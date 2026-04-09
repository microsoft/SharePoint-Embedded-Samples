import { appConfig } from '../config/appConfig';

export interface FileItem {
  createdDateTime: string;
  eTag: string;
  id: string;
  lastModifiedDateTime: string;
  name: string;
  size: number;
  webUrl: string;
  isFolder?: boolean;
  createdByName?: string;
  childCount?: number;
  createdBy?: {
    user: {
      displayName: string;
    };
  };
  lastModifiedBy?: {
    user: {
      displayName: string;
    };
  };
  file?: {
    mimeType: string;
    hashes: {
      quickXorHash: string;
      sha1Hash: string;
    };
  };
  folder?: {
    childCount: number;
  };
}

export class SharePointService {
  async getFiles(token: string, containerId: string, path: string = 'root'): Promise<FileItem[]> {
    try {
      let url: string;
      if (path === 'root' || path === '') {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/root/children`;
      } else {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${path}/children`;
      }
      console.log('Fetching files from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching files:', errorText);
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Files data:', data);

      return data.value || [];
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  async listFiles(token: string, containerId: string, path: string = 'root'): Promise<FileItem[]> {
    try {
      let url: string;
      if (path === 'root' || path === '') {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/root/children`;
      } else {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${path}/children`;
      }
      console.log('Fetching files from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching files:', errorText);
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Files data:', data);

      // Transform the response to include the required properties
      const files = (data.value || []).map((item: any) => ({
        ...item,
        isFolder: !!item.folder,
        createdByName: item.createdBy?.user?.displayName || 'Unknown',
        childCount: item.folder?.childCount || 0,
      }));

      return files;
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  async getContainerDetails(token: string, containerId: string): Promise<{ webUrl: string; name: string }> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}`;
      console.log('Fetching container details:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching container details:', errorText);
        throw new Error(`Failed to get container details: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Container details data:', data);

      return {
        webUrl: data.webUrl || '',
        name: data.name || 'Project Container',
      };
    } catch (error) {
      console.error('Error getting container details:', error);
      throw error;
    }
  }

  async uploadFile(
    token: string,
    containerId: string,
    path: string,
    file: File,
    progressCallback: (progress: number) => void
  ): Promise<void> {
    try {
      const uploadSession = await this.createUploadSession(token, containerId, path, file.name);
      const chunkSize = 320 * 1024; // 320 KB, as recommended by Microsoft
      let start = 0;
      let end = Math.min(chunkSize, file.size);

      while (start < file.size) {
        const chunk = file.slice(start, end);
        const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

        await fetch(uploadSession.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': `${end - start}`,
            'Content-Range': contentRange,
          },
          body: chunk,
        });

        start = end;
        end = Math.min(start + chunkSize, file.size);

        const progress = Math.min(100, Math.round((start / file.size) * 100));
        progressCallback(progress);
      }

      console.log('File uploaded successfully');
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  private async createUploadSession(
    token: string,
    containerId: string,
    path: string,
    fileName: string
  ): Promise<{ uploadUrl: string }> {
    try {
      let url: string;
      if (path === 'root' || path === '') {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/root:/${fileName}:/createUploadSession`;
      } else {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${path}:/${fileName}:/createUploadSession`;
      }
      console.log('Creating upload session:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: {
            '@odata.conflictBehavior': 'replace',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating upload session:', errorText);
        throw new Error(`Failed to create upload session: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload session data:', data);

      return { uploadUrl: data.uploadUrl };
    } catch (error) {
      console.error('Error creating upload session:', error);
      throw error;
    }
  }

  async createFolder(token: string, containerId: string, path: string, folderName: string): Promise<void> {
    try {
      let url: string;
      if (path === 'root' || path === '') {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/root:/${folderName}:`;
      } else {
        url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${path}:/${folderName}:`;
      }
      console.log('Creating folder:', url);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          folder: {},
          '@odata.conflictBehavior': 'replace',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating folder:', errorText);
        throw new Error(`Failed to create folder: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async deleteFile(token: string, containerId: string, itemId: string): Promise<void> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${itemId}`;
      console.log('Deleting file:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        console.error('Error deleting file:', errorText);
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFileBuffer(token: string, driveId: string, itemId: string): Promise<ArrayBuffer> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${driveId}/items/${itemId}/content`;
      console.log('Fetching file content:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching file content:', errorText);
        throw new Error(`Failed to fetch file content: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error getting file content:', error);
      throw error;
    }
  }

  async createOfficeFile(
    token: string,
    containerId: string,
    path: string,
    fileName: string,
    fileType: string
  ): Promise<void> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${path}:/${fileName}.${fileType}:/content`;
      console.log('Creating Office file:', url);

      // Determine the content type based on the file type
      let contentType = 'application/octet-stream';
      switch (fileType) {
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'pptx':
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        default:
          console.warn('Unknown file type, using default octet-stream');
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: new ArrayBuffer(0),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating Office file:', errorText);
        throw new Error(`Failed to create Office file: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('Office file created successfully');
    } catch (error) {
      console.error('Error creating Office file:', error);
      throw error;
    }
  }

  async getSiteDetails(
    token: string,
    siteId: string
  ): Promise<{ displayName?: string; name: string; webUrl: string }> {
    try {
      // Normalize site ID format for Graph API
      let normalizedSiteId = siteId;
      if (!normalizedSiteId.startsWith('b!')) {
        normalizedSiteId = `b!${normalizedSiteId}`;
      }

      const url = `${appConfig.endpoints.graphBaseUrl}/sites/${normalizedSiteId}`;
      console.log('Fetching site details:', { url, siteId: normalizedSiteId });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching site details:', errorText);
        throw new Error(`Failed to get site details: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Site details data:', data);

      return {
        displayName: data.displayName,
        name: data.name || 'Site',
        webUrl: data.webUrl || '',
      };
    } catch (error) {
      console.error('Error getting site details:', error);
      throw error;
    }
  }

  async createContainer(token: string, displayName: string, description: string): Promise<{ id: string }> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/storage/fileStorage/containers`;

      console.log('Creating container:', { displayName, description });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          description,
          containerTypeId: appConfig.containerTypeId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating container:', errorText);
        throw new Error(`Failed to create container: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Container created:', data);
      return { id: data.id };
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  async shareFile(
    token: string,
    containerId: string,
    itemId: string,
    recipients: string[],
    role: 'read' | 'write',
    message?: string
  ): Promise<void> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${itemId}/invite`;

      console.log('Sharing file:', { containerId, itemId, recipients, role });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: recipients.map(email => ({ email })),
          message: message || '',
          requireSignIn: true,
          sendInvitation: true,
          roles: [role],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sharing file:', errorText);
        throw new Error(`Failed to share file: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('File shared successfully');
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  async getFilePreview(token: string, containerId: string, itemId: string): Promise<string> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}/items/${itemId}/preview`;
      console.log('Fetching file preview:', { url });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching file preview:', errorText);
        throw new Error(`Failed to get file preview: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('File preview response:', data);

      return data.getUrl + '&nb=true';
    } catch (error) {
      console.error('Error getting file preview:', error);
      throw error;
    }
  }

  async listContainersUsingSearch(
    token: string
  ): Promise<Array<{ id: string; name: string; webUrl?: string; createdDateTime?: string; description?: string; containerTypeId?: string }>> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/search/query`;

      const requestBody = {
        requests: [
          {
            entityTypes: ['drive'],
            query: {
              queryString: `ContainerTypeId:${appConfig.containerTypeId}`,
            },
            sharePointOneDriveOptions: {
              includeHiddenContent: true,
            },
            fields: ['name', 'description', 'createdDateTime', 'lastModifiedDateTime', 'webUrl', 'parentReference'],
          },
        ],
      };

      console.log('Searching for containers:', { url, body: requestBody });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error searching containers:', errorText);
        throw new Error(`Failed to search containers: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Container search response:', data);

      const containers: Array<{ id: string; name: string; webUrl?: string; createdDateTime?: string; description?: string; containerTypeId?: string }> = [];

      if (
        data.value &&
        data.value.length > 0 &&
        data.value[0].hitsContainers &&
        data.value[0].hitsContainers.length > 0
      ) {
        const hits = data.value[0].hitsContainers[0].hits || [];

        for (const hit of hits) {
          const resource = hit.resource;
          if (resource && resource['@odata.type'] === '#microsoft.graph.drive') {
            containers.push({
              id: hit.hitId,
              name: resource.name || 'Project Container',
              webUrl: resource.webUrl,
              createdDateTime: resource.createdDateTime || resource.lastModifiedDateTime || new Date().toISOString(),
              description: resource.description || '',
              containerTypeId: appConfig.containerTypeId,
            });
          }
        }
      }

      return containers;
    } catch (error) {
      console.error('Error listing containers:', error);
      throw error;
    }
  }

  async getContainer(
    token: string,
    containerId: string
  ): Promise<{ id: string; name: string; webUrl?: string; createdDateTime?: string; description?: string; containerTypeId?: string }> {
    try {
      const url = `${appConfig.endpoints.graphBaseUrl}/drives/${containerId}`;

      console.log('Fetching container:', { url, containerId });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching container:', errorText);
        throw new Error(`Failed to get container: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Container response:', data);

      return {
        id: data.id,
        name: data.name || 'Project Container',
        webUrl: data.webUrl,
        createdDateTime: data.createdDateTime || data.lastModifiedDateTime || new Date().toISOString(),
        description: data.description || '',
        containerTypeId: appConfig.containerTypeId,
      };
    } catch (error) {
      console.error('Error getting container:', error);
      throw error;
    }
  }
}

export const sharePointService = new SharePointService();
