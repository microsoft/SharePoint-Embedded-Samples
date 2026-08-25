/**
 * Shared CMIS Object Action Handlers
 *
 * These handlers implement the id-based CMIS Browser Binding object actions
 * (delete, deleteTree, update/updateProperties, move) per CMIS 1.1 spec
 * section 5.4. Per the Browser Binding convention (and confirmed against
 * cmislib's implementation), these actions are always POSTed to the
 * repository's root folder URL with the target identified by an `objectId`
 * form field, regardless of where the object actually lives in the folder
 * hierarchy. Both the `root` and `root/{path}` routes delegate to these
 * shared handlers so the behavior is consistent no matter which route a
 * client happens to hit.
 */

import { HttpResponseInit } from '@azure/functions';
import {
    deleteDriveItem,
    updateDriveItem,
    moveDriveItem,
    setFileContent,
    getDriveItem,
    listChildren,
    checkoutDriveItem,
    checkinDriveItem,
    discardCheckoutDriveItem,
    getItemPermissions,
    addItemPermission,
    removeItemPermission,
} from '../graph/driveItemService';
import { mapDriveItemToObjectData, mapCreatedItemToObjectData } from './objectMapper';
import { mapPermissionsToAcl, mapCmisPermissionsToGraphRole } from './aclMapper';
import { Acl } from '../types/cmis';
import {
    objectNotFound,
    permissionDenied,
    invalidArgument,
    constraintViolation,
    versioningError,
    runtimeError,
} from './errors';

/**
 * Extracts a CMIS property value from form data.
 * CMIS Browser Binding sends properties as propertyId[0], propertyValue[0], etc.
 */
function getPropertyValue(formData: Map<string, string>, propertyId: string): string | null {
    if (formData.has(propertyId)) {
        return formData.get(propertyId)!;
    }

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
 * Handles cmisaction=delete: deletes a single object by objectId.
 * Per CMIS spec, `delete` (unlike `deleteTree`) must fail with a constraint
 * violation if the target is a non-empty folder - it does not recursively
 * delete descendants.
 */
export async function handleDeleteAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

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

    if (itemResult.data?.folder) {
        const childrenResult = await listChildren(accessToken, repositoryId, objectId, 1, 0);
        if (childrenResult.success && (childrenResult.data?.value?.length || 0) > 0) {
            return constraintViolation(`Folder '${objectId}' is not empty; use deleteTree to remove it and its descendants`);
        }
    }

    const result = await deleteDriveItem(accessToken, repositoryId, objectId);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    return { status: 200 };
}

/**
 * Handles cmisaction=deleteTree: deletes a folder and all its descendants.
 * SPE/OneDrive folder deletion is inherently recursive, so this reuses the
 * same Graph delete call as handleDeleteAction.
 */
export async function handleDeleteTreeAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

    const result = await deleteDriveItem(accessToken, repositoryId, objectId);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    // Per CMIS spec, deleteTree returns the list of object IDs that could
    // NOT be deleted. Empty array indicates full success.
    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { ids: [] },
    };
}

/**
 * Handles cmisaction=update (updateProperties): currently supports renaming
 * via the cmis:name property, which is the only writable CMIS property that
 * maps directly onto a DriveItem field.
 */
export async function handleUpdatePropertiesAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

    const name = getPropertyValue(formData, 'cmis:name');
    const updates: Record<string, unknown> = {};
    if (name) {
        updates.name = name;
    }

    const result = await updateDriveItem(accessToken, repositoryId, objectId, updates);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: mapDriveItemToObjectData(result.data!, true, false),
    };
}

/**
 * Handles cmisaction=move: moves an object into a new parent folder.
 */
export async function handleMoveAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    const targetFolderId = formData.get('targetFolderId');

    if (!objectId || !targetFolderId) {
        return invalidArgument('objectId and targetFolderId are required');
    }

    const result = await moveDriveItem(accessToken, repositoryId, objectId, targetFolderId);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: mapDriveItemToObjectData(result.data!, true, false),
    };
}

/**
 * Handles cmisaction=setContent (id-based): replaces the content stream of
 * an existing document identified by `objectId`.
 */
export async function handleSetContentAction(
    formData: Map<string, string>,
    fileContent: Buffer | null,
    mimeType: string,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }
    if (!fileContent) {
        return invalidArgument('Content is required for setContent');
    }

    const result = await setFileContent(accessToken, repositoryId, objectId, fileContent, mimeType);

    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 403 || result.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(result.error?.message);
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: mapCreatedItemToObjectData(result.data!),
    };
}

/**
 * Handles cmisaction=checkOut: checks out a document via Graph, preventing
 * other users from editing it until it's checked back in. Since SPE/Graph
 * doesn't create a separate PWC object (unlike some CMIS repositories),
 * this returns the same object; the checked-out state is reflected via
 * Graph's `publication` facet (see objectMapper.ts).
 */
export async function handleCheckOutAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

    const checkoutResult = await checkoutDriveItem(accessToken, repositoryId, objectId);
    if (!checkoutResult.success) {
        if (checkoutResult.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (checkoutResult.statusCode === 403 || checkoutResult.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(checkoutResult.error?.message);
    }

    const itemResult = await getDriveItem(accessToken, repositoryId, objectId);
    if (!itemResult.success) {
        return runtimeError(itemResult.error?.message);
    }

    const objectData = mapDriveItemToObjectData(itemResult.data!, true, false);
    // cmis:isVersionSeriesCheckedOut is derived from Graph's publication
    // facet by the mapper; we additionally surface the checked-out-by id,
    // which Graph doesn't map onto any existing CMIS property.
    if (objectData.succinctProperties) {
        objectData.succinctProperties['cmis:versionSeriesCheckedOutId'] = objectId;
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: objectData,
    };
}

/**
 * Handles cmisaction=cancelCheckOut: discards a checkout via Graph, undoing
 * any changes made while the document was checked out.
 */
export async function handleCancelCheckOutAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

    const result = await discardCheckoutDriveItem(accessToken, repositoryId, objectId);
    if (!result.success) {
        if (result.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (result.statusCode === 400) {
            return invalidArgument('Object is not checked out');
        }
        if (result.statusCode === 403 || result.statusCode === 401 || result.statusCode === 423) {
            return permissionDenied('Access denied, or object is checked out by another user');
        }
        return runtimeError(result.error?.message);
    }

    return { status: 200 };
}

/**
 * Handles cmisaction=checkin: checks in a previously checked-out document
 * via Graph, optionally updating its content and/or properties (e.g.
 * cmis:name) beforehand. Verifies the object is actually checked out first,
 * so a doomed check-in can't leave behind partially-applied content/name
 * changes on a document that was never a PWC.
 */
export async function handleCheckInAction(
    formData: Map<string, string>,
    fileContent: Buffer | null,
    mimeType: string,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

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
    if (itemResult.data?.publication?.level !== 'checkout') {
        return versioningError(`Object '${objectId}' is not checked out`);
    }

    if (fileContent) {
        const contentResult = await setFileContent(accessToken, repositoryId, objectId, fileContent, mimeType);
        if (!contentResult.success) {
            return runtimeError(contentResult.error?.message);
        }
    }

    const name = getPropertyValue(formData, 'cmis:name');
    if (name) {
        const updateResult = await updateDriveItem(accessToken, repositoryId, objectId, { name });
        if (!updateResult.success) {
            return runtimeError(updateResult.error?.message);
        }
    }

    const checkinComment = formData.get('checkinComment') || undefined;
    const checkinResult = await checkinDriveItem(accessToken, repositoryId, objectId, checkinComment);
    if (!checkinResult.success) {
        if (checkinResult.statusCode === 404) {
            return objectNotFound(`Object '${objectId}' not found`);
        }
        if (checkinResult.statusCode === 403 || checkinResult.statusCode === 401) {
            return permissionDenied('Access denied');
        }
        return runtimeError(checkinResult.error?.message);
    }

    const finalItemResult = await getDriveItem(accessToken, repositoryId, objectId);
    if (!finalItemResult.success) {
        return runtimeError(finalItemResult.error?.message);
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: mapDriveItemToObjectData(finalItemResult.data!, true, false),
    };
}

/**
 * Fetches and maps the ACL for an object. Used by the `object` selector
 * when a client passes `includeACL=true` (per CMIS 1.1 spec, gated by the
 * repository's capabilityACL being 'discover' or 'manage').
 */
export async function fetchObjectAcl(
    accessToken: string,
    repositoryId: string,
    objectId: string
): Promise<Acl | null> {
    const result = await getItemPermissions(accessToken, repositoryId, objectId);
    if (!result.success || !result.data) {
        return null;
    }
    return mapPermissionsToAcl(result.data.value);
}

/**
 * Parses the indexed addACEPrincipal[i]/addACEPermission[i][j] and
 * removeACEPrincipal[i]/removeACEPermission[i][j] fields cmislib sends for
 * cmisaction=applyACL.
 */
function parseAceFields(
    formData: Map<string, string>,
    principalPrefix: string,
    permissionPrefix: string
): Array<{ principalId: string; permissions: string[] }> {
    const entries: Array<{ principalId: string; permissions: string[] }> = [];
    let i = 0;
    while (formData.has(`${principalPrefix}[${i}]`)) {
        const principalId = formData.get(`${principalPrefix}[${i}]`)!;
        const permissions: string[] = [];
        let j = 0;
        while (formData.has(`${permissionPrefix}[${i}][${j}]`)) {
            permissions.push(formData.get(`${permissionPrefix}[${i}][${j}]`)!);
            j++;
        }
        entries.push({ principalId, permissions });
        i++;
    }
    return entries;
}

/**
 * Handles cmisaction=applyACL: grants/revokes access on a drive item via
 * Graph's invite/permissions APIs. Principal ids are expected to be an
 * email/UPN (needed to grant new access via Graph's /invite endpoint) -
 * this is a best-effort mapping since Graph's sharing model doesn't have
 * a 1:1 equivalent of arbitrary CMIS ACEs.
 */
export async function handleApplyAclAction(
    formData: Map<string, string>,
    accessToken: string,
    repositoryId: string
): Promise<HttpResponseInit> {
    const objectId = formData.get('objectId');
    if (!objectId) {
        return invalidArgument('objectId is required');
    }

    const toAdd = parseAceFields(formData, 'addACEPrincipal', 'addACEPermission');
    const toRemove = parseAceFields(formData, 'removeACEPrincipal', 'removeACEPermission');

    for (const entry of toAdd) {
        const role = mapCmisPermissionsToGraphRole(entry.permissions);
        const result = await addItemPermission(accessToken, repositoryId, objectId, entry.principalId, role);
        if (!result.success) {
            if (result.statusCode === 404) {
                return objectNotFound(`Object '${objectId}' not found`);
            }
            if (result.statusCode === 403 || result.statusCode === 401) {
                return permissionDenied('Access denied');
            }
            return runtimeError(result.error?.message || `Failed to grant access to '${entry.principalId}'`);
        }
    }

    if (toRemove.length > 0) {
        const permissionsResult = await getItemPermissions(accessToken, repositoryId, objectId);
        if (!permissionsResult.success) {
            return runtimeError(permissionsResult.error?.message);
        }
        for (const entry of toRemove) {
            const match = (permissionsResult.data?.value || []).find(
                p =>
                    p.invitation?.email === entry.principalId ||
                    p.grantedToV2?.user?.id === entry.principalId ||
                    p.grantedToV2?.user?.displayName === entry.principalId
            );
            if (match?.id) {
                const removeResult = await removeItemPermission(accessToken, repositoryId, objectId, match.id);
                if (!removeResult.success) {
                    return runtimeError(removeResult.error?.message || `Failed to revoke access for '${entry.principalId}'`);
                }
            }
        }
    }

    const finalAcl = await fetchObjectAcl(accessToken, repositoryId, objectId);
    if (!finalAcl) {
        return runtimeError('Failed to read back the updated ACL');
    }

    return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: finalAcl,
    };
}
