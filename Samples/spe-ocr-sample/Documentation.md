
# Documentation

## Prerequisites
Follow the steps mentioned in the below training module:  
 [SharePoint Embedded - building applications](https://learn.microsoft.com/en-us/training/modules/sharepoint-embedded-create-app/)  
Upon successful completion of this, you should have an react app which allows you to-
1. Create a new container
2. List down the contents of container
3. Create, update and delete files within a container
4. *Preview the files available in container*


As part of next step, we will work on adding the functionality to invoke the Azure Congnitive Service APIs from the app whenever a file is being updated/added.


## Steps:

### 1. Create a POST endpoint `/api/onReceiptAdded`
We need to create a webhook endpoint through which we will get notification whenever there is change in container.  
Open the `index.ts` file and add the below code snippet at the end:
```ts
server.post('/api/onReceiptAdded', async (req, res, next) => {
  try {
    const response = await onReceiptAdded(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});
```   

Along with that we also need to add the query parser plugin at the server startup, at the top of this file.

```ts
server.use(restify.plugins.bodyParser(), restify.plugins.queryParser()); 
```

Also, create a new file `onReceiptAdded.ts` and implement the method `onReceiptAdded(...)`.  
```ts
import {
    Request,
    Response
  } from "restify";

require('isomorphic-fetch');

  export const onReceiptAdded = async (req: Request, res: Response) => {
    
    
    const validationToken = req.query['validationToken'];
    if (validationToken) {
        res.send(200, validationToken, {"Content-Type":"text/plain"});
        return;
    }

    const driveId = req.query['driveId'];
    if (!driveId) {
        res.send(200, "Notification received without driveId, ignoring", {"Content-Type":"text/plain"});
        return;
    }

    // BOOKMARK_1
    console.log(`Received driveId: ${driveId}`);

    res.send(200, "");
    return;
  }

```

### 2. Subscribe for any changes in container

We need to expose our application to internet so that graph service can connect to it, and there are multiple ways to achieve that-  
1. Run it locally and enable secure tunneling.  
2. Deploy the app on cloud.  

We will be using the first approach and utilizing the [`ngrok`](https://ngrok.com/docs/getting-started/) to 
create a tunnel for our backed server.

After starting the app, run the following command in a terminal:
```pwsh
ngrok http 3001
``` 
On successful completion, you should get the following output. And public facing endpoint for app is highlighted in red rectangle.

![Alt text](<Screenshot 2024-01-18 140730.png>)

Once the tunneling is active, we can subscribe to delta changes in container by adding the webhook url. To do that, open the postman and make the following `POST` request with appropriate graph access token and `notificationUrl`.


```json
POST  https://graph.microsoft.com/v1.0/subscriptions 
{ 
  "changeType": "updated", 
  "notificationUrl":"https://5ac2-2404-f801-8028-3-691a-87b2-d309-545b.ngrok-free.app/api/onReceiptAdded?driveId={{ContainerId}}", 
  "resource": "drives/{{ContainerId}}/root", 
  "expirationDateTime": "2024-01-20T03:58:34.088Z", 
  "clientState": "" 
} 
```

**NOTE:** `expirationDateTime` should not be more `4230` minutes from current time, as that is the max lifespan of driveItem subsription.

You can use the following code snippet for setting the max possible expiration time. Add that into "Pre-request Script" section. It will set an environment variable which can be used in request body.

```js
var now = new Date()
var duration = 1000 * 60 * 4230; // max lifespan of driveItem subscription is 4230 minutes
var expiry = new Date(now.getTime() + duration);
var expiryDateTime = expiry.toISOString();

pm.environment.set("ContainerSubscriptionExpiry", expiryDateTime);
```

At this point, if you add/update any file in the container, you will get notification at privously added endpoint (`/api/onReceiptAdded`) and a log message at console:  
`Received driveId: <containerId>`


### 3. Get the delta changes of a container

Now that we are able to get the notification whenever there are any change in our container. As part of next step, we will get these files which are added/updated.

**TODO:** need to change the creatContainer and listContainer graph client for calling the `GraphProvider.setGraphClient()`.  

Create a new file `GraphProvider.ts` and paste the below content.   
```ts
import * as MSGraph from '@microsoft/microsoft-graph-client';
import * as MSAL from "@azure/msal-node";
import { getGraphToken } from "./auth";

export abstract class GraphProvider {
    public static async setGraphClient(token: string) {
        if (!GraphProvider.graphClient || this.IsTokenExpiringSoon(this.graphAccessToken)) {
            const msalConfig: MSAL.Configuration = {
                auth: {
                  clientId: process.env['API_ENTRA_APP_CLIENT_ID']!,
                  authority: process.env['API_ENTRA_APP_AUTHORITY']!,
                  clientSecret: process.env['API_ENTRA_APP_CLIENT_SECRET']!
                },
                system: {
                  loggerOptions: {
                    loggerCallback(loglevel: any, message: any, containsPii: any) {
                      console.log(message);
                    },
                    piiLoggingEnabled: false,
                    logLevel: MSAL.LogLevel.Verbose,
                  }
                }
            };
            const confidentialClient = new MSAL.ConfidentialClientApplication(msalConfig);
            
            const [graphSuccess, graphTokenRequest] = await getGraphToken(confidentialClient, token);
    
            if (!graphSuccess) {
                console.log("unable to fetch graph token");
                return;
            }
            this.graphAccessToken = graphTokenRequest;
            // console.log(this.graphAccessToken);
            const authProvider = (callback: MSGraph.AuthProviderCallback) => {
                callback(null, graphTokenRequest);
            };
    
            GraphProvider.graphClient = MSGraph.Client.init({
                authProvider: authProvider,
                defaultVersion: 'beta'
            });   
        }
    }

    public static graphClient: MSGraph.Client;

    public static graphAccessToken: string;

    // BOOKMARK_1

    // BOOKMARK_2

    // BOOKMARK_3

    // BOOKMARK_4
    private static changeTokens  = new Map<string, string| any>();

    private static IsTokenExpiringSoon(graphAccessToken: string) {
        const decodedToken = JSON.parse(Buffer.from(graphAccessToken.split('.')[1], 'base64').toString('ascii'));
        const expiration = decodedToken.exp;
        const now = Date.now() / 1000;
        const secondsUntilExpiration = expiration - now;
        const secondsBeforeExpirationToRenew = 300;
        return secondsUntilExpiration < secondsBeforeExpirationToRenew;
    }
}
``` 

Create a new file `ReceiptProcessor.ts` and paste the below content:  
```ts
import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer";
import { GraphProvider } from "./GraphProvider";
import { Readable } from 'stream';
import axios, { AxiosRequestConfig } from 'axios';


export abstract class ReceiptProcessor {

    public static async processDrive(driveId: string): Promise<void>{
        const changedItems = await GraphProvider.getDriveChanges(driveId);
        for(const changedItem of changedItems){
            try {
                const item = await GraphProvider.getDriveItem(driveId, changedItem.id);
                const extension = this.getFileExtension(item.name);
                if (this.SUPPORTED_FILE_EXTENSIONS.includes(extension.toLowerCase())) {
                    console.log(item.name);
                    // BOOKMARK_1
                }
            } catch (error) {
                console.log(error);
            }
        }
    
    }
    private static readonly SUPPORTED_FILE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'bmp', 'tiff', 'pdf'];
    
    private static getFileExtension(name: string) : string | any {
        return name.split('.').pop();
    }

    // BOOKMARK_2

    // BOOKMARK_3

    // BOOKMARK_4

    // BOOKMARK_5

    // BOOKMARK_6
}
```
We'll revisit this file again and complete these BOOKMARKs. But as you can see that we are calling two methods of `GraphProvider` which we haven't implemented yet. So, open the `GraphProvider.ts` file again:  

Add the `getDriveChanges(...)` by pasting the following code before `BOOKMARK_1`.
```ts
public static async getDriveChanges(driveId: string): Promise<any[]> {
    let changedItems: any[] = [];
    const driveDeltaBasePath: string = `/drives/${driveId}/items/root/delta`;
    let driveDeltaTokenParams: string = "";
    let hasMoreChanges: boolean = true;
    try{
        do {
            if (this.changeTokens.has(driveId)) {
                driveDeltaTokenParams = `?token=${this.changeTokens.get(driveId)}`
            }
            const response = await this.graphClient.api(driveDeltaBasePath + driveDeltaTokenParams).get();
            changedItems.push(...response.value);
            if (response['@odata.nextLink']) {
                const token = new URL(response['@odata.nextLink']).searchParams.get('token');
                this.changeTokens.set(driveId, token);
            } else {
                hasMoreChanges = false;
                const token = new URL(response['@odata.deltaLink']).searchParams.get('token');
                this.changeTokens.set(driveId, token);
            }
            console.log(this.changeTokens.get(driveId));
        } while (hasMoreChanges);
    }
    catch(err){
        console.log(err);
    }
    return changedItems;
}
```

Add the `getDriveItem(...)` by pasting the following code before `BOOKMARK_2`:  
```ts
public static async getDriveItem(driveId: string, itemId: string): Promise<any> {
    return await this.graphClient.api(`/drives/${driveId}/items/${itemId}`).get();
}
```

At this point if you restart the app along with tunneling and subscription, you should see the recently added/updated files listed in console.  
Next we will implement the feature to procees these files using Document Intelligence service. 

### 4. Call the Azure Conginitive Service's Document Intelligence service API

In order to use the ACS Document Intelligence APIs, you need create a Multi-Service or Document Intelligence resource for Azure AI services. Follow the below tutorial to create the resorce-  
* [Quickstart: Create a multi-service resource for Azure AI services](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource?tabs=windows&pivots=azportal)  
* [Get started with Document Intelligence](https://learn.microsoft.com/en-gb/azure/ai-services/document-intelligence/quickstarts/get-started-sdks-rest-api?view=doc-intel-3.1.0&viewFallbackFrom=form-recog-3.0.0&preserve-view=true&pivots=programming-language-javascript)  

After this step, you should have a endpoint and a key ready to use.

Now we will be updating the `BOOKMARK`s that we left in previous steps.

i. Open `ReceiptProcessor.ts` file and paste the below content before `BOOKMARK_1` and update the endpoint and key.

```ts
const url = item["@microsoft.graph.downloadUrl"];    
const receipt = await this.analyzeReceiptStream( await this.getDriveItemStream(url));
const receiptString = JSON.stringify(receipt, null, 2)
const fileName = this.getFileDisplayName(item.name) + "-extracted-fields.json";
const parentId = item.parentReference.id;
await GraphProvider.addDriveItem(driveId, parentId, fileName, receiptString);
```

Now, paste the below code snippet before `BOOKMARK_2`.
```ts
private static dac = new DocumentAnalysisClient(
    "https://<YOUR-RESOURCE-NAME>.cognitiveservices.azure.com/",
    new AzureKeyCredential("<YOUR-RESOURCE-KEY>")
);
```

Now we will update the `BOOKMARK_3`
```ts
private static async getDriveItemStream(url: string) : Promise<Readable> {
    const token = GraphProvider.graphAccessToken;
    const config: AxiosRequestConfig = {
        method: "get",
        url: url,
        headers: {
            "Authorization": `Bearer ${token}`
        },
        responseType: 'stream' 
    };
    const response = await axios.get<Readable>(url, config);
    return response.data;
}
```

Now we will update the `BOOKMARK_4`. Here we are taking the `prebuilt-invoice` model, but other models can be chosen as per problem.
```ts
private static async analyzeReceiptStream(stream: Readable) : Promise<any> {
    const poller = await this.dac.beginAnalyzeDocument("prebuilt-invoice", stream, {
            onProgress: ({ status }) => {
                console.log(`status: ${status}`);
            },
        });
        const {
            documents: [result] = [],
        } = await poller.pollUntilDone();

        const fields = result?.fields;
        this.removeUnwantedFields(fields);
    return fields;    
}

```
Now we will update the `BOOKMARK_6`
```ts
private static getFileDisplayName(name: string) : string | any{
    return name.split('.')[0];
}
```

Now we will update the `BOOKMARK_5`
```ts
private static removeUnwantedFields(fields: any) {
    for(const prop in fields){
        if( prop === 'boundingRegions' || prop === 'content' || prop === 'spans'){
            delete fields[prop];
        }
        if (typeof fields[prop] === 'object') {
            this.removeUnwantedFields(fields[prop]);
        }
    }
}
```

Finally, we can close `ReceiptProcessor.ts` file and open `GraphProvider.ts` file as we will adding the `addDriveItem(...)` method in our GraphProvider class.  

Update the `BOOKMARK_3`.
```ts
public static async addDriveItem(driveId: string, parentId: any, fileName: string, receiptString: string) {
    await this.graphClient.api(`/drives/${driveId}/items/${parentId}:/${fileName}:/content`).put(receiptString);
}
```

Now, restart the demo app and setup the tunneling using ngrok and delta change subscription on the container again.  
If you add/update any file (supported formats: 'jpeg', 'jpg', 'png', 'bmp', 'tiff', 'pdf') in this container, you should see a new json file created and contains the fields extracted from file.

### 5. Preview the item in browser window
TODO