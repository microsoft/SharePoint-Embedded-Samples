// SharePoint Embedded & Azure AD Configuration
// Central configuration file for the Copilot Chat implementation

// Helper to normalize SharePoint URLs (ensure https:// prefix)
const normalizeSharePointUrl = (url: string): string => {
  if (!url) return '';
  // Remove trailing slashes
  let normalized = url.replace(/\/+$/, '');
  // Ensure https:// prefix
  if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
};

export const appConfig = {
  // Azure AD App Registration
  clientId: "50cbacb0-e16f-4f63-a678-01359bfac87b",
  tenantId: "fc14a141-120b-4368-b125-571da82b7865",
  
  // SharePoint Embedded
  containerTypeId: "9162b1be-e7db-4b0d-bc1a-331df4dea97e",
  sharePointHostname: "https://pucelikdemo.sharepoint.com",
  
  // Utility function for URL normalization
  normalizeSharePointUrl,
};

// Keep APP_CONFIG as alias for backward compatibility
export const APP_CONFIG = appConfig;

// MSAL Configuration
export const MSAL_CONFIG = {
  auth: {
    clientId: APP_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${APP_CONFIG.tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage" as const,
    storeAuthStateInCookie: false,
  },
};

// API Endpoints
export const ENDPOINTS = {
  graph: "https://graph.microsoft.com/v1.0",
  graphBeta: "https://graph.microsoft.com/beta",
} as const;

// Scopes for different API resources (mutable arrays for MSAL compatibility)
export const SCOPES = {
  // Graph API scopes for file/container operations
  graph: [
    "https://graph.microsoft.com/Files.Read.All",
    "https://graph.microsoft.com/Sites.Read.All",
  ] as string[],
  // SharePoint Container.Selected scope for SDK authentication
  sharePoint: [`${APP_CONFIG.sharePointHostname}/Container.Selected`] as string[],
  // Container management scope
  containerManagement: ["https://graph.microsoft.com/FileStorageContainer.Selected"] as string[],
};

// Copilot Chat UI Configuration
export const COPILOT_CONFIG = {
  header: "Case Assistant",
  instruction: "You are a helpful legal case assistant. Answer questions about the documents in this case clearly and professionally.",
  locale: "en-US",
  suggestedPrompts: [
    "Summarize the key facts of this case",
    "Who are the parties involved?",
    "What are the important dates?",
    "List the key documents",
  ] as string[],
  chatInputPlaceholder: "Ask about this case...",
};
