
import React from 'react';
import { ChevronUp, ChevronDown, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ApiCall {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  request?: any;
  response?: any;
  status?: number;
}

interface DevModePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  apiCalls: ApiCall[];
}

export const DevModePanel: React.FC<DevModePanelProps> = ({
  isOpen,
  onToggle,
  apiCalls
}) => {
  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <Button
          variant="ghost"
          onClick={onToggle}
          className="w-full justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="font-semibold">Dev Mode - API Calls ({apiCalls.length})</span>
          </div>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ height: '60vh' }}>
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={0} minSize={0} maxSize={80} className="bg-transparent">
          {/* Empty transparent panel for height adjustment */}
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-border" />
        
        <ResizablePanel defaultSize={100} minSize={20} className="bg-background">
          <div className="h-full flex flex-col border-t shadow-lg">
            <Button
              variant="ghost"
              onClick={onToggle}
              className="w-full justify-between p-4 h-auto border-b"
            >
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span className="font-semibold">Dev Mode - API Calls ({apiCalls.length})</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {apiCalls.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No API calls recorded yet
                    </p>
                  ) : (
                    <Accordion type="multiple" className="space-y-2">
                      {apiCalls.map((call) => (
                        <AccordionItem key={call.id} value={call.id} className="border rounded-lg">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex flex-col items-start gap-2 w-full">
                              <div className="text-left w-full">
                                <span className="text-sm font-medium text-foreground">
                                  {call.url}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 w-full">
                                <span className="font-mono text-sm bg-muted px-2 py-1 rounded font-semibold">
                                  {call.method}
                                </span>
                                {call.status && (
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    call.status >= 200 && call.status < 300
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {call.status}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {call.timestamp}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent className="px-4 pb-4">
                            <Separator className="mb-4" />
                            
                            <div className="space-y-4">
                              {call.request && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96 min-h-32">
                                    {JSON.stringify(call.request, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {call.response && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Response</h4>
                                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96 min-h-32">
                                    {JSON.stringify(call.response, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
