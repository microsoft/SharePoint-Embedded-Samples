export interface AppConfig {
  tenantId: string;
  appId: string;
  clientSecret: string;
  containerTypeId: string;
  port: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    tenantId: requireEnv('TENANT_ID'),
    appId: requireEnv('APP_ID'),
    clientSecret: requireEnv('CLIENT_SECRET'),
    containerTypeId: requireEnv('CONTAINER_TYPE_ID'),
    port: parseInt(process.env['PORT'] ?? '3000', 10),
  };
}
