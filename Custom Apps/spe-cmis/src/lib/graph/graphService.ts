/**
 * Microsoft Graph Service Provider
 * 
 * Provides methods for interacting with Microsoft Graph API,
 * specifically for SharePoint Embedded container operations.
 * Uses the official Microsoft Graph SDK.
 * 
 * All methods require a user access token to be passed in,
 * ensuring Graph calls are made with user context for proper
 * SharePoint Embedded access control enforcement.
 */

import { Client } from '@microsoft/microsoft-graph-client';
import type { FileStorageContainer } from '@microsoft/microsoft-graph-types';
import { isValidGuid } from '../http/validation';

/**
 * Creates a Microsoft Graph client instance with the provided access token.
 * Each request should use a client initialized with the authenticated user's token.
 */
export function createGraphClient(accessToken: string): Client {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

/**
 * Result wrapper for Graph operations
 */
export interface GraphResult<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    statusCode?: number;
}

/**
 * Collection response from Graph API
 */
export interface GraphCollection<T> {
    value: T[];
    '@odata.nextLink'?: string;
    '@odata.count'?: number;
}

/**
 * Retrieves all containers for a specific container type.
 * 
 * @param accessToken - The user's Graph access token
 * @param containerTypeId - The SharePoint Embedded container type ID
 * @param skip - Number of items to skip (for paging)
 * @param top - Maximum number of items to return
 */
export async function getContainers(
    accessToken: string,
    containerTypeId: string,
    skip?: number,
    top?: number
): Promise<GraphResult<GraphCollection<FileStorageContainer>>> {
    // Defense-in-depth: containerTypeId is interpolated directly into an
    // OData $filter expression below. Callers are expected to validate this
    // as a GUID first, but a strict check here prevents any caller from
    // ever being able to inject OData operators into the filter.
    if (!isValidGuid(containerTypeId)) {
        return {
            success: false,
            error: {
                code: 'invalidArgument',
                message: 'containerTypeId must be a valid GUID',
            },
            statusCode: 400,
        };
    }

    try {
        const client = createGraphClient(accessToken);
        
        let request = client
            .api('/storage/fileStorage/containers')
            .filter(`containerTypeId eq ${containerTypeId}`);

        if (skip !== undefined && skip > 0) {
            request = request.skip(skip);
        }

        if (top !== undefined && top > 0) {
            request = request.top(top);
        }

        let response = await request.get() as GraphCollection<FileStorageContainer>;

        // When the caller isn't requesting a specific page (no explicit
        // `top`), follow all continuation pages so the full result set is
        // returned - Graph pages container listings even without $top,
        // and silently returning only the first page would omit containers.
        if (top === undefined) {
            const allValues = response.value ? [...response.value] : [];
            let nextLink = response['@odata.nextLink'];
            while (nextLink) {
                const page = await client.api(nextLink).get() as GraphCollection<FileStorageContainer>;
                allValues.push(...(page.value || []));
                nextLink = page['@odata.nextLink'];
            }
            response = { ...response, value: allValues, '@odata.nextLink': undefined };
        }

        return {
            success: true,
            data: response,
        };
    } catch (error: unknown) {
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
}

/**
 * Retrieves a specific container by ID.
 * 
 * @param accessToken - The user's Graph access token
 * @param containerId - The container ID (also used as repositoryId in CMIS)
 */
export async function getContainer(
    accessToken: string,
    containerId: string
): Promise<GraphResult<FileStorageContainer>> {
    try {
        const client = createGraphClient(accessToken);
        
        const response = await client
            .api(`/storage/fileStorage/containers/${containerId}`)
            .get();

        return {
            success: true,
            data: response as FileStorageContainer,
        };
    } catch (error: unknown) {
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
}

/**
 * Retrieves the drive (document library) for a container.
 * This is needed to get the root folder ID.
 * 
 * @param accessToken - The user's Graph access token
 * @param containerId - The container ID
 */
export async function getContainerDrive(
    accessToken: string,
    containerId: string
): Promise<GraphResult<import('@microsoft/microsoft-graph-types').Drive>> {
    try {
        const client = createGraphClient(accessToken);
        
        const response = await client
            .api(`/storage/fileStorage/containers/${containerId}/drive`)
            .get();

        return {
            success: true,
            data: response,
        };
    } catch (error: unknown) {
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
}
