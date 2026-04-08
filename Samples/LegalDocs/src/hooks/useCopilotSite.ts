import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { APP_CONFIG, ENDPOINTS, SCOPES } from '@/config/appConfig';

interface CopilotSiteState {
  isLoading: boolean;
  error: string | null;
  containerId: string | null;
  containerName: string | null;
  webUrl: string | null;
  sharePointHostname: string;
}

/**
 * Hook to fetch SharePoint container/site information for Copilot.
 * 
 * - Normalizes container ID (adds b! prefix if missing)
 * - Fetches container name and webUrl via Graph API
 * - Extracts SharePoint hostname for authentication
 */
export function useCopilotSite(rawContainerId: string | null): CopilotSiteState {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [state, setState] = useState<CopilotSiteState>({
    isLoading: false,
    error: null,
    containerId: null,
    containerName: null,
    webUrl: null,
    sharePointHostname: APP_CONFIG.sharePointHostname,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchContainerInfo = async () => {
      if (!rawContainerId || !isAuthenticated) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: !rawContainerId ? null : 'Not authenticated',
          containerId: null,
          containerName: null,
          webUrl: null,
        }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Use the raw container ID as-is (with b! prefix) for the drives endpoint
        const normalizedId = rawContainerId;

        // Get token with container management scopes
        const token = await getAccessToken(SCOPES.containerManagement);

        if (!token) {
          if (!cancelled) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Failed to acquire access token',
            }));
          }
          return;
        }

        // Use the /drives/{id} endpoint which accepts b!-prefixed IDs
        // and returns both displayName and webUrl
        const driveResponse = await fetch(
          `${ENDPOINTS.graph}/drives/${normalizedId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!driveResponse.ok) {
          const errorText = await driveResponse.text();
          console.error('Drive fetch error:', driveResponse.status, errorText);
          if (!cancelled) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: `Container not accessible: ${driveResponse.status}`,
            }));
          }
          return;
        }

        const driveData = await driveResponse.json();
        console.log('📦 Drive metadata:', {
          id: driveData.id,
          name: driveData.name,
          webUrl: driveData.webUrl,
        });

        if (!cancelled) {
          setState({
            isLoading: false,
            error: null,
            containerId: normalizedId,
            containerName: driveData.name || driveData.description || 'SharePoint Container',
            webUrl: driveData.webUrl || null,
            sharePointHostname: APP_CONFIG.sharePointHostname,
          });
        }
      } catch (err) {
        console.error('Error fetching container info:', err);
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch container info',
          }));
        }
      }
    };

    fetchContainerInfo();

    return () => {
      cancelled = true;
    };
  }, [rawContainerId, isAuthenticated, getAccessToken]);

  return state;
}
