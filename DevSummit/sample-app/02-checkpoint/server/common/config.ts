import * as MSAL from "@azure/msal-node";

export const msalConfig: MSAL.Configuration = {
  auth: {
    authority: `https://login.microsoftonline.com/${process.env['ENTRA_APP_TENANT_ID']!}/`,
    clientId: process.env['ENTRA_APP_CLIENT_ID']!,
    clientSecret: process.env['ENTRA_APP_CLIENT_SECRET']!
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: any, message: any, containsPii: any) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: MSAL.LogLevel.Verbose,
    }
  }
};
