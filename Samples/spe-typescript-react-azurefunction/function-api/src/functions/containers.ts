import { app, HttpFunctionOptions, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { IAuthProvider } from "../providers/AuthProvider";
import { DelegatedAuthProvider } from "../providers/DelegatedAuthProvider";
import { OboAuthProvider } from "../providers/OboAuthProvider";
import { AppAuthProvider } from "../providers/AppAuthProvider";
import { GraphProvider } from "../providers/GraphProvider";
import { IContainerClientCreateRequest, IContainerUpdateRequest } from "../../../common/schemas/ContainerSchemas";
import { ApiError, InvalidAccessTokenError, MissingContainerDisplayNameError } from "../common/Errors";
import { JwtProvider } from "../providers/JwtProvider";
import { createUserAuthProvider, hasConfidentialClient } from "../providers/AuthFactory";

export async function containers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return request.method === 'POST' ? createContainer(request, context) : listContainers(request, context);
}

export async function listContainers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        let authProvider: IAuthProvider;
        if (hasConfidentialClient()) {
            try {
                const appAuth = new AppAuthProvider(jwt.tid);
                await appAuth.getToken();
                authProvider = appAuth;
            } catch {
                authProvider = new OboAuthProvider(jwt);
            }
        } else {
            authProvider = new DelegatedAuthProvider(jwt.token);
        }
        const graph = new GraphProvider(authProvider);
        const containers = await graph.listContainers();
        context.log(`[listContainers] mode=${hasConfidentialClient() ? 'CCA' : 'PCA'}, found ${containers.length} containers`);
        const hydratedContainers = containers.map(c => graph.getContainer(c.id));
        return { jsonBody: await Promise.all(hydratedContainers) };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `List containers failed: ${error}` };
    }
}

export async function createContainer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(createUserAuthProvider(jwt));
        const clientCreateRequest: IContainerClientCreateRequest = await request.json() as IContainerClientCreateRequest;
        if (!clientCreateRequest.displayName) {
            throw new MissingContainerDisplayNameError();
        }
        return { jsonBody: await graph.createContainer(clientCreateRequest) };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Create container failed: ${error}` };
    }
};

export async function container(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    if (request.method === 'DELETE') return deleteContainer(request, context);
    return request.method === 'PATCH' ? updateContainer(request, context) : getContainer(request, context);
}

export async function updateContainer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(createUserAuthProvider(jwt));
        const id = request.params.id;
        const updateRequest: IContainerUpdateRequest = await request.json() as IContainerUpdateRequest;
        return { jsonBody: await graph.updateContainer(id, updateRequest) };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Update container failed: ${error}` };
    }
}

export async function getContainer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(createUserAuthProvider(jwt));
        const id = request.params.id;
        return { jsonBody: await graph.getContainer(id) };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Get container failed: ${error}` };
    }
};

app.http('containers', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: containers
});

export async function deleteContainer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !jwt.validate() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(createUserAuthProvider(jwt));
        const id = request.params.id;
        await graph.deleteContainer(id);
        return { status: 204 };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Delete container failed: ${error}` };
    }
}

app.http('container', {
    handler: container,
    trigger: {
        type: 'httpTrigger',
        name: 'container',
        authLevel: 'anonymous',
        methods: ['GET', 'PATCH', 'DELETE'],
        route: 'containers/{id}'
    }
});
