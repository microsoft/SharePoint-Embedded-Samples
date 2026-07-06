
import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';

interface FilePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  previewLoading: boolean;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  previewUrl,
  previewLoading,
}) => {
  console.log('FilePreviewDialog rendering:', { isOpen, previewUrl, previewLoading });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen min-h-screen w-screen p-0 gap-0">
        <DialogTitle className="sr-only">File Preview</DialogTitle>
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex-1">
            {previewUrl && (
              <Button 
                variant="outline" 
                onClick={() => window.open(previewUrl, '_blank')}
                className="w-auto"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 h-[calc(100vh-4rem)] w-full">
          {previewLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="File Preview"
              aria-describedby="file-preview-description"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            ></iframe>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Preview not available
            </div>
          )}
        </div>
        <div id="file-preview-description" className="sr-only">
          File preview iframe displaying the selected document
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
