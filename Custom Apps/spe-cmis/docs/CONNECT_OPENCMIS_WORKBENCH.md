# Connecting Apache Chemistry OpenCMIS Workbench

[OpenCMIS Workbench](https://chemistry.apache.org/java/developing/tools/dev-tools-workbench.html)
is the Apache Chemistry project's reference desktop GUI client for the CMIS protocol. It's a good
way to interactively browse, upload, query, and version content through this adapter using a real,
independent CMIS client (rather than this repo's own Python test client).

## 1. Prerequisites

- A Java runtime (JRE/JDK 8 or later) on your machine.
- The CMIS adapter running and reachable (locally at `http://localhost:7071`, or your Azure deployment URL).
- A work/school account with access to at least one container (see [Setup: Azure & SharePoint Embedded](SETUP_AZURE.md)).

## 2. Download and run the Workbench

1. Download the **OpenCMIS Workbench** package from the [OpenCMIS downloads page](https://chemistry.apache.org/java/download.html) (look for the "OpenCMIS Workbench" row; the latest release is 1.1.0).
2. Extract the downloaded archive.
3. Run it:
   - **Windows:** double-click `workbench.bat` in the extracted folder (or run it from a terminal).
   - **macOS/Linux:** run `./workbench.sh` from the extracted folder.
   - If neither script works on your platform, you can launch the jar directly:
     ```
     java -classpath ".;lib/*" org.apache.chemistry.opencmis.workbench.Workbench
     ```
     (use `:` instead of `;` as the classpath separator on macOS/Linux).

## 3. Connect to the server

When the Workbench opens, it shows a connection dialog (or use **File → Connect** if it doesn't):

| Field | Value |
|---|---|
| **URL** | `http://localhost:7071/api/storage/fileStorage/containerTypes/{containerTypeId}/cmis/browser` |
| **Binding** | Browser |
| **Authentication** | Standard (username/password) |
| **Username** | Your work/school account UPN, e.g. `user@yourtenant.onmicrosoft.com` |
| **Password** | That account's password |

Replace `{containerTypeId}` with your actual Container Type ID from setup. Select **Load
Repositories** — you should see one repository per container your account has access to (matching
the container(s) created during setup).

### If your account has MFA enabled

Username/password login uses the ROPC flow, which Microsoft Entra blocks for MFA-protected or
Conditional-Access-protected accounts (you'll see an `AADSTS...` error). Use the Workbench's OAuth
mode instead — note there's no separate "token" field; it reuses the **Username** field:

1. Get a token via the device code flow (supports MFA, opens a normal browser sign-in):
   ```powershell
   node scripts/get-bearer-token.js
   ```
   Open the printed URL, enter the code, and sign in normally (including any MFA prompt). The
   script then prints an access token.
2. In the Workbench connection dialog, select the **"OAuth 2.0 (Bearer Token)"** radio button under
   **Authentication**, paste the token into the **Username** field, and leave **Password** blank.
3. Tokens expire (~1 hour) — rerun the script and reconnect when it does.

## 4. What you can try

- Browse folders/documents in the repository tree.
- Upload a new document (drag-and-drop or **New Document**).
- Create a folder.
- Run a CMIS query, e.g. `SELECT * FROM cmis:document WHERE cmis:name LIKE '%.docx'`, from the **Query** tab.
- Check out / check in a document to exercise versioning.
- Inspect an object's ACL from the **ACL** tab.

## Troubleshooting

- **Login fails / `AADSTS...` error** — the account you're using is likely protected by MFA or a
  Conditional Access policy, which blocks the ROPC (Basic Auth) flow this server uses for
  username/password logins. Either use a test account without those policies, or use the **OAuth
  Bearer Token** flow described above (`node scripts/get-bearer-token.js`), which supports MFA.
- **`cmisaction is required`** — make sure the server's Azure Functions Core Tools version is
  `>= 4.0.5530` (`func --version`). Older versions silently drop the body of the chunked-encoding
  requests the Workbench's Java HTTP client sends by default. See the main [README](../README.md).
- **Repository list is empty** — the signed-in account doesn't have access to any container yet;
  create one and/or grant the account access (see [SETUP_AZURE.md](SETUP_AZURE.md)).
