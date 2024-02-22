import * as restify from "restify";
import { listContainers } from "./listContainers";
import { createContainer } from "./createContainer";
import { onReceiptAdded } from "./onReceiptAdded";

const server = restify.createServer();

server.use(restify.plugins.bodyParser(), restify.plugins.queryParser());

server.listen(process.env.port || process.env.PORT || 3001, () => {
  console.log(`\nAPI server started, ${server.name} listening to ${server.url}`);
});

server.pre((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.header('origin'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.send(204);
  }

  next();
});

server.get('/api/echo', async (req, res, next) => {
  console.log('GET /api/echo');
  res.send(200, "server is running");
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

server.post('/api/onReceiptAdded', async (req, res, next) => {
  try {
    const response = await onReceiptAdded(req, res);
    res.send(200, response)
  } catch (error: any) {
    res.send(500, { message: `Error in API server: ${error.message}` });
  }
  next();
});