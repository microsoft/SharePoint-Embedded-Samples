import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Send, Loader2, Database, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  sendCopilotMessage, 
  createChatAuthProvider, 
  CopilotMessage,
  DEFAULT_CHAT_CONFIG,
  ChatLaunchConfig 
} from "@/services/copilotChat";

interface InlineCopilotChatProps {
  containerId: string;
  containerName: string;
  config?: ChatLaunchConfig;
}

/**
 * Inline Copilot Chat Component
 * 
 * A simplified chat component designed to be embedded inline (not as a floating bubble).
 * Uses the Graph API fallback for document-grounded responses.
 */
export default function InlineCopilotChat({ 
  containerId, 
  containerName, 
  config = DEFAULT_CHAT_CONFIG 
}: InlineCopilotChatProps) {
  const { getAccessToken } = useAuth();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevContainerId = useRef<string | null>(null);

  // Create auth provider following SDK pattern - uses Container.Selected scope
  const authProvider = useMemo(() => 
    createChatAuthProvider(getAccessToken), 
    [getAccessToken]
  );

  // Merged config
  const chatConfig = useMemo(() => ({
    ...DEFAULT_CHAT_CONFIG,
    ...config,
    header: config?.header || containerName,
  }), [config, containerName]);

  // Reset messages and test connection when container changes
  useEffect(() => {
    if (prevContainerId.current !== containerId) {
      prevContainerId.current = containerId;
      setMessages([]);
      setInputValue("");
      setIsConnected(false);
      
      // Test container connection on change
      const testConnection = async () => {
        try {
          await authProvider.getToken();
          setIsConnected(true);
          console.log("Connected to SharePoint container:", containerId);
        } catch (error) {
          console.error("Failed to connect to container:", error);
          setIsConnected(false);
        }
      };
      
      if (containerId) {
        testConnection();
      }
    }
  }, [containerId, authProvider]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: CopilotMessage = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await sendCopilotMessage(
        authProvider,
        containerId,
        containerName,
        text.trim(),
        messages,
        chatConfig
      );

      const assistantMessage: CopilotMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: CopilotMessage = {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [authProvider, containerId, containerName, messages, chatConfig, isLoading]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Don't render if no container is selected
  if (!containerId) return null;

  const zeroQueryPrompts = chatConfig.zeroQueryPrompts || DEFAULT_CHAT_CONFIG.zeroQueryPrompts;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">{chatConfig.header}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Database className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{containerName}</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {zeroQueryPrompts?.headerText}
            </p>
            <div className="space-y-2">
              {zeroQueryPrompts?.promptSuggestionList?.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(prompt.suggestionText)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg 
                           bg-muted hover:bg-muted/80 transition-colors
                           border border-border hover:border-primary/50"
                >
                  {prompt.suggestionText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={chatConfig.chatInputPlaceholder || "Ask about this case..."}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
