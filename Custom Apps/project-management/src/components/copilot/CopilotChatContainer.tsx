
import React, { useState, useCallback, useEffect } from 'react';
import { useCopilotSite } from '@/hooks/useCopilotSite';
import CopilotDesktopView from './CopilotDesktopView';
import { toast } from '@/hooks/use-toast';
import { appConfig } from '@/config/appConfig';
import { useAuth } from '@/context/AuthContext';
import { 
  IChatEmbeddedApiAuthProvider, 
  ChatEmbeddedAPI, 
  ChatLaunchConfig
} from '@microsoft/sharepointembedded-copilotchat-react';

interface CopilotChatContainerProps {
  containerId: string;
}

const CopilotChatContainer: React.FC<CopilotChatContainerProps> = ({ containerId }) => {
  const [isOpen, setIsOpen] = useState(true); // Keep the chat component open within its container
  const { getSharePointToken, isAuthenticated } = useAuth();
  const [chatApi, setChatApi] = useState<ChatEmbeddedAPI | null>(null);
  const [chatKey, setChatKey] = useState(0);
  
  // Validate and normalize containerId
  const normalizedContainerId = containerId && typeof containerId === 'string' 
    ? (containerId.startsWith('b!') ? containerId : `b!${containerId}`)
    : '';
  
  // Don't proceed if we don't have a valid container ID
  if (!normalizedContainerId) {
    console.error('CopilotChatContainer: Invalid containerId provided:', containerId);
    return null;
  }
  
  const {
    isLoading,
    error,
    siteUrl,
    siteName,
    sharePointHostname,
  } = useCopilotSite(normalizedContainerId);
  
  // Ensure we have valid hostnames and site names
  const safeSharePointHostname = sharePointHostname || appConfig.sharePointHostname;
  const safeSiteName = siteName || 'SharePoint Site';
  
  const handleError = useCallback((errorMessage: string) => {
    console.error('Copilot chat error:', errorMessage);
    toast({
      title: "Copilot error",
      description: errorMessage,
      variant: "destructive",
    });
  }, []);
  
  // Create auth provider for Copilot chat with better error handling
  const authProvider = React.useMemo((): IChatEmbeddedApiAuthProvider => {
    return {
      hostname: safeSharePointHostname,
      getToken: async () => {
        try {
          if (!isAuthenticated) {
            console.error('User not authenticated, cannot get token');
            return '';
          }
          
          console.log('Getting SharePoint token for hostname:', safeSharePointHostname);
          const token = await getSharePointToken(safeSharePointHostname);
          console.log('SharePoint auth token retrieved:', token ? 'successfully' : 'failed');
          
          if (!token) {
            handleError('Failed to get authentication token for SharePoint.');
            return '';
          }
          
          return token;
        } catch (err) {
          console.error('Error getting token for Copilot chat:', err);
          handleError('Failed to authenticate with SharePoint. Please try again.');
          return '';
        }
      }
    };
  }, [safeSharePointHostname, getSharePointToken, handleError, isAuthenticated]);
  
  // Create chat theme config
  const chatTheme = React.useMemo(() => ({
    useDarkMode: false,
    customTheme: {
      themePrimary: '#4854EE',
      themeSecondary: '#4854EE',
      themeDark: '#4854EE',
      themeDarker: '#4854EE',
      themeTertiary: '#4854EE',
      themeLight: '#dddeef',
      themeDarkAlt: '#4854EE',
      themeLighter: '#dddeef',
      themeLighterAlt: '#dddeef',
      themeDarkAltTransparent: '#4854EE',
      themeLighterTransparent: '#dddeef',
      themeLighterAltTransparent: '#dddeef',
      themeMedium: '#4854EE',
      neutralSecondary: '#4854EE',
      neutralSecondaryAlt: '#4854EE',
      neutralTertiary: '#4854EE',
      neutralTertiaryAlt: '#4854EE',
      neutralQuaternary: '#4854EE',
      neutralQuaternaryAlt: '#4854EE',
      neutralPrimaryAlt: '#4854EE',
      neutralDark: '#4854EE',
      themeBackground: 'white',
    }
  }), []);
  
  // Create chat configuration with instruction to ensure prompt visibility
  const chatConfig = React.useMemo((): ChatLaunchConfig => ({
    header: `SharePoint Embedded - ${safeSiteName}`,
    theme: chatTheme,
    instruction: "You are a helpful assistant that helps users find and summarize information related to their files and documents.",
    locale: "en-US",
    // Removed the unsupported properties
  }), [safeSiteName, chatTheme]);
  
  // Reset chat when there's an issue
  const handleResetChat = useCallback(() => {
    console.log('Resetting Copilot chat');
    setChatKey(prev => prev + 1);
    setChatApi(null);
    setIsOpen(false);
    setTimeout(() => {
      setIsOpen(true);
    }, 500);
  }, []);
  
  // Handles API ready event from ChatEmbedded component
  const handleApiReady = useCallback((api: ChatEmbeddedAPI) => {
    if (!api) {
      console.error('Chat API is undefined');
      handleError('Chat API initialization failed');
      return;
    }
    
    console.log('Copilot chat API is ready');
    setChatApi(api);
  }, [handleError]);

  return (
    <CopilotDesktopView
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      siteName={safeSiteName}
      isLoading={isLoading}
      error={error}
      containerId={normalizedContainerId}
      onError={handleError}
      chatConfig={chatConfig}
      authProvider={authProvider}
      onApiReady={handleApiReady}
      chatKey={chatKey}
      onResetChat={handleResetChat}
      isAuthenticated={isAuthenticated}
      chatApi={chatApi}
    />
  );
};

export default CopilotChatContainer;
