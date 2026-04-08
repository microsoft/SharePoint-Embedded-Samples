import { useState, useCallback } from "react";
import { FolderNode } from "@/hooks/useFolders";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  isSelected: boolean;
  onSelect: (folder: FolderNode) => void;
  onLoadChildren: (folderId: string) => Promise<FolderNode[]>;
  onUpdateFolder: (folderId: string, updates: Partial<FolderNode>) => void;
}

function FolderTreeItem({
  folder,
  level,
  isSelected,
  onSelect,
  onLoadChildren,
  onUpdateFolder,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isExpanded && !folder.isLoaded && folder.childCount > 0) {
      onUpdateFolder(folder.id, { isLoading: true });
      try {
        const children = await onLoadChildren(folder.id);
        onUpdateFolder(folder.id, { 
          children, 
          isLoaded: true, 
          isLoading: false 
        });
      } catch {
        onUpdateFolder(folder.id, { isLoading: false });
      }
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, folder.id, folder.isLoaded, folder.childCount, onLoadChildren, onUpdateFolder]);

  const hasChildren = folder.childCount > 0 || folder.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(folder)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted-foreground/10 rounded"
          >
            {folder.isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-legal-gold flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-legal-gold flex-shrink-0" />
        )}
        
        <span className="truncate">{folder.name}</span>
      </button>

      {isExpanded && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
              onUpdateFolder={onUpdateFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folder: FolderNode) => void;
  onLoadChildren: (folderId: string) => Promise<FolderNode[]>;
  onUpdateFolder: (folderId: string, updates: Partial<FolderNode>) => void;
  isLoading?: boolean;
}

export default function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onLoadChildren,
  onUpdateFolder,
  isLoading,
}: FolderTreeProps) {
  if (isLoading) {
    return (
      <div className="py-2 text-sm text-muted-foreground flex items-center gap-2 px-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading folders...
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="py-2 text-sm text-muted-foreground px-2">
        No folders found
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {folders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          level={0}
          isSelected={selectedFolderId === folder.id}
          onSelect={onSelectFolder}
          onLoadChildren={onLoadChildren}
          onUpdateFolder={onUpdateFolder}
        />
      ))}
    </div>
  );
}
