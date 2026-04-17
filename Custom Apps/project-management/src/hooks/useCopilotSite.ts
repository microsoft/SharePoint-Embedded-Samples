
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { sharePointService } from '../services/sharePointService';
import { appConfig } from '../config/appConfig';

export const useCopilotSite = (containerId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const { getAccessToken, isAuthenticated } = useAuth();
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Skip all processing if not authenticated
  const shouldProcess = isAuthenticated && !!containerId;

  // Normalize container ID to handle different formats
  const normalizedContainerId = useMemo(() => {
    if (!containerId || !shouldProcess) {
      console.log('No containerId provided to useCopilotSite or user not authenticated');
      return '';
    }
    
    // If it already starts with b!, keep it as is
    if (containerId.startsWith('b!')) {
      return containerId;
    }
    
    // Otherwise, add the b! prefix
    return `b!${containerId}`;
  }, [containerId, shouldProcess]);

  useEffect(() => {
    // Set default values immediately for safety
    if (!siteUrl) {
      setSiteUrl(appConfig.sharePointHostname.replace(/\/+$/, ''));
    }
    
    if (!siteName) {
      setSiteName('SharePoint Site');
    }
    
    // Early return if conditions aren't met
    if (!shouldProcess || !normalizedContainerId) {
      console.log('Skipping site info fetch - not authenticated or no valid containerId');
      return;
    }
    
    // Avoid refetching unnecessarily
    if (fetchAttempted) {
      console.log('Already attempted to fetch site info, skipping');
      return;
    }
    
    const fetchSiteInfo = async () => {
      // Skip if already loading
      if (isLoading) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const token = await getAccessToken();
        if (!token) {
          console.error('Authentication token not available');
          setError('Authentication token not available');
          return;
        }
    
        console.log('Fetching container details for:', normalizedContainerId);
        const containerDetails = await sharePointService.getContainerDetails(token, normalizedContainerId);
        
        // Mark as attempted regardless of outcome
        setFetchAttempted(true);
        
        // Set fallback values and handle missing data
        if (!containerDetails) {
          console.error('Container details are undefined');
          setError('Container details are undefined');
          return;
        }
        
        // Handle name specifically - ensure it's never undefined
        const name = containerDetails.name || 'SharePoint Site';
        setSiteName(name);
        console.log('Container name retrieved:', name);
        
        if (!containerDetails.webUrl) {
          console.error('Container webUrl is undefined');
          setError('Container webUrl is undefined');
          return;
        }
        
        // Store the site URL without any trailing slashes
        const normalizedUrl = containerDetails.webUrl.replace(/\/+$/, '');
        setSiteUrl(normalizedUrl);
        console.log('Container webUrl retrieved:', normalizedUrl);
      } catch (err) {
        console.error('Error fetching site info:', err);
        setError('Failed to load site information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSiteInfo();
  }, [normalizedContainerId, getAccessToken, isAuthenticated, shouldProcess, fetchAttempted]);

  // Get the base SharePoint hostname (without any paths or trailing slashes)
  // This is used for authentication and CSP compatibility
  const sharePointHostname = useMemo(() => {
    try {
      // If no site URL yet, use the default from config
      if (!siteUrl) {
        const defaultHostname = appConfig.sharePointHostname.replace(/\/+$/, '');
        console.log('Using default SharePoint hostname:', defaultHostname);
        return defaultHostname;
      }
      
      // Parse only the hostname part from the URL with protocol
      const url = new URL(siteUrl);
      const hostname = `${url.protocol}//${url.hostname}`;
      console.log('Extracted SharePoint hostname from URL:', hostname);
      return hostname;
    } catch (e) {
      console.error('Error parsing site URL:', e);
      // Return default from config as fallback
      const fallback = appConfig.sharePointHostname.replace(/\/+$/, '');
      console.log('Using fallback SharePoint hostname after error:', fallback);
      return fallback;
    }
  }, [siteUrl]);

  return {
    isLoading,
    error,
    siteUrl,
    siteName,
    sharePointHostname,
    fetchAttempted
  };
};
