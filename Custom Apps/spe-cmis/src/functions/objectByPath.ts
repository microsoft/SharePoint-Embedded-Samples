import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
    authenticateRequest,
    getContainer,
    getDriveItem,
    getDriveItemByPath,
    listChildren,
    listChildrenByPath,
    createFolder,
    createFile,
    setFileContent,
    getFileContent,
    mapDriveItemToObjectData,
    mapDriveItemsToObjectList,
    mapCreatedItemToObjectData,
    unauthorized,
    objectNotFound,
    permissionDenied,
    invalidArgument,
    notSupported,
    runtimeError,
    handleDeleteAction,
    handleDeleteTreeAction,
    handleUpdatePropertiesAction,
    handleMoveAction,
    handleSetContentAction,
    handleCheckOutAction,
    handleCancelCheckOutAction,
    handleCheckInAction,
    handleApplyAclAction,
    fetchObjectAcl,
    isValidGuid,
    isValidRepositoryId,
    parseBoundedInt,
} from "../lib";

/**
 * CMIS Browser Binding: Object Operations by Path
 * 
 * Handles all operations on objects accessed by path.
 * Per CMIS 1.1 Browser Binding spec section 5.3.1.
 * 
 * URL Pattern: /storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser/{repositoryId}/root/{*path}
 * 
 * GET Operations (via cmisselector query param):
 *   - object: Get object properties
 *   - children: List children (for folders)
 *   - content: Get file content (for documents)
 * 
 * POST Operations (via cmisaction form param):
 *   - createDocument: Create a new file in folder
 *   - createFolder: Create a new folder
 *   - setContent: Set/replace file content
 *   - (others not yet implemented)
 */
export async function objectByPath(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`CMIS objectByPath request: ${request.method} ${request.url}`);

    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.context) {
        context.log(`Authentication failed: ${authResult.error}`);
        return unauthorized(authResult.error);
    }

    const { graphAccessToken } = authResult.context;
    const containerTypeId = request.params.containerTypeId;
    const repositoryId = request.params.repositoryId;
    const path = request.params.path || '';

    if (!containerTypeId || !repositoryId) {
        return invalidArgument('Container type ID and repository ID are required');
    }

    if (!isValidGuid(containerTypeId)) {
        return invalidArgument('Container type ID must be a valid GUID');
    }

    if (!isValidRepositoryId(repositoryId)) {
        return invalidArgument('Repository ID has an invalid format');
    }

    // Verify the repository exists and belongs to the container type
    const containerResult = await getContainer(graphAccessToken, repositoryId);
    if (!containerResult.success) {
        if (containerResult.statusCode === 404) {
            return objectNotFound(`Repository '${repositoryId}' not found`);
        }
        if (containerResult.statusCode === 403 || containerResult.statusCode === 401) {
            return permissionDenied('Access denied to repository');
        }
        return runtimeError(containerResult.error?.message);
    }
    if (containerResult.data?.containerTypeId !== containerTypeId) {
        return objectNotFound(`Repository '${repositoryId}' not found in this container type`);
    }

    // Dispatch based on HTTP method
    if (request.method === 'GET') {
        return handleGet(request, context, graphAccessToken, repositoryId, path);
    } else if (request.method === 'POST') {
        return handlePost(request, context, graphAccessToken, repositoryId, path);
    }

    return invalidArgument(`Unsupported method: ${request.method}`);
}

/**
 * Handles GET requests
 */
async function handleGet(
    request: HttpRequest,
    context: InvocationContext,
    accessToken: string,
    repositoryId: string,
    path: string
): Promise<HttpResponseInit> {
    const cmisselector = request.query.get('cmisselector') || 'object';
    const succinct = request.query.get('succinct') !== 'false';
    const includeAllowableActions = (request.query.get('includeAllowableActions') || '').toLowerCase() === 'true';
    const includeACL = (request.query.get('includeACL') || '').toLowerCase() === 'true';
    // CMIS clients (e.g. cmislib) address any already-known object via an
    // `objectId` query parameter rather than by path, even when the request
    // lands on this path-based route (Azure Functions routes a bare `/root`
    // request with no extra segment here rather than to the `rootFolder`
    // function). When present, objectId takes priority over path.
    const objectId = request.query.get('objectId');

    context.log(`GET path='${path}' objectId=${objectId ?? ''} cmisselector=${cmisselector}`);

    if (objectId) {
        switch (cmisselector) {
            case 'object':
                return handleGetObjectById(accessToken, repositoryId, objectId, succinct, includeAllowableActions, includeACL);

            case 'children':
                return handleGetChildrenById(request, accessToken, repositoryId, objectId, succinct, includeAllowableActions);

            case 'content':
                return handleGetContentById(accessToken, repositoryId, objectId);

            default:
                return notSupported(`Selector '${cmisselector}' is not supported`);
        }
    }

    switch (cmisselector) {
        case 'object':
            return handleGetObject(accessToken, repositoryId, path, succinct, includeAllowableActions, includeACL);

        case 'children':
            return handleGetChildren(request, accessToken, repositoryId, path, succinct, includeAllowableActions);

        case 'content':
            return handleGetContent(accessToken, repositoryId, path);

        default:
            return notSupported(`Selector '${cmisselector}' is not supported`);
    }
}

/**
 * Gets object properties by objectId
 */
async function handleGetObjectById(
    accessToken: string,
    repositoryId: string,
    objectId: string,
    succinct: boolean,
    includeAllowableActions: boolean,
    includeACL: boolean = false
): Promise<HttpResponseInit> {
    const result = await getDriveItem(accessToken, repositoryId, objectId);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    const objectData = mapDriveItemToObjectData(result.data!, succinct, includeAllowableActions, objectId === 'root');

    if (includeACL) {
        const acl = await fetchObjectAcl(accessToken, repositoryId, objectId);
        if (acl) {
            objectData.acl = acl;
            objectData.exactACL = true;
        }
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Lists children of a folder identified by objectId
 */
async function handleGetChildrenById(
    request: HttpRequest,
    accessToken: string,
    repositoryId: string,
    objectId: string,
    succinct: boolean,
    includeAllowableActions: boolean
): Promise<HttpResponseInit> {
    const maxItems = parseBoundedInt(request.query.get('maxItems'), 100, 1000);
    const skipCount = parseBoundedInt(request.query.get('skipCount'), 0);
    if (maxItems === undefined || skipCount === undefined) {
        return invalidArgument('maxItems and skipCount must be non-negative integers');
    }

    const result = await listChildren(accessToken, repositoryId, objectId, maxItems, skipCount);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Folder '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    const items = result.data?.value || [];
    const hasMoreItems = !!result.data?.['@odata.nextLink'];
    const numItems = result.data?.['@odata.count'];

    const objectList = mapDriveItemsToObjectList(items, hasMoreItems, numItems, succinct, includeAllowableActions);

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectList,
    };
}

/**
 * Gets file content by objectId
 */
async function handleGetContentById(
    accessToken: string,
    repositoryId: string,
    objectId: string
): Promise<HttpResponseInit> {
    const itemResult = await getDriveItem(accessToken, repositoryId, objectId);

    if (!itemResult.success) {
        if (itemResult.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (itemResult.statusCode === 403 || itemResult.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(itemResult.error?.message);
    }

    const item = itemResult.data!;

    if (item.folder) {
        return invalidArgument('Cannot get content of a folder');
    }

    const contentResult = await getFileContent(accessToken, repositoryId, item.id!);

    if (!contentResult.success) {
        return runtimeError(contentResult.error?.message);
    }

    const contentBuffer = Buffer.from(contentResult.data!);
    const mimeType = item.file?.mimeType || 'application/octet-stream';

    return {
        status: 200,
        headers: {
            'Content-Type': mimeType,
            'Content-Length': contentBuffer.length.toString(),
            'Content-Disposition': `inline; filename="${item.name}"`,
        },
        body: contentBuffer,
    };
}

/**
 * Gets object properties by path
 */
async function handleGetObject(
    accessToken: string,
    repositoryId: string,
    path: string,
    succinct: boolean,
    includeAllowableActions: boolean,
    includeACL: boolean = false
): Promise<HttpResponseInit> {
    const result = await getDriveItemByPath(accessToken, repositoryId, path);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object not found at path: ${path}`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    const isRoot = !path || path === '' || path === '/';
    const objectData = mapDriveItemToObjectData(result.data!, succinct, includeAllowableActions, isRoot);

    if (includeACL) {
        const acl = await fetchObjectAcl(accessToken, repositoryId, result.data!.id!);
        if (acl) {
            objectData.acl = acl;
            objectData.exactACL = true;
        }
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Lists children of a folder by path
 */
async function handleGetChildren(
    request: HttpRequest,
    accessToken: string,
    repositoryId: string,
    path: string,
    succinct: boolean,
    includeAllowableActions: boolean
): Promise<HttpResponseInit> {
    const maxItems = parseBoundedInt(request.query.get('maxItems'), 100, 1000);
    const skipCount = parseBoundedInt(request.query.get('skipCount'), 0);
    if (maxItems === undefined || skipCount === undefined) {
        return invalidArgument('maxItems and skipCount must be non-negative integers');
    }

    const result = await listChildrenByPath(accessToken, repositoryId, path, maxItems, skipCount);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Folder not found at path: ${path}`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    const items = result.data?.value || [];
    const hasMoreItems = !!result.data?.['@odata.nextLink'];
    const numItems = result.data?.['@odata.count'];

    const objectList = mapDriveItemsToObjectList(items, hasMoreItems, numItems, succinct, includeAllowableActions);

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectList,
    };
}

/**
 * Gets file content by path
 */
async function handleGetContent(
    accessToken: string,
    repositoryId: string,
    path: string
): Promise<HttpResponseInit> {
    // First get the item to check if it's a file and get metadata
    const itemResult = await getDriveItemByPath(accessToken, repositoryId, path);

    if (!itemResult.success) {
        if (itemResult.statusCode === 404) {
            return objectNotFound(`Object not found at path: ${path}`);
        }
        if (itemResult.statusCode === 403 || itemResult.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(itemResult.error?.message);
    }

    const item = itemResult.data!;

    // Check if it's a folder (folders don't have content)
    if (item.folder) {
        return invalidArgument('Cannot get content of a folder');
    }

    // Get the file content
    const contentResult = await getFileContent(accessToken, repositoryId, item.id!);

    if (!contentResult.success) {
        return runtimeError(contentResult.error?.message);
    }

    const contentBuffer = Buffer.from(contentResult.data!);
    const mimeType = item.file?.mimeType || 'application/octet-stream';

    return {
        status: 200,
        headers: {
            'Content-Type': mimeType,
            'Content-Length': contentBuffer.length.toString(),
            'Content-Disposition': `inline; filename="${item.name}"`,
        },
        body: contentBuffer,
    };
}

/**
 * Handles POST requests
 */
async function handlePost(
    request: HttpRequest,
    context: InvocationContext,
    accessToken: string,
    repositoryId: string,
    path: string
): Promise<HttpResponseInit> {
    // Parse the form data or body to get cmisaction
    const contentType = request.headers.get('content-type') || '';
    context.log(`POST content-type: ${contentType}, content-length: ${request.headers.get('content-length')}, transfer-encoding: ${request.headers.get('transfer-encoding')}`);
    
    // cmisaction may arrive as a query param even on POST (some Browser Binding
    // clients, e.g. OpenCMIS Workbench, do this), so it's always the fallback.
    let cmisaction: string | null = request.query.get('cmisaction');
    let formData: Map<string, string> = new Map();
    let fileContent: Buffer | null = null;
    let fileName: string | null = null;
    let mimeType: string = 'application/octet-stream';

    if (contentType.includes('multipart/form-data')) {
        // Handle multipart form data (file uploads)
        context.log('Parsing multipart form data...');
        const parsed = await parseMultipartForm(request, context);
        cmisaction = parsed.fields.get('cmisaction') || cmisaction;
        formData = parsed.fields;
        fileContent = parsed.fileContent;
        fileName = parsed.fileName;
        mimeType = parsed.mimeType || mimeType;
        context.log(`Parsed fields: ${JSON.stringify([...formData.entries()])}`);
        context.log(`File: name=${fileName}, size=${fileContent?.length || 0}`);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle URL-encoded form data
        context.log('Parsing URL-encoded form data...');
        const body = await request.text();
        context.log(`Body length: ${body.length}`);
        const params = new URLSearchParams(body);
        cmisaction = params.get('cmisaction') || cmisaction;
        params.forEach((value, key) => formData.set(key, value));
    } else {
        context.log('No recognized form content-type, using query params only...');
    }

    if (!cmisaction) {
        context.log('ERROR: cmisaction not found in request');
        return invalidArgument('cmisaction is required');
    }

    context.log(`POST path='${path}' cmisaction=${cmisaction}`);

    switch (cmisaction) {
        case 'createDocument':
            return handleCreateDocument(formData, fileContent, fileName, mimeType, accessToken, repositoryId, path);

        case 'createFolder':
            return handleCreateFolder(formData, accessToken, repositoryId, path);

        case 'setContent':
            // cmislib identifies the target document via `objectId` (id-based),
            // falling back to the path-based lookup for direct path addressing.
            return formData.get('objectId')
                ? handleSetContentAction(formData, fileContent, mimeType, accessToken, repositoryId)
                : handleSetContent(fileContent, mimeType, accessToken, repositoryId, path);

        case 'delete':
            return handleDeleteAction(formData, accessToken, repositoryId);

        case 'deleteTree':
            return handleDeleteTreeAction(formData, accessToken, repositoryId);

        case 'update':
            return handleUpdatePropertiesAction(formData, accessToken, repositoryId);

        case 'move':
            return handleMoveAction(formData, accessToken, repositoryId);

        case 'checkOut':
            return handleCheckOutAction(formData, accessToken, repositoryId);

        case 'cancelCheckOut':
            return handleCancelCheckOutAction(formData, accessToken, repositoryId);

        case 'checkin':
            return handleCheckInAction(formData, fileContent, mimeType, accessToken, repositoryId);

        case 'applyACL':
            return handleApplyAclAction(formData, accessToken, repositoryId);

        default:
            return notSupported(`Action '${cmisaction}' is not supported`);
    }
}

/**
 * Creates a new document (file) in the specified folder path
 */
async function handleCreateDocument(
    formData: Map<string, string>,
    fileContent: Buffer | null,
    fileName: string | null,
    mimeType: string,
    accessToken: string,
    repositoryId: string,
    folderPath: string
): Promise<HttpResponseInit> {
    // cmislib identifies the parent folder via `objectId` (id-based) once its
    // ID is known, falling back to path-based resolution otherwise.
    let parentId = formData.get('objectId');
    if (!parentId) {
        const parentResult = await getDriveItemByPath(accessToken, repositoryId, folderPath);

        if (!parentResult.success) {
            if (parentResult.statusCode === 404) {
                return objectNotFound(`Folder not found at path: ${folderPath}`);
            }
            return runtimeError(parentResult.error?.message);
        }

        const parentFolder = parentResult.data!;

        if (!parentFolder.folder) {
            return invalidArgument('Cannot create document in a non-folder object');
        }

        parentId = parentFolder.id!;
    }

    // Get the file name from properties or form data
    const name = getPropertyValue(formData, 'cmis:name') || fileName;
    
    if (!name) {
        return invalidArgument('Document name (cmis:name) is required');
    }

    // Content is optional for createDocument (can set later)
    const content = fileContent || Buffer.alloc(0);

    const result = await createFile(accessToken, repositoryId, parentId, name, content, mimeType);

    if (!result.success) {
        if (result.statusCode === 409) {
            return {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: { exception: 'contentAlreadyExists', message: `Document '${name}' already exists` },
            };
        }
        return runtimeError(result.error?.message);
    }

    const objectData = mapCreatedItemToObjectData(result.data!);

    return {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Creates a new folder in the specified folder path
 */
async function handleCreateFolder(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string,
    folderPath: string
): Promise<HttpResponseInit> {
    // cmislib identifies the parent folder via `objectId` (id-based) once its
    // ID is known, falling back to path-based resolution otherwise.
    let parentId = formData.get('objectId');
    if (!parentId) {
        const parentResult = await getDriveItemByPath(accessToken, repositoryId, folderPath);

        if (!parentResult.success) {
            if (parentResult.statusCode === 404) {
                return objectNotFound(`Folder not found at path: ${folderPath}`);
            }
            return runtimeError(parentResult.error?.message);
        }

        const parentFolder = parentResult.data!;

        if (!parentFolder.folder) {
            return invalidArgument('Cannot create folder in a non-folder object');
        }

        parentId = parentFolder.id!;
    }

    const name = getPropertyValue(formData, 'cmis:name');
    
    if (!name) {
        return invalidArgument('Folder name (cmis:name) is required');
    }

    const result = await createFolder(accessToken, repositoryId, parentId, name);

    if (!result.success) {
        if (result.statusCode === 409) {
            return {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: { exception: 'contentAlreadyExists', message: `Folder '${name}' already exists` },
            };
        }
        return runtimeError(result.error?.message);
    }

    const objectData = mapCreatedItemToObjectData(result.data!);

    return {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Sets (replaces) the content of an existing file
 */
async function handleSetContent(
    fileContent: Buffer | null,
    mimeType: string,
    accessToken: string,
    repositoryId: string,
    path: string
): Promise<HttpResponseInit> {
    if (!fileContent) {
        return invalidArgument('Content is required for setContent');
    }

    // Get the existing file
    const itemResult = await getDriveItemByPath(accessToken, repositoryId, path);
    
    if (!itemResult.success) {
        if (itemResult.statusCode === 404) {
            return objectNotFound(`Document not found at path: ${path}`);
        }
        return runtimeError(itemResult.error?.message);
    }

    const item = itemResult.data!;
    
    if (item.folder) {
        return invalidArgument('Cannot set content on a folder');
    }

    const result = await setFileContent(accessToken, repositoryId, item.id!, fileContent, mimeType);

    if (!result.success) {
        return runtimeError(result.error?.message);
    }

    const objectData = mapCreatedItemToObjectData(result.data!);

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Extracts a CMIS property value from form data.
 */
function getPropertyValue(formData: Map<string, string>, propertyId: string): string | null {
    // Try direct property name first
    if (formData.has(propertyId)) {
        return formData.get(propertyId)!;
    }

    // Look through indexed properties
    let index = 0;
    while (formData.has(`propertyId[${index}]`)) {
        if (formData.get(`propertyId[${index}]`) === propertyId) {
            return formData.get(`propertyValue[${index}]`) || null;
        }
        index++;
    }

    return null;
}

/**
 * Parses multipart form data from the request.
 * Manual implementation since request.formData() may not work correctly in all cases.
 */
async function parseMultipartForm(request: HttpRequest, context?: InvocationContext): Promise<{
    fields: Map<string, string>;
    fileContent: Buffer | null;
    fileName: string | null;
    mimeType: string | null;
}> {
    const fields = new Map<string, string>();
    let fileContent: Buffer | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;

    try {
        // First try the native formData() method
        const formData = await request.formData();
        const entries = [...formData.entries()];
        context?.log(`FormData entries count: ${entries.length}`);
        
        if (entries.length > 0) {
            for (const [key, value] of entries) {
                // Check if it's a file-like object (has arrayBuffer method and name property)
                const isFile = value && typeof value === 'object' && 'arrayBuffer' in value && 'name' in value;
                context?.log(`FormData entry: key=${key}, type=${isFile ? 'File' : 'string'}`);
                if (isFile) {
                    const fileValue = value as { name: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> };
                    fileName = fileValue.name;
                    mimeType = fileValue.type || null;
                    fileContent = Buffer.from(await fileValue.arrayBuffer());
                    context?.log(`File parsed: name=${fileName}, type=${mimeType}, size=${fileContent.length}`);
                } else {
                    fields.set(key, String(value));
                    context?.log(`Field parsed: ${key}=${String(value)}`);
                }
            }
            return { fields, fileContent, fileName, mimeType };
        }
    } catch (error) {
        context?.log(`Native formData() failed: ${error}, trying manual parse...`);
    }

    // Fallback: Manual multipart parsing
    try {
        const contentType = request.headers.get('content-type') || '';
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (!boundaryMatch) {
            context?.log('No boundary found in content-type');
            return { fields, fileContent, fileName, mimeType };
        }
        
        const boundary = boundaryMatch[1] || boundaryMatch[2];
        context?.log(`Parsing with boundary: ${boundary}`);
        
        const body = Buffer.from(await request.arrayBuffer());
        context?.log(`Body size: ${body.length} bytes`);
        
        const parts = splitMultipartBody(body, boundary);
        context?.log(`Found ${parts.length} parts`);
        
        for (const part of parts) {
            const { headers, content } = parseMultipartPart(part);
            const disposition = headers.get('content-disposition') || '';
            
            const nameMatch = disposition.match(/name="([^"]+)"/);
            const filenameMatch = disposition.match(/filename="([^"]+)"/);
            
            if (nameMatch) {
                const fieldName = nameMatch[1];
                
                if (filenameMatch) {
                    // This is a file field
                    fileName = filenameMatch[1];
                    mimeType = headers.get('content-type') || 'application/octet-stream';
                    fileContent = content;
                    context?.log(`Manual parse - File: name=${fileName}, type=${mimeType}, size=${content.length}`);
                } else {
                    // This is a regular field
                    const value = content.toString('utf-8').trim();
                    fields.set(fieldName, value);
                    context?.log(`Manual parse - Field: ${fieldName}=${value}`);
                }
            }
        }
    } catch (error) {
        context?.log(`Manual multipart parsing failed: ${error}`);
    }

    return { fields, fileContent, fileName, mimeType };
}

/**
 * Splits a multipart body into individual parts based on the boundary.
 */
function splitMultipartBody(body: Buffer, boundary: string): Buffer[] {
    const parts: Buffer[] = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundary = Buffer.from(`--${boundary}--`);
    
    let start = 0;
    let pos = body.indexOf(boundaryBuffer, start);
    
    while (pos !== -1) {
        // Skip the first boundary
        if (start > 0) {
            // Extract content between boundaries (excluding CRLF before boundary)
            let end = pos;
            if (body[end - 2] === 0x0D && body[end - 1] === 0x0A) {
                end -= 2;
            }
            if (end > start) {
                parts.push(body.subarray(start, end));
            }
        }
        
        // Move past the boundary and CRLF
        start = pos + boundaryBuffer.length;
        if (body[start] === 0x0D && body[start + 1] === 0x0A) {
            start += 2;
        }
        
        // Check for end boundary
        if (body.subarray(pos, pos + endBoundary.length).equals(endBoundary)) {
            break;
        }
        
        pos = body.indexOf(boundaryBuffer, start);
    }
    
    return parts;
}

/**
 * Parses a single multipart part into headers and content.
 */
function parseMultipartPart(part: Buffer): { headers: Map<string, string>; content: Buffer } {
    const headers = new Map<string, string>();
    
    // Find the blank line separating headers from content
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) {
        return { headers, content: part };
    }
    
    // Parse headers
    const headerSection = part.subarray(0, headerEnd).toString('utf-8');
    const headerLines = headerSection.split('\r\n');
    
    for (const line of headerLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const name = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            headers.set(name, value);
        }
    }
    
    // Content starts after headers + blank line
    const content = part.subarray(headerEnd + 4);
    
    return { headers, content };
}

// Register the Azure Function
// Note: {*path} captures the entire remaining path including slashes
app.http('objectByPath', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser/{repositoryId}/root/{*path}',
    handler: objectByPath
});
