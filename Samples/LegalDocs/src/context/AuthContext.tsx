import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { 
  PublicClientApplication, 
  AccountInfo, 
  AuthenticationResult,
  InteractionRequiredAuthError
} from "@azure/msal-browser";
import { MSAL_CONFIG, APP_CONFIG, SCOPES } from "@/config/appConfig";

interface AuthContextType {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: (scopes: string[]) => Promise<string | null>;
  getSharePointToken: () => Promise<string | null>;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const msalInstance = new PublicClientApplication(MSAL_CONFIG);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        
        // Handle redirect promise if returning from auth flow
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
          setUser(response.account);
          setIsAuthenticated(true);
        } else {
          // Check for existing accounts
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            setUser(accounts[0]);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("MSAL initialization error:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeMsal();
  }, []);

  const login = useCallback(async () => {
    if (!isInitialized) {
      console.error("MSAL not initialized");
      return;
    }

    setIsLoggingIn(true);
    try {
      // Use popup with explicit window features to avoid hash_empty_error
      const loginResponse: AuthenticationResult = await msalInstance.loginPopup({
        scopes: [],
        popupWindowAttributes: {
          popupSize: {
            height: 600,
            width: 480,
          },
          popupPosition: {
            top: window.screenY + (window.outerHeight - 600) / 2,
            left: window.screenX + (window.outerWidth - 480) / 2,
          },
        },
      });
      
      if (loginResponse.account) {
        setUser(loginResponse.account);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }, [isInitialized]);

  const logout = useCallback(async () => {
    try {
      // Clear all local storage to prevent data leakage
      localStorage.clear();
      sessionStorage.clear();
      
      await msalInstance.logoutPopup();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Get access token for specified scopes (typically Graph API)
   */
  const getAccessToken = useCallback(async (scopes: string[]): Promise<string | null> => {
    if (!user) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes,
        account: user,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await msalInstance.acquireTokenPopup({ scopes });
          return response.accessToken;
        } catch (popupError) {
          console.error("Token acquisition error:", popupError);
          return null;
        }
      }
      console.error("Token acquisition error:", error);
      return null;
    }
  }, [user]);

  /**
   * Get SharePoint-scoped token for Copilot SDK
   * Uses the {hostname}/Container.Selected scope pattern
   */
  const getSharePointToken = useCallback(async (): Promise<string | null> => {
    return getAccessToken(SCOPES.sharePoint);
  }, [getAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        isInitialized,
        isAuthenticated,
        user,
        login,
        logout,
        getAccessToken,
        getSharePointToken,
        isLoggingIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
