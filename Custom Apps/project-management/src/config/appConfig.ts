
// Configuration for SharePoint Embedded application
export const appConfig = {
  // These values should be updated with your actual values
  clientId: "<CLIENT_ID>", // Replace with your application client ID
  tenantId: "<TENANT_ID>", // Replace with your tenant ID
  containerTypeId: "<CONTAINER_TYPE_ID>", // Replace with your container type ID
  appName: "Project Management using SharePoint Embedded",
  
  // MSAL configuration
  msalConfig: {
    auth: {
      clientId: "<CLIENT_ID>", // Same as above
      authority: "https://login.microsoftonline.com/<TENANT_ID>", // Will be updated with actual tenant ID
      redirectUri: window.location.origin, // Dynamic redirect URI based on current origin
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  },
  
  // API endpoints
  endpoints: {
    graphBaseUrl: "https://graph.microsoft.com/v1.0",
    fileStorage: "/storage/fileStorage",
    containers: "/containers",
    drives: "/drives",
  },
};
