import { useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import CopilotChat from "@/components/CopilotChat";
import { useToast } from "@/hooks/use-toast";

interface FloatingCopilotIconProps {
  containerId: string | null;
  containerName?: string;
}

/**
 * FloatingCopilotIcon - Floating action button for Copilot chat
 * 
 * Features:
 * - Fixed position at bottom-right corner
 * - Checks authentication before opening chat
 * - Validates a container is selected
 * - Opens CopilotChat modal on click
 */
export default function FloatingCopilotIcon({ containerId, containerName }: FloatingCopilotIconProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    if (!containerId) {
      toast({
        title: "No Case Selected",
        description: "Please select a case to use the AI Assistant.",
        variant: "destructive",
      });
      return;
    }

    setIsOpen(true);
  }, [isAuthenticated, containerId, toast]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Only show if authenticated
  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={handleClick}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95",
          !containerId && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Open AI Assistant"
        disabled={!containerId}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Chat Panel */}
      {containerId && (
        <CopilotChat
          containerId={containerId}
          isOpen={isOpen}
          onClose={handleClose}
        />
      )}
    </>
  );
}
