#requires -Version 5.1
<#
.SYNOPSIS
    Step 5-6: Create container type and register on tenant.
.PARAMETER ContainerTypeName
    Name for the container type. Default: "My Container Type"
.PARAMETER BillingClassification
    "trial" (default) or "standard".
#>

param(
    [string]$ContainerTypeName = "My Container Type",
    [string]$BillingClassification = "trial"
)

. "$PSScriptRoot\_common.ps1"

$spe = Assert-EnvKeys @("TENANT_ID", "CLIENT_ID")
$appId = $spe["CLIENT_ID"]
$speHeaders = Get-SpeHeaders

# ── Step 5: Create or find container type ─────────────────────────────────────
Write-Host "`n=== Step 5: Container Type ===" -ForegroundColor Cyan

$ctList = Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containerTypes" -Headers $speHeaders
$ct = $ctList.value | Where-Object { $_.owningAppId -eq $appId } | Select-Object -First 1

if ($ct) {
    Write-Host "  Container type already exists: $($ct.id)" -ForegroundColor Green
} else {
    Write-Host "  Creating container type '$ContainerTypeName' (billing: $BillingClassification)..." -ForegroundColor Gray
    # IMPORTANT: Graph API field is "name" NOT "displayName"
    $ctBody = @{
        name                  = $ContainerTypeName
        owningAppId           = $appId
        billingClassification = $BillingClassification
    } | ConvertTo-Json

    $ct = Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containerTypes" -Method POST -Headers $speHeaders -Body $ctBody
    Write-Host "  Container type created: $($ct.id)" -ForegroundColor Green
}

# IMPORTANT: Graph response field is "id" NOT "containerTypeId"
$containerTypeId = $ct.id

# ── Step 6: Register container type on tenant ─────────────────────────────────
Write-Host "`n=== Step 6: Container Type Registration ===" -ForegroundColor Cyan

# PUT is idempotent - always call to ensure permissions are correct
# CRITICAL: Must include applicationPermissionGrants or container creation fails
Write-Host "  Registering container type with app permissions..." -ForegroundColor Gray
$regBody = @{
    applicationPermissionGrants = @(
        @{
            appId                  = $appId
            delegatedPermissions   = @("full")
            applicationPermissions = @("full")
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containerTypeRegistrations/$containerTypeId" -Method PUT -Headers $speHeaders -Body $regBody
Write-Host "  Container type registered on tenant" -ForegroundColor Green

# Save state
$spe["CONTAINER_TYPE_ID"] = $containerTypeId
Save-EnvFile $spe

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: OK"
Write-Host "Container Type ID: $containerTypeId"
Write-Host "Name: $ContainerTypeName"
Write-Host "Owning App: $appId"
Write-Host "Billing: $BillingClassification"
Write-Host "Delegated Permissions: full"
Write-Host "Application Permissions: full"
Write-Host "=== END ==="  -ForegroundColor Green
Write-Host "[AGENT] STOP. Show the RESULT as a markdown table. Then ask the user to continue. Do NOT run the next script yet." -ForegroundColor DarkGray
Write-Host ""
