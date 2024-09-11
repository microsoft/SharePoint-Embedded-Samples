import { app, HttpFunctionOptions, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { DriveItem } from "@microsoft/microsoft-graph-types";
import { OboAuthProvider } from "../providers/OboAuthProvider";
import { GraphProvider, IDriveProcessingItem } from "../providers/GraphProvider";
import { IContainerClientCreateRequest, IContainerColumn, IContainerCustomProperties, IContainerUpdateRequest } from "../../../common/schemas/ContainerSchemas";
import { ApiError, InvalidAccessTokenError, MissingContainerDisplayNameError, MissingContainerIdError } from "../common/Errors";
import { AppAuthProvider } from "../providers/AppAuthProvider";
import { AzureDocAnalysisProvider, IReceiptFields } from "../providers/AzureDocAnalysisProvider";
import { JwtProvider } from "../providers/JwtProvider";

const processingStatusColumn = 'DocProcessingCompleted';
const processingExclusionFilter = `listitem/fields/${processingStatusColumn} ne true`
const customTextColumns = ['Merchant', 'MerchantAddress', 'MerchantPhoneNumber', 'Total'];

interface IChangeNotificationRequestBody {
    validationToken?: string;
}

interface IProcessedFileFields extends IReceiptFields {
    DocProcessingCompleted: boolean;
}

export async function disableContainerProcessing(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const containerId = request.query.get('containerId');
        if (!containerId) {
            throw new MissingContainerIdError();
        }
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !await jwt.authorize() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(new AppAuthProvider(jwt.tid));

        const container = await graph.getContainer(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }

        await graph.removeDriveSubscriptions(containerId);
        
        const subscriptionPropertyId = 'docProcessingSubscriptionId';
        const subscriptionPropertyExpiry = 'docProcessingSubscriptionExpiry';
        let props = container.customProperties || {} as any;
        props[subscriptionPropertyId] = null;
        props[subscriptionPropertyExpiry] = null;
        await graph.setContainerCustomProperties(containerId, props);
        delete props[subscriptionPropertyId];
        delete props[subscriptionPropertyExpiry];
        container.customProperties =  props as IContainerCustomProperties;

        return { jsonBody: container };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Disable container processing failed: ${error}` };
    }
}

export async function enableContainerProcessing(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const containerId = request.query.get('containerId');
        if (!containerId) {
            throw new MissingContainerIdError();
        }
        const jwt = JwtProvider.fromAuthHeader(request.headers.get('Authorization'));
        if (!jwt || !await jwt.authorize() || !jwt.tid) {
            throw new InvalidAccessTokenError();
        }
        const graph = new GraphProvider(new AppAuthProvider(jwt.tid));
        const container = await graph.getContainer(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }
        const columns = container.columns || [];
        if (!columns.find(c => c.name === processingStatusColumn)) {
            const newColumn: IContainerColumn = {
                name: processingStatusColumn,
                displayName: processingStatusColumn,
                description: processingStatusColumn,
                indexed: false,
                boolean: {}
            };
            await graph.addContainerColumn(containerId, newColumn);
        }

        for (const columnName of customTextColumns) {
            if (!columns.find(c => c.name === columnName)) {
                const newColumn: IContainerColumn = {
                    name: columnName,
                    displayName: columnName,
                    description: columnName,
                    indexed: true,
                    text: {
                        maxLength: 255
                    }
                };
                await graph.addContainerColumn(containerId, newColumn);
            }
        }
        const url = new URL(request.url);
        const hostname = url.hostname;
        const notificationUrl = `${hostname}/api/onDriveChanged?tid=${jwt.tid}driveId=${containerId}`;
        console.log(`Subscribing to drive changes at ${notificationUrl}`);
        const subscription = await graph.subscribeToDriveChanges(containerId, notificationUrl);
        
        const subscriptionPropertyId = 'docProcessingSubscriptionId';
        const subscriptionPropertyExpiry = 'docProcessingSubscriptionExpiry';
        const props = container.customProperties || {} as IContainerCustomProperties;
        props[subscriptionPropertyId] = {
            value: subscription.id,
            isSearchable: false
        };
        props[subscriptionPropertyExpiry] = {
            value: subscription.expirationDateTime,
            isSearchable: false
        };
        await graph.setContainerCustomProperties(containerId, props);
        container.customProperties = props;

        return { jsonBody: container };
    } catch (error) {
        if (error instanceof ApiError) {
            return { status: error.status, body: error.message };
        }
        return { status: 500, body: `Enable container processing failed: ${error}` };
    }
}

export async function onDriveChanged(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    let validationToken = request.query.get('validationToken');
    if (!validationToken && request.method === 'POST') {
        const requestBody = await request.json() as IChangeNotificationRequestBody;
        validationToken = requestBody.validationToken!;
    }
    const tenantId = request.query.get('driveId') || '';
    const driveId = request.query.get('driveId') || '';
    if (tenantId && driveId) {
        const graph = new GraphProvider(new AppAuthProvider(tenantId));
        processDrive(graph, driveId).catch(console.error);
    }
    if (validationToken) {
        return { 
            headers: { 'Content-Type': 'text/plain' },
            body: validationToken 
        };
    }
    return { };
}

async function processDrive(graph: GraphProvider, driveId: string): Promise<void> {
    try {
        const items = await graph.getUnprocessedItems(driveId, processingExclusionFilter);
        for (const item of items) {
            // One at a time, and we'll abort the whole thing if one fails
            await processItem(graph, driveId, item);
        }
    } catch (error) {
        console.error(`Error processing drive ${driveId}: ${error}`);
    }
}

async function processItem(graph: GraphProvider, driveId: string, item: IDriveProcessingItem): Promise<void> {
    if (!item || !item.name) {
        console.error(`Invalid item: ${JSON.stringify(item)}`);
        return;
    }

    let extension = item.name.split('.').pop();
    if (!extension || !AzureDocAnalysisProvider.SUPPORTED_FILE_EXTENSIONS.includes(extension.toLowerCase())) {
        console.log(`Skipping unsupported file type: ${item.name}`);
        return;
    }

    const downloadUrl = (item as any)['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
        console.error(`Download URL not found for item ${item.id}`);
        return;
    }
    
    const stream = await graph.getDriveItemStream(downloadUrl);
    const azureAi = new AzureDocAnalysisProvider();
    const fields = await azureAi.extractReceiptFields(stream) as IProcessedFileFields;
    if (!fields) {
        console.error(`Error extracting fields from item ${item.id}`);
        return;
    }

    fields.DocProcessingCompleted = true;
    console.log(fields);
    await graph.setDriveItemFields(driveId, item.id, fields);
}

app.http('onDriveChanged', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: onDriveChanged
});

app.http('enableContainerProcessing', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: enableContainerProcessing
});

app.http('disableContainerProcessing', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: disableContainerProcessing
});
