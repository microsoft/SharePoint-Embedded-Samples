import {
  Request,
  Response
} from "express";
import { GraphProvider } from "./GraphProvider";
require('isomorphic-fetch');

export const createContainer = async (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    res.status(401).send({ message: 'No access token provided.' });
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

    res.status(200).send(graphResponse);
    return;
  } catch (error: any) {
    res.status(500).send({ message: `Failed to create container: ${error.message}` });
    return;
  }
}

