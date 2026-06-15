// SharePoint Embedded & Azure AD Configuration
// Central configuration file

export const appConfig = {
  // Azure AD App Registration
  clientId: "<CLIENT_ID>",
  tenantId: "<TENANT_ID>",
  
  // SharePoint Embedded
  containerTypeId: "<CONTAINER_TYPE_ID>",
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
  // Container management scope
  containerManagement: ["https://graph.microsoft.com/FileStorageContainer.Selected"] as string[],
};
