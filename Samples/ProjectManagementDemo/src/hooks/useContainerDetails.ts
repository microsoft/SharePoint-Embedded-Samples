
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sharePointService } from '../services/sharePointService';

export const useContainerDetails = (containerId: string | undefined) => {
  const [containerDetails, setContainerDetails] = useState<{ webUrl: string, name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, getAccessToken } = useAuth();

  useEffect(() => {
    // If no container ID provided, don't do anything
    if (!isAuthenticated || !containerId) return;

    const fetchContainerDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = await getAccessToken();
        if (!token) {
          setError('Failed to get access token');
          return;
        }
        
        console.log('Fetching container details for containerId:', containerId);
        
        // Handle different container ID formats
        let normalizedContainerId = containerId;
        
        // If it's a SharePoint site ID format (contains commas), use it as-is
        if (containerId.includes(',')) {
          console.log('Using SharePoint site ID format as-is:', containerId);
          normalizedContainerId = containerId;
        } else if (!containerId.startsWith('b!')) {
          // Add b! prefix for single GUIDs only
          normalizedContainerId = `b!${containerId}`;
        }
    
        console.log('Using normalized container ID:', normalizedContainerId);
        
        const details = await sharePointService.getContainerDetails(token, normalizedContainerId);
        setContainerDetails(details);
        console.log('Container details fetched successfully:', details);
      } catch (error: any) {
        console.error('Error fetching container details:', error);
        setError(error.message || 'Failed to fetch container details');
        
        // Set fallback values to prevent UI breaking
        setContainerDetails({
          webUrl: '',
          name: 'Project Container'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchContainerDetails();
  }, [isAuthenticated, getAccessToken, containerId]);

  return { 
    containerDetails, 
    loading, 
    error 
  };
};
