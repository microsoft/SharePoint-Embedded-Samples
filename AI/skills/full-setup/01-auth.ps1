#requires -Version 5.1
<#
.SYNOPSIS
    Step 1: Azure CLI authentication for SharePoint Embedded setup.
.DESCRIPTION
    Signs into Azure CLI and saves tenant info to .env.spe.
    If already signed in, reuses the existing session.
#>

. "$PSScriptRoot\_common.ps1"

Write-Host "`n=== Step 1: Azure CLI Authentication ===" -ForegroundColor Cyan

$azAccount = $null
try {
    $azAccount = az account show --query "{tenantId:tenantId, user:user.name}" -o json 2>$null | ConvertFrom-Json
} catch {}

if (-not $azAccount) {
    Write-Host "  Signing into Azure CLI..." -ForegroundColor Yellow
    Write-Host "  A browser window will open for authentication." -ForegroundColor Gray
    Write-Host "  If no browser opens, use: az login --allow-no-subscriptions --use-device-code" -ForegroundColor Gray
    Write-Host ""
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    az login --allow-no-subscriptions 2>&1 | Out-Null
    $ErrorActionPreference = $prevPref
    $azAccount = az account show --query "{tenantId:tenantId, user:user.name}" -o json | ConvertFrom-Json
    if (-not $azAccount) {
        throw "Azure CLI login failed. Please run 'az login --allow-no-subscriptions' manually."
    }
}

$tenantId = $azAccount.tenantId

# Save to .env.spe
$spe = Read-EnvFile
$spe["TENANT_ID"] = $tenantId
$spe["USER_UPN"] = $azAccount.user
Save-EnvFile $spe

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: OK"
Write-Host "User: $($azAccount.user)"
Write-Host "Tenant: $tenantId"
Write-Host "Entra Portal: https://entra.microsoft.com/$tenantId/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
Write-Host "=== END ===" -ForegroundColor Green
Write-Host "[AGENT] STOP. Present the RESULT block above to the user as a markdown table. Do NOT run the next script until the user replies." -ForegroundColor DarkGray
Write-Host ""
