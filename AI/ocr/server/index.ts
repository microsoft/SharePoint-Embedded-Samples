import express, { NextFunction, Request, Response } from "express";
import { listContainers } from "./listContainers";
import { createContainer } from "./createContainer";
import { onReceiptAdded } from "./onReceiptAdded";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', req.header('origin'));
  res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/api/echo', async (_req: Request, res: Response) => {
  console.log('GET /api/echo');
  res.status(200).send("server is running");
});

app.get('/api/listContainers', async (req: Request, res: Response) => {
  try {
    await listContainers(req, res);
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).send({ message: `Error in API server: ${error.message}` });
    }
  }
});

app.post('/api/createContainer', async (req: Request, res: Response) => {
  try {
    await createContainer(req, res);
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).send({ message: `Error in API server: ${error.message}` });
    }
  }
});

app.post('/api/onReceiptAdded', async (req: Request, res: Response) => {
  try {
    await onReceiptAdded(req, res);
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).send({ message: `Error in API server: ${error.message}` });
    }
  }
});

const port = Number(process.env.port || process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`\nAPI server started, listening on http://127.0.0.1:${port}`);
});