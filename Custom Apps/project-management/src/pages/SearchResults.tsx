
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Clock, FileIcon, Edit, Eye } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchResult, searchService } from '@/services/searchService';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import FilePreviewDialog from '@/components/files/FilePreviewDialog';
import { useFilePreview } from '@/hooks/useFilePreview';
import { Badge } from '@/components/ui/badge';
import { stripHtmlTags } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const containerId = searchParams.get('container') || undefined;
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getAccessToken } = useAuth();
  
  const {
    isPreviewOpen,
    setIsPreviewOpen,
    previewUrl,
    previewLoading,
    handleViewFile
  } = useFilePreview(containerId);
  
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm) return;
      
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
        
        const searchResults = await searchService.searchFiles(token, searchTerm, containerId);
        console.log('Setting search results:', searchResults);
        setResults(searchResults);
      } catch (error: any) {
        console.error('Search error:', error);
        setError(error.message || 'An error occurred while searching');
        toast({
          title: "Search Error",
          description: `Failed to search: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    performSearch();
  }, [searchTerm, containerId, getAccessToken]);
  
  const isOfficeDocument = (filename: string): boolean => {
    if (!filename) return false;
    const extension = filename.toLowerCase().split('.').pop();
    return ['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'one'].includes(extension || '');
  };

  const handleEditOfficeDocument = async (result: SearchResult) => {
    console.log('Edit button clicked for:', result);
    
    if (!result.driveId || !result.itemId) {
      console.error('Missing driveId or itemId:', { driveId: result.driveId, itemId: result.itemId });
      toast({
        title: "Error",
        description: "Cannot open this file: Missing file information",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Getting access token...');
      const token = await getAccessToken();
      if (!token) {
        console.error('Failed to get access token');
        toast({
          title: "Authentication Error",
          description: "Failed to get access token",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Fetching file details for editing:', { driveId: result.driveId, itemId: result.itemId });
      const fileDetails = await searchService.getFileDetails(token, result.driveId, result.itemId);
      console.log('File details received:', fileDetails);
      
      if (fileDetails.webUrl) {
        console.log('Opening webUrl:', fileDetails.webUrl);
        window.open(fileDetails.webUrl, '_blank');
      } else {
        console.error('No webUrl in file details');
        toast({
          title: "Error",
          description: "Could not retrieve file URL",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error opening Office document:', error);
      toast({
        title: "Error",
        description: `Failed to open file: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  const handlePreviewDocument = async (result: SearchResult) => {
    console.log('Preview button clicked for:', result);
    
    if (!result.driveId || !result.itemId) {
      console.error('Missing driveId or itemId for preview:', { driveId: result.driveId, itemId: result.itemId });
      toast({
        title: "Error",
        description: "Cannot preview this file: Missing file information",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Converting SearchResult to FileItem...');
      const fileItem = searchService.convertToFileItem(result);
      console.log('Converted FileItem:', fileItem);
      
      console.log('Calling handleViewFile...');
      await handleViewFile(fileItem);
    } catch (error: any) {
      console.error('Error previewing document:', error);
      toast({
        title: "Error",
        description: `Failed to preview file: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getFileExtension = (filename: string): string => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  };
  
  return (
    <div className="container space-y-6 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Search Results</h1>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {!loading && results.length > 0 && (
          <p>{results.length} results for "{searchTerm}"</p>
        )}
      </div>
      
      <Card>
        <CardContent className="pt-6">
          {loading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={`loading-${i}`} className="flex space-x-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!loading && !error && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground">No files found matching your search.</p>
            </div>
          )}
          
          {!loading && !error && results.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const fileExt = getFileExtension(result.title);
                  const isOffice = isOfficeDocument(result.title);
                  
                  console.log('Rendering result:', { 
                    title: result.title, 
                    driveId: result.driveId, 
                    itemId: result.itemId, 
                    isOffice 
                  });
                  
                  return (
                    <TableRow key={`result-${result.id || Math.random().toString()}`}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{result.title || 'Unnamed Document'}</span>
                          {fileExt && (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 w-fit">
                              <FileIcon className="h-3 w-3 mr-1" />
                              {fileExt}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{result.createdBy}</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(result.createdDateTime)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2">
                          {stripHtmlTags(result.preview || 'No preview available')}
                        </p>
                      </TableCell>
                      <TableCell>
                        {isOffice ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Edit button clicked, calling handleEditOfficeDocument');
                              handleEditOfficeDocument(result);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Preview button clicked, calling handlePreviewDocument');
                              handlePreviewDocument(result);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <FilePreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
      />
    </div>
  );
};

export default SearchResults;
