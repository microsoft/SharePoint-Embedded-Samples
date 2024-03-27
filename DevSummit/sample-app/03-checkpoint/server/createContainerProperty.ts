import {
  Request,
  Response
} from "restify";
import * as MSAL from "@azure/msal-node";
import 'isomorphic-fetch';
import * as MSGraph from '@microsoft/microsoft-graph-client';
import { getGraphToken, } from "./common/auth";
import { msalConfig } from "./common/config";

const confidentialClient = new MSAL.ConfidentialClientApplication(msalConfig);

export const createContainerProperty = async (req: Request, res: Response) => {

  if (!req.headers.authorization) {
    res.send(401, { message: 'No access token provided.' });
    return;
  }
  if (!req.params.id) {
    res.send(400, { message: 'No container ID provided.' });
    return;
  }
  if (!req.body?.propertyName) {
    res.send(400, { message: 'Invalid request: must provide propertyName property request body' });
    return undefined;
  }
  if (!req.body?.propertyValue) {
    res.send(400, { message: 'Invalid request: must provide propertyValue property request body' });
    return undefined;
  }
  if (!req.body?.isSearchable) {
    res.send(400, { message: 'Invalid request: must provide isSearchable property request body' });
    return undefined;
  }

  const [bearer, token] = req.headers.authorization.split(' ');
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

    const graphResponse = await graphClient.api(`storage/fileStorage/containers/${req.params.id}/customProperties`)
                                           .patch(req.body)

    res.send(200, graphResponse);
    return;
  } catch (error: any) {
    res.send(500, { message: `Unable to create container property: ${error.message}` });
    return;
  }
}
