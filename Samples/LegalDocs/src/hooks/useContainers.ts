import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchContainers, SharePointContainer } from "@/services/sharepoint";

const GRAPH_SCOPES = ["FileStorageContainer.Selected"];

export function useContainers() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [containers, setContainers] = useState<SharePointContainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContainers = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken(GRAPH_SCOPES);
      if (!token) {
        throw new Error("Failed to acquire access token");
      }

      const data = await fetchContainers(token);
      setContainers(data);
    } catch (err) {
      console.error("Error loading containers:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, isAuthenticated]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  return {
    containers,
    isLoading,
    error,
    refresh: loadContainers,
  };
}
