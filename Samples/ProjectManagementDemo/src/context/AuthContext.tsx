
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  PublicClientApplication, 
  AuthenticationResult, 
  AccountInfo,
  InteractionRequiredAuthError 
} from '@azure/msal-browser';
import { appConfig } from '../config/appConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: (resource?: string) => Promise<string | null>;
  getSharePointToken: (hostname: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Update authority with actual tenant ID
const msalConfig = {
  ...appConfig.msalConfig,
  auth: {
    ...appConfig.msalConfig.auth,
    authority: `https://login.microsoftonline.com/${appConfig.tenantId}`,
    redirectUri: window.location.origin, // Ensure this matches what's in Azure AD
    postLogoutRedirectUri: window.location.origin
  }
};

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Make sure the instance is properly initialized
(async () => {
  await msalInstance.initialize();
})();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AccountInfo | null>(null);

  useEffect(() => {
    // Check if there's a user already logged in
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      setIsAuthenticated(true);
      setUser(accounts[0]);
      msalInstance.setActiveAccount(accounts[0]);
    }
  }, []);

  const login = async (): Promise<void> => {
    try {
      // Ensure MSAL is initialized
      await msalInstance.initialize();
      
      // Using empty scopes for login as instructed
      const loginRequest = {
        scopes: []
      };
      
      // Log relevant information for debugging
      console.log('Login attempt with config:', {
        clientId: msalConfig.auth.clientId,
        authority: msalConfig.auth.authority,
        redirectUri: msalConfig.auth.redirectUri
      });
      
      // Login with popup
      const response: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
      
      if (response) {
        setIsAuthenticated(true);
        setUser(response.account);
        // Set the active account for future token requests
        msalInstance.setActiveAccount(response.account);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = (): void => {
    msalInstance.logoutPopup().then(() => {
      setIsAuthenticated(false);
      setUser(null);
      // Clear any local storage
      sessionStorage.clear();
      localStorage.removeItem('preferExternalChat');
      localStorage.removeItem('lastChatError');
    }).catch(error => {
      console.error('Logout failed:', error);
    });
  };

  const getAccessToken = async (resource?: string): Promise<string | null> => {
    try {
      // Use silent token acquisition if possible
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        console.error('No accounts found when trying to get access token');
        return null;
      }

      // Default to Graph API if no resource specified
      const tokenScopes = resource 
        ? [`${resource}/.default`]
        : ["https://graph.microsoft.com/.default"];
      
      console.log(`Acquiring token silently for account: ${accounts[0].username}, resource: ${resource || 'graph'}`);
      
      // Request token with specific scopes for the requested resource
      const tokenRequest = {
        scopes: tokenScopes,
        account: accounts[0]
      };

      const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
      console.log('Token acquired successfully for resource:', resource || 'graph');
      
      return tokenResponse.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        console.log(`Silent token acquisition failed for resource: ${resource || 'graph'}, trying popup`);
        
        try {
          // If silent acquisition fails, try popup
          const tokenScopes = resource 
            ? [`${resource}/.default`]
            : ["https://graph.microsoft.com/.default"];
            
          const tokenResponse = await msalInstance.acquireTokenPopup({
            scopes: tokenScopes
          });
          console.log('Token acquired with popup for resource:', resource || 'graph');
          return tokenResponse.accessToken;
        } catch (fallbackError) {
          console.error(`Failed to get access token with popup for resource: ${resource || 'graph'}`, fallbackError);
          return null;
        }
      } else {
        console.error(`Failed to get access token for resource: ${resource || 'graph'}`, error);
        return null;
      }
    }
  };
  
  // Get a token specifically for SharePoint
  const getSharePointToken = async (hostname: string): Promise<string | null> => {
    try {
      // Extract the hostname without protocol
      const domain = hostname.replace(/^https?:\/\//, '');
      
      // Use the SharePoint Online scope format with the specific domain
      return await getAccessToken(`https://${domain}`);
    } catch (error) {
      console.error('Failed to get SharePoint token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user,
      login, 
      logout, 
      getAccessToken,
      getSharePointToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
