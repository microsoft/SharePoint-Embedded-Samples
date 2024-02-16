import {
  Request,
  Response
} from "restify";
import { GraphProvider } from "./GraphProvider";
require('isomorphic-fetch');

export const createContainer = async (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    res.send(401, { message: 'No access token provided.' });
    return;
  }

  const [bearer, token] = req.headers.authorization.split(' ');
  await GraphProvider.setGraphClient(token);

  try {
    const containerRequestData = {
      displayName: req.body!.displayName,
      description: (req.body?.description) ? req.body.description : '',
      containerTypeId: process.env["CONTAINER_TYPE_ID"]
    };

    const graphResponse = await GraphProvider.graphClient.api(`storage/fileStorage/containers`).post(containerRequestData);

    res.send(200, graphResponse);
    return;
  } catch (error: any) {
    res.send(500, { message: `Failed to create container: ${error.message}` });
    return;
  }
}

