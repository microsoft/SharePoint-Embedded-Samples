
import { ConfidentialClientApplication, NodeAuthOptions } from '@azure/msal-node';

type AuthHandlerCallback = (error: any, accessToken: string | null) => void;

export type AuthHandler = (done: AuthHandlerCallback) => void;

export interface IAuthProvider {
    getToken(): Promise<string>;
    getAuthHandler(): AuthHandler;
}

export abstract class AuthProvider implements IAuthProvider {
    protected client: ConfidentialClientApplication | null;
    public constructor(private readonly _tid: string, public readonly scopes: string[] = ['https://graph.microsoft.com/.default']) {
        const hasSecret = !!process.env.AZURE_CLIENT_SECRET;
        const hasCert = !!(process.env.AZURE_CLIENT_CERT_THUMBPRINT && process.env.AZURE_CLIENT_CERT_PRIVATE_KEY);

        if (hasSecret || hasCert) {
            const authority = `https://login.microsoftonline.com/${_tid}`;
            const auth: NodeAuthOptions = {
                clientId: process.env.AZURE_CLIENT_ID!,
                authority: authority
            };
            if (hasCert) {
                auth.clientCertificate = {
                    thumbprint: process.env.AZURE_CLIENT_CERT_THUMBPRINT!,
                    privateKey: process.env.AZURE_CLIENT_CERT_PRIVATE_KEY!
                };
            } else {
                auth.clientSecret = process.env.AZURE_CLIENT_SECRET;
            }
            this.client = new ConfidentialClientApplication({ auth: auth });
        } else {
            this.client = null;
        }
    }

    public abstract getToken(): Promise<string>;

    public getAuthHandler(): AuthHandler {
        return (done: AuthHandlerCallback) => {
            this.getToken().then(token => done(null, token)).catch(err => done(err, null));
        };
    }
}
