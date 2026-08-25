/**
 * CMIS 1.1 Type Definitions
 * Based on CMIS 1.1 Browser Binding specification.
 */

/**
 * CMIS capability flags advertised per repository (per CMIS 1.1 spec section 2.1.1)
 */
export interface RepositoryCapabilities {
    capabilityContentStreamUpdatability: 'none' | 'anytime' | 'pwconly';
    capabilityChanges: 'none' | 'objectidsonly' | 'properties' | 'all';
    capabilityRenditions: 'none' | 'read';
    capabilityGetDescendants: boolean;
    capabilityGetFolderTree: boolean;
    capabilityMultifiling: boolean;
    capabilityUnfiling: boolean;
    capabilityVersionSpecificFiling: boolean;
    capabilityPWCSearchable: boolean;
    capabilityPWCUpdatable: boolean;
    capabilityAllVersionsSearchable: boolean;
    capabilityOrderBy: 'none' | 'common' | 'custom';
    capabilityQuery: 'none' | 'metadataonly' | 'fulltextonly' | 'bothseparate' | 'bothcombined';
    capabilityJoin: 'none' | 'inneronly' | 'innerandouter';
    capabilityACL: 'none' | 'discover' | 'manage';
    capabilityCreatablePropertyTypes?: {
        canCreate: string[];
    };
    capabilityNewTypeSettableAttributes?: {
        id: boolean;
        localName: boolean;
        localNamespace: boolean;
        displayName: boolean;
        queryName: boolean;
        description: boolean;
        creatable: boolean;
        fileable: boolean;
        queryable: boolean;
        fulltextIndexed: boolean;
        includedInSupertypeQuery: boolean;
        controllablePolicy: boolean;
        controllableACL: boolean;
    };
}

/**
 * ACL capabilities per CMIS 1.1 spec
 */
export interface AclCapabilities {
    supportedPermissions: 'basic' | 'repository' | 'both';
    propagation: 'repositorydetermined' | 'objectonly' | 'propagate';
    permissions: Array<{
        permission: string;
        description: string;
    }>;
    permissionMapping: Array<{
        key: string;
        permission: string[];
    }>;
}

/**
 * Describes a CMIS repository per CMIS 1.1 Browser Binding spec.
 * In this service, a repository maps 1:1 to a SharePoint Embedded Container.
 */
export interface RepositoryInfo {
    repositoryId: string;
    repositoryName: string;
    repositoryDescription: string;
    vendorName: string;
    productName: string;
    productVersion: string;
    rootFolderId: string;
    rootFolderUrl?: string;
    repositoryUrl?: string;
    latestChangeLogToken?: string | null;
    cmisVersionSupported: string;
    thinClientURI?: string | null;
    changesIncomplete?: boolean;
    changesOnType?: Array<'cmis:document' | 'cmis:folder' | 'cmis:policy' | 'cmis:item'>;
    principalIdAnonymous?: string;
    principalIdAnyone?: string;
    extendedFeatures?: unknown[];
    capabilities: RepositoryCapabilities;
    aclCapabilities?: AclCapabilities;
}

/**
 * Response structure for getRepositories endpoint.
 * Per CMIS 1.1 Browser Binding spec section 5.2.1, repositories
 * are returned directly at the root level keyed by repositoryId.
 */
export type GetRepositoriesResponse = Record<string, RepositoryInfo>;

/**
 * CMIS property types
 */
export type CmisPropertyType = 'string' | 'boolean' | 'integer' | 'decimal' | 'datetime' | 'id' | 'html' | 'uri';

/**
 * CMIS property data (full representation)
 */
export interface PropertyData {
    id: string;
    localName?: string;
    displayName?: string;
    queryName?: string;
    type: CmisPropertyType;
    cardinality: 'single' | 'multi';
    value: string | number | boolean | unknown[] | null;
}

/**
 * Succinct properties representation (property ID -> value directly)
 */
export type SuccinctProperties = Record<string, string | number | boolean | unknown[] | null>;

/**
 * CMIS rendition
 */
export interface Rendition {
    streamId: string;
    mimeType: string;
    length?: number;
    kind: string;
    title?: string;
    height?: number;
    width?: number;
    renditionDocumentId?: string;
}

/**
 * CMIS object data (Browser Binding format)
 */
export interface ObjectData {
    succinctProperties?: SuccinctProperties;
    properties?: Record<string, PropertyData>;
    allowableActions?: Record<string, boolean>;
    relationships?: ObjectData[];
    renditions?: Rendition[];
    exactACL?: boolean;
    acl?: Acl;
}

/**
 * Wrapped object in object list (CMIS Browser Binding requires 'object' wrapper)
 */
export interface ObjectInList {
    object: ObjectData;
}

/**
 * CMIS object list (for query results, children, etc.)
 * Per CMIS 1.1 Browser Binding spec, each item has an 'object' wrapper.
 */
export interface ObjectList {
    objects: ObjectInList[];
    hasMoreItems: boolean;
    numItems?: number;
}

/**
 * CMIS ACL entry
 */
export interface AclEntry {
    principal: {
        principalId: string;
    };
    permissions: string[];
    isDirect: boolean;
}

/**
 * CMIS ACL
 */
export interface Acl {
    aces: AclEntry[];
    isExact?: boolean;
}

/**
 * CMIS error exception types
 */
export type CmisExceptionType =
    | 'constraint'
    | 'contentAlreadyExists'
    | 'filterNotValid'
    | 'invalidArgument'
    | 'nameConstraintViolation'
    | 'notSupported'
    | 'objectNotFound'
    | 'permissionDenied'
    | 'runtime'
    | 'storage'
    | 'streamNotSupported'
    | 'updateConflict'
    | 'versioning';

/**
 * CMIS error response
 */
export interface CmisError {
    exception: CmisExceptionType;
    message?: string;
}

/**
 * Query parameters for getRepositories
 */
export interface GetRepositoriesParams {
    skipCount?: number;
    maxItems?: number;
    filter?: string;
}

/**
 * CMIS property definition, describing one property of a type
 * (e.g. cmis:name on cmis:document). Per CMIS 1.1 spec section 2.1.2.
 */
export interface PropertyDefinition {
    id: string;
    localName: string;
    localNamespace?: string | null;
    displayName: string;
    queryName: string;
    description?: string | null;
    propertyType: CmisPropertyType;
    cardinality: 'single' | 'multi';
    updatability: 'readonly' | 'readwrite' | 'oncreate' | 'whencheckedout';
    inherited: boolean;
    required: boolean;
    queryable: boolean;
    orderable: boolean;
    openChoice: boolean;
}

/**
 * CMIS type definition (e.g. cmis:document, cmis:folder). Per CMIS 1.1
 * spec section 2.1.2. This adapter only exposes the two base types that
 * map onto SharePoint Embedded's data model - no custom subtypes.
 */
export interface TypeDefinition {
    id: string;
    localName: string;
    localNamespace?: string | null;
    displayName: string;
    queryName: string;
    description?: string | null;
    baseId: string;
    parentId?: string | null;
    creatable: boolean;
    fileable: boolean;
    queryable: boolean;
    fulltextIndexed: boolean;
    includedInSupertypeQuery: boolean;
    controllablePolicy: boolean;
    controllableACL: boolean;
    versionable?: boolean;
    contentStreamAllowed?: 'notallowed' | 'allowed' | 'required';
    typeMutability?: {
        create: boolean;
        update: boolean;
        delete: boolean;
    };
    propertyDefinitions: Record<string, PropertyDefinition>;
}

/**
 * Response structure for cmisselector=typeChildren, per CMIS 1.1 Browser
 * Binding spec section 5.2.3.
 */
export interface TypeDefinitionList {
    types: TypeDefinition[];
    hasMoreItems: boolean;
    numItems?: number;
}

/**
 * A node in the tree returned by cmisselector=typeDescendants, per CMIS
 * 1.1 Browser Binding spec section 5.2.4.
 */
export interface TypeDefinitionContainer {
    type: TypeDefinition;
    children?: TypeDefinitionContainer[];
}

/**
 * Response structure for cmisaction=query, per CMIS 1.1 Browser Binding
 * spec section 5.5.1. Unlike getChildren, results are NOT wrapped in an
 * `object` key.
 */
export interface QueryResults {
    results: ObjectData[];
    hasMoreItems: boolean;
    numItems?: number;
}
