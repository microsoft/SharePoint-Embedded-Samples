
import React, { useState } from 'react';
import { FilePlus, Folder, FileText, MoreHorizontal, Trash2, ExternalLink, Share, Pencil, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { FileItem } from '@/services/sharePointService';
import EmptyState from './EmptyState';
import ShareDialog from './ShareDialog';

interface FileListProps {
  files: FileItem[];
  loading: boolean;
  onFolderClick: (item: FileItem) => void;
  onFileClick: (item: FileItem) => void;
  onViewFile?: (item: FileItem) => void;
  onDeleteFile?: (item: FileItem) => void;
  containerId: string;
}

const FileList: React.FC<FileListProps> = ({
  files,
  loading,
  onFolderClick,
  onFileClick,
  onViewFile,
  onDeleteFile,
  containerId
}) => {
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Unknown Date';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleShareClick = (file: FileItem) => {
    setShareFile(file);
    setIsShareDialogOpen(true);
  };
  
  // Helper function to determine if a file is an Office document
  const isOfficeDocument = (fileName: string): boolean => {
    const officeExtensions = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.one'];
    const lowerFileName = fileName.toLowerCase();
    return officeExtensions.some(ext => lowerFileName.endsWith(ext));
  };
  
  // Function to handle edit button click
  const handleEditClick = (item: FileItem) => {
    // Open the file in the respective Office app for editing
    if (item.webUrl) {
      window.open(item.webUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-2">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return <EmptyState onUploadClick={() => {
      console.log("Upload button clicked in EmptyState");
    }} />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Modified</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="hidden md:table-cell">Created By</TableHead>
            <TableHead className="hidden md:table-cell">Size/Items</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50 group">
              <TableCell className="font-medium cursor-pointer" onClick={() => {
                if (item.isFolder) {
                  onFolderClick(item);
                } else {
                  onFileClick(item);
                }
              }}>
                <div className="flex items-center gap-2">
                  {item.isFolder ? (
                    <Folder className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="truncate max-w-[180px] md:max-w-md lg:max-w-lg">
                    {item.name}
                  </span>
                </div>
              </TableCell>
              
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {formatDate(item.lastModifiedDateTime)}
              </TableCell>
            
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {formatDate(item.createdDateTime || '')}
              </TableCell>
              
              <TableCell className="hidden md:table-cell text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{item.createdByName || 'Unknown'}</span>
                </div>
              </TableCell>
              
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {item.isFolder ? 
                  `${item.childCount || 0} item${item.childCount !== 1 ? 's' : ''}` : 
                  formatSize(item.size)}
              </TableCell>
              
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!item.isFolder && onViewFile && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onViewFile(item);
                      }}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View File
                      </DropdownMenuItem>
                    )}
                    {!item.isFolder && isOfficeDocument(item.name) && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(item);
                      }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit in Office
                      </DropdownMenuItem>
                    )}
                    {!item.isFolder && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick(item);
                      }}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    )}
                    {onDeleteFile && (
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(item);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        file={shareFile}
        containerId={containerId}
        onShareComplete={() => {
          // Optional callback when sharing is complete
        }}
      />
    </>
  );
};

export default FileList;
