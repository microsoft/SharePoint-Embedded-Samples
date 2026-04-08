import { useState, useEffect, useCallback } from "react";
import { SharePointContainer } from "@/services/sharepoint";
import { FolderNode, useFolders } from "@/hooks/useFolders";
import FolderTree from "@/components/FolderTree";
import { Calendar, ChevronDown, ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseAccordionProps {
  container: SharePointContainer;
  isSelected: boolean;
  onSelect: () => void;
  onFolderSelect?: (folder: FolderNode) => void;
  selectedFolderId?: string | null;
  onRefreshFolders?: (refreshFn: () => void) => void;
}

export default function CaseAccordion({
  container,
  isSelected,
  onSelect,
  onFolderSelect,
  selectedFolderId,
  onRefreshFolders,
}: CaseAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    rootFolders, 
    setRootFolders, 
    isLoading, 
    loadRootFolders, 
    loadChildFolders 
  } = useFolders(container.id);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  useEffect(() => {
    if (isExpanded && rootFolders.length === 0) {
      loadRootFolders();
    }
  }, [isExpanded, rootFolders.length, loadRootFolders]);

  // Expose refresh function to parent when this accordion is selected
  useEffect(() => {
    if (isSelected && onRefreshFolders) {
      onRefreshFolders(loadRootFolders);
    }
  }, [isSelected, onRefreshFolders, loadRootFolders]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      onSelect();
    }
  };

  const handleUpdateFolder = useCallback((folderId: string, updates: Partial<FolderNode>) => {
    const updateFolderRecursive = (folders: FolderNode[]): FolderNode[] => {
      return folders.map((folder) => {
        if (folder.id === folderId) {
          return { ...folder, ...updates };
        }
        if (folder.children.length > 0) {
          return {
            ...folder,
            children: updateFolderRecursive(folder.children),
          };
        }
        return folder;
      });
    };

    setRootFolders(updateFolderRecursive(rootFolders));
  }, [rootFolders, setRootFolders]);

  const handleFolderSelect = (folder: FolderNode) => {
    onFolderSelect?.(folder);
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/30"
      )}
    >
      {/* Case Header */}
      <button
        onClick={handleToggle}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {container.displayName}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(container.createdDateTime)}</span>
          </div>
        </div>
      </button>

      {/* Folder Structure */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Folder Structure
          </p>
          
          {/* Root folder */}
          <button
            onClick={() => handleFolderSelect({ 
              id: "root", 
              name: "Root", 
              createdDateTime: container.createdDateTime,
              lastModifiedDateTime: container.createdDateTime,
              childCount: rootFolders.length,
              children: [],
              isLoaded: true,
              isLoading: false,
            })}
            className={cn(
              "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm transition-colors mb-1",
              selectedFolderId === "root"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-foreground"
            )}
          >
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Folder className="w-4 h-4 text-legal-gold" />
            <span>Root</span>
          </button>

          {/* Child folders */}
          <div className="ml-4">
            <FolderTree
              folders={rootFolders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleFolderSelect}
              onLoadChildren={loadChildFolders}
              onUpdateFolder={handleUpdateFolder}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
