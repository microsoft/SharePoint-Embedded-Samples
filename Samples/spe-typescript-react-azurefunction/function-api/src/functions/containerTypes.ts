import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { ApiError, InvalidAccessTokenError } from "../common/Errors";
import { JwtProvider } from "../providers/JwtProvider";
import { createUserAuthProvider } from "../providers/AuthFactory";

export async function registerContainerType(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }

        const authProvider = createUserAuthProvider(jwt, ['FileStorageContainerTypeReg.Selected']);
        const token = await authProvider.getToken();

        const containerTypeId = process.env.SPE_CONTAINER_TYPE_ID!;
        const registerApi = `https://graph.microsoft.com/v1.0/storage/fileStorage/containerTypeRegistrations/${containerTypeId}`;
        const grants = [
            {
                appId: process.env.AZURE_CLIENT_ID,
                delegatedPermissions: ['full'],
                applicationPermissions: ['full']
            }
        ];
        if (process.env.AZURE_SPA_CLIENT_ID && process.env.AZURE_SPA_CLIENT_ID !== process.env.AZURE_CLIENT_ID) {
            grants.push({
                appId: process.env.AZURE_SPA_CLIENT_ID,
                delegatedPermissions: ['full'],
                applicationPermissions: ['full']
            });
        }
        const registerPayload = { applicationPermissionGrants: grants };

        const registerResponse = await fetch(registerApi, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(registerPayload)
        });
        return { jsonBody: await registerResponse.json()};
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Register Container Type failed: ${error}` };
    }
}


app.http('registerContainerType', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    handler: registerContainerType
});
