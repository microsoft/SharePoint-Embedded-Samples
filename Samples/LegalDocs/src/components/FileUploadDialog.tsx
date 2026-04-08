import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileIcon, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error" | "duplicate";
  error?: string;
}

interface DuplicateFile {
  file: File;
  existingFileName: string;
}

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFiles: (
    files: File[],
    conflictBehavior: "replace" | "rename"
  ) => Promise<{ duplicates: string[] }>;
  isUploading: boolean;
  uploadProgress: Map<string, number>;
  uploadStatus: Map<string, "pending" | "uploading" | "success" | "error">;
}

export default function FileUploadDialog({
  isOpen,
  onClose,
  onUploadFiles,
  isUploading,
  uploadProgress,
  uploadStatus,
}: FileUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState<DuplicateFile[]>([]);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    const result = await onUploadFiles(selectedFiles, "rename");
    
    if (result.duplicates.length > 0) {
      const dupes = selectedFiles
        .filter((f) => result.duplicates.includes(f.name))
        .map((f) => ({ file: f, existingFileName: f.name }));
      setDuplicateFiles(dupes);
      setShowDuplicatePrompt(true);
    }
  }, [selectedFiles, onUploadFiles]);

  const handleDuplicateAction = useCallback(
    async (action: "replace" | "keep-both") => {
      const filesToUpload = duplicateFiles.map((d) => d.file);
      await onUploadFiles(filesToUpload, action === "replace" ? "replace" : "rename");
      setShowDuplicatePrompt(false);
      setDuplicateFiles([]);
    },
    [duplicateFiles, onUploadFiles]
  );

  const handleClose = useCallback(() => {
    if (!isUploading) {
      setSelectedFiles([]);
      setDuplicateFiles([]);
      setShowDuplicatePrompt(false);
      onClose();
    }
  }, [isUploading, onClose]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const allUploadsComplete = selectedFiles.length > 0 && 
    selectedFiles.every((f) => uploadStatus.get(f.name) === "success");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files here or click to browse
          </DialogDescription>
        </DialogHeader>

        {showDuplicatePrompt ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                {duplicateFiles.length === 1
                  ? `"${duplicateFiles[0].existingFileName}" already exists.`
                  : `${duplicateFiles.length} files already exist.`}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleDuplicateAction("keep-both")}
              >
                Keep Both
              </Button>
              <Button onClick={() => handleDuplicateAction("replace")}>
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "pointer-events-none opacity-60"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or{" "}
                <span className="text-primary font-medium">browse</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const progress = uploadProgress.get(file.name) ?? 0;
                  const status = uploadStatus.get(file.name) ?? "pending";

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <FileIcon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        {status === "uploading" && (
                          <Progress value={progress} className="h-1.5 mt-1" />
                        )}
                      </div>
                      {status === "success" ? (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      ) : (
                        !isUploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(index);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {allUploadsComplete ? "Close" : "Cancel"}
              </Button>
              {!allUploadsComplete && (
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
