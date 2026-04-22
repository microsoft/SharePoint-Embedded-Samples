---
name: sharepoint-embedded-setup
description: Sets up a complete SharePoint Embedded environment - creates Entra app, container type, registration, container, and uploads a test file. Use when setting up SPE, creating container types, onboarding to SharePoint Embedded, or bootstrapping file storage containers.
---

# SharePoint Embedded — Full Setup

## Workflow

Run each script in order. State passes via `.env.spe`.

```
Setup Progress:
- [ ] 01-auth.ps1          -> Azure CLI login
- [ ] 02-app.ps1           -> Entra app + permissions
- [ ] 03-token.ps1         -> Device code auth (user interaction)
- [ ] 04-container-type.ps1 -> Container type + registration
- [ ] 05-container.ps1     -> Container + proof file + preview link
```

```powershell
powershell -File Skills/full-setup/01-auth.ps1
powershell -File Skills/full-setup/02-app.ps1
powershell -File Skills/full-setup/03-token.ps1
powershell -File Skills/full-setup/04-container-type.ps1
powershell -File Skills/full-setup/05-container.ps1
```

## Output format

Every script ends with a structured block:

```
=== RESULT ===
Status: OK
Key: Value
View App: https://portal.azure.com/...
=== END ===
```

Present **every line** from the RESULT block as a markdown table. Do not drop URL lines.

## Step-specific notes

**03-token.ps1** opens a browser for interactive sign-in (auth code + PKCE). If the browser cannot open, it falls back to device code flow and prints `ACTION REQUIRED:` with a URL and code. Use `-UseDeviceCode` to force device code flow. If `.spe-token` exists and is valid, this step completes instantly.

**05-container.ps1** may take 30-60s due to propagation retries (handled automatically). After it finishes, read `.env.spe` and include `PREVIEW_URL` in the summary.

**06-cleanup.ps1** deletes the container type and app. Only run if the user asks. The script prompts for Y/N confirmation before proceeding.

## Customization

```powershell
.\02-app.ps1 -AppDisplayName "Contoso Legal App"
.\04-container-type.ps1 -ContainerTypeName "Legal Cases" -BillingClassification "trial"
.\05-container.ps1 -ContainerName "Sample Case"
```

## Recovery

All scripts are idempotent. Re-run any failed script. Delete `.env.spe` to start fresh.

## Reference

- **Edge cases and gotchas:** See [gotchas.md](gotchas.md)
- **Auth flow details:** See [../reference/auth.md](../reference/auth.md)
- **Graph API reference:** See [../reference/graph-api-reference.md](../reference/graph-api-reference.md)
