# SPE React Sample App - Setup Checklist

Use this checklist to get the SharePoint Embedded TypeScript/React + Azure Functions sample app running locally.

---

## 1. Prerequisites

Install these tools **before** cloning or running the project.

### Node.js (v18 or v20 LTS)

```bash
node --version
# Expected: v18.x.x or v20.x.x
```

- Download from https://nodejs.org/ (pick the LTS version)
- **Do NOT use Node 22** -- it can cause issues with Azure Functions v4 and react-scripts 5
- If you use nvm: `nvm install 20 && nvm use 20`

### Azure Functions Core Tools v4

```bash
func --version
# Expected: 4.x.x
```

- **This is the most common missing piece.** Without it, the backend will not start.
- Install via npm:
  ```bash
  npm install -g azure-functions-core-tools@4 --unsafe-perm true
  ```
- Or via other methods: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools

### .NET SDK 6.0+

```bash
dotnet --version
# Expected: 6.x.x, 7.x.x, or 8.x.x
```

- Required by Azure Functions Core Tools under the hood
- Download from https://dotnet.microsoft.com/download
- If `func start` fails with a cryptic error and you have no .NET installed, this is likely the cause

### npm (comes with Node)

```bash
npm --version
# Expected: 8+
```

---

## 2. Environment Configuration

These files are **gitignored** -- every developer must create their own.

### Backend: `function-api/local.settings.json`

1. Copy the template:
   ```bash
   cp function-api/local.settings.template.json function-api/local.settings.json
   ```

2. Fill in the values:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
       "AZURE_SPA_CLIENT_ID": "<your SPA client ID>",
       "AZURE_CLIENT_ID": "<your server app client ID>",
       "SPE_CONTAINER_TYPE_ID": "<your container type ID>",
       "AZURE_CLIENT_SECRET": "<your client secret>",
       "AZURE_AI_ENDPOINT": "<optional - Azure AI Doc Intelligence endpoint>",
       "AZURE_AI_API_KEY": "<optional - Azure AI Doc Intelligence key>"
     },
     "Host": {
       "LocalHttpPort": 7072,
       "CORS": "*"
     }
   }
   ```

   - `AZURE_SPA_CLIENT_ID` -- Client ID of the SPA app registration
   - `AZURE_CLIENT_ID` -- Client ID of the server/API app registration
   - `SPE_CONTAINER_TYPE_ID` -- Your SharePoint Embedded container type ID
   - `AZURE_CLIENT_SECRET` -- Client secret for the server app registration
   - `AZURE_AI_*` -- Only needed if you want document intelligence/OCR features

### Frontend: `react-client/.env`

1. Copy the template:
   ```bash
   cp react-client/.template.env react-client/.env
   ```

2. Fill in the Azure AD app registration values (tenant ID, client IDs, container type ID, SharePoint host URL). See the template for the exact variable names.

---

## 3. Install Dependencies & Run

From the project root:

```bash
npm start
```

This single command will:
1. Install root dev dependencies
2. `cd function-api && npm install && npm run start` (builds TypeScript, starts Azure Functions on port 7072)
3. `cd react-client && npm install && npm run start` (starts React dev server, default port 8080)

Or start them individually in separate terminals:

```bash
# Terminal 1 - Backend
cd function-api
npm install
npm run start

# Terminal 2 - Frontend
cd react-client
npm install
npm run start
```

---

## 4. Verify It's Working

| Check | How |
|-------|-----|
| Backend is running | Visit `http://localhost:7072/api/containers` -- should return 401 (auth required) or a JSON response |
| Frontend is running | Visit `http://localhost:8080` (or whatever port your `.env` specifies) |
| Auth popup works | Click sign-in -- Azure AD popup should appear |

---

## 5. Troubleshooting

### `func: command not found`
Azure Functions Core Tools is not installed. See Prerequisites above.

### `func start` fails immediately or shows .NET errors
Install the .NET SDK (6.0+). Azure Functions Core Tools depends on it.

### `func start` fails with "No job functions found"
- Make sure `npm run build` completed successfully in `function-api/` (check for `dist/` folder)
- Verify `local.settings.json` exists and has `"AzureWebJobsFeatureFlags": "EnableWorkerIndexing"`

### `react-scripts: command not found` or webpack errors
```bash
cd react-client
rm -rf node_modules package-lock.json
npm install
```

### Node version errors or unexpected failures
```bash
node --version
```
If you're on Node 22+, switch to Node 20 LTS. Use nvm if you need multiple versions.

### CORS errors in browser console
Verify `function-api/local.settings.json` has `"CORS": "*"` under the `"Host"` section.

### Auth errors (token/login failures)
- Double-check all client IDs and secrets in both `local.settings.json` and `react-client/.env`
- Verify your Azure AD app registrations have the correct redirect URIs for `http://localhost:8080`
- Make sure the API scope `api://{SERVER_APP_ID}/Container.Manage` is exposed and granted

### Port conflicts
- Backend default: `7072` (set in `local.settings.json` and the start script)
- Frontend default: `8080` (set in `react-client/.env` as `PORT`)
- If those ports are in use, change them in the respective config files

---

## Quick Version Reference

These are the confirmed working versions from a known-good setup:

| Tool | Version |
|------|---------|
| Node.js | v20.19.3 |
| npm | 11.5.2 |
| Azure Functions Core Tools | 4.6.0 |
| .NET SDK | 8.0.418 |
| TypeScript | 4.9.5 |
| `@azure/functions` | 4.3.0 |
