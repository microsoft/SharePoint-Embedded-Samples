import {
  Request,
  Response
} from "restify";
import { GraphProvider } from "./GraphProvider";
require('isomorphic-fetch');

export const listContainers = async (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    res.send(401, { message: 'No access token provided.' });
    return;
  }

  const [bearer, token] = req.headers.authorization.split(' ');
  await GraphProvider.setGraphClient(token);

  try {
    const graphResponse = await GraphProvider.graphClient.api(`storage/fileStorage/containers?$filter=containerTypeId eq ${process.env["CONTAINER_TYPE_ID"]}`).get();
    res.send(200, graphResponse);
    return;
  } catch (error: any) {
    res.send(500, { message: `Unable to list containers: ${error.message}` });
    return;
  }
}