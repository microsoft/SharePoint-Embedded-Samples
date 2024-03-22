import { ConfidentialClientApplication } from "@azure/msal-node";
import 'isomorphic-fetch';
import * as MSGraph from '@microsoft/microsoft-graph-client';
import * as Scopes from './scopes';

export const getGraphToken = async (confidentialClient: ConfidentialClientApplication, token: string): Promise<[boolean, string | any]> => {
  try {
    const graphTokenRequest = {
      oboAssertion: token,
      scopes: [
        Scopes.GRAPH_SITES_READ_ALL,
        Scopes.SPE_FILESTORAGECONTAINER_SELECTED
      ]
    };

    const oboGraphToken = (await confidentialClient.acquireTokenOnBehalfOf(graphTokenRequest))!.accessToken;
    return [true, oboGraphToken];
  } catch (error: any) {
    const errorResult = {
      status: 500,
      body: JSON.stringify({
        message: `Unable to generate Microsoft Graph OBO token: ${error.message}`,
        providedToken: token
      })
    };
    return [false, errorResult];
  }
}
