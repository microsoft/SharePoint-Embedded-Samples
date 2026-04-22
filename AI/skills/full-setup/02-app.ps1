#requires -Version 5.1
<#
.SYNOPSIS
    Step 2-3: Create Entra app registration and add SPE API permissions.
.PARAMETER AppDisplayName
    Display name for the app registration. Default: "My SPE App"
#>

param(
    [string]$AppDisplayName = "My SPE App"
)

. "$PSScriptRoot\_common.ps1"

$spe = Assert-EnvKeys @("TENANT_ID")
$tenantId = $spe["TENANT_ID"]
$headers = Get-BootstrapHeaders
$portalBase = "https://portal.azure.com/$tenantId/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade"

# ── Step 2: Create or find Entra app ──────────────────────────────────────────
Write-Host "`n=== Step 2: Entra App Registration ===" -ForegroundColor Cyan

$app = $null

# Check for app from previous run
if ($spe["CLIENT_ID"]) {
    try {
        $existing = Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications?`$filter=appId eq '$($spe["CLIENT_ID"])'" -Headers $headers
        $app = $existing.value | Select-Object -First 1
        if ($app) { Write-Host "  Found app from previous run: $($app.appId)" -ForegroundColor Gray }
    } catch {}
}

# Fall back to displayName lookup
if (-not $app) {
    $existing = Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications?`$filter=displayName eq '$AppDisplayName'" -Headers $headers
    $app = $existing.value | Select-Object -First 1
}

if ($app) {
    Write-Host "  App already exists: $($app.appId)" -ForegroundColor Green
} else {
    Write-Host "  Creating public client app '$AppDisplayName'..." -ForegroundColor Gray
    $appBody = @{
        displayName            = $AppDisplayName
        signInAudience         = "AzureADMyOrg"
        isFallbackPublicClient = $true
        publicClient           = @{ redirectUris = @("http://localhost:3000") }
    } | ConvertTo-Json -Depth 5

    $app = Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications" -Method POST -Headers $headers -Body $appBody
    Write-Host "  App created: $($app.appId)" -ForegroundColor Green
}

$appId = $app.appId
$appObjectId = $app.id

# Ensure publicClient redirect URI and isFallbackPublicClient are set (fixes existing apps)
$needsPatch = $false
$patchBody = @{}
if (-not $app.isFallbackPublicClient) {
    $patchBody["isFallbackPublicClient"] = $true
    $needsPatch = $true
}
$currentRedirects = @()
if ($app.publicClient -and $app.publicClient.redirectUris) {
    $currentRedirects = $app.publicClient.redirectUris
}
if ("http://localhost:3000" -notin $currentRedirects) {
    $patchBody["publicClient"] = @{ redirectUris = @("http://localhost:3000") }
    $needsPatch = $true
}
# Remove SPA redirect if present (causes AADSTS9002327 on server-side token exchange)
if ($app.spa -and $app.spa.redirectUris -and $app.spa.redirectUris.Count -gt 0) {
    $patchBody["spa"] = @{ redirectUris = @() }
    $needsPatch = $true
}
if ($needsPatch) {
    $patchJson = $patchBody | ConvertTo-Json -Depth 5
    Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications/$($app.id)" -Method PATCH -Headers $headers -Body $patchJson
    Write-Host "  Updated app: publicClient redirect URI and settings configured" -ForegroundColor Green
}

# ── Step 3: Add API permissions ───────────────────────────────────────────────
Write-Host "`n=== Step 3: API Permissions ===" -ForegroundColor Cyan

$permBody = @{
    requiredResourceAccess = @(
        @{
            resourceAppId  = "00000003-0000-0000-c000-000000000000"
            resourceAccess = @(
                @{ id = $PERMS.FileStorageContainer_Selected_Delegated;         type = "Scope" }
                @{ id = $PERMS.FileStorageContainerType_ManageAll_Delegated;     type = "Scope" }
                @{ id = $PERMS.FileStorageContainerTypeReg_ManageAll_Delegated;  type = "Scope" }
            )
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications/$appObjectId" -Method PATCH -Headers $headers -Body $permBody
Write-Host "  Permissions configured" -ForegroundColor Green

# Save state
$spe["CLIENT_ID"] = $appId
$spe["APP_OBJECT_ID"] = $appObjectId
$spe["APP_PORTAL"] = "$portalBase/~/Overview/appId/$appId"
$spe["PERMISSIONS_PORTAL"] = "$portalBase/~/CallAnAPI/appId/$appId"
Save-EnvFile $spe

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: OK"
Write-Host "App Name: $AppDisplayName"
Write-Host "Application ID: $appId"
Write-Host "Object ID: $appObjectId"
Write-Host "Public Client: Yes (no secret needed)"
Write-Host "Permissions: FileStorageContainer.Selected, ContainerType.Manage.All, ContainerTypeReg.Manage.All"
Write-Host "View App: $portalBase/~/Overview/appId/$appId"
Write-Host "View Permissions: $portalBase/~/CallAnAPI/appId/$appId"
Write-Host "=== END ===" -ForegroundColor Green
Write-Host "[AGENT] STOP. Present the RESULT block above to the user as a markdown table. Do NOT run the next script until the user replies." -ForegroundColor DarkGray
Write-Host ""
