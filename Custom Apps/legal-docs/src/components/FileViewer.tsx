import { SharePointFile, getFilePreviewUrl } from "@/services/sharepoint";
import { X, ExternalLink, Loader2, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

function isOfficeFile(file: SharePointFile): boolean {
  const mimeType = file.file?.mimeType || "";
  const name = file.name.toLowerCase();
  
  const officeExtensions = [".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".one", ".vsdx"];
  const officeMimeTypes = ["word", "excel", "powerpoint", "onenote", "visio", "officedocument"];
  
  if (officeExtensions.some(ext => name.endsWith(ext))) {
    return true;
  }
  
  if (officeMimeTypes.some(type => mimeType.includes(type))) {
    return true;
  }
  
  return false;
}

interface FileViewerProps {
  file: SharePointFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FileViewer({ file, isOpen, onClose }: FileViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [width, setWidth] = useState(500);
  const { getAccessToken } = useAuth();
  const isResizing = useRef(false);

  useEffect(() => {
    async function fetchPreviewUrl() {
      if (!file || !isOpen) {
        setPreviewUrl(null);
        return;
      }

      const driveId = file.parentReference?.driveId;
      if (!driveId) {
        console.error("No driveId available for file");
        setPreviewUrl(null);
        return;
      }

      setIsLoading(true);
      try {
        const token = await getAccessToken(["Files.Read.All"]);
        if (token) {
          const url = await getFilePreviewUrl(token, driveId, file.id);
          setPreviewUrl(url);
        }
      } catch (error) {
        console.error("Failed to get preview URL:", error);
        setPreviewUrl(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreviewUrl();
  }, [file, isOpen, getAccessToken]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.9)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleResizeStart = () => {
    isResizing.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  if (!file || !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full bg-background border-l shadow-xl z-50 flex animate-slide-in-right"
        style={{ width: `${width}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 flex items-center justify-center group"
          onMouseDown={handleResizeStart}
        >
          <GripVertical className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex flex-col w-full">
          {/* Header */}
          <div className="px-4 py-3 border-b flex-shrink-0 flex items-center justify-between">
            <h2 className="text-base font-medium truncate pr-4">
              {file.name}
            </h2>
            <div className="flex items-center gap-1">
              {isOfficeFile(file) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => window.open(file.webUrl, "_blank")}
                  title="Edit in Office Online"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit in Office
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(file.webUrl, "_blank")}
                title="Open in SharePoint"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-hidden bg-muted/30">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={file.name}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open(file.webUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in SharePoint
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
