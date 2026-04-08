import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, MessageSquare, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CopilotAuthProvider } from "@/components/copilot/CopilotAuthProvider";
import { CopilotErrorBoundary } from "./CopilotErrorBoundary";
import { ChatEmbedded, ChatEmbeddedAPI, ChatLaunchConfig } from "@microsoft/sharepointembedded-copilotchat-react";

interface SDKCopilotChatProps {
  containerId: string;
  containerName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * SharePoint Embedded Copilot Chat using the official SDK.
 * 
 * Prerequisites:
 * 1. Install SDK: npm install @microsoft/sharepointembedded-copilotchat-react
 * 2. Configure CopilotEmbeddedChatHosts via PowerShell
 * 3. Set DiscoverabilityDisabled to false
 * 
 * Reference: https://learn.microsoft.com/en-us/sharepoint/dev/embedded/development/declarative-agent/spe-da-adv
 */
export default function SDKCopilotChat({
  containerId,
  containerName,
  isOpen,
  onClose,
}: SDKCopilotChatProps) {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatApi, setChatApi] = useState<ChatEmbeddedAPI | null>(null);
  const [sdkAvailable, setSdkAvailable] = useState(false);

  // Create auth provider with Container.Selected scope
  const authProvider = useMemo(
    () => new CopilotAuthProvider(getAccessToken),
    [getAccessToken]
  );

  // SDK is now statically imported, mark as available
  useEffect(() => {
    setSdkAvailable(true);
    console.log("SDKCopilotChat: SDK is available");
  }, []);

  // Initialize auth provider when opened
  useEffect(() => {
    if (!isOpen || !containerId || !sdkAvailable) return;

    const initAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await authProvider.initialize();
        console.log("SDKCopilotChat: Auth provider initialized");
        setIsLoading(false);
      } catch (err) {
        console.error("SDKCopilotChat: Auth initialization failed", err);
        setError("Authentication failed. Please try again.");
        setIsLoading(false);
      }
    };

    // Set timeout for initialization
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError(
          "The SharePoint Embedded Copilot chat is not responding.\n\n" +
          "Possible causes:\n" +
          "• CopilotEmbeddedChatHosts not configured\n" +
          "• DiscoverabilityDisabled is true\n" +
          "• Copilot not enabled for your tenant"
        );
        setIsLoading(false);
      }
    }, 15000);

    initAuth();

    return () => clearTimeout(timeout);
  }, [isOpen, containerId, sdkAvailable, authProvider]);

  // Open chat when API is ready
  useEffect(() => {
    if (!chatApi) return;

    const openChat = async () => {
      try {
        await chatApi.openChat({
          header: `Case Assistant - ${containerName}`,
          zeroQueryPrompts: {
            headerText: "How can I help you with this case?",
            promptSuggestionList: [
              { suggestionText: "Summarize the key facts of this case" },
              { suggestionText: "Who are the parties involved?" },
              { suggestionText: "What are the important dates?" },
              { suggestionText: "List the key documents" },
            ],
          },
          instruction:
            "You are a legal case assistant. Provide clear, professional responses based on the case documents.",
          locale: "en",
        });
        console.log("SDKCopilotChat: Chat opened successfully");
      } catch (err) {
        console.error("SDKCopilotChat: Failed to open chat", err);
        setError("Failed to open chat interface");
      }
    };

    openChat();
  }, [chatApi, containerName]);

  const handleApiReady = useCallback((api: ChatEmbeddedAPI) => {
    console.log("SDKCopilotChat: API ready");
    setChatApi(api);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setChatApi(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[80vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Copilot Assistant</h3>
              <p className="text-xs text-muted-foreground">{containerName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h4 className="font-semibold mb-2">Copilot Unavailable</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-6 max-w-md">
                {error}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Initializing Copilot...</p>
              <p className="text-xs text-muted-foreground mt-1">Connecting to Microsoft services</p>
            </div>
          ) : sdkAvailable ? (
            <CopilotErrorBoundary onRetry={handleRetry} onClose={onClose}>
              <div className="w-full h-full" id="copilot-chat-container">
                <ChatEmbedded
                  onApiReady={handleApiReady}
                  authProvider={authProvider}
                  containerId={containerId}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </CopilotErrorBoundary>
          ) : null}
        </div>

        {/* Footer status */}
        {!error && !isLoading && (
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Copilot Active</span>
          </div>
        )}
      </div>
    </div>
  );
}
