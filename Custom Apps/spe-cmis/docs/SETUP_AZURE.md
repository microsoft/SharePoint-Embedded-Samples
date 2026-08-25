# Setup: Azure Entra ID app + SharePoint Embedded Container Type

This guide walks through everything you need before you can run the CMIS adapter against your own
tenant: registering the Entra ID app the server runs as, creating a SharePoint Embedded (SPE)
Container Type, registering it, and creating a container to test against.

You'll need a Microsoft 365 tenant with SharePoint Embedded available, and permission to create app
registrations and consent to permissions (a Global Administrator, Application Administrator, or
[SharePoint Embedded Administrator](https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#sharepoint-embedded-administrator)
role).

## 1. Register the Entra ID app

This is the "owning app" — both the identity the CMIS server authenticates as, **and** (for the
one-time setup steps below) the app used to create/register the Container Type.

1. Go to the [Azure portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name it (e.g. `spe-cmis-adapter`). Under **Supported account types**, "Accounts in this
   organizational directory only" is fine for a single-tenant setup.
3. Select **Register**. Note the **Application (client) ID** — you'll need it later.
4. **Certificates & secrets** → **New client secret** → copy the secret **value** immediately (it's
   only shown once).
5. **Authentication** → **Advanced settings** → set **Allow public client flows** to **Yes** → **Save**.
   This is required for the ROPC (Basic Auth) flow used by legacy CMIS clients.
6. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** →
   search for and add each of the following (search box supports partial matches):
   - `FileStorageContainer.Selected` — required always; this is what the running server uses.
   - `FileStorageContainerType.Manage.All` — only needed temporarily, to create the Container Type in step 2.
   - `FileStorageContainerTypeReg.Selected` — only needed temporarily, to register the Container Type in step 3.
7. Select **Grant admin consent for `<tenant>`**.

> You can remove the two temporary permissions again after setup if you prefer to keep the app's
> standing permissions minimal — they're only used once, during steps 2 and 3 below.

### Expose an API (required for Bearer/MFA-compatible auth)

The Basic Auth (ROPC) flow above doesn't work for accounts with MFA or Conditional Access policies
(see Troubleshooting). To use `scripts/get-bearer-token.js` (or any interactive/Bearer-token client)
instead, the app needs a delegated scope to request a token against:

1. **Expose an API** → **Add** next to **Application ID URI** → accept the default
   (`api://<Application (client) ID>`) → **Save**.
2. **Add a scope**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name / description**: e.g. "Access spe-cmis as the signed-in user"
   - **User consent display name / description**: same
   - **State**: Enabled
3. Under **Authorized client applications**, you can pre-authorize a public client (e.g. a CLI/test
   script's own client ID) to skip the consent prompt, or just consent interactively the first time
   `get-bearer-token.js` runs.

Without this step, `scripts/get-bearer-token.js` (and any Bearer-token client) fails with an
invalid-scope error, since it requests `api://<Application (client) ID>/access_as_user`.

## 2. Create a Container Type

**Recommended — SharePoint Embedded VS Code extension** (GUI, no manual Graph calls):
1. Install the [SharePoint Embedded extension](https://marketplace.visualstudio.com/items?itemName=SharepointEmbedded.ms-sharepoint-embedded-vscode-extension) in VS Code and sign in with a Microsoft 365 administrator account.
2. Create a new (trial) Container Type, owned by the app registered in step 1.
3. Note the **Container Type ID** it generates.

**Manual alternative — Microsoft Graph:**
```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containerTypes
Authorization: Bearer <delegated token with FileStorageContainerType.Manage.All>
Content-Type: application/json

{
  "displayName": "CMIS Adapter Container Type",
  "owningAppId": "<Application (client) ID from step 1>"
}
```
Note the `id` returned in the response — this is your **Container Type ID**.

## 3. Register the Container Type on the (consuming) tenant

Registration authorizes your app to actually use the Container Type in this tenant. If you're
testing in the same tenant that owns the Container Type, this is still a required step.

**Via the VS Code extension:** right-click the Container Type → **Register** → review the requested
permissions → grant consent in the browser tab that opens.

**Manual alternative — Microsoft Graph:**
```http
PUT https://graph.microsoft.com/v1.0/storage/fileStorage/containerTypeRegistrations/{containerTypeId}
Authorization: Bearer <delegated token with FileStorageContainerTypeReg.Selected>
Content-Type: application/json

{
  "applicationPermissionGrants": [
    {
      "appId": "<Application (client) ID from step 1>",
      "delegatedPermissions": ["full"],
      "applicationPermissions": ["full"]
    }
  ]
}
```
Use least-privilege permissions instead of `full` for anything beyond local testing.

## 4. Create a Container

A container is a single CMIS repository. Create at least one to test against.

**Via the VS Code extension:** expand the Container Type → right-click **Containers** → **Create container** → give it a name (e.g. `CMIS Test`).

**Manual alternative — Microsoft Graph:**
```http
POST https://graph.microsoft.com/v1.0/storage/fileStorage/containers
Authorization: Bearer <delegated token>
Content-Type: application/json

{
  "displayName": "CMIS Test",
  "containerTypeId": "<Container Type ID from step 2>"
}
```

## 5. Configure the server

```powershell
copy local.settings.json.example local.settings.json
```
Fill in the two values from step 1:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_CLIENT_ID": "<Application (client) ID>",
    "AZURE_CLIENT_SECRET": "<client secret value>"
  }
}
```
Notice there's no tenant ID or Container Type ID to configure — the tenant is derived from
whichever account authenticates, and the Container Type ID is part of every request URL. This same
running server can serve any Container Type your app has been registered against.

## 6. Run it

```powershell
npm install
npm start
```

Verify with:
```
GET http://localhost:7071/api/storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser
```
using Basic Auth (a work/school account with access to the container) or a Bearer token. You should
get back a JSON list of repositories, including the container you created in step 4.

## Troubleshooting

- **`AADSTS...` errors on Basic Auth requests** — ROPC doesn't work for accounts with MFA or
  Conditional Access policies applied. Use a test account without those policies, or switch the
  client to send a Bearer token instead.
- **403 / `accessDenied` from Graph** — double check step 3 (registration) completed and admin
  consent was granted in step 1.
- **`cmisaction is required` from a real client but not from `curl`/Postman** — make sure your Azure
  Functions Core Tools is `>= 4.0.5530` (see the main [README](../README.md)); some clients send
  chunked-transfer-encoding requests that older Core Tools versions silently drop the body of.
