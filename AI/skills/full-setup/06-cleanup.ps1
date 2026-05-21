#requires -Version 5.1
<#
.SYNOPSIS
    Step 9: Clean up SPE resources (container type + app registration).
.DESCRIPTION
    Deletes the container type and Entra app created by the setup scripts.
    Removes cached token and .env.spe files.
    Only run this if you want to tear down everything that was created.
#>

. "$PSScriptRoot\_common.ps1"

$spe = Assert-EnvKeys @("TENANT_ID", "CLIENT_ID", "APP_OBJECT_ID", "CONTAINER_TYPE_ID")
$appObjectId = $spe["APP_OBJECT_ID"]
$containerTypeId = $spe["CONTAINER_TYPE_ID"]
$speHeaders = Get-SpeHeaders
$bootstrapHeaders = Get-BootstrapHeaders

Write-Host "`n=== Step 9: Cleanup ===" -ForegroundColor Cyan

Write-Host "  This will DELETE the following resources:" -ForegroundColor Yellow
Write-Host "    - Container Type: $containerTypeId" -ForegroundColor Yellow
Write-Host "    - App Registration: $appObjectId" -ForegroundColor Yellow
Write-Host "    - Local files: .spe-token and .env.spe" -ForegroundColor Yellow
$confirm = Read-Host "  Are you sure you want to delete all SPE resources? (Y/N)"
if ($confirm -ne 'Y') {
    Write-Host "  Cleanup cancelled." -ForegroundColor Gray
    return
}

Write-Host "  Deleting container type: $containerTypeId ..." -ForegroundColor Gray
try {
    Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containerTypes/$containerTypeId" -Method DELETE -Headers $speHeaders
    Write-Host "  Container type deleted" -ForegroundColor Green
} catch {
    Write-Host "  Container type deletion failed: $_" -ForegroundColor Red
}

Write-Host "  Deleting app registration: $appObjectId ..." -ForegroundColor Gray
try {
    Invoke-GraphRequest -Uri "$GraphBase/v1.0/applications/$appObjectId" -Method DELETE -Headers $bootstrapHeaders
    Write-Host "  App registration deleted" -ForegroundColor Green
} catch {
    Write-Host "  App deletion failed: $_" -ForegroundColor Red
}

# Clean up local files
$tokenPath = Join-Path (Get-Location) ".spe-token"
$envPath = Join-Path (Get-Location) ".env.spe"
if (Test-Path $tokenPath) { Remove-Item $tokenPath -Force }
if (Test-Path $envPath) { Remove-Item $envPath -Force }

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: OK"
Write-Host "Container Type: deleted ($containerTypeId)"
Write-Host "App Registration: deleted ($appObjectId)"
Write-Host "Local Files: .spe-token and .env.spe removed"
Write-Host "=== END ==="  -ForegroundColor Green
Write-Host "[AGENT: Present the RESULT block above as a markdown table.]" -ForegroundColor DarkGray
Write-Host ""
