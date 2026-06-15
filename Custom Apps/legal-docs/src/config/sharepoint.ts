// SharePoint Embedded Configuration
// Update these values with your actual Azure AD and SharePoint Embedded settings

export const SHAREPOINT_CONFIG = {
  CLIENT_ID: "<CLIENT_ID>",
  TENANT_ID: "<TENANT_ID>",
  CONTAINER_TYPE_ID: "<CONTAINER_TYPE_ID>",
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

// Graph API scopes
export const GRAPH_SEARCH_SCOPES = [
  "https://graph.microsoft.com/Files.Read.All",
  "https://graph.microsoft.com/Sites.Read.All",
];

