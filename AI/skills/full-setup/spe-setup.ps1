#requires -Version 5.1
<#
.SYNOPSIS
    SharePoint Embedded - Full setup (runs all steps in sequence).
.DESCRIPTION
    Wrapper that runs 01-auth through 05-container in order.
    For agent-driven setups, run each numbered script individually instead.
.PARAMETER AppDisplayName
    Display name for the Entra app. Default: "My SPE App"
.PARAMETER ContainerTypeName
    Name for the container type. Default: "My Container Type"
.PARAMETER ContainerName
    Display name for the container. Default: "My First Container"
.PARAMETER BillingClassification
    "trial" (default) or "standard".
.PARAMETER SkipCleanup
    Skip the cleanup prompt at the end.
.PARAMETER NonInteractive
    Skip pauses between steps (for fleet/eval runs).
.EXAMPLE
    .\spe-setup.ps1
.EXAMPLE
    .\spe-setup.ps1 -AppDisplayName "Contoso Legal" -NonInteractive -SkipCleanup
#>

param(
    [string]$AppDisplayName = "My SPE App",
    [string]$ContainerTypeName = "My Container Type",
    [string]$ContainerName = "My First Container",
    [string]$BillingClassification = "trial",
    [switch]$SkipCleanup,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot

function Pause-Step {
    param([string]$NextStep)
    if (-not $NonInteractive) {
        Write-Host ""
        Read-Host "  Press Enter to continue to $NextStep"
    }
}

# Stage 1: Azure CLI auth
& "$scriptDir\01-auth.ps1"
Pause-Step "Entra App Registration"

# Stage 2: Create app + permissions (Steps 2.1–2.2)
& "$scriptDir\02-app.ps1" -AppDisplayName $AppDisplayName
Pause-Step "Device Code Authentication"

# Stage 3: SPE token via device code
& "$scriptDir\03-token.ps1"
Pause-Step "Container Type"

# Stage 4: Container type + registration (Steps 4.1–4.2)
& "$scriptDir\04-container-type.ps1" -ContainerTypeName $ContainerTypeName -BillingClassification $BillingClassification
Pause-Step "Container + Proof File"

# Stage 5: Container + upload + preview (Steps 5.1–5.2)
& "$scriptDir\05-container.ps1" -ContainerName $ContainerName

# Stage 6 (optional): Cleanup
if (-not $SkipCleanup) {
    Write-Host ""
    $cleanup = Read-Host "  Clean up resources? Deletes container type + app (y/n)"
    if ($cleanup -eq 'y') {
        & "$scriptDir\06-cleanup.ps1"
    } else {
        Write-Host "  Skipping cleanup. Resources preserved." -ForegroundColor Gray
    }
} else {
    Write-Host "  Cleanup skipped (-SkipCleanup)." -ForegroundColor Gray
}
