import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
    authenticateRequest,
    getContainers,
    mapContainersToRepositories,
    filterContainersByName,
    unauthorized,
    permissionDenied,
    invalidArgument,
    runtimeError,
    isValidGuid,
    GetRepositoriesParams,
} from "../lib";

/**
 * CMIS Browser Binding: Get Repositories
 * 
 * Returns repositories (containers) visible to the caller within the
 * specified Container Type. Supports paging to accommodate very large
 * repository counts.
 * 
 * URL Pattern: /storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser
 * Method: GET
 * 
 * Query Parameters:
 *   - skipCount: Number of items to skip (for paging)
 *   - maxItems: Maximum number of items to return (1-1000)
 *   - filter: Optional server-side filter (e.g., by name prefix)
 */
export async function getRepositories(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`CMIS getRepositories request for url "${request.url}"`);

    // Authenticate the request and get Graph token with user context
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.context) {
        context.log(`Authentication failed: ${authResult.error}`);
        return unauthorized(authResult.error);
    }

    const { graphAccessToken } = authResult.context;
    context.log(`Authenticated principal: ${authResult.context.principalId}`);

    // Extract container type ID from the route
    // Expected route: /storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser
    const containerTypeId = request.params.containerTypeId;
    
    if (!containerTypeId) {
        context.log('Missing containerTypeId in route');
        return permissionDenied('Container type ID is required');
    }

    if (!isValidGuid(containerTypeId)) {
        context.log(`Invalid containerTypeId format: ${containerTypeId}`);
        return invalidArgument('Container type ID must be a valid GUID');
    }

    // Parse query parameters
    const params = parseQueryParams(request);
    context.log(`Query params: skipCount=${params.skipCount}, maxItems=${params.maxItems}, filter=${params.filter}`);

    try {
        // When a name filter is specified, Graph paging (skip/top) can't be
        // applied server-side because filterContainersByName runs
        // client-side afterward - applying Graph's skip/top first would
        // page over the UNFILTERED set, silently dropping or misplacing
        // matches. Fetch the complete container list in that case and page
        // the filtered results ourselves instead.
        const graphResult = await getContainers(
            graphAccessToken,
            containerTypeId,
            params.filter ? undefined : params.skipCount,
            params.filter ? undefined : params.maxItems
        );

        if (!graphResult.success) {
            context.log(`Graph API error: ${JSON.stringify(graphResult.error)}`);
            
            // Map Graph errors to CMIS errors
            if (graphResult.statusCode === 403 || graphResult.statusCode === 401) {
                return permissionDenied('Access denied to container type');
            }
            
            return runtimeError(graphResult.error?.message || 'Failed to retrieve repositories');
        }

        // Get containers from response
        let containers = graphResult.data?.value || [];

        // Apply client-side filter, then apply paging ourselves since Graph
        // couldn't do it for us above.
        if (params.filter) {
            containers = filterContainersByName(containers, params.filter);
            const start = params.skipCount || 0;
            const end = params.maxItems !== undefined ? start + params.maxItems : undefined;
            containers = containers.slice(start, end);
        }

        // Build the base URL for rootFolderUrl
        const baseUrl = buildBaseUrl(request);
        context.log(`Base URL for rootFolderUrl: ${baseUrl}`);

        // Map to CMIS repository format (per Browser Binding spec 5.2.1)
        const response = mapContainersToRepositories(containers, baseUrl);

        // Debug: log first repo's rootFolderUrl
        const firstRepoId = Object.keys(response)[0];
        if (firstRepoId) {
            context.log(`First repo rootFolderUrl: ${response[firstRepoId].rootFolderUrl}`);
        }

        context.log(`Returning ${Object.keys(response).length} repositories`);

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            jsonBody: response,
        };

    } catch (error) {
        context.error('Unexpected error in getRepositories:', error);
        return runtimeError('An unexpected error occurred');
    }
}

/**
 * Parses and validates query parameters for getRepositories
 */
function parseQueryParams(request: HttpRequest): GetRepositoriesParams {
    const skipCountStr = request.query.get('skipCount');
    const maxItemsStr = request.query.get('maxItems');
    const filter = request.query.get('filter') || undefined;

    let skipCount: number | undefined;
    let maxItems: number | undefined;

    if (skipCountStr) {
        skipCount = parseInt(skipCountStr, 10);
        if (isNaN(skipCount) || skipCount < 0) {
            skipCount = 0;
        }
    }

    if (maxItemsStr) {
        maxItems = parseInt(maxItemsStr, 10);
        if (isNaN(maxItems) || maxItems < 1) {
            maxItems = undefined;
        } else if (maxItems > 1000) {
            maxItems = 1000; // Cap at maximum per spec
        }
    }

    return { skipCount, maxItems, filter };
}

/**
 * Builds the base URL for CMIS Browser Binding URLs
 */
function buildBaseUrl(request: HttpRequest): string {
    const url = new URL(request.url);
    // The base URL is the current URL (which is the repository service URL)
    return `${url.protocol}//${url.host}${url.pathname}`;
}

// Register the Azure Function
app.http('getRepositories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser',
    handler: getRepositories
});
