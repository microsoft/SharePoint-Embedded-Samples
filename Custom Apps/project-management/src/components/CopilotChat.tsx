
import React, { useEffect, useState } from 'react';
import CopilotChatContainer from './copilot/CopilotChatContainer';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface CopilotChatProps {
  containerId: string;
  className?: string;
}

const CopilotChat: React.FC<CopilotChatProps> = ({ containerId, className }) => {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [errorShown, setErrorShown] = useState(false);
  
  useEffect(() => {
    if (!containerId || typeof containerId !== 'string') {
      const errorMsg = 'CopilotChat: No valid containerId provided';
      console.error(errorMsg);
      
      // Only show toast once to avoid spamming
      if (!errorShown) {
        setErrorShown(true);
        toast({
          title: "Copilot Error",
          description: "No valid container ID provided. Copilot chat cannot load.",
          variant: "destructive",
        });
      }
      return;
    }
    
    console.log('CopilotChat initialized with containerId:', containerId);
    setErrorShown(false);
  }, [containerId, errorShown]);

  // Add error boundary via window.addEventListener
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message && event.error.message.includes('Cannot read properties of undefined')) {
        console.error('Caught SharePoint Embedded error:', event.error);
        if (!errorShown) {
          setErrorShown(true);
          toast({
            title: "Copilot Error",
            description: "An error occurred while loading the chat component. Please try refreshing.",
            variant: "destructive",
          });
        }
        event.preventDefault(); // Prevent default browser error handling
      }
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [errorShown]);
  
  // Early return if no containerId is provided
  if (!containerId || typeof containerId !== 'string') {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded-md">
        Error: No valid containerId provided for Copilot Chat
      </div>
    );
  }
  
  // Don't render on mobile devices
  if (isMobile) {
    return null;
  }
  
  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className={`copilot-wrapper h-full flex flex-col ${className || ''}`} data-testid="copilot-chat-wrapper">
      <CopilotChatContainer containerId={containerId} />
    </div>
  );
};

export default CopilotChat;
