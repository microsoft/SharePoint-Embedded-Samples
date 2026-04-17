import { SHAREPOINT_CONFIG, GRAPH_ENDPOINT } from "@/config/sharepoint";

export interface SharePointContainer {
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  containerTypeId: string;
}

export interface SharePointFolder {
  id: string;
  name: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: {
    childCount: number;
  };
  parentReference?: {
    id: string;
    path: string;
  };
}

interface ContainersResponse {
  value: SharePointContainer[];
}

interface DriveItemsResponse {
  value: SharePointFolder[];
}

// Graph Beta endpoint for container creation
const GRAPH_BETA_ENDPOINT = "https://graph.microsoft.com/beta";

// Fetch all containers for the configured container type
export async function fetchContainers(accessToken: string): Promise<SharePointContainer[]> {
  const url = `${GRAPH_ENDPOINT}/storage/fileStorage/containers?$filter=containerTypeId eq ${SHAREPOINT_CONFIG.CONTAINER_TYPE_ID}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch containers:", error);
    throw new Error(`Failed to fetch containers: ${response.status}`);
  }

  const data: ContainersResponse = await response.json();
  return data.value || [];
}

// Create a new container (case) using the Graph Beta API
// Reference: https://learn.microsoft.com/en-us/graph/api/filestoragecontainer-post?view=graph-rest-beta
export async function createContainer(
  accessToken: string,
  displayName: string,
  description?: string
): Promise<SharePointContainer> {
  const url = `${GRAPH_BETA_ENDPOINT}/storage/fileStorage/containers`;
  
  const body: {
    displayName: string;
    containerTypeId: string;
    description?: string;
  } = {
    displayName,
    containerTypeId: SHAREPOINT_CONFIG.CONTAINER_TYPE_ID,
  };
  
  if (description) {
    body.description = description;
  }
  
  console.log("Creating container with:", body);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create container:", error);
    throw new Error(`Failed to create container: ${response.status} - ${error}`);
  }

  const container: SharePointContainer = await response.json();
  console.log("Container created successfully:", container);
  return container;
}

// Fetch root folders for a container (drive)
export async function fetchRootFolders(
  accessToken: string,
  containerId: string
): Promise<SharePointFolder[]> {
  // First get the drive ID for this container
  const driveUrl = `${GRAPH_ENDPOINT}/storage/fileStorage/containers/${containerId}/drive`;
  
  const driveResponse = await fetch(driveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!driveResponse.ok) {
    const error = await driveResponse.text();
    console.error("Failed to fetch drive:", error);
    throw new Error(`Failed to fetch drive: ${driveResponse.status}`);
  }

  const driveData = await driveResponse.json();
  const driveId = driveData.id;

  // Now fetch root children, filtering to only folders
  const rootUrl = `${GRAPH_ENDPOINT}/drives/${driveId}/root/children?$filter=folder ne null`;
  
  const response = await fetch(rootUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch root folders:", error);
    throw new Error(`Failed to fetch root folders: ${response.status}`);
  }

  const data: DriveItemsResponse = await response.json();
  return data.value || [];
}

// Fetch child folders for a specific folder
export async function fetchChildFolders(
  accessToken: string,
  containerId: string,
  folderId: string
): Promise<SharePointFolder[]> {
  // First get the drive ID for this container
  const driveUrl = `${GRAPH_ENDPOINT}/storage/fileStorage/containers/${containerId}/drive`;
  
  const driveResponse = await fetch(driveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!driveResponse.ok) {
    throw new Error(`Failed to fetch drive: ${driveResponse.status}`);
  }

  const driveData = await driveResponse.json();
  const driveId = driveData.id;

  // Fetch children of the specific folder, filtering to only folders
  const folderUrl = `${GRAPH_ENDPOINT}/drives/${driveId}/items/${folderId}/children?$filter=folder ne null`;
  
  const response = await fetch(folderUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch child folders:", error);
    throw new Error(`Failed to fetch child folders: ${response.status}`);
  }

  const data: DriveItemsResponse = await response.json();
  return data.value || [];
}

// File item interface for folder contents
export interface SharePointFile {
  id: string;
  name: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  size?: number;
  webUrl: string;
  "@microsoft.graph.downloadUrl"?: string;
  createdBy?: {
    user?: {
      displayName?: string;
      email?: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName?: string;
      email?: string;
    };
  };
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  parentReference?: {
    driveId?: string;
  };
}

interface FolderContentsResponse {
  value: SharePointFile[];
}

// Fetch all items (files and folders) in a folder
export async function fetchFolderContents(
  accessToken: string,
  containerId: string,
  folderId: string | null
): Promise<SharePointFile[]> {
  // First get the drive ID for this container
  const driveUrl = `${GRAPH_ENDPOINT}/storage/fileStorage/containers/${containerId}/drive`;
  
  const driveResponse = await fetch(driveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!driveResponse.ok) {
    throw new Error(`Failed to fetch drive: ${driveResponse.status}`);
  }

  const driveData = await driveResponse.json();
  const driveId = driveData.id;

  // If no folderId, get root children; otherwise get specific folder children
  const contentsUrl = folderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${folderId}/children`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root/children`;
  
  const response = await fetch(contentsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch folder contents:", error);
    throw new Error(`Failed to fetch folder contents: ${response.status}`);
  }

  const data: FolderContentsResponse = await response.json();
  return data.value || [];
}

// Get preview URL for a file (embeddable in iframe)
export async function getFilePreviewUrl(
  accessToken: string,
  driveId: string,
  itemId: string
): Promise<string | null> {
  const previewUrl = `${GRAPH_ENDPOINT}/drives/${driveId}/items/${itemId}/preview`;
  
  const response = await fetch(previewUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    console.error("Failed to get preview URL:", await response.text());
    return null;
  }

  const data = await response.json();
  // Add nb=true to remove the banner
  const getUrl = data.getUrl;
  if (getUrl) {
    return getUrl.includes("?") ? `${getUrl}&nb=true` : `${getUrl}?nb=true`;
  }
  return null;
}

// Get drive ID for a container
export async function getDriveId(
  accessToken: string,
  containerId: string
): Promise<string> {
  const driveUrl = `${GRAPH_ENDPOINT}/storage/fileStorage/containers/${containerId}/drive`;
  
  const driveResponse = await fetch(driveUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!driveResponse.ok) {
    throw new Error(`Failed to fetch drive: ${driveResponse.status}`);
  }

  const driveData = await driveResponse.json();
  return driveData.id;
}

// Create a new folder in a container
export async function createFolder(
  accessToken: string,
  containerId: string,
  parentFolderId: string | null,
  folderName: string
): Promise<SharePointFolder> {
  const driveId = await getDriveId(accessToken, containerId);
  
  // Use root or specific folder as parent
  const createUrl = parentFolderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${parentFolderId}/children`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root/children`;
  
  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename"
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create folder:", error);
    throw new Error(`Failed to create folder: ${response.status}`);
  }

  return await response.json();
}

// Create a new empty Office file
export async function createEmptyFile(
  accessToken: string,
  containerId: string,
  parentFolderId: string | null,
  fileName: string
): Promise<SharePointFile> {
  const driveId = await getDriveId(accessToken, containerId);
  
  // Use root or specific folder as parent
  const createUrl = parentFolderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${parentFolderId}:/${fileName}:/content`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root:/${fileName}:/content`;
  
  const response = await fetch(createUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Blob([]),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create file:", error);
    throw new Error(`Failed to create file: ${response.status}`);
  }

  return await response.json();
}

// Check if a file exists in a folder
export async function checkFileExists(
  accessToken: string,
  containerId: string,
  parentFolderId: string | null,
  fileName: string
): Promise<boolean> {
  const driveId = await getDriveId(accessToken, containerId);
  
  const checkUrl = parentFolderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${parentFolderId}:/${fileName}`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root:/${fileName}`;
  
  const response = await fetch(checkUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.ok;
}

// Upload a file to a container/folder
export interface UploadProgressCallback {
  (fileName: string, progress: number): void;
}

export async function uploadFile(
  accessToken: string,
  containerId: string,
  parentFolderId: string | null,
  file: File,
  conflictBehavior: "replace" | "rename" = "rename",
  onProgress?: UploadProgressCallback
): Promise<SharePointFile> {
  const driveId = await getDriveId(accessToken, containerId);
  
  // For files larger than 4MB, we should use upload session, but for simplicity
  // we'll use direct PUT for smaller files (most common case)
  const maxDirectUploadSize = 4 * 1024 * 1024; // 4MB
  
  if (file.size > maxDirectUploadSize) {
    return uploadLargeFile(accessToken, driveId, parentFolderId, file, conflictBehavior, onProgress);
  }
  
  // Direct upload for smaller files
  const uploadUrl = parentFolderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${parentFolderId}:/${file.name}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root:/${file.name}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
  
  onProgress?.(file.name, 50); // Simulate progress for small files
  
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to upload file:", error);
    throw new Error(`Failed to upload file: ${response.status}`);
  }

  onProgress?.(file.name, 100);
  return await response.json();
}

// Upload large files using upload session
async function uploadLargeFile(
  accessToken: string,
  driveId: string,
  parentFolderId: string | null,
  file: File,
  conflictBehavior: "replace" | "rename",
  onProgress?: UploadProgressCallback
): Promise<SharePointFile> {
  // Create upload session
  const sessionUrl = parentFolderId
    ? `${GRAPH_ENDPOINT}/drives/${driveId}/items/${parentFolderId}:/${file.name}:/createUploadSession`
    : `${GRAPH_ENDPOINT}/drives/${driveId}/root:/${file.name}:/createUploadSession`;
  
  const sessionResponse = await fetch(sessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item: {
        "@microsoft.graph.conflictBehavior": conflictBehavior,
        name: file.name,
      },
    }),
  });

  if (!sessionResponse.ok) {
    throw new Error(`Failed to create upload session: ${sessionResponse.status}`);
  }

  const session = await sessionResponse.json();
  const uploadUrl = session.uploadUrl;

  // Upload in chunks
  const chunkSize = 320 * 1024 * 10; // 3.2MB chunks (must be multiple of 320KB)
  let uploadedBytes = 0;
  let result: SharePointFile | null = null;

  while (uploadedBytes < file.size) {
    const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);
    const chunkEnd = Math.min(uploadedBytes + chunkSize, file.size) - 1;

    const chunkResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.size.toString(),
        "Content-Range": `bytes ${uploadedBytes}-${chunkEnd}/${file.size}`,
      },
      body: chunk,
    });

    if (!chunkResponse.ok && chunkResponse.status !== 202) {
      throw new Error(`Failed to upload chunk: ${chunkResponse.status}`);
    }

    uploadedBytes += chunk.size;
    const progress = Math.round((uploadedBytes / file.size) * 100);
    onProgress?.(file.name, progress);

    // If upload is complete, the response will contain the file metadata
    if (chunkResponse.status === 200 || chunkResponse.status === 201) {
      result = await chunkResponse.json();
    }
  }

  if (!result) {
    throw new Error("Upload completed but no file metadata received");
  }

  return result;
}

// Copilot retrieval response interface
// Clean up text from Copilot API responses
function cleanCopilotText(text: string): string {
  let cleaned = text;
  // Remove page markers
  cleaned = cleaned.replace(/<page_\d+>/g, '').replace(/<\/page_\d+>/g, '');
  // Remove escaped markdown characters
  cleaned = cleaned.replace(/\\_/g, '_').replace(/\\-/g, '-');
  cleaned = cleaned.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  cleaned = cleaned.replace(/\\\(/g, '(').replace(/\\\)/g, ')');
  cleaned = cleaned.replace(/\\\*/g, '*');
  // Remove standalone asterisks used as separators (e.g., "* * * * *" or "\* \* \*")
  cleaned = cleaned.replace(/(\s*\*\s*){2,}/g, ' ');
  // Remove single asterisks at word boundaries (markdown bold/italic markers)
  cleaned = cleaned.replace(/\*+/g, '');
  // Remove backslashes before common characters
  cleaned = cleaned.replace(/\\([^\\])/g, '$1');
  // Clean up whitespace
  cleaned = cleaned.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

export interface CopilotRetrievalResponse {
  retrievalHits?: Array<{
    webUrl?: string;
    extracts?: Array<{
      text?: string;
      relevanceScore?: number;
    }>;
    resourceType?: string;
  }>;
}

// Fetch case summary using Microsoft Copilot retrieval API
export async function fetchCaseSummary(
  accessToken: string,
  caseTitle: string
): Promise<string | null> {
  const url = "https://graph.microsoft.com/beta/copilot/microsoft.graph.retrieval";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryString: `Summarize the case for ${caseTitle}`,
      dataSource: "sharePointEmbedded",
      dataSourceConfiguration: {
        SharePointEmbedded: {
          ContainerTypeId: SHAREPOINT_CONFIG.CONTAINER_TYPE_ID,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch case summary:", error);
    return null;
  }

  const data: CopilotRetrievalResponse = await response.json();
  
  // Extract and return the text from the first retrieval hit's extract
  if (data.retrievalHits && data.retrievalHits.length > 0) {
    const firstHit = data.retrievalHits[0];
    if (firstHit.extracts && firstHit.extracts.length > 0 && firstHit.extracts[0].text) {
      return cleanCopilotText(firstHit.extracts[0].text);
    }
  }
  
  return null;
}

export interface CasePersonnel {
  role: string;
  name: string;
}

// Fetch case personnel using Microsoft Copilot retrieval API
export async function fetchCasePersonnel(
  accessToken: string,
  caseTitle: string
): Promise<CasePersonnel[]> {
  const url = "https://graph.microsoft.com/beta/copilot/microsoft.graph.retrieval";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryString: `Who is the judge, defense counsel, defense attorney, prosecuting counsel, prosecutor, and plaintiff attorney for the case ${caseTitle}?`,
      dataSource: "sharePointEmbedded",
      dataSourceConfiguration: {
        SharePointEmbedded: {
          ContainerTypeId: SHAREPOINT_CONFIG.CONTAINER_TYPE_ID,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch case personnel:", error);
    return [];
  }

  const data: CopilotRetrievalResponse = await response.json();
  
  if (data.retrievalHits && data.retrievalHits.length > 0) {
    const firstHit = data.retrievalHits[0];
    if (firstHit.extracts && firstHit.extracts.length > 0 && firstHit.extracts[0].text) {
      const text = cleanCopilotText(firstHit.extracts[0].text);
      return parseCasePersonnel(text);
    }
  }
  
  return [];
}

// Parse text to extract case personnel
function parseCasePersonnel(text: string): CasePersonnel[] {
  const personnel: CasePersonnel[] = [];
  const lowerText = text.toLowerCase();
  
  // Patterns to find personnel with their names
  const personnelPatterns: { role: string; patterns: RegExp[] }[] = [
    {
      role: 'Judge',
      patterns: [
        /(?:judge|hon\.|honorable|justice)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+),?\s+(?:judge|j\.)/gi,
      ]
    },
    {
      role: 'Defense Counsel',
      patterns: [
        /(?:defense counsel|defense attorney|attorney for defendant|counsel for defendant|defendant'?s? (?:counsel|attorney))[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+),?\s+(?:for|counsel for|attorney for)\s+(?:the\s+)?(?:defendant|appellant|defense)/gi,
      ]
    },
    {
      role: 'Prosecuting Counsel',
      patterns: [
        /(?:prosecut(?:ing|or)|district attorney|state'?s? (?:counsel|attorney)|attorney for (?:the )?state|counsel for (?:the )?state|appellee)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/gi,
        /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+),?\s+(?:for|counsel for|attorney for)\s+(?:the\s+)?(?:state|prosecution|appellee|plaintiff)/gi,
      ]
    },
  ];
  
  for (const { role, patterns } of personnelPatterns) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[1]?.trim();
        if (name && name.length > 3 && !personnel.some(p => p.role === role)) {
          personnel.push({ role, name });
          break;
        }
      }
      if (personnel.some(p => p.role === role)) break;
    }
  }
  
  return personnel;
}

export interface KeyDate {
  description: string;
  date: string;
}

// Fetch jurisdiction using Microsoft Copilot retrieval API
export async function fetchJurisdiction(
  accessToken: string,
  caseTitle: string
): Promise<string | null> {
  const url = "https://graph.microsoft.com/beta/copilot/microsoft.graph.retrieval";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryString: `What is the jurisdiction, court, district, or venue where the case ${caseTitle} was filed?`,
      dataSource: "sharePointEmbedded",
      dataSourceConfiguration: {
        SharePointEmbedded: {
          ContainerTypeId: SHAREPOINT_CONFIG.CONTAINER_TYPE_ID,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch jurisdiction:", error);
    return null;
  }

  const data: CopilotRetrievalResponse = await response.json();
  
  if (data.retrievalHits && data.retrievalHits.length > 0) {
    const firstHit = data.retrievalHits[0];
    if (firstHit.extracts && firstHit.extracts.length > 0 && firstHit.extracts[0].text) {
      const text = cleanCopilotText(firstHit.extracts[0].text);
      return parseJurisdiction(text);
    }
  }
  
  return null;
}

// Parse text to extract jurisdiction info
function parseJurisdiction(text: string): string | null {
  // Common court patterns
  const courtPatterns = [
    /(?:court of appeal[s]?[^,.\n]*)/i,
    /(?:supreme court[^,.\n]*)/i,
    /(?:district court[^,.\n]*)/i,
    /(?:circuit court[^,.\n]*)/i,
    /(?:superior court[^,.\n]*)/i,
    /(?:trial court[^,.\n]*)/i,
    /(?:(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh)\s+(?:judicial\s+)?(?:district|circuit)[^,.\n]*)/i,
  ];
  
  for (const pattern of courtPatterns) {
    const match = text.match(pattern);
    if (match) {
      let jurisdiction = match[0].trim();
      // Clean up and capitalize properly
      jurisdiction = jurisdiction.replace(/\s+/g, ' ');
      // Limit length
      if (jurisdiction.length > 100) {
        jurisdiction = jurisdiction.substring(0, 100) + '...';
      }
      return jurisdiction;
    }
  }
  
  // If no specific court pattern found, return first sentence if it mentions state/county
  const statePattern = /(?:state of [a-z]+|[a-z]+ county|parish of [a-z]+)/i;
  const stateMatch = text.match(statePattern);
  if (stateMatch) {
    // Get surrounding context
    const idx = text.indexOf(stateMatch[0]);
    const start = Math.max(0, text.lastIndexOf('.', idx) + 1);
    const end = text.indexOf('.', idx + stateMatch[0].length);
    let snippet = text.substring(start, end > 0 ? end : undefined).trim();
    if (snippet.length > 100) {
      snippet = snippet.substring(0, 100) + '...';
    }
    return snippet;
  }
  
  return null;
}

// Fetch key dates using Microsoft Copilot retrieval API
export async function fetchKeyDates(
  accessToken: string,
  caseTitle: string
): Promise<KeyDate[]> {
  const url = "https://graph.microsoft.com/beta/copilot/microsoft.graph.retrieval";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queryString: `List all important dates, deadlines, hearings, filings, and scheduled events for the case ${caseTitle}`,
      dataSource: "sharePointEmbedded",
      dataSourceConfiguration: {
        SharePointEmbedded: {
          ContainerTypeId: SHAREPOINT_CONFIG.CONTAINER_TYPE_ID,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to fetch key dates:", error);
    return [];
  }

  const data: CopilotRetrievalResponse = await response.json();
  
  if (data.retrievalHits && data.retrievalHits.length > 0) {
    const firstHit = data.retrievalHits[0];
    if (firstHit.extracts && firstHit.extracts.length > 0 && firstHit.extracts[0].text) {
      const text = cleanCopilotText(firstHit.extracts[0].text);
      return parseKeyDates(text);
    }
  }
  
  return [];
}

// Parse text to extract key dates with descriptions
function parseKeyDates(text: string): KeyDate[] {
  const dates: KeyDate[] = [];
  
  // Common date patterns: MM/DD/YYYY, Month DD, YYYY, YYYY-MM-DD
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
    /(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b)/gi,
    /(\d{4}-\d{2}-\d{2})/g,
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b)/gi,
  ];
  
  // Keywords that typically precede important dates in legal documents
  const dateKeywords = [
    'filed', 'filing', 'hearing', 'trial', 'discovery', 'deadline', 
    'motion', 'response', 'due', 'scheduled', 'set for', 'date',
    'commenced', 'begins', 'ends', 'closing', 'opening',
    // Additional legal terms
    'judgment', 'rendered', 'subpoena', 'subpoenaed', 'closed', 'dismissed',
    'appeal', 'appealed', 'verdict', 'sentenced', 'sentencing', 'arraignment',
    'deposition', 'mediation', 'arbitration', 'settlement', 'order', 'ordered',
    'entered', 'signed', 'executed', 'served', 'service', 'notice',
    'continuance', 'continued', 'postponed', 'rescheduled', 'adjourned',
    'pretrial', 'pre-trial', 'status', 'conference', 'review',
    'plea', 'indictment', 'arraigned', 'bail', 'bond', 'released',
    'stayed', 'remanded', 'affirmed', 'reversed', 'denied', 'granted',
    'rehearing', 'reconsideration', 'certified', 'final'
  ];
  
  // Split text into sentences/segments
  const segments = text.split(/[.;!\n]+/).filter(s => s.trim());
  
  for (const segment of segments) {
    // Check if segment contains a date keyword
    const hasKeyword = dateKeywords.some(keyword => 
      segment.toLowerCase().includes(keyword)
    );
    
    if (hasKeyword) {
      // Try to find a date in this segment
      for (const pattern of datePatterns) {
        const matches = segment.match(pattern);
        if (matches && matches.length > 0) {
          // Extract a description from the segment
          let description = segment.trim();
          // Clean up the description
          description = description.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Try to extract a meaningful label
          const lowerDesc = description.toLowerCase();
          let label = 'Key Date';
          
          // Legal milestones - check in order of specificity
          if (lowerDesc.includes('judgment') || lowerDesc.includes('rendered')) {
            label = 'Judgment Rendered';
          } else if (lowerDesc.includes('verdict')) {
            label = 'Verdict';
          } else if (lowerDesc.includes('sentencing') || lowerDesc.includes('sentenced')) {
            label = 'Sentencing';
          } else if (lowerDesc.includes('appeal') && lowerDesc.includes('filed')) {
            label = 'Appeal Filed';
          } else if (lowerDesc.includes('appealed')) {
            label = 'Appealed';
          } else if (lowerDesc.includes('rehearing')) {
            label = 'Rehearing';
          } else if (lowerDesc.includes('subpoena')) {
            label = 'Subpoena';
          } else if (lowerDesc.includes('closed') || lowerDesc.includes('dismissed')) {
            label = 'Case Closed';
          } else if (lowerDesc.includes('settlement')) {
            label = 'Settlement';
          } else if (lowerDesc.includes('mediation')) {
            label = 'Mediation';
          } else if (lowerDesc.includes('arbitration')) {
            label = 'Arbitration';
          } else if (lowerDesc.includes('deposition')) {
            label = 'Deposition';
          } else if (lowerDesc.includes('arraignment') || lowerDesc.includes('arraigned')) {
            label = 'Arraignment';
          } else if (lowerDesc.includes('plea')) {
            label = 'Plea';
          } else if (lowerDesc.includes('indictment')) {
            label = 'Indictment';
          } else if (lowerDesc.includes('pretrial') || lowerDesc.includes('pre-trial')) {
            label = 'Pretrial';
          } else if (lowerDesc.includes('status') && lowerDesc.includes('conference')) {
            label = 'Status Conference';
          } else if (lowerDesc.includes('filed') || lowerDesc.includes('filing')) {
            label = 'Filed';
          } else if (lowerDesc.includes('hearing')) {
            label = 'Hearing';
          } else if (lowerDesc.includes('trial')) {
            label = 'Trial';
          } else if (lowerDesc.includes('discovery')) {
            label = 'Discovery Deadline';
          } else if (lowerDesc.includes('motion')) {
            label = 'Motion';
          } else if (lowerDesc.includes('response')) {
            label = 'Response Due';
          } else if (lowerDesc.includes('order') || lowerDesc.includes('ordered')) {
            label = 'Order';
          } else if (lowerDesc.includes('deadline') || lowerDesc.includes('due')) {
            label = 'Deadline';
          } else if (lowerDesc.includes('continued') || lowerDesc.includes('postponed') || lowerDesc.includes('rescheduled')) {
            label = 'Rescheduled';
          }
          
          // Format the date
          const dateStr = matches[0];
          const formattedDate = formatDateString(dateStr);
          
          // Avoid duplicates
          if (!dates.some(d => d.date === formattedDate && d.description === label)) {
            dates.push({
              description: label,
              date: formattedDate
            });
          }
          break;
        }
      }
    }
  }
  
  return dates.slice(0, 5); // Limit to 5 dates
}

// Format date string to a readable format
function formatDateString(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  } catch {
    // If parsing fails, return original string
  }
  return dateStr;
}
