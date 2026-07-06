
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CustomDrawer, 
  CustomDrawerContent, 
  CustomDrawerTrigger, 
  CustomDrawerTitle 
} from '@/components/ui/custom-drawer';
import { MessageSquare, ExternalLink, Monitor } from 'lucide-react';

interface CopilotMobileViewProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  siteName: string | null;
  isLoading: boolean;
  error: string | null;
  openExternalChat: (() => void) | null;
}

const CopilotMobileView: React.FC<CopilotMobileViewProps> = ({
  isOpen,
  setIsOpen,
  siteName,
  isLoading,
  error,
  openExternalChat,
}) => {
  return (
    <CustomDrawer open={isOpen} onOpenChange={setIsOpen}>
      <CustomDrawerTrigger asChild>
        <Button variant="outline" className="gap-2 flex items-center">
          <MessageSquare size={16} />
          <span>Copilot Chat</span>
        </Button>
      </CustomDrawerTrigger>
      <CustomDrawerContent 
        className="flex flex-col h-[80vh] max-h-[90vh]" 
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        <div className="p-4 border-b">
          <CustomDrawerTitle className="text-lg font-semibold">
            SharePoint Embedded Copilot
          </CustomDrawerTitle>
        </div>
        <div className="flex-shrink-0 px-6 py-2">
          {siteName && <p className="text-sm text-muted-foreground">Connected to: {siteName}</p>}
        </div>
        <div className="flex-1 min-h-0 p-6 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-destructive text-center p-4">
              <p>Could not load Copilot Chat: {error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="text-center space-y-2">
                <Monitor size={48} className="mx-auto text-primary opacity-70" />
                <h3 className="text-xl font-medium mt-4">Desktop View Recommended</h3>
                <p className="text-center text-muted-foreground">For the best experience with Copilot Chat, please use a desktop device or switch to desktop view on your browser.</p>
              </div>
              {openExternalChat && (
                <Button onClick={openExternalChat} className="gap-2">
                  <ExternalLink size={16} />
                  <span>Open Chat</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CustomDrawerContent>
    </CustomDrawer>
  );
};

export default CopilotMobileView;
