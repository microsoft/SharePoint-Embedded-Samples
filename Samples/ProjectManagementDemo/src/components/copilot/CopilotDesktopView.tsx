
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ChatEmbedded, ChatEmbeddedAPI, IChatEmbeddedApiAuthProvider, ChatLaunchConfig } from '@microsoft/sharepointembedded-copilotchat-react';

interface CopilotDesktopViewProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  siteName: string;
  isLoading: boolean;
  error: string | null;
  containerId: string;
  onError: (errorMessage: string) => void;
  chatConfig: ChatLaunchConfig;
  authProvider: IChatEmbeddedApiAuthProvider;
  onApiReady: (api: ChatEmbeddedAPI) => void;
  chatKey: number;
  onResetChat?: () => void;
  isAuthenticated?: boolean;
  chatApi: ChatEmbeddedAPI | null;
}

const CopilotDesktopView: React.FC<CopilotDesktopViewProps> = ({
  isOpen,
  setIsOpen,
  siteName,
  isLoading,
  error,
  containerId,
  onError,
  chatConfig,
  authProvider,
  onApiReady,
  chatKey,
  onResetChat,
  isAuthenticated = true,
  chatApi
}) => {
  // Early return if not authenticated
  if (!isAuthenticated) {
    console.log('CopilotDesktopView: Not rendering because not authenticated');
    return null;
  }
  
  // Open the chat when the component is opened and we have a valid chat API
  useEffect(() => {
    if (isOpen && chatApi) {
      console.log('Component opened, attempting to open chat...', containerId);
      
      const openChatOnOpen = async () => {
        try {
          // Ensure we have required config fields to avoid the undefined error
          if (!chatConfig) {
            console.error('Chat config is undefined or missing required fields');
            onError('Invalid chat configuration');
            return;
          }
          
          // Add a small delay to ensure the container is ready
          setTimeout(async () => {
            try {
              console.log('Opening chat with config:', JSON.stringify({
                header: chatConfig.header,
                locale: chatConfig.locale,
                hasTheme: !!chatConfig.theme,
                containerId
                // Removed references to unsupported properties
              }));
              
              await chatApi.openChat(chatConfig);
              console.log('Chat opened successfully');
            } catch (innerErr) {
              console.error('Error in delayed chat open:', innerErr);
              onError('Failed to load chat interface. Try resetting the chat.');
            }
          }, 300);
        } catch (err) {
          console.error('Error opening chat:', err);
          onError('Failed to load chat interface. Try resetting the chat.');
        }
      };
      
      openChatOnOpen();
    }
  }, [isOpen, chatApi, chatConfig, onError, containerId]);
  
  // Reset chat when requested
  const handleResetChat = () => {
    if (onResetChat) {
      console.log('Force refreshing chat component');
      onResetChat();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {isOpen && (
        <>
          <div className="flex justify-between items-center p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">SharePoint Embedded Copilot</h2>
              <p className="text-sm text-muted-foreground">Connected to: {siteName || 'SharePoint Site'}</p>
            </div>
            {onResetChat && isAuthenticated && (
              <Button onClick={handleResetChat} size="sm" variant="ghost" className="gap-1">
                <RefreshCw size={14} />
                <span className="sr-only md:not-sr-only md:inline-block">Refresh</span>
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <p className="text-destructive mb-4">
                  {error || "Unable to load the chat. Please try again."}
                </p>
                {onResetChat && (
                  <Button onClick={handleResetChat} variant="outline" className="gap-2">
                    <RefreshCw size={16} />
                    <span>Reset Chat</span>
                  </Button>
                )}
              </div>
            ) : (
              <div 
                className="h-full w-full"
                style={{ 
                  height: '100%',
                  position: "relative"
                }}
                data-testid="copilot-chat-container"
              >
                <ChatEmbedded
                  key={`chat-${chatKey}`}
                  containerId={containerId}
                  authProvider={authProvider}
                  onApiReady={onApiReady}
                  style={{ 
                    height: '100%',
                    width: '100%',
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CopilotDesktopView;
