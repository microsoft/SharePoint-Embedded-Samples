/**
 * Repository Mapper
 * 
 * Maps SharePoint Embedded containers to CMIS repositories.
 */

import type { FileStorageContainer } from '@microsoft/microsoft-graph-types';
import { RepositoryInfo, RepositoryCapabilities, AclCapabilities, GetRepositoriesResponse } from '../types/cmis';

/**
 * Default CMIS capabilities for SPE-backed repositories.
 * These reflect what SharePoint Embedded supports through our adapter.
 * Per CMIS 1.1 spec section 2.1.1.
 */
export const DEFAULT_CAPABILITIES: RepositoryCapabilities = {
    capabilityContentStreamUpdatability: 'anytime',
    capabilityChanges: 'none',                    // Change log not supported in MVP
    capabilityRenditions: 'none',                 // Renditions not supported in MVP
    // The descendants/folderTree cmisselectors aren't implemented (routes
    // return notSupported for them), so these must be false.
    capabilityGetDescendants: false,
    capabilityGetFolderTree: false,
    capabilityMultifiling: false,                 // SPE doesn't support multi-filing
    capabilityUnfiling: false,                    // SPE doesn't support unfiling
    capabilityVersionSpecificFiling: false,
    capabilityPWCSearchable: false,
    capabilityPWCUpdatable: true,
    capabilityAllVersionsSearchable: false,
    // orderBy is never honored by cmis/query.ts, so this can't claim 'common'.
    capabilityOrderBy: 'none',
    capabilityQuery: 'metadataonly',              // Simple name-based query only (see cmis/query.ts)
    capabilityJoin: 'none',
    capabilityACL: 'manage',                      // Can both read and manage ACLs (see cmis/aclMapper.ts)
};

/**
 * ACL capabilities advertised alongside capabilityACL: 'manage'. Reflects
 * the simplified two-permission (read/write) model implemented by
 * cmis/aclMapper.ts - Graph's sharing model doesn't support a richer
 * permission scheme or per-object propagation control.
 */
export const DEFAULT_ACL_CAPABILITIES: AclCapabilities = {
    supportedPermissions: 'basic',
    propagation: 'repositorydetermined',
    permissions: [
        { permission: 'cmis:read', description: 'Read access' },
        { permission: 'cmis:write', description: 'Read and write access' },
        { permission: 'cmis:all', description: 'Full access' },
    ],
    permissionMapping: [
        { key: 'canGetProperties.Object', permission: ['cmis:read'] },
        { key: 'canGetACL.Object', permission: ['cmis:read'] },
        { key: 'canGetContentStream.Object', permission: ['cmis:read'] },
        { key: 'canGetChildren.Folder', permission: ['cmis:read'] },
        { key: 'canCreateDocument.Folder', permission: ['cmis:write'] },
        { key: 'canCreateFolder.Folder', permission: ['cmis:write'] },
        { key: 'canDeleteObject.Object', permission: ['cmis:write'] },
        { key: 'canDeleteTree.Folder', permission: ['cmis:write'] },
        { key: 'canSetContentStream.Object', permission: ['cmis:write'] },
        { key: 'canUpdateProperties.Object', permission: ['cmis:write'] },
        { key: 'canMoveObject.Object', permission: ['cmis:write'] },
        { key: 'canApplyACL.Object', permission: ['cmis:all'] },
    ],
};

/**
 * Product information constants
 */
export const PRODUCT_INFO = {
    vendorName: 'Microsoft',
    productName: 'SharePoint Embedded CMIS Adapter',
    productVersion: '1.0.0',
    cmisVersionSupported: '1.1',
};

/**
 * Maps an SPE container to a CMIS RepositoryInfo object.
 * 
 * @param container - The SharePoint Embedded container
 * @param rootFolderId - The container drive's actual root item ID. When
 * omitted, falls back to the well-known 'root' alias that all routes in
 * this adapter also accept - used for bulk discovery (mapContainersToRepositories)
 * where fetching every container's drive root would be an extra Graph call
 * per repository.
 * @param baseUrl - Base URL for constructing rootFolderUrl
 */
export function mapContainerToRepository(
    container: FileStorageContainer,
    rootFolderId: string = 'root',
    baseUrl?: string
): RepositoryInfo {
    const repositoryId = container.id!;

    return {
        repositoryId,
        repositoryName: container.displayName!,
        repositoryDescription: container.description || '',
        vendorName: PRODUCT_INFO.vendorName,
        productName: PRODUCT_INFO.productName,
        productVersion: PRODUCT_INFO.productVersion,
        rootFolderId,
        rootFolderUrl: baseUrl ? `${baseUrl}/${repositoryId}/root` : undefined,
        repositoryUrl: baseUrl ? `${baseUrl}/${repositoryId}` : undefined,
        latestChangeLogToken: null,
        cmisVersionSupported: PRODUCT_INFO.cmisVersionSupported,
        thinClientURI: null,
        changesIncomplete: true,
        changesOnType: [],
        principalIdAnonymous: 'anonymous',
        principalIdAnyone: 'anyone',
        capabilities: DEFAULT_CAPABILITIES,
        aclCapabilities: DEFAULT_ACL_CAPABILITIES,
    };
}

/**
 * Maps multiple SPE containers to a CMIS GetRepositoriesResponse.
 * Per CMIS 1.1 Browser Binding spec section 5.2.1, returns repositories
 * directly at the root level keyed by repositoryId.
 * 
 * @param containers - Array of SharePoint Embedded containers
 * @param baseUrl - Base URL for constructing rootFolderUrl
 */
export function mapContainersToRepositories(
    containers: FileStorageContainer[],
    baseUrl?: string
): GetRepositoriesResponse {
    const repositories: GetRepositoriesResponse = {};

    for (const container of containers) {
        const repository = mapContainerToRepository(container, 'root', baseUrl);
        repositories[repository.repositoryId] = repository;
    }

    return repositories;
}

/**
 * Filters containers by name prefix (for filter parameter support)
 * 
 * @param containers - Array of containers to filter
 * @param filter - Filter string (prefix match on displayName)
 */
export function filterContainersByName(
    containers: FileStorageContainer[],
    filter?: string
): FileStorageContainer[] {
    if (!filter) {
        return containers;
    }

    const lowerFilter = filter.toLowerCase();
    return containers.filter(c => 
        c.displayName?.toLowerCase().startsWith(lowerFilter)
    );
}
