import {
  Request,
  Response
} from "express";
import { GraphProvider } from "./GraphProvider";
require('isomorphic-fetch');

export const listContainers = async (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    res.status(401).send({ message: 'No access token provided.' });
    return;
  }

  const [bearer, token] = req.headers.authorization.split(' ');
  await GraphProvider.setGraphClient(token);

  try {
    const graphResponse = await GraphProvider.graphClient.api(`storage/fileStorage/containers?$filter=containerTypeId eq ${process.env["CONTAINER_TYPE_ID"]}`).get();
    res.status(200).send(graphResponse);
    return;
  } catch (error: any) {
    res.status(500).send({ message: `Unable to list containers: ${error.message}` });
    return;
  }
}