/**
 * Gets a bearer token for use with the OpenCMIS Workbench (or any OAuth2 Bearer
 * Token CMIS client) when your account has MFA/Conditional Access enabled,
 * which blocks the Basic Auth (ROPC) flow used for username/password login.
 *
 * Uses the device code flow (supports MFA) against the same public client the
 * server already trusts, requesting a token for its own exposed API scope so
 * the server's On-Behalf-Of exchange (see src/lib/auth/authService.ts) works.
 *
 * Requires env vars AZURE_CLIENT_ID (required) and AZURE_TENANT_ID (optional,
 * defaults to 'organizations' to match the server's multi-tenant authority).
 *
 * Usage: AZURE_CLIENT_ID=<your-app-client-id> node scripts/get-bearer-token.js
 */
const { PublicClientApplication } = require('@azure/msal-node');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID || 'organizations';

if (!CLIENT_ID) {
    console.error('Missing required environment variable: AZURE_CLIENT_ID');
    console.error('Usage: AZURE_CLIENT_ID=<your-app-client-id> node scripts/get-bearer-token.js');
    process.exit(1);
}

const SCOPES = [`api://${CLIENT_ID}/access_as_user`];

const pca = new PublicClientApplication({
    auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    },
});

async function main() {
    const result = await pca.acquireTokenByDeviceCode({
        scopes: SCOPES,
        deviceCodeCallback: (response) => {
            console.log(response.message);
        },
    });

    console.log('\nAccess token (paste into Workbench\'s OAuth Bearer Token field):\n');
    console.log(result.accessToken);
}

main().catch((err) => {
    console.error('Failed to acquire token:', err);
    process.exit(1);
});
