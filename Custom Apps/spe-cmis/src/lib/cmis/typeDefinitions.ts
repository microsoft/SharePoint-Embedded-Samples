/**
 * CMIS Type Definitions
 *
 * Provides static CMIS type definitions for the two base types this
 * adapter supports: cmis:document and cmis:folder. SharePoint Embedded
 * doesn't have a notion of custom CMIS subtypes, so these are the only
 * types a client will ever see via typeChildren/typeDescendants/
 * typeDefinition, per CMIS 1.1 spec sections 2.1.2 and 5.2.3-5.2.5.
 */

import { PropertyDefinition, TypeDefinition, TypeDefinitionContainer, TypeDefinitionList } from '../types/cmis';
import { CMIS_TYPE_DOCUMENT, CMIS_TYPE_FOLDER } from './objectMapper';

/**
 * Helper to create a PropertyDefinition with the common defaults used
 * throughout this adapter's read-mostly property set.
 */
function property(
    id: string,
    propertyType: PropertyDefinition['propertyType'],
    overrides: Partial<PropertyDefinition> = {}
): PropertyDefinition {
    const localName = id.includes(':') ? id.split(':')[1] : id;
    return {
        id,
        localName,
        displayName: localName,
        queryName: id,
        propertyType,
        cardinality: 'single',
        updatability: 'readonly',
        inherited: false,
        required: false,
        queryable: true,
        orderable: true,
        openChoice: false,
        ...overrides,
    };
}

/**
 * Common properties shared by cmis:document and cmis:folder.
 */
function commonProperties(): Record<string, PropertyDefinition> {
    return {
        'cmis:name': property('cmis:name', 'string', { updatability: 'readwrite', required: true }),
        'cmis:objectId': property('cmis:objectId', 'id'),
        'cmis:objectTypeId': property('cmis:objectTypeId', 'id', { updatability: 'oncreate', required: true }),
        'cmis:baseTypeId': property('cmis:baseTypeId', 'id'),
        'cmis:createdBy': property('cmis:createdBy', 'string'),
        'cmis:creationDate': property('cmis:creationDate', 'datetime'),
        'cmis:lastModifiedBy': property('cmis:lastModifiedBy', 'string'),
        'cmis:lastModificationDate': property('cmis:lastModificationDate', 'datetime'),
        'cmis:changeToken': property('cmis:changeToken', 'string'),
        'cmis:parentId': property('cmis:parentId', 'id'),
    };
}

/**
 * The cmis:folder base type definition.
 */
export const CMIS_FOLDER_TYPE_DEFINITION: TypeDefinition = {
    id: CMIS_TYPE_FOLDER,
    localName: 'folder',
    displayName: 'Folder',
    queryName: CMIS_TYPE_FOLDER,
    description: 'CMIS folder object, mapped onto a SharePoint Embedded drive folder.',
    baseId: CMIS_TYPE_FOLDER,
    parentId: null,
    creatable: true,
    fileable: true,
    queryable: true,
    fulltextIndexed: false,
    includedInSupertypeQuery: true,
    controllablePolicy: false,
    controllableACL: true,
    typeMutability: { create: false, update: false, delete: false },
    propertyDefinitions: {
        ...commonProperties(),
        'cmis:path': property('cmis:path', 'string'),
    },
};

/**
 * The cmis:document base type definition.
 */
export const CMIS_DOCUMENT_TYPE_DEFINITION: TypeDefinition = {
    id: CMIS_TYPE_DOCUMENT,
    localName: 'document',
    displayName: 'Document',
    queryName: CMIS_TYPE_DOCUMENT,
    description: 'CMIS document object, mapped onto a SharePoint Embedded drive file.',
    baseId: CMIS_TYPE_DOCUMENT,
    parentId: null,
    creatable: true,
    fileable: true,
    queryable: true,
    fulltextIndexed: false,
    includedInSupertypeQuery: true,
    controllablePolicy: false,
    controllableACL: true,
    versionable: true,
    contentStreamAllowed: 'allowed',
    typeMutability: { create: false, update: false, delete: false },
    propertyDefinitions: {
        ...commonProperties(),
        'cmis:contentStreamLength': property('cmis:contentStreamLength', 'integer'),
        'cmis:contentStreamMimeType': property('cmis:contentStreamMimeType', 'string'),
        'cmis:contentStreamFileName': property('cmis:contentStreamFileName', 'string'),
        'cmis:contentStreamId': property('cmis:contentStreamId', 'id'),
        'cmis:isLatestVersion': property('cmis:isLatestVersion', 'boolean'),
        'cmis:isMajorVersion': property('cmis:isMajorVersion', 'boolean'),
        'cmis:isLatestMajorVersion': property('cmis:isLatestMajorVersion', 'boolean'),
        'cmis:versionLabel': property('cmis:versionLabel', 'string'),
        'cmis:isVersionSeriesCheckedOut': property('cmis:isVersionSeriesCheckedOut', 'boolean'),
        'cmis:versionSeriesCheckedOutId': property('cmis:versionSeriesCheckedOutId', 'id'),
        'cmis:versionSeriesCheckedOutBy': property('cmis:versionSeriesCheckedOutBy', 'string'),
        'cmis:checkinComment': property('cmis:checkinComment', 'string'),
    },
};

const BASE_TYPES: TypeDefinition[] = [CMIS_FOLDER_TYPE_DEFINITION, CMIS_DOCUMENT_TYPE_DEFINITION];

/**
 * Looks up a base type definition by id. Returns undefined for any type
 * id other than cmis:folder / cmis:document, since this adapter has no
 * custom subtypes.
 */
export function getBaseTypeDefinition(typeId: string): TypeDefinition | undefined {
    return BASE_TYPES.find(t => t.id === typeId);
}

/**
 * Builds the response for cmisselector=typeChildren.
 * With no typeId, returns the two base types (there's no super-root type).
 * With a typeId matching one of our base types, returns an empty list
 * since neither type has any children (no custom subtypes exist).
 */
export function buildTypeChildrenResponse(typeId?: string | null): TypeDefinitionList {
    if (!typeId) {
        return { types: BASE_TYPES, hasMoreItems: false, numItems: BASE_TYPES.length };
    }
    return { types: [], hasMoreItems: false, numItems: 0 };
}

/**
 * Builds the response for cmisselector=typeDescendants.
 * Per CMIS 1.1 spec, this returns descendants BENEATH the given type, not
 * the type itself. Since neither base type has any custom subtypes, both
 * are leaves: passing a typeId (matching either base type) yields an empty
 * list, and omitting typeId returns the two base types as roots (with no
 * children) - mirroring typeChildren's root-level behavior.
 */
export function buildTypeDescendantsResponse(typeId?: string | null): TypeDefinitionContainer[] {
    if (typeId) {
        return [];
    }
    return BASE_TYPES.map(type => ({ type, children: [] }));
}
