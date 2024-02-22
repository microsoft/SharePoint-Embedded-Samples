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
            const authProvider = (callback: MSGraph.AuthProviderCallback) => {
                callback(null, graphTokenRequest);
            };
    
            GraphProvider.graphClient = MSGraph.Client.init({
                authProvider: authProvider,
                defaultVersion: 'beta'
            });
            console.log("creating");   
        }
        else{
            console.log("already");
        }
    }

    public static graphClient: MSGraph.Client;

    public static graphAccessToken: string;

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

    public static async getDriveItem(driveId: string, itemId: string): Promise<any> {
        return await this.graphClient.api(`/drives/${driveId}/items/${itemId}`).get();
    }

    public static async addDriveItem(driveId: string, parentId: any, fileName: string, receiptString: string) {
        await this.graphClient.api(`/drives/${driveId}/items/${parentId}:/${fileName}:/content`).put(receiptString);
    }

    public static async getDriveItemPreviewURL(driveId: string, itemId: string): Promise<any> {
        const response = await this.graphClient.api(`/drives/${driveId}/items/${itemId}/preview`).post({});
        console.log(response.getUrl);
        return response.getUrl;
    }

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