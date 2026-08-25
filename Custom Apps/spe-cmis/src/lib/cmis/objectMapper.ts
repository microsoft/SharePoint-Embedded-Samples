/**
 * Object Mapper
 * 
 * Maps Microsoft Graph DriveItems to CMIS ObjectData format.
 * Per CMIS 1.1 Browser Binding specification.
 */

import type { DriveItem } from '@microsoft/microsoft-graph-types';
import { ObjectData, ObjectList, SuccinctProperties, PropertyData, CmisPropertyType } from '../types/cmis';

/**
 * CMIS base type IDs
 */
export const CMIS_TYPE_DOCUMENT = 'cmis:document';
export const CMIS_TYPE_FOLDER = 'cmis:folder';

/**
 * Helper to create a full PropertyData object
 */
function createProperty(
    id: string,
    type: CmisPropertyType,
    value: string | number | boolean | unknown[] | null
): PropertyData {
    return {
        id,
        type,
        cardinality: 'single',
        value,
    };
}

/**
 * Derives whether a document's version series is currently checked out from
 * Graph's `publication` facet (populated when the DriveItem read explicitly
 * selects it - see DRIVE_ITEM_SELECT in driveItemService.ts). Falls back to
 * `false` when the facet isn't present rather than assuming checked out.
 */
function isCheckedOut(item: DriveItem): boolean {
    return item.publication?.level === 'checkout';
}

/**
 * Derives a version label from Graph's publication facet when available,
 * falling back to '1.0' since this adapter doesn't track a full version
 * history.
 */
function getVersionLabel(item: DriveItem): string {
    return item.publication?.versionId || '1.0';
}

/**
 * Maps a DriveItem to CMIS full properties format.
 * Full format: property ID -> PropertyData object with metadata.
 *
 * @param item - The DriveItem to map
 * @param isRoot - True when this item is the repository's root folder; used
 * to report the CMIS-required root path of '/' instead of the Graph item's
 * own name-derived path.
 */
export function mapDriveItemToProperties(item: DriveItem, isRoot: boolean = false): Record<string, PropertyData> {
    const isFolder = !!item.folder;
    const baseTypeId = isFolder ? CMIS_TYPE_FOLDER : CMIS_TYPE_DOCUMENT;

    const props: Record<string, PropertyData> = {
        'cmis:objectId': createProperty('cmis:objectId', 'id', item.id!),
        'cmis:objectTypeId': createProperty('cmis:objectTypeId', 'id', baseTypeId),
        'cmis:baseTypeId': createProperty('cmis:baseTypeId', 'id', baseTypeId),
        'cmis:name': createProperty('cmis:name', 'string', item.name!),
        'cmis:createdBy': createProperty('cmis:createdBy', 'string', item.createdBy?.user?.displayName || 'Unknown'),
        'cmis:creationDate': createProperty('cmis:creationDate', 'datetime', item.createdDateTime ? new Date(item.createdDateTime).getTime() : null),
        'cmis:lastModifiedBy': createProperty('cmis:lastModifiedBy', 'string', item.lastModifiedBy?.user?.displayName || 'Unknown'),
        'cmis:lastModificationDate': createProperty('cmis:lastModificationDate', 'datetime', item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).getTime() : null),
        'cmis:changeToken': createProperty('cmis:changeToken', 'string', item.eTag || null),
    };

    if (isFolder) {
        // Folder-specific properties
        const path = isRoot
            ? '/'
            : item.parentReference?.path
                ? `${item.parentReference.path.replace(/^\/drive\/root:?/, '')}/${item.name}`
                : `/${item.name}`;
        props['cmis:path'] = createProperty('cmis:path', 'string', path);
    } else {
        // Document-specific properties
        props['cmis:contentStreamLength'] = createProperty('cmis:contentStreamLength', 'integer', item.size || 0);
        props['cmis:contentStreamMimeType'] = createProperty('cmis:contentStreamMimeType', 'string', item.file?.mimeType || 'application/octet-stream');
        props['cmis:contentStreamFileName'] = createProperty('cmis:contentStreamFileName', 'string', item.name!);
        props['cmis:contentStreamId'] = createProperty('cmis:contentStreamId', 'id', item.id!);
        props['cmis:isLatestVersion'] = createProperty('cmis:isLatestVersion', 'boolean', true);
        props['cmis:isMajorVersion'] = createProperty('cmis:isMajorVersion', 'boolean', true);
        props['cmis:isLatestMajorVersion'] = createProperty('cmis:isLatestMajorVersion', 'boolean', true);
        props['cmis:versionLabel'] = createProperty('cmis:versionLabel', 'string', getVersionLabel(item));
        props['cmis:isVersionSeriesCheckedOut'] = createProperty('cmis:isVersionSeriesCheckedOut', 'boolean', isCheckedOut(item));
    }

    // Parent folder ID
    if (item.parentReference?.id) {
        props['cmis:parentId'] = createProperty('cmis:parentId', 'id', item.parentReference.id);
    }

    return props;
}

/**
 * Maps a DriveItem to CMIS succinct properties format.
 * Succinct format: property ID -> value directly (no metadata).
 *
 * @param item - The DriveItem to map
 * @param isRoot - True when this item is the repository's root folder.
 */
export function mapDriveItemToSuccinctProperties(item: DriveItem, isRoot: boolean = false): SuccinctProperties {
    const isFolder = !!item.folder;
    const baseTypeId = isFolder ? CMIS_TYPE_FOLDER : CMIS_TYPE_DOCUMENT;

    const props: SuccinctProperties = {
        'cmis:objectId': item.id!,
        'cmis:objectTypeId': baseTypeId,
        'cmis:baseTypeId': baseTypeId,
        'cmis:name': item.name!,
        'cmis:createdBy': item.createdBy?.user?.displayName || 'Unknown',
        'cmis:creationDate': item.createdDateTime ? new Date(item.createdDateTime).getTime() : null,
        'cmis:lastModifiedBy': item.lastModifiedBy?.user?.displayName || 'Unknown',
        'cmis:lastModificationDate': item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).getTime() : null,
        'cmis:changeToken': item.eTag || null,
    };

    if (isFolder) {
        // Folder-specific properties
        props['cmis:path'] = isRoot
            ? '/'
            : item.parentReference?.path
                ? `${item.parentReference.path.replace(/^\/drive\/root:?/, '')}/${item.name}`
                : `/${item.name}`;
    } else {
        // Document-specific properties
        props['cmis:contentStreamLength'] = item.size || 0;
        props['cmis:contentStreamMimeType'] = item.file?.mimeType || 'application/octet-stream';
        props['cmis:contentStreamFileName'] = item.name!;
        props['cmis:contentStreamId'] = item.id!;
        props['cmis:isLatestVersion'] = true;
        props['cmis:isMajorVersion'] = true;
        props['cmis:isLatestMajorVersion'] = true;
        props['cmis:versionLabel'] = getVersionLabel(item);
        props['cmis:isVersionSeriesCheckedOut'] = isCheckedOut(item);
    }

    // Parent folder ID
    if (item.parentReference?.id) {
        props['cmis:parentId'] = item.parentReference.id;
    }

    return props;
}

/**
 * Maps a DriveItem to CMIS ObjectData format.
 * 
 * @param item - The DriveItem from Graph API
 * @param succinct - If true, include succinct properties format (default: true)
 * @param includeAllowableActions - If true, include allowable actions
 */
export function mapDriveItemToObjectData(
    item: DriveItem,
    succinct: boolean = true,
    includeAllowableActions: boolean = false,
    isRoot: boolean = false
): ObjectData {
    const objectData: ObjectData = {
        // Always include full properties - cmislib needs this
        properties: mapDriveItemToProperties(item, isRoot),
    };

    if (succinct) {
        objectData.succinctProperties = mapDriveItemToSuccinctProperties(item, isRoot);
    }

    if (includeAllowableActions) {
        objectData.allowableActions = mapDriveItemToAllowableActions(item);
    }

    return objectData;
}

/**
 * Maps DriveItem permissions to CMIS allowable actions.
 * This is a simplified implementation - real implementation would check actual permissions.
 */
export function mapDriveItemToAllowableActions(item: DriveItem): Record<string, boolean> {
    const isFolder = !!item.folder;
    const isRoot = !item.parentReference?.id || item.parentReference.path === '/drive/root:';

    const actions: Record<string, boolean> = {
        'canGetProperties': true,
        'canGetObjectParents': !isRoot,
        'canUpdateProperties': true,
        'canDeleteObject': !isRoot,
        'canMoveObject': !isRoot,
        'canGetACL': true,
        'canApplyACL': true,
    };

    if (isFolder) {
        actions['canGetChildren'] = true;
        // descendants/folderTree selectors are not implemented by this
        // adapter (they return notSupported), so these must not be
        // advertised as available.
        actions['canGetDescendants'] = false;
        actions['canGetFolderTree'] = false;
        actions['canCreateDocument'] = true;
        actions['canCreateFolder'] = true;
        actions['canDeleteTree'] = !isRoot;
        actions['canGetFolderParent'] = !isRoot;
    } else {
        actions['canGetContentStream'] = true;
        actions['canSetContentStream'] = true;
        // No route dispatches a deleteContent action or the `versions`
        // selector, so these must not be advertised as available.
        actions['canDeleteContentStream'] = false;
        actions['canGetAllVersions'] = false;
        // Backed by Graph's checkout/checkin/discardCheckout driveItem
        // actions, which are implemented.
        actions['canCheckOut'] = true;
        actions['canCancelCheckOut'] = true;
        actions['canCheckIn'] = true;
    }

    return actions;
}

/**
 * Maps an array of DriveItems to a CMIS ObjectList.
 * Per CMIS 1.1 Browser Binding spec, each object is wrapped in an 'object' key.
 * 
 * @param items - Array of DriveItems
 * @param hasMoreItems - Whether there are more items available
 * @param numItems - Total count of items (optional)
 * @param succinct - Use succinct properties format
 * @param includeAllowableActions - Include allowable actions
 */
export function mapDriveItemsToObjectList(
    items: DriveItem[],
    hasMoreItems: boolean = false,
    numItems?: number,
    succinct: boolean = true,
    includeAllowableActions: boolean = false
): ObjectList {
    return {
        objects: items.map(item => ({
            object: mapDriveItemToObjectData(item, succinct, includeAllowableActions)
        })),
        hasMoreItems,
        numItems,
    };
}

/**
 * Maps a newly created DriveItem to CMIS ObjectData response.
 * Used after createDocument or createFolder operations.
 */
export function mapCreatedItemToObjectData(
    item: DriveItem,
    succinct: boolean = true
): ObjectData {
    return mapDriveItemToObjectData(item, succinct, true);
}

/**
 * Maps an array of DriveItems to a CMIS query results response (cmisaction=query).
 * Per CMIS 1.1 Browser Binding spec section 5.5.1, this is a distinct shape
 * from ObjectList: results are NOT wrapped in an `object` key.
 */
export function mapDriveItemsToQueryResults(
    items: DriveItem[],
    hasMoreItems: boolean = false,
    numItems?: number,
    succinct: boolean = true,
    includeAllowableActions: boolean = false
): { results: ObjectData[]; hasMoreItems: boolean; numItems?: number } {
    return {
        results: items.map(item => mapDriveItemToObjectData(item, succinct, includeAllowableActions)),
        hasMoreItems,
        numItems,
    };
}
