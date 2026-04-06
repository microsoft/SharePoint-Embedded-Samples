# SharePoint Embedded MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI coding tools — Lovable, Claude, Cursor, GitHub Copilot, and others — to [SharePoint Embedded](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview) via the Microsoft Graph API.

Once deployed, your AI tool can create and manage containers, upload and download files, set permissions, track changes, and perform the full range of SharePoint Embedded operations — all through natural language.

---

## What it does

The server exposes ~60 MCP tools across four resource areas:

| Area | What you can do |
|---|---|
| **Containers** | Create, list, update, delete, lock, restore, manage permissions and custom properties, define columns, manage the recycle bin |
| **Drives** | Get drive metadata, browse by path, track changes with delta queries, list followed items |
| **Files & Folders** | Upload (small and large), download, move, copy, rename, search, check in/out, version history, thumbnails, preview URLs |
| **Permissions** | Grant, update, and remove permissions on files and folders |

---

## Prerequisites

Before you start you will need:

- An **Azure subscription** with permission to create resources
- An **Azure Entra ID App Registration** (instructions below)
- A **SharePoint Embedded Container Type** registered in your tenant
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`)
- [Node.js 20+](https://nodejs.org) for local development

---

## Step 1 — Locate your App Registration credentials

When you set up SharePoint Embedded, an Azure Entra ID App Registration was created as part of that process. This MCP server uses that same app registration to authenticate to Microsoft Graph — you do not need to create a new one.

### Find your credentials

1. Go to the [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Select your existing SPE app registration
3. On the overview page, note down:
   - **Application (client) ID** → this is your `APP_ID`
   - **Directory (tenant) ID** → this is your `TENANT_ID`
4. Go to **Certificates & secrets** and either copy an existing secret value (if you saved it when it was created) or create a new one:
   - Click **New client secret**, set an expiry, and copy the **Value** immediately — it is only shown once
   - This is your `CLIENT_SECRET`

### Verify required API permissions

Go to **API permissions** and confirm the following **Application permissions** are present and have admin consent granted (shown as a green checkmark):

| Permission | Type | Purpose |
|---|---|---|
| `FileStorageContainer.Selected` | Application | Access the containers linked to your app |
| `Files.ReadWrite.All` | Application | Read and write files within those containers |

If either permission is missing, click **Add a permission** → **Microsoft Graph** → **Application permissions**, add it, then click **Grant admin consent**.

> `FileStorageContainer.Selected` only grants access to containers whose Container Type is registered against this app. This is configured during SPE setup and is the correct scope — it is more restrictive than `FileStorageContainer.ReadWrite.All`.

---

## Step 2 — Get your Container Type ID

If you have already created a Container Type:

```powershell
# Using SharePoint Embedded PowerShell module
Install-Module -Name Microsoft.Online.SharePoint.PowerShell
Connect-SPOService -Url https://yourtenant-admin.sharepoint.com
Get-SPOContainerType
```

If you need to create one, follow the [SPE Container Type setup guide](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/getting-started/spembedded-for-3p-start).

---

## Step 3 — Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
TENANT_ID="your-directory-tenant-id"
APP_ID="your-app-registration-client-id"
CLIENT_SECRET="your-client-secret-value"
CONTAINER_TYPE_ID="your-container-type-id"
PORT=3000
```

> **Security:** Never commit `.env` to source control. It is excluded by `.gitignore`.

---

## Step 4 — Run locally

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000`. Verify it is working:

```bash
curl http://localhost:3000/health
# {"status":"ok","service":"spe-mcp-server","version":"1.0.0"}
```

Your local MCP endpoint is: `http://localhost:3000/mcp`

---

## Step 5 — Deploy to Azure Container Apps

The included Bicep template and deployment script create everything needed in Azure:

- Azure Container Registry (ACR)
- Container Apps Environment
- Container App with HTTPS ingress
- Log Analytics workspace
- Managed Identity with ACR pull access

### One-command deployment

```bash
# Create a resource group first (once)
az group create --name my-resource-group --location eastus

# Set your credentials as environment variables
export TENANT_ID="your-tenant-id"
export APP_ID="your-app-id"
export CLIENT_SECRET="your-client-secret"
export CONTAINER_TYPE_ID="your-container-type-id"

# Deploy infrastructure, build image, and start the app
./deploy.sh my-resource-group
```

At the end of the script you will see output like:

```
MCP Endpoint (Streamable HTTP) : https://spe-mcp.yellowsand-abc123.eastus.azurecontainerapps.io/mcp
SSE Endpoint (legacy)          : https://spe-mcp.yellowsand-abc123.eastus.azurecontainerapps.io/sse
Health check                   : https://spe-mcp.yellowsand-abc123.eastus.azurecontainerapps.io/health
```

Copy the **MCP Endpoint URL** — you will need it in the next steps.

### Verify deployment

```bash
curl https://your-endpoint.azurecontainerapps.io/health
```

---

## Step 6 — Connect to your AI tool

### Lovable

1. Open your Lovable project
2. Click the **...** menu → **Project settings** → **MCP Servers**
3. Click **Add MCP Server**
4. Enter your MCP endpoint URL: `https://your-endpoint.azurecontainerapps.io/mcp`
5. Lovable will automatically handle OAuth — it will open a browser window, authenticate, and return a token
6. Click **Save** — the SPE tools will appear in Lovable's tool list

You can now ask Lovable things like:
> *"Create a new container called 'Project Files' and upload this document to it"*

---

### Claude Desktop (claude.ai desktop app)

1. Open Claude Desktop → **Settings** → **Developer** → **Edit Config**
2. Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sharepoint-embedded": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-endpoint.azurecontainerapps.io/mcp"
      ]
    }
  }
}
```

3. Restart Claude Desktop
4. The SPE tools will appear in the tools panel (hammer icon)

> `mcp-remote` is a small proxy that bridges Claude Desktop's stdio transport to the server's HTTP transport. Install it once with `npm install -g mcp-remote` if the `npx` approach does not work.

---

### Claude Code (CLI)

Add the server to your Claude Code MCP config:

```bash
claude mcp add sharepoint-embedded \
  --transport http \
  --url https://your-endpoint.azurecontainerapps.io/mcp
```

Or edit `~/.claude/mcp_servers.json` directly:

```json
{
  "sharepoint-embedded": {
    "transport": "http",
    "url": "https://your-endpoint.azurecontainerapps.io/mcp"
  }
}
```

---

### Cursor

1. Open Cursor → **Settings** → **Features** → **MCP Servers**
2. Click **Add new MCP server**
3. Choose type **SSE** (use the `/sse` endpoint) or **Streamable HTTP** (use `/mcp`)
4. Enter the URL: `https://your-endpoint.azurecontainerapps.io/sse`
5. Click **Save**

The tools will appear in Cursor's Composer agent tool list.

---

### GitHub Copilot (VS Code extension)

1. Open VS Code → open `.vscode/mcp.json` (create it if it does not exist):

```json
{
  "servers": {
    "sharepoint-embedded": {
      "type": "http",
      "url": "https://your-endpoint.azurecontainerapps.io/mcp"
    }
  }
}
```

2. Open the Copilot Chat panel → switch to **Agent** mode
3. Click the tools icon — SharePoint Embedded tools will be listed

---

### Windsurf

1. Open Windsurf → **Settings** → **MCP**
2. Click **Add Server** → choose **HTTP/SSE**
3. Enter URL: `https://your-endpoint.azurecontainerapps.io/sse`
4. Click **Connect**

---

## Running locally with an AI tool

For local development, use `http://localhost:3000/mcp` as the endpoint. Most tools accept `localhost` URLs directly. You will still need the OAuth flow — the server handles it automatically without requiring a real user login (it uses app-only credentials).

---

## Available MCP tools

<details>
<summary>Container tools (29 tools)</summary>

| Tool | Description |
|---|---|
| `list_containers` | List all containers for the configured container type |
| `create_container` | Create a new container |
| `get_container` | Get container metadata including its drive ID |
| `get_container_drive` | Get just the driveId for use with file tools |
| `update_container` | Update display name or description |
| `delete_container` | Soft delete (recoverable for 93 days) |
| `activate_container` | Activate an inactive container |
| `permanent_delete_container` | Permanently delete a container |
| `list_deleted_containers` | List soft-deleted containers |
| `restore_deleted_container` | Restore a soft-deleted container |
| `permanent_delete_deleted_container` | Permanently remove from deleted store |
| `lock_container` | Set container to read-only |
| `unlock_container` | Remove read-only lock |
| `list_container_permissions` | List all permission entries |
| `add_container_permission` | Grant a user reader/writer/manager/owner access |
| `update_container_permission` | Change a user's role |
| `delete_container_permission` | Remove a permission entry |
| `get_container_custom_properties` | Get all custom metadata |
| `set_container_custom_property` | Create or update a custom property |
| `delete_container_custom_property` | Remove a custom property |
| `list_container_columns` | List column definitions |
| `create_container_column` | Add a column (text, number, date, choice, and more) |
| `get_container_column` | Get a column definition |
| `update_container_column` | Update a column definition |
| `delete_container_column` | Remove a column |
| `list_recycle_bin_items` | List items in the container recycle bin |
| `restore_recycle_bin_item` | Restore an item from the recycle bin |
| `delete_recycle_bin_item` | Permanently delete a recycle bin item |
| `update_recycle_bin_settings` | Set retention days (1–180) |

</details>

<details>
<summary>Drive tools (5 tools)</summary>

| Tool | Description |
|---|---|
| `get_drive` | Get drive metadata (quota, owner, type) |
| `get_drive_root` | Get the root folder item |
| `get_item_by_path` | Get an item by its path (e.g. `"Docs/Q1.pdf"`) |
| `get_drive_changes` | Delta query — get all changes since a token |
| `list_followed_items` | List items being followed |

</details>

<details>
<summary>File & folder tools (24 tools)</summary>

| Tool | Description |
|---|---|
| `list_items` | List files and folders in root or a folder |
| `get_item` | Get file/folder metadata |
| `upload_file` | Upload a file up to 4MB (base64-encoded) |
| `create_upload_session` | Create a resumable upload session for files larger than 4MB |
| `download_file` | Download a file as base64 |
| `download_item_as_format` | Download converted to another format (e.g. DOCX → PDF) |
| `delete_item` | Delete a file or folder (moves to recycle bin) |
| `permanently_delete_item` | Delete bypassing the recycle bin |
| `restore_item` | Restore a deleted item |
| `update_item` | Update item name or description |
| `create_folder` | Create a new folder |
| `move_item` | Move or rename a file or folder |
| `copy_item` | Copy a file or folder |
| `search_items` | Full-text search by keyword |
| `create_sharing_link` | Create a view/edit/embed sharing link |
| `checkout_item` | Lock a file for editing |
| `checkin_item` | Publish changes and release the checkout |
| `discard_checkout` | Revert to the last checked-in version |
| `list_item_versions` | List all versions of a file |
| `get_item_version` | Get metadata for a specific version |
| `restore_item_version` | Make a previous version current |
| `get_item_thumbnails` | Get thumbnail image URLs |
| `preview_item` | Get a short-lived embeddable preview URL |
| `follow_item` / `unfollow_item` | Subscribe/unsubscribe to change notifications |

</details>

<details>
<summary>Permission tools (4 tools)</summary>

| Tool | Description |
|---|---|
| `list_permissions` | List all permissions on a file or folder |
| `grant_permission` | Invite users by email with read or write access |
| `update_permission` | Change roles on an existing permission |
| `remove_permission` | Remove a permission entry |

</details>

---

## Architecture

```
AI Tool (Lovable / Claude / Cursor / etc.)
        │
        │  MCP over HTTPS (Streamable HTTP or SSE)
        │  OAuth 2.0 + PKCE for authentication
        ▼
SharePoint Embedded MCP Server
(Azure Container Apps)
        │
        │  Microsoft Graph API
        │  App-only auth via MSAL (Client Credentials)
        ▼
SharePoint Embedded (Microsoft 365)
```

**Authentication has two layers:**

1. **MCP client → server:** The server runs a lightweight OAuth 2.0 authorization server. AI tools authenticate using Authorization Code + PKCE. Tokens are short-lived JWTs signed with your `CLIENT_SECRET`.

2. **Server → Microsoft Graph:** The server uses MSAL with Client Credentials flow (your App Registration) to acquire Graph API tokens. This is app-only — no user sign-in required.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TENANT_ID` | Yes | Azure Entra ID tenant (directory) ID |
| `APP_ID` | Yes | App Registration client ID |
| `CLIENT_SECRET` | Yes | App Registration client secret |
| `CONTAINER_TYPE_ID` | Yes | SharePoint Embedded Container Type ID |
| `PORT` | No | HTTP port (default: `3000`) |

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload via tsx)
npm run dev

# Build TypeScript
npm run build

# Run compiled output
npm start
```

### Project structure

```
src/
├── index.ts          # Entry point
├── server.ts         # Express app + MCP server + OAuth endpoints
├── graph.ts          # Microsoft Graph HTTP client
├── auth.ts           # MSAL token acquisition
├── oauth.ts          # OAuth 2.0 authorization server
├── config.ts         # Environment variable loader
└── tools/
    ├── containers.ts  # Container management tools
    ├── drives.ts      # Drive-level tools
    ├── files.ts       # File and folder tools
    └── permissions.ts # Drive item permission tools
infra/
├── main.bicep         # Azure infrastructure (Container Apps, ACR, etc.)
└── main.bicepparam    # Deployment parameter placeholders
```

---

## Security considerations

- **Rotate secrets regularly.** Client secrets should be rotated before expiry (12–24 months). Update the `CLIENT_SECRET` env var in your Container App after rotation.
- **Scope permissions minimally.** The server uses `FileStorageContainer.Selected` and `Files.ReadWrite.All`. Remove any permissions your use case does not need.
- **Never commit `.env`.** It is excluded by `.gitignore`. Use Azure Container Apps secrets (already configured in the Bicep template) in production.
- **HTTPS only.** The Container Apps deployment enforces HTTPS. Do not expose the server over plain HTTP in production.

---

## License

MIT
