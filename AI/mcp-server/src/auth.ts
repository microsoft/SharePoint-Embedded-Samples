import { ConfidentialClientApplication } from '@azure/msal-node';
import type { AppConfig } from './config.js';

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class AuthProvider {
  private msal: ConfidentialClientApplication;
  private cache: TokenCache | null = null;

  constructor(config: AppConfig) {
    this.msal = new ConfidentialClientApplication({
      auth: {
        clientId: config.appId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  async getToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer before expiry)
    if (this.cache && Date.now() < this.cache.expiresAt - 60_000) {
      return this.cache.token;
    }

    const result = await this.msal.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result?.accessToken || !result.expiresOn) {
      throw new Error('Failed to acquire access token from MSAL');
    }

    this.cache = {
      token: result.accessToken,
      expiresAt: result.expiresOn.getTime(),
    };

    return this.cache.token;
  }
}
