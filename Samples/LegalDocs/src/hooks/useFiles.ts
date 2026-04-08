import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchFolderContents, SharePointFile } from "@/services/sharepoint";

const GRAPH_SCOPES = ["FileStorageContainer.Selected"];

export function useFiles(containerId: string | null) {
  const { getAccessToken } = useAuth();
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolderContents = useCallback(async (folderId: string | null) => {
    if (!containerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken(GRAPH_SCOPES);
      if (!token) {
        throw new Error("Failed to acquire access token");
      }

      const contents = await fetchFolderContents(token, containerId, folderId);
      setFiles(contents);
    } catch (err) {
      console.error("Error loading folder contents:", err);
      setError(err instanceof Error ? err.message : "Failed to load contents");
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [containerId, getAccessToken]);

  return {
    files,
    isLoading,
    error,
    loadFolderContents,
  };
}
