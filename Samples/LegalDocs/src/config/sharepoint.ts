// SharePoint Embedded Configuration
// Update these values with your actual Azure AD and SharePoint Embedded settings

export const SHAREPOINT_CONFIG = {
  CLIENT_ID: "50cbacb0-e16f-4f63-a678-01359bfac87b",
  TENANT_ID: "fc14a141-120b-4368-b125-571da82b7865",
  CONTAINER_TYPE_ID: "9162b1be-e7db-4b0d-bc1a-331df4dea97e",
  // SharePoint hostname for Copilot API authentication (must include https://)
  // Use tenant name format: https://{tenant}.sharepoint.com
  SHAREPOINT_HOSTNAME: "https://pucelikdemo.sharepoint.com",
} as const;

// MSAL Configuration
export const MSAL_CONFIG = {
  auth: {
    clientId: SHAREPOINT_CONFIG.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${SHAREPOINT_CONFIG.TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

// Graph API endpoints
export const GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";
export const GRAPH_BETA_ENDPOINT = "https://graph.microsoft.com/beta";

// Scopes for Copilot - using SharePoint Container.Selected as per SDK documentation
// The SDK requires this scope pattern: {hostname}/Container.Selected
export const COPILOT_SCOPES = [`${SHAREPOINT_CONFIG.SHAREPOINT_HOSTNAME}/Container.Selected`];

// Graph API scopes for search-based Copilot functionality
// Used when calling Graph API endpoints directly (current implementation)
export const GRAPH_SEARCH_SCOPES = [
  "https://graph.microsoft.com/Files.Read.All",
  "https://graph.microsoft.com/Sites.Read.All",
];

// SharePoint-specific scopes for container access
export const SHAREPOINT_CONTAINER_SCOPES = [`${SHAREPOINT_CONFIG.SHAREPOINT_HOSTNAME}/Container.Selected`];

// Copilot Chat Auth Provider Interface (matches SDK's IChatEmbeddedApiAuthProvider)
export interface IChatEmbeddedApiAuthProvider {
  hostname: string;
  getToken(): Promise<string>;
}

// Copilot Chat Launch Configuration (matches SDK's ChatLaunchConfig)
export interface ChatLaunchConfig {
  header?: string;
  zeroQueryPrompts?: {
    headerText: string;
    promptSuggestionList?: Array<{
      suggestionText: string;
    }>;
  };
  suggestedPrompts?: string[];
  instruction?: string;
  locale?: string;
  chatInputPlaceholder?: string;
}
