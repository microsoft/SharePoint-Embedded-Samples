/**
 * Authentication Service for the SPE-CMIS adapter.
 * 
 * Handles authentication from legacy CMIS clients and acquires Microsoft Graph API 
 * tokens with USER CONTEXT using MSAL. All Graph calls use delegated permissions
 * so that SharePoint Embedded's built-in access controls are enforced.
 * 
 * Authentication Flows:
 * 
 * 1. Basic Auth (legacy CMIS clients like SAP Document Center):
 *    - Client sends username/password via Basic Auth header
 *    - We use ROPC (Resource Owner Password Credentials) flow to get a user token
 *    - Graph calls are made in the context of that user
 * 
 * 2. OAuth2 Bearer Token:
 *    - Client sends a bearer token they obtained from Azure AD
 *    - We use OBO (On-Behalf-Of) flow to exchange it for a Graph token
 *    - Graph calls are made in the context of the original user
 */

import { HttpRequest } from '@azure/functions';
import {
    ConfidentialClientApplication,
    Configuration,
    AuthenticationResult,
    OnBehalfOfRequest,
    UsernamePasswordRequest,
} from '@azure/msal-node';
import { getConfig } from '../config';

/**
 * Parsed authentication context from incoming request
 */
export interface AuthContext {
    /** Authenticated user or service principal identifier */
    principalId: string;
    /** Principal display name if available */
    principalName?: string;
    /** Authentication method used */
    authMethod: 'basic' | 'oauth2';
    /** The Graph access token for this user */
    graphAccessToken: string;
}

/** Cached MSAL client instance */
let msalClient: ConfidentialClientApplication | null = null;

/** Graph API scopes for delegated access */
const GRAPH_SCOPES = ['https://graph.microsoft.com/FileStorageContainer.Selected'];

/**
 * Gets or creates the MSAL ConfidentialClientApplication instance.
 */
function getMsalClient(): ConfidentialClientApplication {
    if (!msalClient) {
        const config = getConfig();
        
        const msalConfig: Configuration = {
            auth: {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                // Defaults to 'organizations' for multi-tenant apps supporting only work/school accounts
                authority: `https://login.microsoftonline.com/${config.tenantId}`,
            },
        };

        msalClient = new ConfidentialClientApplication(msalConfig);
    }

    return msalClient;
}

/**
 * Parses Basic Auth credentials from an HTTP request.
 */
export function parseBasicAuth(request: HttpRequest): { username: string; password: string } | null {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.toLowerCase().startsWith('basic ')) {
        return null;
    }

    try {
        const base64Credentials = authHeader.slice(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        // Split on the FIRST colon only - RFC 7617 permits ':' in the
        // password, so splitting on every colon would silently truncate it.
        const separatorIndex = credentials.indexOf(':');
        if (separatorIndex === -1) {
            return null;
        }
        const username = credentials.slice(0, separatorIndex);
        const password = credentials.slice(separatorIndex + 1);

        if (!username || !password) {
            return null;
        }

        return { username, password };
    } catch {
        return null;
    }
}

/**
 * Parses Bearer token from an HTTP request.
 */
export function parseBearerToken(request: HttpRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        return null;
    }

    return authHeader.slice(7);
}

/**
 * Acquires a Graph token using ROPC flow (for Basic Auth clients).
 * The token will have the user's identity, enabling SPE access control.
 *
 * ROPC (sending a raw username/password to the token endpoint) is generally
 * discouraged, but it's integral to this adapter's purpose: bridging legacy
 * CMIS clients (e.g. SAP Document Center) that only support HTTP Basic Auth
 * and have no way to complete an interactive/OAuth2 flow. Clients that CAN
 * send an OAuth2 Bearer token should do so instead - see
 * acquireTokenOnBehalfOf and the Bearer-first ordering in authenticateRequest.
 *
 * Note: ROPC requires the user's tenant to allow it and the app to have
 * the appropriate permissions. It won't work with MFA-enabled accounts.
 */
async function acquireTokenByUsernamePassword(
    username: string,
    password: string
): Promise<AuthenticationResult> {
    const client = getMsalClient();

    const request: UsernamePasswordRequest = {
        scopes: GRAPH_SCOPES,
        username,
        password,
    };

    const result = await client.acquireTokenByUsernamePassword(request);

    if (!result) {
        throw new Error('Failed to acquire token: No result returned from MSAL');
    }

    return result;
}

/**
 * Acquires a Graph token using OBO flow (for OAuth2 Bearer token clients).
 * Exchanges the incoming token for a Graph token with the same user context.
 */
async function acquireTokenOnBehalfOf(
    userToken: string
): Promise<AuthenticationResult> {
    const client = getMsalClient();

    const request: OnBehalfOfRequest = {
        scopes: GRAPH_SCOPES,
        oboAssertion: userToken,
    };

    const result = await client.acquireTokenOnBehalfOf(request);

    if (!result) {
        throw new Error('Failed to acquire token: No result returned from MSAL');
    }

    return result;
}

/**
 * Clears the server-side cached MSAL ConfidentialClientApplication instance,
 * forcing it to be recreated (picking up updated config) on next use. This
 * runs entirely in the API service - there is no browser involved in this
 * adapter, so this has no effect on any browser-side token cache.
 */
export function clearMsalClientCache(): void {
    msalClient = null;
}

/**
 * Authentication middleware result
 */
export interface AuthResult {
    success: boolean;
    context?: AuthContext;
    error?: string;
}

/**
 * Authenticates an incoming request and acquires a Graph token with user context.
 * Returns an AuthResult with the user's Graph access token for subsequent API calls.
 */
export async function authenticateRequest(request: HttpRequest): Promise<AuthResult> {
    // Prefer OAuth2 Bearer tokens (OBO) over Basic Auth (ROPC) when a client
    // can send either, since ROPC involves passing raw user credentials.
    const bearerToken = parseBearerToken(request);
    if (bearerToken) {
        try {
            const result = await acquireTokenOnBehalfOf(bearerToken);

            return {
                success: true,
                context: {
                    principalId: result.account?.localAccountId || 'oauth2-user',
                    principalName: result.account?.name,
                    authMethod: 'oauth2',
                    graphAccessToken: result.accessToken,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Token exchange failed';
            return {
                success: false,
                error: `OAuth2 OBO failed: ${message}`,
            };
        }
    }

    // Fall back to Basic Auth (legacy CMIS clients that can't do OAuth2)
    const basicAuth = parseBasicAuth(request);
    if (basicAuth) {
        try {
            const result = await acquireTokenByUsernamePassword(
                basicAuth.username,
                basicAuth.password
            );

            return {
                success: true,
                context: {
                    principalId: result.account?.localAccountId || basicAuth.username,
                    principalName: result.account?.name || basicAuth.username,
                    authMethod: 'basic',
                    graphAccessToken: result.accessToken,
                },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Authentication failed';
            return {
                success: false,
                error: `Basic Auth failed: ${message}`,
            };
        }
    }

    return {
        success: false,
        error: 'No authentication credentials provided',
    };
}
