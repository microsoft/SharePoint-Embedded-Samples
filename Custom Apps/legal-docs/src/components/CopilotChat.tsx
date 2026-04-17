import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCopilotSite } from "@/hooks/useCopilotSite";
import { CopilotAuthProvider, IChatEmbeddedApiAuthProvider } from "@/components/copilot/CopilotAuthProvider";
import { APP_CONFIG, COPILOT_CONFIG } from "@/config/appConfig";
import { Button } from "@/components/ui/button";

// Import SDK types
import type { 
  ChatEmbeddedAPI, 
  ChatLaunchConfig 
} from "@microsoft/sharepointembedded-copilotchat-react";
import { ChatEmbedded } from "@microsoft/sharepointembedded-copilotchat-react";

interface CopilotChatProps {
  containerId: string;
  isOpen: boolean;
  onClose: () => void;
}

type ChatStatus = 'initializing' | 'ready' | 'error' | 'timeout';

/**
 * CopilotChat - Main chat modal component
 * 
 * Features:
 * - Creates CopilotAuthProvider instance with SharePoint hostname
 * - Configures ChatLaunchConfig with header, instruction, locale, suggestedPrompts
 * - Renders ChatEmbedded component from Microsoft SDK
 * - Handles loading states, errors, and timeout detection
 * - Modern slide-in panel UI with close button
 */
export default function CopilotChat({ containerId, isOpen, onClose }: CopilotChatProps) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const { containerName, isLoading: siteLoading, error: siteError } = useCopilotSite(containerId);
  
  const [status, setStatus] = useState<ChatStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mountKey, setMountKey] = useState(0);
  
  const chatApiRef = useRef<ChatEmbeddedAPI | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create auth provider instance
  const authProvider = useMemo<IChatEmbeddedApiAuthProvider>(() => 
    new CopilotAuthProvider(getAccessToken),
    [getAccessToken]
  );

  // Chat launch configuration - must include zeroQueryPrompts for SDK to render UI
  const chatConfig = useMemo<ChatLaunchConfig>(() => ({
    header: containerName || COPILOT_CONFIG.header,
    instruction: COPILOT_CONFIG.instruction,
    locale: COPILOT_CONFIG.locale,
    zeroQueryPrompts: {
      headerText: "How can I help you with this case?",
      promptSuggestionList: COPILOT_CONFIG.suggestedPrompts.map(text => ({ 
        suggestionText: text 
      })),
    },
    chatInputPlaceholder: COPILOT_CONFIG.chatInputPlaceholder,
  }), [containerName]);

  // Reset state when container changes
  useEffect(() => {
    setStatus('initializing');
    setErrorMessage(null);
    setMountKey(prev => prev + 1);
  }, [containerId]);

  // Initialize chat when API is ready
  const initializeCopilotChat = useCallback(async (api: ChatEmbeddedAPI) => {
    console.log("🚀 Copilot API ready, initializing chat...");
    chatApiRef.current = api;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Open the chat with configuration
      await api.openChat(chatConfig);
      
      console.log("✅ Copilot chat opened successfully");
      setStatus('ready');
    } catch (error) {
      console.error("❌ Failed to open Copilot chat:", error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize chat');
    }
  }, [chatConfig]);

  // Handle SDK API ready event
  const handleApiReady = useCallback((api: ChatEmbeddedAPI) => {
    console.log("📡 ChatEmbedded onApiReady fired");
    initializeCopilotChat(api);
  }, [initializeCopilotChat]);

  // Set up timeout detection
  useEffect(() => {
    if (!isOpen || status !== 'initializing') return;

    timeoutRef.current = setTimeout(() => {
      if (status === 'initializing') {
        console.warn("⏰ Copilot initialization timeout");
        setStatus('timeout');
        setErrorMessage('Chat initialization timed out. This may be due to CSP restrictions.');
      }
    }, 15000); // 15 second timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, status]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setStatus('initializing');
    setErrorMessage(null);
    setMountKey(prev => prev + 1);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  const showLoading = status === 'initializing' || siteLoading;
  const showError = status === 'error' || status === 'timeout' || !!siteError;

  return (
    <div 
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-[420px] max-w-full",
        "bg-background border-l border-border shadow-2xl",
        "flex flex-col transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <h2 className="font-semibold text-base">AI Assistant</h2>
          {containerName && (
            <p className="text-xs text-muted-foreground">{containerName}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {/* Loading State */}
        {showLoading && !showError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {siteLoading ? 'Loading container...' : 'Starting Copilot...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {showError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-background z-10">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-2">
              <h3 className="font-medium">Unable to Load Chat</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {siteError || errorMessage || 'An error occurred while loading the chat.'}
              </p>
              {status === 'timeout' && (
                <p className="text-xs text-muted-foreground">
                  Ensure your published URL is whitelisted in SharePoint admin.
                </p>
              )}
            </div>
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* SDK ChatEmbedded Component */}
        {isAuthenticated && containerId && !siteError && (
          <div className={cn(
            "h-full w-full",
            showLoading && "opacity-0"
          )}>
            <ChatEmbedded
              key={mountKey}
              authProvider={authProvider}
              containerId={containerId}
              onApiReady={handleApiReady}
            />
          </div>
        )}
      </div>
    </div>
  );
}
