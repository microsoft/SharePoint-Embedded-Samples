import {
  Request,
  Response
} from "restify";
import * as MSAL from "@azure/msal-node";
import 'isomorphic-fetch';
import * as MSGraph from '@microsoft/microsoft-graph-client';
import { getGraphToken } from "./common/auth";
import { msalConfig } from "./common/config";

const confidentialClient = new MSAL.ConfidentialClientApplication(msalConfig);

export const createContainer = async (req: Request, res: Response) => {

  if (!req.headers.authorization) {
    res.send(401, { message: 'No access token provided.' });
    return;
  }

  const [bearer, token] = req.headers.authorization.split(' ');

  if (!req.body?.displayName) {
    res.send(400, { message: 'Invalid request: must provide a displayName property in the query parameters or request body' });
    return undefined;
  }

  const [graphSuccess, graphTokenRequest] = await getGraphToken(confidentialClient, token);
  if (!graphSuccess) {
    res.send(200, graphTokenRequest);
    return;
  }

  const authProvider = (callback: MSGraph.AuthProviderCallback) => {
    callback(null, graphTokenRequest);
  };

  try {
    const graphClient = MSGraph.Client.init({
      authProvider: authProvider,
      defaultVersion: 'beta'
    });

    const containerRequestData = {
      displayName: req.body!.displayName,
      description: (req.body?.description) ? req.body.description : '',
      containerTypeId: process.env["CONTAINER_TYPE_ID"]
    };

    const graphResponse = await graphClient.api(`storage/fileStorage/containers`).post(containerRequestData);

    res.send(200, graphResponse);
    return;
  } catch (error: any) {
    res.send(500, { message: `Failed to create container: ${error.message}` });
    return;
  }

}
