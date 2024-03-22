import * as restify from "restify";

import { listContainers } from "./listContainers";
import { createContainer } from "./createContainer";

import { listContainerPermissions } from "./listContainerPermissions";
import { createContainerPermission } from "./createContainerPermission";
import { deleteContainerPermission } from "./deleteContainerPermission";

import { listContainerProperties } from "./listContainerProperties";
import { createContainerProperty } from "./createContainerProperty";

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 3001, () => {
  console.log(`\nAPI server started, ${server.name} listening to ${server.url}`);
});

// add CORS support
server.pre((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.header('origin'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.send(204);
  }

  next();
});

server.get('/api/listContainers', async (req, res, next) => {
  try {
    const response = await listContainers(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.post('/api/createContainer', async (req, res, next) => {
  try {
    const response = await createContainer(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.get('/api/listContainerPermissions/:id', async (req, res, next) => {
  try {
    const response = await listContainerPermissions(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.post('/api/createContainerPermission/:id', async (req, res, next) => {
  try {
    const response = await createContainerPermission(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.post('/api/deleteContainerPermission/:id', async (req, res, next) => {
  try {
    const response = await deleteContainerPermission(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.get('/api/listContainerProperties/:id', async (req, res, next) => {
  try {
    const response = await listContainerProperties(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});

server.post('/api/createContainerProperty/:id', async (req, res, next) => {
  try {
    const response = await createContainerProperty(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});
