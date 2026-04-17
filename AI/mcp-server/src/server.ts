import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { GraphClient } from './graph.js';
import type { AppConfig } from './config.js';
import { registerContainerTools } from './tools/containers.js';
import { registerDriveTools } from './tools/drives.js';
import { registerFileTools } from './tools/files.js';
import { registerPermissionTools } from './tools/permissions.js';
import {
  deriveSigningKey,
  registerClient,
  getClient,
  getOrCreateClient,
  issueToken,
  issueAuthCode,
  consumeAuthCode,
  verifyToken,
  extractClientCredentials,
} from './oauth.js';

// ── MCP server factory ────────────────────────────────────────────────────────

function createMcpServer(graph: GraphClient, config: AppConfig): McpServer {
  const server = new McpServer({ name: 'spe-mcp-server', version: '1.0.0' });
  registerContainerTools(server, graph, config);
  registerDriveTools(server, graph);
  registerFileTools(server, graph);
  registerPermissionTools(server, graph);
  return server;
}

// ── App builder ───────────────────────────────────────────────────────────────

export function buildApp(graph: GraphClient, config: AppConfig): express.Application {
  const app = express();

  // ── CORS — must be first, before all other middleware ─────────────────────────
  // Lovable runs in the browser and makes cross-origin requests to this server.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Mcp-Session-Id');
    res.set('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const signingKey = deriveSigningKey(config.clientSecret);

  // Helper: build the public base URL from the incoming request
  function baseUrl(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.get('host') ?? 'localhost';
    return `${proto}://${host}`;
  }

  // ── Auth middleware ───────────────────────────────────────────────────────────
  function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      res.set('WWW-Authenticate', 'Bearer realm="spe-mcp-server"');
      res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token required' });
      return;
    }
    const claims = verifyToken(auth.slice(7), signingKey);
    if (!claims) {
      res.set('WWW-Authenticate', 'Bearer realm="spe-mcp-server", error="invalid_token"');
      res.status(401).json({ error: 'invalid_token', error_description: 'Token is invalid or expired' });
      return;
    }
    next();
  }

  // ── Health ────────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'spe-mcp-server', version: '1.0.0' });
  });

  // ── OAuth: protected resource metadata ───────────────────────────────────────
  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const base = baseUrl(req);
    res.json({
      resource: base,
      authorization_servers: [base],
    });
  });

  // ── OAuth: authorization server metadata ─────────────────────────────────────
  // Lovable fetches this first to discover all OAuth endpoints
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const base = baseUrl(req);
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      grant_types_supported: ['authorization_code', 'client_credentials'],
      response_types_supported: ['code'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      scopes_supported: ['mcp'],
    });
  });

  // ── OAuth: dynamic client registration ───────────────────────────────────────
  app.post('/register', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const clientName = (body['client_name'] as string | undefined) ?? 'MCP Client';
    const redirectUris = (body['redirect_uris'] as string[] | undefined) ?? [];
    const client = registerClient(clientName, redirectUris);
    res.status(201).json({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      client_id_issued_at: Math.floor(client.createdAt / 1000),
      token_endpoint_auth_method: 'client_secret_post',
      grant_types: ['authorization_code', 'client_credentials'],
      scope: 'mcp',
    });
  });

  // ── OAuth: authorization endpoint ─────────────────────────────────────────────
  // Lovable redirects here to start the auth code flow.
  // Since this is an app-only connector (no user login), we auto-approve and
  // immediately redirect back with an authorization code.
  app.get('/authorize', (req, res) => {
    const q = req.query as Record<string, string>;
    const { client_id, redirect_uri, state, code_challenge, code_challenge_method, response_type } = q;

    if (response_type !== 'code') {
      res.status(400).json({ error: 'unsupported_response_type' });
      return;
    }
    if (!redirect_uri) {
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is required' });
      return;
    }

    // Ensure the client exists (auto-register if not yet known — supports public clients)
    getOrCreateClient(client_id ?? randomUUID());

    // Issue authorization code immediately (app-only — no user consent screen needed)
    const code = issueAuthCode(client_id, redirect_uri, code_challenge, code_challenge_method);

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);

    res.redirect(callbackUrl.toString());
  });

  // ── OAuth: token endpoint ─────────────────────────────────────────────────────
  app.post('/token', (req, res) => {
    const body = req.body as Record<string, string>;
    const grantType = body['grant_type'];

    // Authorization Code grant (used by Lovable's default OAuth flow)
    if (grantType === 'authorization_code') {
      const { code, redirect_uri, client_id, code_verifier } = body;

      if (!code || !redirect_uri || !client_id) {
        res.status(400).json({ error: 'invalid_request', error_description: 'code, redirect_uri, and client_id are required' });
        return;
      }

      if (!consumeAuthCode(code, client_id, redirect_uri, code_verifier)) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code is invalid, expired, or PKCE failed' });
        return;
      }

      const accessToken = issueToken(client_id, signingKey);
      res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, scope: 'mcp' });
      return;
    }

    // Client Credentials grant (service-to-service fallback)
    if (grantType === 'client_credentials') {
      const creds = extractClientCredentials(req.headers['authorization'], body);
      if (!creds) {
        res.status(401).json({ error: 'invalid_client', error_description: 'Missing credentials' });
        return;
      }
      const client = getClient(creds.clientId);
      if (!client || client.clientSecret !== creds.clientSecret) {
        res.status(401).json({ error: 'invalid_client', error_description: 'Invalid credentials' });
        return;
      }
      const accessToken = issueToken(creds.clientId, signingKey);
      res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, scope: 'mcp' });
      return;
    }

    res.status(400).json({ error: 'unsupported_grant_type' });
  });

  // ── Streamable HTTP transport (primary) ───────────────────────────────────────
  app.post('/mcp', requireBearerToken, async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createMcpServer(graph, config);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('[/mcp POST]', e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    } finally {
      await server.close().catch(console.error);
    }
  });

  app.get('/mcp', requireBearerToken, async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createMcpServer(graph, config);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (e) {
      console.error('[/mcp GET]', e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── SSE transport (legacy fallback) ───────────────────────────────────────────
  const sseTransports = new Map<string, SSEServerTransport>();

  app.get('/sse', requireBearerToken, async (req: Request, res: Response) => {
    const sessionId = randomUUID();
    const transport = new SSEServerTransport(`/messages?sessionId=${sessionId}`, res);
    const server = createMcpServer(graph, config);
    sseTransports.set(sessionId, transport);
    transport.onclose = () => {
      sseTransports.delete(sessionId);
      server.close().catch(console.error);
    };
    try {
      await server.connect(transport);
    } catch (e) {
      console.error('[/sse]', e);
      sseTransports.delete(sessionId);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/messages', requireBearerToken, async (req: Request, res: Response) => {
    const sessionId = req.query['sessionId'] as string | undefined;
    if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return; }
    const transport = sseTransports.get(sessionId);
    if (!transport) { res.status(404).json({ error: `No active SSE session: ${sessionId}` }); return; }
    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (e) {
      console.error('[/messages]', e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
