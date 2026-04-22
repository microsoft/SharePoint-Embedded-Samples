# Auth Patterns for SharePoint Embedded Skills

## Overview

The full-setup skill uses a two-moment auth pattern. This document explains the details and fallback options.

---

## Moment 1: Bootstrap Token (Azure CLI)

Used for Entra app creation and permission configuration only.

```powershell
# Login (one-time, interactive)
az login --allow-no-subscriptions

# Get token (non-interactive, can be called repeatedly)
$token = az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv
```

**Why `--allow-no-subscriptions`:** M365-only tenants don't have Azure subscriptions. Without this flag, `az login` reports "No subscriptions found" and exits with error code 1.

**Scopes available:** The Azure CLI token has whatever permissions the signed-in user has in the tenant. For app creation, the user needs `Application.ReadWrite.All` (typically Global Admin or Application Admin).

---

## Moment 2: SPE Token (Interactive Login)

Used for all SPE operations (container types, containers, permissions).

The script (`03-token.ps1`) uses a two-tier auth strategy:

1. **Primary: Interactive browser login (auth code + PKCE)** — Opens a browser, user signs in, callback on `http://localhost:3000`
2. **Fallback: Device code flow** — If browser can't open, user visits a URL and enters a code

### Interactive Flow (Primary)

```powershell
# 1. Generate PKCE code verifier + challenge
# 2. Start HttpListener on localhost:3000
# 3. Open browser to authorization URL
# 4. User signs in and consents
# 5. Browser redirects to localhost:3000 with auth code
# 6. Exchange auth code + code_verifier for token
```

This is the same pattern `az login` uses — smoother UX, no manual code entry.

### Device Code Flow (Fallback)

Used when browser cannot be launched (headless environments, agent-driven terminals):

```powershell
# Force device code flow explicitly:
powershell -File 03-token.ps1 -UseDeviceCode
```

### Auth Method Comparison

| Flow | Browser Opens | User Action | Security | When Used |
|------|--------------|-------------|----------|-----------|
| Auth Code + PKCE | Yes (auto) | Sign in, close tab | PKCE + state + CSRF | Default (interactive) |
| Device Code | No | Visit URL, enter code | Phishing risk (mitigated) | Fallback / `-UseDeviceCode` |
| Client Credentials | N/A | None | No user context | Not supported (need delegated) |

> **Security note:** The interactive flow uses PKCE (Proof Key for Code Exchange) and state validation to prevent CSRF and auth code interception attacks. Device code flow is only used as a fallback and carries a theoretical phishing risk, mitigated by the fact that the user initiates the flow themselves from their own terminal.

> **Public client requirement:** Device code flow only works with public client applications (`isFallbackPublicClient: true`). If a user provides a bring-your-own app ID, the `03-token.ps1` script validates this before attempting the flow. Confidential client applications will be rejected with a clear error message.

---

## Consent Behavior

### First Run (No Prior Consent)

When the user completes the device code flow for the first time with this app, they see a consent prompt:

```
Permissions requested:
☑ Read and write items in selected file storage containers
☑ Manage all file storage container types
☑ Manage all file storage container type registrations

[Accept] [Cancel]
```

The user clicks **Accept** once. All subsequent runs skip the consent prompt.

### Subsequent Runs

- If the user has already consented, the device code flow completes without a consent prompt
- The token is issued immediately after login

---

## Token Scopes in the Response

After device code flow, verify the token has all required scopes:

```powershell
# Decode JWT payload (base64)
$payload = $speToken.Split('.')[1]
$padding = 4 - ($payload.Length % 4)
if ($padding -ne 4) { $payload += '=' * $padding }
$decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
Write-Host "Scopes: $($decoded.scp)"
```

Expected output:
```
Scopes: FileStorageContainer.Selected FileStorageContainerType.Manage.All FileStorageContainerTypeReg.Manage.All
```

If any scope is missing, the app's `requiredResourceAccess` was not set correctly in Step 3.

---

## Fallback: No Admin Access

If the user cannot run `az login` with admin privileges (e.g., they're a regular user, or Azure CLI isn't installed):

### Option A: Pre-existing App ID

If someone (an admin) has already created the Entra app and shared the `CLIENT_ID`:

```powershell
# Skip Steps 1-3 entirely. Start at Step 4 (device code flow).
$appId = "pre-existing-client-id"
$tenantId = "known-tenant-id"
# Continue with device code flow...
```

### Option B: Manual App Creation + Paste

1. Agent instructs user: "Go to https://portal.azure.com → App registrations → New registration"
2. User creates app, adds permissions, and pastes the `CLIENT_ID` back to the agent
3. Agent continues from Step 4

### Option C: Paste a Token

If the user can obtain a token through another means (Postman, Graph Explorer):

```powershell
$speToken = Read-Host "Paste your Graph API token"
# Continue with SPE operations...
```
