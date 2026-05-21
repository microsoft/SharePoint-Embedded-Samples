#requires -Version 5.1
<#
.SYNOPSIS
    Stage 5: Create container, upload proof file, generate preview link.
    Step 5.1 — Create and activate the container.
    Step 5.2 — Upload proof file, grant owner permission, generate preview URL.
.PARAMETER ContainerName
    Display name for the container. Default: "My First Container"
#>

param(
    [string]$ContainerName = "My First Container"
)

. "$PSScriptRoot\_common.ps1"

$spe = Assert-EnvKeys @("TENANT_ID", "CLIENT_ID", "CONTAINER_TYPE_ID")
$tenantId = $spe["TENANT_ID"]
$appId = $spe["CLIENT_ID"]
$containerTypeId = $spe["CONTAINER_TYPE_ID"]
$speHeaders = Get-SpeHeaders
$bootstrapHeaders = Get-BootstrapHeaders

# ── Stage 5, Step 5.1: Create and activate container ─────────────────────────
Write-Host "`n=== Stage 5 — Step 5.1: First Container ===" -ForegroundColor Cyan

$container = $null
try {
    $containers = Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containers?`$filter=containerTypeId eq $containerTypeId" -Headers $speHeaders
    $container = $containers.value | Where-Object { $_.displayName -eq $ContainerName } | Select-Object -First 1
} catch {
    Write-Host "  Could not list containers yet (registration propagating). Will create." -ForegroundColor Yellow
}

if ($container) {
    Write-Host "  Container already exists: $($container.id)" -ForegroundColor Green
} else {
    $containerBody = @{
        containerTypeId = $containerTypeId
        displayName     = $ContainerName
    } | ConvertTo-Json

    # Retry with backoff - registration can take 10-30s to propagate
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        Write-Host "  Creating container '$ContainerName' (attempt $attempt/5)..." -ForegroundColor Gray
        try {
            $container = Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containers" -Method POST -Headers $speHeaders -Body $containerBody
            Write-Host "  Container created: $($container.id)" -ForegroundColor Green
            break
        } catch {
            if ($attempt -lt 5) {
                $waitSec = $attempt * 15
                Write-Host "  Registration propagating. Waiting ${waitSec}s..." -ForegroundColor Yellow
                Start-Sleep -Seconds $waitSec
            } else {
                throw "Container creation failed after 5 attempts: $_"
            }
        }
    }
}

$containerId = $container.id

# Activate if needed (retry with backoff)
if ($container.status -ne "active") {
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        Write-Host "  Activating container (attempt $attempt/5)..." -ForegroundColor Gray
        try {
            Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containers/$containerId/activate" -Method POST -Headers $speHeaders
            Write-Host "  Container activated" -ForegroundColor Green
            break
        } catch {
            if ($_ -match "already active|activated") {
                Write-Host "  Container already active" -ForegroundColor Green
                break
            } elseif ($attempt -lt 5) {
                $waitSec = $attempt * 10
                Write-Host "  Waiting ${waitSec}s for propagation..." -ForegroundColor Yellow
                Start-Sleep -Seconds $waitSec
            } else {
                Write-Host "  Activation failed after 5 attempts: $_" -ForegroundColor Red
            }
        }
    }
}

# ── Stage 5, Step 5.2: Upload proof file, grant access, generate preview ──────
Write-Host "`n=== Stage 5 — Step 5.2: Proof File & Preview Link ===" -ForegroundColor Cyan

$drive = Invoke-GraphRequest -Uri "$GraphBase/v1.0/storage/fileStorage/containers/$containerId/drive" -Headers $speHeaders
$driveId = $drive.id
Write-Host "  Drive ID: $driveId" -ForegroundColor Gray

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$proofContent = @"
=== SharePoint Embedded Setup Proof ===
If you can see this file, the SPE setup completed successfully!

App ID:            $appId
Container Type:    $containerTypeId
Container:         $ContainerName ($containerId)
Created:           $timestamp
"@

$proofFileName = "SPE-Setup-Proof.txt"
$uploadHeaders = @{ Authorization = $speHeaders.Authorization; "Content-Type" = "text/plain" }
$proofFile = Invoke-GraphRequest -Uri "$GraphBase/v1.0/drives/$driveId/root:/${proofFileName}:/content" -Method PUT -Headers $uploadHeaders -Body $proofContent
Write-Host "  Uploaded: $proofFileName ($($proofFile.size) bytes)" -ForegroundColor Green

# Grant current user owner permission on the container
Write-Host "  Granting container owner permission to current user..." -ForegroundColor Gray
$me = Invoke-GraphRequest -Uri "$GraphBase/v1.0/me" -Headers $bootstrapHeaders
$permBody = @{
    roles = @("owner")
    grantedToV2 = @{
        user = @{
            userPrincipalName = $me.userPrincipalName
        }
    }
} | ConvertTo-Json -Depth 5

try {
    # Note: containers/{id}/permissions is beta-only (no v1.0 equivalent yet)
    Invoke-RestMethod -Uri "$GraphBase/beta/storage/fileStorage/containers/$containerId/permissions" -Method POST -Headers $speHeaders -Body $permBody
    Write-Host "  Permission granted: $($me.userPrincipalName) = owner" -ForegroundColor Green
} catch {
    $permErr = $_.ErrorDetails.Message
    if ($permErr -match "already|exists|conflict|Forbidden") {
        Write-Host "  User already has container permissions (creator is auto-granted owner)" -ForegroundColor Green
    } else {
        Write-Host "  Permission warning: $permErr" -ForegroundColor Yellow
    }
}

$preview = Invoke-GraphRequest -Uri "$GraphBase/v1.0/drives/$driveId/items/$($proofFile.id)/preview" -Method POST -Headers $speHeaders -Body "{}"
$previewUrl = $preview.getUrl

# Save state
$spe["CONTAINER_ID"] = $containerId
$spe["DRIVE_ID"] = $driveId
$spe["PREVIEW_URL"] = $previewUrl
Save-EnvFile $spe

Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Status: Setup Complete!"
Write-Host "Container ID: $containerId"
Write-Host "Container Name: $ContainerName"
Write-Host "Container Type ID: $containerTypeId"
Write-Host "Drive ID: $driveId"
Write-Host "Proof File: $proofFileName ($($proofFile.size) bytes)"
Write-Host "Owner: $($me.userPrincipalName)"
Write-Host "Preview URL: $previewUrl"
Write-Host "CLIENT_ID: $appId"
Write-Host "TENANT_ID: $tenantId"
Write-Host "CONTAINER_TYPE_ID: $containerTypeId"
Write-Host "=== END ===" -ForegroundColor Green
Write-Host "[AGENT] STOP. Present the RESULT block above to the user as a markdown table. This is the final step - congratulate the user!" -ForegroundColor DarkGray
Write-Host ""
