import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchRootFolders, fetchChildFolders, SharePointFolder } from "@/services/sharepoint";

const GRAPH_SCOPES = ["FileStorageContainer.Selected"];

export interface FolderNode {
  id: string;
  name: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  childCount: number;
  children: FolderNode[];
  isLoaded: boolean;
  isLoading: boolean;
}

export function useFolders(containerId: string | null) {
  const { getAccessToken } = useAuth();
  const [rootFolders, setRootFolders] = useState<FolderNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapToFolderNode = (folder: SharePointFolder): FolderNode => ({
    id: folder.id,
    name: folder.name,
    createdDateTime: folder.createdDateTime,
    lastModifiedDateTime: folder.lastModifiedDateTime,
    childCount: folder.folder?.childCount || 0,
    children: [],
    isLoaded: false,
    isLoading: false,
  });

  const loadRootFolders = useCallback(async () => {
    if (!containerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken(GRAPH_SCOPES);
      if (!token) {
        throw new Error("Failed to acquire access token");
      }

      const folders = await fetchRootFolders(token, containerId);
      setRootFolders(folders.map(mapToFolderNode));
    } catch (err) {
      console.error("Error loading root folders:", err);
      setError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setIsLoading(false);
    }
  }, [containerId, getAccessToken]);

  const loadChildFolders = useCallback(async (folderId: string): Promise<FolderNode[]> => {
    if (!containerId) return [];

    try {
      const token = await getAccessToken(GRAPH_SCOPES);
      if (!token) {
        throw new Error("Failed to acquire access token");
      }

      const folders = await fetchChildFolders(token, containerId, folderId);
      return folders.map(mapToFolderNode);
    } catch (err) {
      console.error("Error loading child folders:", err);
      throw err;
    }
  }, [containerId, getAccessToken]);

  return {
    rootFolders,
    setRootFolders,
    isLoading,
    error,
    loadRootFolders,
    loadChildFolders,
  };
}
