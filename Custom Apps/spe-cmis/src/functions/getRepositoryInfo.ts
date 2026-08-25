import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
    authenticateRequest,
    getContainer,
    getDriveRoot,
    mapContainerToRepository,
    unauthorized,
    objectNotFound,
    permissionDenied,
    runtimeError,
    notSupported,
    invalidArgument,
    buildTypeChildrenResponse,
    buildTypeDescendantsResponse,
    getBaseTypeDefinition,
    executeCmisQuery,
    parseMultipartForm,
    isValidGuid,
    isValidRepositoryId,
    parseBoundedInt,
} from "../lib";

/** Repository-level query statements beyond this length are rejected outright. */
const MAX_QUERY_STATEMENT_LENGTH = 4000;

/** Known repository-level cmisactions (only 'query' is implemented). */
const SUPPORTED_REPOSITORY_ACTIONS = new Set(['query']);

/**
 * CMIS Browser Binding: Get Repository Info
 * 
 * Returns information about a specific repository (SPE container).
 * Per CMIS 1.1 Browser Binding spec section 5.2.2.
 * 
 * URL Pattern: /storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser/{repositoryId}
 * Method: GET
 */
export async function getRepositoryInfo(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`CMIS getRepositoryInfo request for url "${request.url}"`);

    // Authenticate the request and get Graph token with user context
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.context) {
        context.log(`Authentication failed: ${authResult.error}`);
        return unauthorized(authResult.error);
    }

    const { graphAccessToken } = authResult.context;
    context.log(`Authenticated principal: ${authResult.context.principalId}`);

    // Extract parameters from the route
    const containerTypeId = request.params.containerTypeId;
    const repositoryId = request.params.repositoryId;

    if (!containerTypeId) {
        context.log('Missing containerTypeId in route');
        return permissionDenied('Container type ID is required');
    }

    if (!isValidGuid(containerTypeId)) {
        context.log(`Invalid containerTypeId format: ${containerTypeId}`);
        return invalidArgument('Container type ID must be a valid GUID');
    }

    if (!repositoryId) {
        context.log('Missing repositoryId in route');
        return objectNotFound('Repository ID is required');
    }

    if (!isValidRepositoryId(repositoryId)) {
        context.log(`Invalid repositoryId format: ${repositoryId}`);
        return invalidArgument('Repository ID has an invalid format');
    }

    try {
        // Fetch the container from Graph API using user's token
        const containerResult = await getContainer(graphAccessToken, repositoryId);

        if (!containerResult.success) {
            context.log(`Graph API error: ${JSON.stringify(containerResult.error)}`);

            // Map Graph errors to CMIS errors
            if (containerResult.statusCode === 404) {
                return objectNotFound(`Repository '${repositoryId}' not found`);
            }
            if (containerResult.statusCode === 403 || containerResult.statusCode === 401) {
                return permissionDenied('Access denied to repository');
            }

            return runtimeError(containerResult.error?.message || 'Failed to retrieve repository');
        }

        const container = containerResult.data!;

        // Verify the container belongs to the expected container type
        if (container.containerTypeId !== containerTypeId) {
            context.log(`Container ${repositoryId} belongs to container type ${container.containerTypeId}, not ${containerTypeId}`);
            return objectNotFound(`Repository '${repositoryId}' not found in this container type`);
        }

        // Type Definition selectors (typeChildren/typeDescendants/typeDefinition)
        // are static and repository-independent (this adapter has no custom
        // subtypes), but are still served from the repository URL per CMIS 1.1
        // Browser Binding spec sections 5.2.3-5.2.5.
        const cmisselector = request.query.get('cmisselector');
        const typeId = request.query.get('typeId');
        if (cmisselector === 'typeChildren') {
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: buildTypeChildrenResponse(typeId),
            };
        }
        if (cmisselector === 'typeDescendants') {
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: buildTypeDescendantsResponse(typeId),
            };
        }
        if (cmisselector === 'typeDefinition') {
            if (!typeId) {
                return invalidArgument('typeId is required for cmisselector=typeDefinition');
            }
            const typeDefinition = getBaseTypeDefinition(typeId);
            if (!typeDefinition) {
                return objectNotFound(`Type '${typeId}' not found`);
            }
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                jsonBody: typeDefinition,
            };
        }

        // Fetch the drive's actual root item ID. Drive responses don't embed
        // `.root` by default, so a dedicated call is needed - without it,
        // rootFolderId would fall back to the 'root' alias, which wouldn't
        // match the real cmis:objectId returned by a subsequent GET of that
        // folder.
        let rootFolderId = 'root';
        const rootResult = await getDriveRoot(graphAccessToken, repositoryId);
        if (rootResult.success && rootResult.data?.id) {
            rootFolderId = rootResult.data.id;
        } else {
            context.log(`Could not fetch drive root for container ${repositoryId}: ${rootResult.error?.message}`);
            // Continue with the 'root' alias - all routes in this adapter
            // also accept it, so the repository remains fully usable.
        }

        // Build the base URL for rootFolderUrl
        const baseUrl = buildBaseUrl(request);

        // Map to CMIS repository format
        const repositoryInfo = mapContainerToRepository(container, rootFolderId, baseUrl);

        context.log(`Returning repository info for ${repositoryId}, rootFolderUrl=${repositoryInfo.rootFolderUrl}`);

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            jsonBody: repositoryInfo,
        };

    } catch (error) {
        context.error('Unexpected error in getRepositoryInfo:', error);
        return runtimeError('An unexpected error occurred');
    }
}

/**
 * Builds the base URL for CMIS Browser Binding URLs
 */
function buildBaseUrl(request: HttpRequest): string {
    const url = new URL(request.url);
    // Remove the /{repositoryId} segment to get the base browser binding URL
    // URL is: .../cmis/browser/{repositoryId}
    // We want: .../cmis/browser
    const basePath = url.pathname.replace(/\/[^/]+$/, '');
    return `${url.protocol}//${url.host}${basePath}`;
}

/**
 * CMIS Browser Binding: Repository-level actions (POST)
 *
 * Supports cmisaction=query (see cmis/query.ts for the supported subset of
 * CMIS SQL). All other repository-level cmisactions (createType, updateType,
 * deleteType, etc.) are not implemented by this adapter and return a proper
 * CMIS 'notSupported' (405) response instead of a generic 404.
 */
async function postRepositoryInfo(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`CMIS repository-level POST request for url "${request.url}"`);

    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.context) {
        return unauthorized(authResult.error);
    }

    const containerTypeId = request.params.containerTypeId;
    if (!containerTypeId) {
        return objectNotFound('Container type ID is required');
    }

    if (!isValidGuid(containerTypeId)) {
        return invalidArgument('Container type ID must be a valid GUID');
    }

    const repositoryId = request.params.repositoryId;
    if (!repositoryId) {
        return objectNotFound('Repository ID is required');
    }

    if (!isValidRepositoryId(repositoryId)) {
        return invalidArgument('Repository ID has an invalid format');
    }

    // Verify the repository exists and belongs to the container type -
    // otherwise a caller could execute repository-level actions (e.g.
    // query) against a repository outside the container type in the URL.
    const containerResult = await getContainer(authResult.context.graphAccessToken, repositoryId);
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

    let cmisaction: string | null = request.query.get('cmisaction');
    const formData = new Map<string, string>();

    const contentType = request.headers.get('content-type') || '';
    context.log(`POST content-type: ${contentType}, content-length: ${request.headers.get('content-length')}, transfer-encoding: ${request.headers.get('transfer-encoding')}`);
    if (contentType.includes('multipart/form-data')) {
        const parsed = await parseMultipartForm(request, context);
        cmisaction = parsed.fields.get('cmisaction') || cmisaction;
        parsed.fields.forEach((value, key) => formData.set(key, value));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const body = await request.text();
        context.log(`Body length: ${body.length}`);
        const params = new URLSearchParams(body);
        cmisaction = params.get('cmisaction') || cmisaction;
        params.forEach((value, key) => formData.set(key, value));
    }

    if (!cmisaction) {
        return invalidArgument('cmisaction is required');
    }

    if (!SUPPORTED_REPOSITORY_ACTIONS.has(cmisaction)) {
        context.log(`Repository-level cmisaction=${cmisaction} is not supported`);
        return notSupported(`Repository-level action '${cmisaction}' is not supported`);
    }

    if (cmisaction === 'query') {
        // OASIS spec field is 'q'; some clients (e.g. OpenCMIS Workbench) send 'statement' instead.
        const statement = formData.get('q') || formData.get('statement') || request.query.get('q') || request.query.get('statement');
        if (!statement) {
            return invalidArgument("'q' (the query statement) is required");
        }
        if (statement.length > MAX_QUERY_STATEMENT_LENGTH) {
            return invalidArgument(`Query statement exceeds maximum length of ${MAX_QUERY_STATEMENT_LENGTH} characters`);
        }

        const maxItems = parseBoundedInt(formData.get('maxItems') || request.query.get('maxItems'), 100, 1000);
        const skipCount = parseBoundedInt(formData.get('skipCount') || request.query.get('skipCount'), 0);
        if (maxItems === undefined || skipCount === undefined) {
            return invalidArgument('maxItems and skipCount must be non-negative integers');
        }

        const result = await executeCmisQuery(
            statement,
            authResult.context.graphAccessToken,
            repositoryId,
            maxItems,
            skipCount
        );

        if (!result.success || !result.queryResults) {
            return notSupported(result.error || 'Query failed');
        }

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: result.queryResults,
        };
    }

    // Unreachable: SUPPORTED_REPOSITORY_ACTIONS currently only contains 'query'.
    return notSupported(`Repository-level action '${cmisaction}' is not supported`);
}

/**
 * Dispatches GET (repository info) vs POST (repository-level actions).
 */
async function repositoryInfoHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    if (request.method === 'POST') {
        return postRepositoryInfo(request, context);
    }
    return getRepositoryInfo(request, context);
}

// Register the Azure Function
app.http('getRepositoryInfo', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser/{repositoryId}',
    handler: repositoryInfoHandler
});
