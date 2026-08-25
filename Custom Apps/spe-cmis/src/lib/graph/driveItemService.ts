/**
 * Drive Item Operations for Microsoft Graph
 * 
 * Provides methods for file/folder operations within SPE containers.
 * All operations use delegated permissions with user context.
 * 
 * IMPORTANT: SPE containers require using /drives/{driveId} endpoints
 * for many operations, as /storage/fileStorage/containers/{containerId}/drive
 * endpoints have limitations with AAD accounts.
 */

import { Client } from '@microsoft/microsoft-graph-client';
import type { DriveItem, Drive, Permission } from '@microsoft/microsoft-graph-types';
import { createGraphClient, GraphResult, GraphCollection } from './graphService';

/**
 * Cache for container drive IDs to avoid repeated lookups
 */
const driveIdCache = new Map<string, string>();

/**
 * Fields selected on DriveItem reads. Explicit so that `publication` (the
 * checkout/checked-in state facet, used to reflect real versioning state in
 * objectMapper.ts) is included - Graph omits it unless requested.
 */
const DRIVE_ITEM_SELECT =
    'id,name,size,file,folder,parentReference,createdBy,createdDateTime,lastModifiedBy,lastModifiedDateTime,eTag,publication';

/**
 * Gets the drive ID for a container.
 * Uses caching to avoid repeated lookups.
 */
async function getDriveId(client: Client, containerId: string): Promise<string> {
    // Check cache first
    const cached = driveIdCache.get(containerId);
    if (cached) {
        return cached;
    }
    
    // Fetch drive info to get the ID
    const response = await client
        .api(`/storage/fileStorage/containers/${containerId}/drive`)
        .select('id')
        .get() as Drive;
    
    const driveId = response.id!;
    driveIdCache.set(containerId, driveId);
    return driveId;
}

/**
 * Gets the root folder of a container's drive.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function getDriveRoot(
    accessToken: string,
    containerId: string
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        const response = await client
            .api(`/drives/${driveId}/root`)
            .select(DRIVE_ITEM_SELECT)
            .get();

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Gets a drive item by its ID.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function getDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        // Use different endpoint for root vs specific item ID
        const endpoint = itemId === 'root'
            ? `/drives/${driveId}/root`
            : `/drives/${driveId}/items/${itemId}`;
        
        const response = await client
            .api(endpoint)
            .select(DRIVE_ITEM_SELECT)
            .get();

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Gets a drive item by path relative to root.
 * 
 * @param path - Path relative to root (e.g., "folder1/folder2/file.txt")
 */
export async function getDriveItemByPath(
    accessToken: string,
    containerId: string,
    path: string
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        // If path is empty, use root endpoint directly
        if (!path || path === '' || path === '/') {
            const response = await client
                .api(`/drives/${driveId}/root`)
                .select(DRIVE_ITEM_SELECT)
                .get();
            return {
                success: true,
                data: response as DriveItem,
            };
        }
        
        // Ensure path starts with /
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        
        const response = await client
            .api(`/drives/${driveId}/root:${normalizedPath}`)
            .select(DRIVE_ITEM_SELECT)
            .get();

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Lists children of a folder.
 * Uses /drives/{driveId} endpoints for AAD account compatibility.
 * 
 * @param itemId - The folder's item ID, or "root" for the root folder
 * @param top - Maximum number of items to return
 * @param skip - Number of items to skip
 */
export async function listChildren(
    accessToken: string,
    containerId: string,
    itemId: string,
    top?: number,
    skip?: number
): Promise<GraphResult<GraphCollection<DriveItem>>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        // Use different endpoint for root vs specific item ID
        const endpoint = itemId === 'root'
            ? `/drives/${driveId}/root/children`
            : `/drives/${driveId}/items/${itemId}/children`;
        
        let request = client.api(endpoint).select(DRIVE_ITEM_SELECT);

        if (top !== undefined && top > 0) {
            request = request.top(top);
        }

        if (skip !== undefined && skip > 0) {
            request = request.skip(skip);
        }

        const response = await request.get();

        return {
            success: true,
            data: response as GraphCollection<DriveItem>,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Lists children of a folder by path.
 * Uses /drives/{driveId} endpoints for AAD account compatibility.
 */
export async function listChildrenByPath(
    accessToken: string,
    containerId: string,
    path: string,
    top?: number,
    skip?: number
): Promise<GraphResult<GraphCollection<DriveItem>>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        // If path is empty, use root/children endpoint directly
        let endpoint: string;
        if (!path || path === '' || path === '/') {
            endpoint = `/drives/${driveId}/root/children`;
        } else {
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            endpoint = `/drives/${driveId}/root:${normalizedPath}:/children`;
        }
        
        let request = client.api(endpoint).select(DRIVE_ITEM_SELECT);

        if (top !== undefined && top > 0) {
            request = request.top(top);
        }

        if (skip !== undefined && skip > 0) {
            request = request.skip(skip);
        }

        const response = await request.get();

        return {
            success: true,
            data: response as GraphCollection<DriveItem>,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Creates a new folder.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 * 
 * @param parentId - Parent folder ID, or "root" for root folder
 * @param name - Name of the new folder
 */
export async function createFolder(
    accessToken: string,
    containerId: string,
    parentId: string,
    name: string
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        const folder = {
            name,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
        };

        // Use different endpoint for root vs specific item ID
        const endpoint = parentId === 'root'
            ? `/drives/${driveId}/root/children`
            : `/drives/${driveId}/items/${parentId}/children`;

        const response = await client
            .api(endpoint)
            .post(folder);

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Creates a new file with content.
 * For small files (< 4MB), uses simple upload.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 * 
 * @param parentId - Parent folder ID, or "root" for root folder
 * @param name - Name of the new file
 * @param content - File content as Buffer
 * @param contentType - MIME type of the content
 */
export async function createFile(
    accessToken: string,
    containerId: string,
    parentId: string,
    name: string,
    content: Buffer,
    contentType: string = 'application/octet-stream'
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        // Use PUT to upload file content directly
        // For root: /drives/{driveId}/root:/{filename}:/content
        // For other folders: /drives/{driveId}/items/{parent-id}:/{filename}:/content
        // @microsoft.graph.conflictBehavior=fail ensures a name collision
        // surfaces as an error instead of silently replacing the existing
        // file's content (Graph's default PUT behavior is to overwrite).
        const endpoint = parentId === 'root'
            ? `/drives/${driveId}/root:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=fail`
            : `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=fail`;
        
        const response = await client
            .api(endpoint)
            .header('Content-Type', contentType)
            .put(content);

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Gets the content of a file.
 * Returns the content as an ArrayBuffer.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function getFileContent(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<ArrayBuffer>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        const response = await client
            .api(`/drives/${driveId}/items/${itemId}/content`)
            .responseType('ArrayBuffer' as any)
            .get();

        return {
            success: true,
            data: response as ArrayBuffer,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Sets (replaces) the content of an existing file.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function setFileContent(
    accessToken: string,
    containerId: string,
    itemId: string,
    content: Buffer,
    contentType: string = 'application/octet-stream'
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);
        
        const response = await client
            .api(`/drives/${driveId}/items/${itemId}/content`)
            .header('Content-Type', contentType)
            .put(content);

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Deletes a drive item (file or folder).
 * For folders, this deletes the entire subtree, which satisfies both the
 * CMIS "delete" and "deleteTree" semantics since SPE/OneDrive folders don't
 * support partial (non-recursive) folder deletion.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function deleteDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<void>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        await client.api(`/drives/${driveId}/items/${itemId}`).delete();

        return { success: true };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Updates properties of a drive item (e.g. rename via `name`).
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function updateDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string,
    updates: Partial<DriveItem>
): Promise<GraphResult<DriveItem>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        const response = await client
            .api(`/drives/${driveId}/items/${itemId}`)
            .patch(updates);

        return {
            success: true,
            data: response as DriveItem,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Moves a drive item to a new parent folder, optionally renaming it.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function moveDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string,
    targetParentId: string,
    newName?: string
): Promise<GraphResult<DriveItem>> {
    const updates: Partial<DriveItem> = {
        parentReference: { id: targetParentId } as DriveItem['parentReference'],
    };
    if (newName) {
        updates.name = newName;
    }
    return updateDriveItem(accessToken, containerId, itemId, updates);
}

/**
 * Checks out a document, preventing other users from editing it until it
 * is checked back in (or the checkout is discarded).
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function checkoutDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<void>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        await client.api(`/drives/${driveId}/items/${itemId}/checkout`).post({});

        return { success: true };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Checks in a previously checked-out document, making the new version
 * available to others.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function checkinDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string,
    comment?: string
): Promise<GraphResult<void>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        await client.api(`/drives/${driveId}/items/${itemId}/checkin`).post({
            comment: comment || '',
        });

        return { success: true };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Discards a checkout, releasing the document and undoing any changes
 * made while it was checked out.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function discardCheckoutDriveItem(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<void>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        await client.api(`/drives/${driveId}/items/${itemId}/discardCheckout`).post({});

        return { success: true };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Lists the permissions (ACL) currently applied to a drive item.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function getItemPermissions(
    accessToken: string,
    containerId: string,
    itemId: string
): Promise<GraphResult<GraphCollection<Permission>>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        const response = await client
            .api(`/drives/${driveId}/items/${itemId}/permissions`)
            .get();

        return {
            success: true,
            data: response as GraphCollection<Permission>,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Grants a principal (identified by email/UPN) access to a drive item.
 * Uses the /invite endpoint since SPE/OneDrive don't support directly
 * creating a Permission resource for an arbitrary AAD principal.
 */
export async function addItemPermission(
    accessToken: string,
    containerId: string,
    itemId: string,
    principalEmail: string,
    role: 'read' | 'write'
): Promise<GraphResult<GraphCollection<Permission>>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        const response = await client
            .api(`/drives/${driveId}/items/${itemId}/invite`)
            .post({
                requireSignIn: true,
                sendInvitation: false,
                roles: [role],
                recipients: [{ email: principalEmail }],
            });

        return {
            success: true,
            data: response as GraphCollection<Permission>,
        };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Removes a previously granted permission from a drive item.
 * Uses /drives/{driveId} endpoint for AAD account compatibility.
 */
export async function removeItemPermission(
    accessToken: string,
    containerId: string,
    itemId: string,
    permissionId: string
): Promise<GraphResult<void>> {
    try {
        const client = createGraphClient(accessToken);
        const driveId = await getDriveId(client, containerId);

        await client.api(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`).delete();

        return { success: true };
    } catch (error: unknown) {
        return handleGraphError(error);
    }
}

/**
 * Handles Graph API errors and converts them to GraphResult format.
 */
function handleGraphError<T>(error: unknown): GraphResult<T> {
    const graphError = error as { statusCode?: number; code?: string; message?: string };
    return {
        success: false,
        error: {
            code: graphError.code || 'UnknownError',
            message: graphError.message || 'An unknown error occurred',
        },
        statusCode: graphError.statusCode,
    };
}
