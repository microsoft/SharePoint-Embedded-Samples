import { APP_CONFIG, SCOPES } from "@/config/appConfig";

/**
 * Authentication provider interface for the SharePoint Embedded Copilot SDK.
 * Matches the SDK's IChatEmbeddedApiAuthProvider interface.
 */
export interface IChatEmbeddedApiAuthProvider {
  hostname: string;
  getToken(): Promise<string>;
}

/**
 * CopilotAuthProvider implements IChatEmbeddedApiAuthProvider for the SDK.
 * 
 * The SDK requires:
 * - hostname: SharePoint site URL (e.g., https://tenant.sharepoint.com)
 * - getToken(): Returns access token with Container.Selected scope
 */
export class CopilotAuthProvider implements IChatEmbeddedApiAuthProvider {
  public readonly hostname: string;
  private getAccessToken: (scopes: string[]) => Promise<string | null>;
  private initialized: boolean = false;

  constructor(getAccessToken: (scopes: string[]) => Promise<string | null>) {
    this.hostname = APP_CONFIG.sharePointHostname;
    this.getAccessToken = getAccessToken;
  }

  /**
   * Initialize the auth provider by testing token acquisition.
   * Call this before using the ChatEmbedded component.
   */
  async initialize(): Promise<void> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("Failed to initialize auth provider - could not acquire token");
    }
    this.initialized = true;
    console.log("CopilotAuthProvider: Initialized successfully");
  }

  /**
   * Get access token with Container.Selected scope.
   * Required by the SDK: {hostname}/Container.Selected
   */
  async getToken(): Promise<string> {
    const token = await this.getAccessToken(SCOPES.sharePoint);
    if (!token) {
      throw new Error("Failed to acquire SharePoint Container.Selected token");
    }
    console.log("CopilotAuthProvider: Acquired Container.Selected token");
    return token;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}
