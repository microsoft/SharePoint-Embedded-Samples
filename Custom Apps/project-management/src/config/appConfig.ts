
// Configuration for SharePoint Embedded application
export const appConfig = {
  // These values should be updated with your actual values
  clientId: "<CLIENT_ID>", // Replace with your application client ID
  tenantId: "<TENANT_ID>", // Replace with your tenant ID
  containerTypeId: "<CONTAINER_TYPE_ID>", // Replace with your container type ID
  appName: "Project Management using SharePoint Embedded",
  
  // Add the SharePoint hostname explicitly
  sharePointHostname: "https://<Domain>.sharepoint.com",
  
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
  
  // Copilot theme configuration
  copilotTheme: {
    useDarkMode: false,
    customTheme: {
      themePrimary: '#6941C6',
      themeSecondary: '#7F56D9',
      themeDark: '#5E37BF',
      themeDarker: '#4924A1',
      themeTertiary: '#9E77ED',
      themeLight: '#E9D7FE',
      themeDarkAlt: '#7F56D9',
      themeLighter: '#F4EBFF',
      themeLighterAlt: '#FAF5FF',
      themeDarkAltTransparent: 'rgba(111, 66, 193, 0.9)',
      themeLighterTransparent: 'rgba(233, 215, 254, 0.9)',
      themeLighterAltTransparent: 'rgba(250, 245, 255, 0.9)',
      themeMedium: '#9E77ED',
      neutralSecondary: '#6941C6',
      neutralSecondaryAlt: '#7F56D9',
      neutralTertiary: '#9E77ED',
      neutralTertiaryAlt: '#B692F6',
      neutralQuaternary: '#D6BBFB',
      neutralQuaternaryAlt: '#E9D7FE',
      neutralPrimaryAlt: '#4924A1',
      neutralDark: '#5E37BF',
      themeBackground: 'white',
    }
  }
};
