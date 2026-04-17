
import { AuthProvider } from "./AuthProvider";

export class AppAuthProvider extends AuthProvider {
    public constructor(tid: string, host: string = 'https://graph.microsoft.com') {
        if (host.charAt(host.length - 1) !== '/') {
            host += '/';
        }
        host += '.default';
        super(tid, [host]);
    }

    public async getToken(): Promise<string> {
        if (!this.client) {
            throw new Error(
                'App-only authentication requires AZURE_CLIENT_SECRET or certificate configuration. ' +
                'This operation cannot be performed without credentials.'
            );
        }
        const result = await this.client.acquireTokenByClientCredential({
            scopes: this.scopes
        });
        return result!.accessToken;
    }
}
