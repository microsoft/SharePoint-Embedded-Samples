import * as Msal from '@azure/msal-browser';
import * as Constants from '../common/Constants';

// MIP specific constants
const MIP_RESOURCE = 'https://aadrm.com/';
const MIP_SYNC_RESOURCE = 'https://psor.o365syncservice.com/'
const MIP_UNIFIED_POLICY_SCOPE = 'UnifiedPolicy.User.Read';
const MIP_USER_IMPERSONATION_SCOPE = 'user_impersonation';
const MS_GRAPH_USER_READ = 'User.Read';

// MIP specific scopes - for v2 endpoints, format is 'resource/scope'
export const MIP_SCOPES = [
    `${MIP_RESOURCE}${MIP_USER_IMPERSONATION_SCOPE}`,
];

export class MipAuthProvider {
    public readonly _client: Msal.PublicClientApplication;
    public static readonly instance: MipAuthProvider = new MipAuthProvider();

    private constructor() {
        const msalConfig: Msal.Configuration = {
            auth: {
                clientId: Constants.AZURE_CLIENT_ID!,
                authority: Constants.AUTH_AUTHORITY,
                redirectUri: this.redirectUri
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false
            }
        };
        this._client = new Msal.PublicClientApplication(msalConfig);
    }

    private get redirectUri(): string {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        let port = `:${window.location.port}`;
        if (port === '80' || port === '443') {
            port = '';
        }
        return `${protocol}//${hostname}${port}`;
    }

    private async _getTokenSilent(scopes: string[]): Promise<string> {
        const silentRequest: Msal.SilentRequest = {
            scopes: scopes,
            account: this.account!,
            authority: Constants.AUTH_AUTHORITY
        };
        const result = await this._client.acquireTokenSilent(silentRequest);
        this._client.setActiveAccount(result.account);
        return result.accessToken;
    }

    private async _getTokenPopup(scopes: string[]): Promise<string> {
        const tokenRequest: Msal.PopupRequest = {
            scopes: scopes,
            authority: Constants.AUTH_AUTHORITY
        };
        const result = await this._client.acquireTokenPopup(tokenRequest);
        this._client.setActiveAccount(result.account);
        return result.accessToken;
    }

    public async getToken(scopes: string[] = MIP_SCOPES): Promise<string> { 
        console.log('MIP Auth Provider account:', this.account);
        try {
            await this._client.initialize();
            if (this.account) {
                return await this._getTokenSilent(scopes);
            }
            return await this._getTokenPopup(scopes);
        } catch (error) {
            if (error instanceof Msal.InteractionRequiredAuthError) {
                return await this._getTokenPopup(scopes);
            } else {
                throw error;
            }
        }
    }

    public async signIn(scopes: string[] = MIP_SCOPES): Promise<Msal.AccountInfo | null> {
        return this.getToken(scopes).then(() => this.account).catch(() => null);
    }

    public get account(): Msal.AccountInfo | null {
        return this._client.getActiveAccount();
    }

    public async isSignedIn(): Promise<boolean> {
        return this.account !== null;
    }
}
