
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { sharePointService } from '../services/sharePointService';
import { FileItem } from '@/services/sharePointService';
import { toast } from '@/hooks/use-toast';
import { useApiCalls } from '../context/ApiCallsContext';

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const useFiles = (containerId: string | undefined) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<BreadcrumbItem[]>([
    { id: '', name: 'Root' }
  ]);
  const { isAuthenticated, getAccessToken } = useAuth();
  const { addApiCall } = useApiCalls();

  // Improved container ID normalization for SharePoint site IDs
  const normalizeContainerId = useCallback((id: string) => {
    if (!id) return '';
    
    console.log('Original container ID:', id);
    
    // If it's a SharePoint site ID format (contains commas), use it as-is
    // SharePoint site IDs have the format: tenant.sharepoint.com,siteId,webId
    if (id.includes(',')) {
      console.log('Using SharePoint site ID format as-is:', id);
      return id;
    }
    
    // If it contains 'b!' prefix, it's already a Graph-style ID
    if (id.startsWith('b!')) {
      console.log('Using Graph ID format:', id);
      return id;
    }
    
    // Otherwise, add the b! prefix
    const normalizedId = `b!${id}`;
    console.log('Normalized to Graph ID format:', normalizedId);
    return normalizedId;
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!isAuthenticated || !containerId) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();
      if (!token) {
        setError("Failed to get access token. Please try logging in again.");
        toast({
          title: "Authentication Error",
          description: "Failed to get access token",
          variant: "destructive",
        });
        return;
      }

      const normalizedContainerId = normalizeContainerId(containerId);
      console.log(`Fetching files for container ${normalizedContainerId}, folder ${currentFolder || 'root'}`);
      
      // Track API call
      const apiCallData = {
        method: 'GET',
        url: `/containers/${normalizedContainerId}/drive/items/${currentFolder || 'root'}/children`,
        request: { containerId: normalizedContainerId, folder: currentFolder || 'root' }
      };

      try {
        const fileItems = await sharePointService.listFiles(token, normalizedContainerId, currentFolder);

        // Ensure each file has the creator information and format
        const enhancedFiles = fileItems.map(item => ({
          ...item,
          createdByName: item.createdBy?.user?.displayName || 'Unknown',
          childCount: item.folder?.childCount || 0
        }));
        
        setFiles(enhancedFiles);
        
        // Track successful API call
        addApiCall({
          ...apiCallData,
          response: enhancedFiles,
          status: 200
        });
      } catch (apiError: any) {
        console.error('API Error details:', apiError);
        
        // Track failed API call
        addApiCall({
          ...apiCallData,
          response: { error: apiError.message },
          status: apiError.status || 500
        });
        
        // Provide more specific error messages
        let errorMessage = "Failed to fetch files.";
        if (apiError.message?.includes('404')) {
          errorMessage = "Container not found. Please check if the project exists and you have access.";
        } else if (apiError.message?.includes('403')) {
          errorMessage = "Access denied. You may not have permission to view files in this container.";
        } else if (apiError.message?.includes('400')) {
          errorMessage = "Invalid request. The container ID format may be incorrect.";
        }
        
        setError(errorMessage);
        throw apiError;
      }
    } catch (error: any) {
      console.error('Error fetching files:', error);
      
      if (!error.message?.includes('404') && !error.message?.includes('403') && !error.message?.includes('400')) {
        setError(error.message || "Failed to fetch files. This may be due to insufficient permissions or API limitations.");
        toast({
          title: "Error",
          description: "Failed to fetch files. Please check console for details.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken, containerId, currentFolder, addApiCall, normalizeContainerId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFolderClick = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId);
    if (folderId) {
      setCurrentPath(prev => [...prev, { id: folderId, name: folderName }]);
    }
  };

  const handleNavigate = (folderId: string) => {
    const folderIndex = currentPath.findIndex(item => item.id === folderId);
    if (folderIndex !== -1) {
      setCurrentPath(currentPath.slice(0, folderIndex + 1));
      setCurrentFolder(folderId);
    }
  };

  const handleDeleteFile = async (file: FileItem): Promise<void> => {
    if (!containerId) return;
    
    try {
      const token = await getAccessToken();
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Failed to get access token",
          variant: "destructive",
        });
        return;
      }

      const normalizedContainerId = normalizeContainerId(containerId);
      
      // Track API call
      const apiCallData = {
        method: 'DELETE',
        url: `/containers/${normalizedContainerId}/drive/items/${file.id}`,
        request: { containerId: normalizedContainerId, fileId: file.id, fileName: file.name }
      };

      try {
        await sharePointService.deleteFile(token, normalizedContainerId, file.id);
        setFiles(prevFiles => prevFiles.filter(f => f.id !== file.id));
        
        // Track successful API call
        addApiCall({
          ...apiCallData,
          response: { success: true, message: 'File deleted successfully' },
          status: 204
        });
        
        toast({
          title: "Success",
          description: "File deleted successfully",
        });
      } catch (apiError: any) {
        // Track failed API call
        addApiCall({
          ...apiCallData,
          response: { error: apiError.message },
          status: apiError.status || 500
        });
        throw apiError;
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshFiles = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    currentPath,
    currentFolder,
    handleFolderClick,
    handleNavigate,
    handleDeleteFile,
    refreshFiles
  };
};
