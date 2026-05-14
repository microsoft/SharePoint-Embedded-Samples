---
name: sharepoint-embedded
description: Entry point for all SharePoint Embedded operations - setup, container management, content operations, and billing. Routes to the appropriate sub-skill. Use when working with SPE, SharePoint Embedded containers, container types, file storage containers, or Microsoft Graph storage APIs.
---

# SharePoint Embedded

AI agent skills for SharePoint Embedded — from initial setup to day-2 operations.

## Skills

| Skill | When to Use |
|-------|-------------|
| [full-setup/](full-setup/SKILL.md) | First-time environment setup (Entra app, container type, container) |

> Day-2 management, content operations, and billing-configuration skills are tracked on the roadmap and will be added in follow-up PRs.

## Quick Start

Give an agent this prompt:

```
Read skills/full-setup/SKILL.md and run the SPE setup scripts to set up SharePoint Embedded on my tenant.
```

Or run it yourself:

```powershell
cd skills/full-setup
.\spe-setup.ps1
```

## Prerequisites

- Azure CLI (`az --version`)
- PowerShell 5.1+ or 7+
- **Application Administrator** role on the tenant (sufficient to create the Entra app registration and consent to the delegated SPE permissions during interactive sign-in). Global Administrator also works but is not required.

## Auth Architecture

Two-moment auth — see [reference/auth.md](reference/auth.md) for details.

- **Moment 1 (Bootstrap):** `az login` for admin-level Entra app creation
- **Moment 2 (SPE Token):** Device code flow for delegated SPE scopes

## Reference

- **Auth flow details + fallbacks:** [reference/auth.md](reference/auth.md)
- **Graph API endpoints + payloads + errors:** [reference/graph-api-reference.md](reference/graph-api-reference.md)

## References

- [SharePoint Embedded Getting Started](https://learn.microsoft.com/en-us/sharepoint/dev/embedded/getting-started/register-api-documentation)
- [Graph API: Container Types](https://learn.microsoft.com/en-us/graph/api/resources/filestoragecontainertype?view=graph-rest-beta)
- [Graph API: Containers](https://learn.microsoft.com/en-us/graph/api/resources/filestoragecontainer?view=graph-rest-beta)
- [Entra App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [Device Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
