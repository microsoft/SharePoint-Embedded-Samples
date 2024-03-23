import {
  Request,
  Response
} from "restify";
import * as MSAL from "@azure/msal-node";
import 'isomorphic-fetch';
import * as MSGraph from '@microsoft/microsoft-graph-client';
import { getGraphToken,  } from "./common/auth";
import { msalConfig } from "./common/config";

const confidentialClient = new MSAL.ConfidentialClientApplication(msalConfig);

export const listContainerPermissions = async (req: Request, res: Response) => {

  if (!req.headers.authorization) {
    res.send(401, { message: 'No access token provided.' });
    return;
  }
  if (!req.params.id) {
    res.send(400, { message: 'No container ID provided.' });
    return;
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

    const graphResponse = await graphClient.api(`storage/fileStorage/containers/${req.params.id}/permissions`)
                                           .get();

    res.send(200, graphResponse);
    return;
  } catch (error: any) {
    res.send(500, { message: `Unable to list container permissions: ${error.message}` });
    return;
  }
}
