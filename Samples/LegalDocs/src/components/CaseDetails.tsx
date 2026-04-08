import { useEffect, useState, useCallback } from "react";
import { 
  SharePointContainer, 
  SharePointFile,
  createFolder, 
  createEmptyFile, 
  uploadFile, 
  checkFileExists 
} from "@/services/sharepoint";
import { FolderNode } from "@/hooks/useFolders";
import { useFiles } from "@/hooks/useFiles";
import { useAuth } from "@/context/AuthContext";
import { 
  Folder, 
  Home, 
  Upload, 
  ChevronRight,
  ChevronDown,
  FolderPlus,
  FilePlus,
  Plus,
  Eye,
  Pencil,
  Share2,
  FileText,
  Download,
  Trash2,
  File,
  FolderUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileGrid from "@/components/FileGrid";
import NewFolderDialog from "@/components/NewFolderDialog";
import NewDocumentDialog from "@/components/NewDocumentDialog";
import FileUploadDialog from "@/components/FileUploadDialog";
import { toast } from "sonner";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface CaseDetailsProps {
  container: SharePointContainer;
  selectedFolder: FolderNode | null;
  onFolderCreated?: () => void;
}

export default function CaseDetails({ container, selectedFolder, onFolderCreated }: CaseDetailsProps) {
  const { getAccessToken } = useAuth();
  const { files, isLoading, loadFolderContents } = useFiles(container?.id || null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isNewDocumentDialogOpen, setIsNewDocumentDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [uploadStatus, setUploadStatus] = useState<Map<string, "pending" | "uploading" | "success" | "error">>(new Map());
  const [selectedFiles, setSelectedFiles] = useState<SharePointFile[]>([]);

  const hasSelectedFiles = selectedFiles.length > 0;

  // Reset when selected folder changes from sidebar
  useEffect(() => {
    if (selectedFolder) {
      setCurrentFolderId(selectedFolder.id);
      setBreadcrumbs([{ id: selectedFolder.id, name: selectedFolder.name }]);
    }
  }, [selectedFolder]);

  // Load folder contents when currentFolderId changes
  useEffect(() => {
    if (container?.id && currentFolderId) {
      loadFolderContents(currentFolderId);
    }
  }, [container?.id, currentFolderId, loadFolderContents]);

  const handleFolderClick = useCallback((folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index < breadcrumbs.length - 1) {
      const targetCrumb = breadcrumbs[index];
      setCurrentFolderId(targetCrumb.id);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  const handleHomeClick = useCallback(() => {
    if (selectedFolder) {
      setCurrentFolderId(selectedFolder.id);
      setBreadcrumbs([{ id: selectedFolder.id, name: selectedFolder.name }]);
    }
  }, [selectedFolder]);

  const handleCreateFolder = useCallback(async (folderName: string) => {
    if (!container?.id) return;
    
    setIsCreating(true);
    try {
      const accessToken = await getAccessToken(["FileStorageContainer.Selected"]);
      if (!accessToken) {
        toast.error("Failed to get access token");
        return;
      }

      const newFolder = await createFolder(
        accessToken,
        container.id,
        currentFolderId,
        folderName
      );

      toast.success(`Folder "${folderName}" created successfully`);
      setIsNewFolderDialogOpen(false);
      
      // Navigate to the newly created folder
      setCurrentFolderId(newFolder.id);
      setBreadcrumbs(prev => [...prev, { id: newFolder.id, name: newFolder.name }]);
      
      // Trigger refresh of the sidebar folder tree
      onFolderCreated?.();
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  }, [container?.id, currentFolderId, getAccessToken, onFolderCreated]);

  const handleCreateFile = useCallback(async (fileName: string, extension: string) => {
    if (!container?.id) return;
    
    setIsCreating(true);
    try {
      const accessToken = await getAccessToken(["FileStorageContainer.Selected"]);
      if (!accessToken) {
        toast.error("Failed to get access token");
        return;
      }

      const fullFileName = `${fileName}.${extension}`;
      await createEmptyFile(
        accessToken,
        container.id,
        currentFolderId,
        fullFileName
      );

      toast.success(`File "${fullFileName}" created successfully`);
      setIsNewDocumentDialogOpen(false);
      
      // Refresh the folder contents to show the new file
      if (currentFolderId) {
        loadFolderContents(currentFolderId);
      }
    } catch (error) {
      console.error("Failed to create file:", error);
      toast.error("Failed to create file");
    } finally {
      setIsCreating(false);
    }
  }, [container?.id, currentFolderId, getAccessToken, loadFolderContents]);

  const handleUploadFiles = useCallback(async (
    files: File[],
    conflictBehavior: "replace" | "rename"
  ): Promise<{ duplicates: string[] }> => {
    if (!container?.id) return { duplicates: [] };
    
    const accessToken = await getAccessToken(["FileStorageContainer.Selected"]);
    if (!accessToken) {
      toast.error("Failed to get access token");
      return { duplicates: [] };
    }

    // Check for duplicates first
    const duplicates: string[] = [];
    for (const file of files) {
      try {
        const exists = await checkFileExists(
          accessToken,
          container.id,
          currentFolderId,
          file.name
        );
        if (exists) {
          duplicates.push(file.name);
        }
      } catch {
        // File doesn't exist, which is fine
      }
    }

    // If there are duplicates and we're not replacing, return them for user decision
    if (duplicates.length > 0 && conflictBehavior === "rename") {
      // Only return duplicates without uploading
      return { duplicates };
    }

    setIsUploading(true);
    
    // Initialize progress and status for all files
    const initialProgress = new Map<string, number>();
    const initialStatus = new Map<string, "pending" | "uploading" | "success" | "error">();
    files.forEach(file => {
      initialProgress.set(file.name, 0);
      initialStatus.set(file.name, "pending");
    });
    setUploadProgress(initialProgress);
    setUploadStatus(initialStatus);

    // Upload files
    for (const file of files) {
      setUploadStatus(prev => new Map(prev).set(file.name, "uploading"));
      
      try {
        await uploadFile(
          accessToken,
          container.id,
          currentFolderId,
          file,
          conflictBehavior,
          (fileName, progress) => {
            setUploadProgress(prev => new Map(prev).set(fileName, progress));
          }
        );
        
        setUploadStatus(prev => new Map(prev).set(file.name, "success"));
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        setUploadStatus(prev => new Map(prev).set(file.name, "error"));
      }
    }

    setIsUploading(false);
    
    // Refresh folder contents
    if (currentFolderId) {
      loadFolderContents(currentFolderId);
    }
    
    const successCount = Array.from(uploadStatus.values()).filter(s => s === "success").length;
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
    }

    return { duplicates: [] };
  }, [container?.id, currentFolderId, getAccessToken, loadFolderContents, uploadStatus]);

  if (!container) {
    return null;
  }

  const lastUpdated = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const currentFolderName = breadcrumbs.length > 0 
    ? breadcrumbs[breadcrumbs.length - 1].name 
    : selectedFolder?.name || "Root";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Folder className="w-5 h-5 text-legal-gold" />
          <span className="font-medium text-foreground">{container.displayName}</span>
          <span>/</span>
          <span className="text-primary">{currentFolderName}</span>
          <span className="ml-auto text-xs">Last Updated {lastUpdated}</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="h-8" onClick={handleHomeClick}>
            <Home className="w-4 h-4 mr-1.5" />
            Home
          </Button>
          
          {/* New Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 bg-primary">
                <Plus className="w-4 h-4 mr-1.5" />
                New
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setIsNewFolderDialogOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewDocumentDialogOpen(true)}>
                <FilePlus className="w-4 h-4 mr-2" />
                New Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upload Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Upload className="w-4 h-4 mr-1.5" />
                Upload
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)}>
                <File className="w-4 h-4 mr-2" />
                Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)}>
                <FolderUp className="w-4 h-4 mr-2" />
                Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Button */}
          <Button variant="ghost" size="sm" className="h-8" disabled={!hasSelectedFiles}>
            <Eye className="w-4 h-4 mr-1.5" />
            View
          </Button>

          {/* Edit Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8" disabled={!hasSelectedFiles}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => {
                if (selectedFiles.length > 0) {
                  window.open(selectedFiles[0].webUrl, "_blank");
                }
              }}>
                Edit Online
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (selectedFiles.length > 0) {
                  // Use odopen protocol for desktop app launch
                  const file = selectedFiles[0];
                  const odOpenUrl = `odopen://open/?fileId=${encodeURIComponent(file.id)}&web=${encodeURIComponent(file.webUrl || "")}`;
                  window.location.href = odOpenUrl;
                }
              }}>
                Edit in Desktop
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Button */}
          <Button variant="ghost" size="sm" className="h-8" disabled={!hasSelectedFiles}>
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>

          {/* Save as PDF Button */}
          <Button variant="ghost" size="sm" className="h-8" disabled={!hasSelectedFiles}>
            <FileText className="w-4 h-4 mr-1.5" />
            Save as PDF
          </Button>

          {/* Download Button */}
          <Button variant="ghost" size="sm" className="h-8" disabled={!hasSelectedFiles}>
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </Button>

          {/* Delete Button */}
          <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" disabled={!hasSelectedFiles}>
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-1 text-sm overflow-x-auto">
        <button 
          className="hover:text-primary transition-colors flex items-center gap-1"
          onClick={handleHomeClick}
        >
          <Home className="w-4 h-4 text-muted-foreground" />
        </button>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id || index} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button 
              className={`hover:text-primary transition-colors ${
                index === breadcrumbs.length - 1 ? "font-medium" : ""
              }`}
              onClick={() => handleBreadcrumbClick(index)}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Content Area */}
      {selectedFolder ? (
        <FileGrid 
          files={files} 
          isLoading={isLoading} 
          folderName={currentFolderName}
          onFolderClick={handleFolderClick}
          selectedFiles={selectedFiles}
          onSelectionChange={setSelectedFiles}
        />
      ) : (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Folder className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Select a folder to view contents</p>
            <p className="text-sm mt-1">Click on a folder in the sidebar</p>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NewFolderDialog
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
        onCreateFolder={handleCreateFolder}
        isCreating={isCreating}
      />

      <NewDocumentDialog
        isOpen={isNewDocumentDialogOpen}
        onClose={() => setIsNewDocumentDialogOpen(false)}
        onCreateFile={handleCreateFile}
        isCreating={isCreating}
      />

      <FileUploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUploadFiles={handleUploadFiles}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        uploadStatus={uploadStatus}
      />
    </div>
  );
}
