/**
 * Minimal OAuth 2.0 Authorization Server for the MCP spec.
 *
 * Implements:
 *   - Authorization Code flow with PKCE  (used by Lovable's OAuth default)
 *   - Client Credentials flow            (service-to-service fallback)
 *   - Dynamic client registration
 *
 * Token signing key is derived from CLIENT_SECRET — no extra env var needed.
 */
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  clientName: string;
  redirectUris: string[];
  createdAt: number;
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}

export interface TokenClaims {
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
}

// ── Key derivation ────────────────────────────────────────────────────────────

/** Derive a stable 32-byte signing key from the app's CLIENT_SECRET. */
export function deriveSigningKey(clientSecret: string): Buffer {
  return createHmac('sha256', clientSecret)
    .update('spe-mcp-oauth-signing-key-v1')
    .digest();
}

// ── Client registry (in-memory) ───────────────────────────────────────────────

const clientStore = new Map<string, OAuthClient>();

export function registerClient(
  clientName = 'MCP Client',
  redirectUris: string[] = []
): OAuthClient {
  const client: OAuthClient = {
    clientId: randomUUID(),
    clientSecret: randomBytes(32).toString('base64url'),
    clientName,
    redirectUris,
    createdAt: Date.now(),
  };
  clientStore.set(client.clientId, client);
  return client;
}

/** Get or auto-create a client record (allows unregistered public clients in auth code flow). */
export function getOrCreateClient(clientId: string): OAuthClient {
  let client = clientStore.get(clientId);
  if (!client) {
    // Auto-register unknown clients as public (no secret required for PKCE flow)
    client = {
      clientId,
      clientSecret: '',
      clientName: 'Auto-registered client',
      redirectUris: [],
      createdAt: Date.now(),
    };
    clientStore.set(clientId, client);
  }
  return client;
}

export function getClient(clientId: string): OAuthClient | undefined {
  return clientStore.get(clientId);
}

// ── Authorization codes ───────────────────────────────────────────────────────

const authCodeStore = new Map<string, AuthorizationCode>();

export function issueAuthCode(
  clientId: string,
  redirectUri: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): string {
  const code = randomBytes(32).toString('base64url');
  authCodeStore.set(code, {
    code,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: codeChallengeMethod ?? 'plain',
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return code;
}

export function consumeAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier?: string
): boolean {
  const entry = authCodeStore.get(code);
  if (!entry) return false;
  authCodeStore.delete(code); // single-use

  if (entry.clientId !== clientId) return false;
  if (entry.redirectUri !== redirectUri) return false;
  if (Date.now() > entry.expiresAt) return false;

  // Verify PKCE if the code was issued with a challenge
  if (entry.codeChallenge) {
    if (!codeVerifier) return false;
    if (entry.codeChallengeMethod === 'S256') {
      const computed = createHash('sha256').update(codeVerifier).digest('base64url');
      if (computed !== entry.codeChallenge) return false;
    } else {
      // plain
      if (codeVerifier !== entry.codeChallenge) return false;
    }
  }

  return true;
}

// ── Token issuance & verification ─────────────────────────────────────────────

const TOKEN_TTL_SECONDS = 3600; // 1 hour

export function issueToken(clientId: string, signingKey: Buffer): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: TokenClaims = {
    iss: 'spe-mcp-server',
    sub: clientId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    jti: randomUUID(),
  };
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'at+JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = createHmac('sha256', signingKey).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

export function verifyToken(token: string, signingKey: Buffer): TokenClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts as [string, string, string];

    const expected = createHmac('sha256', signingKey).update(`${h}.${p}`).digest('base64url');
    const sBuf = Buffer.from(sig, 'base64url');
    const eBuf = Buffer.from(expected, 'base64url');
    if (sBuf.length !== eBuf.length || !timingSafeEqual(sBuf, eBuf)) return null;

    const claims = JSON.parse(Buffer.from(p, 'base64url').toString()) as TokenClaims;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// ── Client credentials extraction ─────────────────────────────────────────────

export function extractClientCredentials(
  authHeader: string | undefined,
  body: Record<string, string>
): { clientId: string; clientSecret: string } | null {
  if (authHeader?.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const colon = decoded.indexOf(':');
    if (colon === -1) return null;
    return { clientId: decoded.slice(0, colon), clientSecret: decoded.slice(colon + 1) };
  }
  if (body['client_id'] && body['client_secret']) {
    return { clientId: body['client_id'], clientSecret: body['client_secret'] };
  }
  return null;
}
