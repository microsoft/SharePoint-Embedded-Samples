# SPE CMIS Adapter

A CMIS 1.1 [Browser Binding](https://docs.oasis-open.org/cmis/CMIS/v1.1/CMIS-v1.1.html) server,
implemented as an Azure Functions (Node.js/TypeScript) app, that sits in front of
[SharePoint Embedded](https://learn.microsoft.com/sharepoint/dev/embedded/overview) (SPE) via
Microsoft Graph. It lets any CMIS-speaking client — legacy ECM integrations (SAP Document Center,
etc.), the reference [Apache Chemistry OpenCMIS Workbench](https://chemistry.apache.org/), or your
own tooling — read and write content stored in SPE containers without needing to speak Microsoft
Graph directly.

```
CMIS client  --(CMIS Browser Binding / HTTP+JSON)-->  this server  --(Microsoft Graph)-->  SharePoint Embedded
```

- One SPE **Container Type** = one CMIS "repository set" (its container type ID is part of the URL).
- One SPE **Container** = one CMIS **repository**.
- A Graph **DriveItem** = a CMIS **document/folder** object.
- All Graph calls are made with **delegated (user) permissions**, so SPE's own access control is
  always enforced — this server never bypasses per-user/per-container permissions.

## Quickstart

**Prerequisites:**
- [Node.js](https://nodejs.org/) 20 or later (required by `@azure/functions` and `@azure/msal-node`)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) v4, **version 4.0.5530 or later** (needed for correct handling of chunked-transfer-encoding requests sent by some CMIS clients, e.g. OpenCMIS Workbench — run `func --version` to check)
- An Entra ID app + SharePoint Embedded Container Type already set up — see [Setup: Azure & SharePoint Embedded](docs/SETUP_AZURE.md) if you don't have one yet

```powershell
npm install
copy local.settings.json.example local.settings.json   # then fill in AZURE_CLIENT_ID / AZURE_CLIENT_SECRET
npm start
```

(On macOS/Linux: `cp local.settings.json.example local.settings.json`.)

That's it — `npm start` cleans, builds, and runs the Functions host at `http://localhost:7071`.
The `containerTypeId` and `repositoryId` are part of the URL, so **one running server instance can
serve any number of container types/repositories** your app's Entra registration is granted access to.

Try it:
```
GET http://localhost:7071/api/storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser
```
with HTTP Basic Auth (a work/school account with access to the container type) or a Bearer token.

## Testing it

There are two ways to test a running server (local or Azure) — a scripted Python test suite, and a
real third-party CMIS GUI client.

### Python test suite (`tests/`)

A small Python client under [`tests/`](tests/) exercises the implemented CMIS actions end-to-end
against a real container, using [cmislib](https://chemistry.apache.org/python/cmislib.html) over
the Browser Binding.

**Prerequisites:** Python 3.8+.

```powershell
cd tests
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env           # macOS/Linux: cp .env.example .env — then fill in your values
python cmis_client.py
```

Fill in `.env` with your Container Type ID and a test account's credentials:
```
CONTAINER_TYPE_ID=your-container-type-id-here
CMIS_USERNAME=your-username
CMIS_PASSWORD=your-password
```
By default the suite targets `http://localhost:7071`; set `CMIS_BASE_URL` in `.env` to point it at
an Azure deployment instead.

`cmis_client.py` connects, lists repositories, clears the target container, uploads the bundled
`tests/sample_data/` folder tree, and lists the result. For a broader regression pass covering type
definitions, query, ACLs, and versioning, run:
```powershell
python test_gaps.py
```
See [tests/requirements.txt](tests/requirements.txt) and [tests/.env.example](tests/.env.example)
for the full list of options (e.g. `CMIS_CONTAINER_NAME`, `CMIS_SAMPLE_DATA_FOLDER`).

### OpenCMIS Workbench (recommended for interop testing)

See [Connecting OpenCMIS Workbench](docs/CONNECT_OPENCMIS_WORKBENCH.md) to browse, upload, query,
and version content through a real, independent third-party CMIS GUI client.

## Deploying to Azure

1. Create a Function App (Node.js 20+, Consumption or Flex Consumption plan is fine):
   ```powershell
   az group create -n <resource-group> -l <region>
   az storage account create -n <storageaccountname> -g <resource-group> -l <region> --sku Standard_LRS
   az functionapp create -g <resource-group> -n <function-app-name> --consumption-plan-location <region> --runtime node --runtime-version 20 --functions-version 4 --storage-account <storageaccountname>
   ```
2. Set the app settings (same two values as `local.settings.json`):
   ```powershell
   az functionapp config appsettings set -g <resource-group> -n <function-app-name> --settings AZURE_CLIENT_ID=<your-client-id> AZURE_CLIENT_SECRET=<your-client-secret>
   ```
3. Build and publish:
   ```powershell
   npm run build
   func azure functionapp publish <function-app-name>
   ```
4. Your CMIS base URL becomes `https://<function-app-name>.azurewebsites.net/api/storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser`.

## Authentication

Two auth methods are supported, both resulting in a **delegated** (user-context) Microsoft Graph
token so SPE permissions are enforced per-user:

| Client sends | Server uses | Notes |
|---|---|---|
| HTTP Basic Auth (`username`/`password`) | ROPC (Resource Owner Password Credentials) flow | Matches how many legacy CMIS clients authenticate. **Does not work for accounts protected by MFA or Conditional Access** — use a test account without those policies, or use Bearer auth instead. Requires "Allow public client flows" enabled on the Entra app (see setup guide). |
| `Authorization: Bearer <token>` | On-Behalf-Of (OBO) flow, exchanged for a Graph token | Use when your client can already acquire an Entra ID token (e.g. via MSAL) for this app. |

## Repo layout

```
src/
  index.ts              # Function app entry point (enables Node.js HTTP Streams)
  functions/             # One file per CMIS Browser Binding route
  lib/
    auth/                # Basic/Bearer -> delegated Graph token (ROPC / OBO)
    cmis/                 # CMIS <-> Graph mapping, query engine, type defs, object actions
    config/               # Environment variable loading (AZURE_CLIENT_ID/SECRET)
    graph/                # Microsoft Graph calls (drive items, containers)
docs/
  SETUP_AZURE.md                    # End-to-end Entra app + Container Type setup
  CONNECT_OPENCMIS_WORKBENCH.md     # Using the OpenCMIS Workbench reference client
tests/
  cmis_client.py         # Python test client (Browser Binding via cmislib)
  test_gaps.py            # Regression pass: type defs, query, ACL, versioning
  test_http_edge_cases.py # Regression pass: HTTP wire-protocol edge cases
  sample_data/             # Synthetic placeholder content uploaded by the tests
```

## What's implemented

Repository listing/info, object CRUD (create/read/update/delete/move), folder browsing (by path or
`objectId`), content up/download, query (a practical SQL-92 subset), type definitions, ACL
discover/manage, and versioning (checkOut/checkIn/cancelCheckOut). Relationships, policies, and
multi-filing are **not** implemented — SPE's single-parent-folder data model has no equivalent for
them.
