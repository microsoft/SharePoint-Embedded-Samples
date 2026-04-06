import { loadConfig } from './config.js';
import { AuthProvider } from './auth.js';
import { GraphClient } from './graph.js';
import { buildApp } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const auth = new AuthProvider(config);
  const graph = new GraphClient(auth);
  const app = buildApp(graph, config);

  const httpServer = app.listen(config.port, () => {
    console.log(`SPE MCP Server started on port ${config.port}`);
    console.log(`  Streamable HTTP : POST/GET http://localhost:${config.port}/mcp`);
    console.log(`  SSE (legacy)    : GET  http://localhost:${config.port}/sse`);
    console.log(`                    POST http://localhost:${config.port}/messages?sessionId=<id>`);
    console.log(`  Health check    : GET  http://localhost:${config.port}/health`);
  });

  const shutdown = (): void => {
    console.log('Shutting down gracefully...');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(e => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
