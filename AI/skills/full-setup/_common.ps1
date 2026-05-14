# _common.ps1 - Shared utilities for SPE setup scripts
# Usage: . "$PSScriptRoot\_common.ps1"

$ErrorActionPreference = "Stop"
$GraphBase = "https://graph.microsoft.com"
# User-Agent header identifies traffic from this skill in Graph telemetry.
$SpeSkillUserAgent = "spe-agent-skills/1.0 (full-setup)"

# Check execution policy and prompt for consent if restricted
try {
    $currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
    if ($currentPolicy -eq 'Restricted') {
        Write-Host "ExecutionPolicy is '$currentPolicy'. SPE scripts require at least 'RemoteSigned' to run." -ForegroundColor Yellow
        $consent = Read-Host "Allow 'RemoteSigned' for this user scope? (Y/N)"
        if ($consent -eq 'Y') {
            Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
            Write-Host "ExecutionPolicy set to 'RemoteSigned' for CurrentUser." -ForegroundColor Green
        } else {
            Write-Host "Cannot proceed with 'Restricted' execution policy. Exiting." -ForegroundColor Red
            exit 1
        }
    }
} catch {
    # Get-ExecutionPolicy may not be available in all PS environments (e.g., PS Core without Security module)
    # Safe to proceed - if scripts couldn't run, we wouldn't be here
}

# Known permission GUIDs (stable, from Microsoft Graph service principal manifest)
$PERMS = @{
    FileStorageContainer_Selected_Delegated         = "085ca537-6565-41c2-aca7-db852babc212"
    FileStorageContainerType_ManageAll_Delegated     = "8e6ec84c-5fcd-4cc7-ac8a-2296efc0ed9b"
    FileStorageContainerTypeReg_ManageAll_Delegated  = "c319a7df-930e-44c0-a43b-7e5e9c7f4f24"
}

function Invoke-GraphRequest {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers,
        [string]$Body = $null,
        [int]$MaxRetries = 3
    )
    $params = @{
        Uri       = $Uri
        Method    = $Method
        Headers   = $Headers
        UserAgent = $SpeSkillUserAgent
    }
    if ($Body) { $params.Body = $Body }

    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            return Invoke-RestMethod @params
        } catch {
            $status = 0
            try { $status = [int]$_.Exception.Response.StatusCode.value__ } catch {}
            $detail = $_.ErrorDetails.Message

            if ($status -eq 429 -or ($status -ge 500 -and $status -lt 600)) {
                if ($attempt -eq $MaxRetries) {
                    throw "Graph API error ($status) after $MaxRetries retries: $detail"
                }
                $retryAfter = 5
                try {
                    $retryHeader = $_.Exception.Response.Headers | Where-Object { $_.Key -eq 'Retry-After' } | Select-Object -ExpandProperty Value -First 1
                    if ($retryHeader) { $retryAfter = [Math]::Max([int]$retryHeader, 1) }
                } catch {}
                $waitSeconds = $retryAfter * $attempt
                Write-Host "  Throttled/transient ($status). Retrying in ${waitSeconds}s..." -ForegroundColor Yellow
                Start-Sleep -Seconds $waitSeconds
                continue
            }

            throw "Graph API error ($status): $detail"
        }
    }
}

function Read-EnvFile {
    $path = Join-Path (Get-Location) ".env.spe"
    $result = [ordered]@{}
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            if ($_ -match '^([A-Z_]+)=(.+)$') {
                $result[$Matches[1]] = $Matches[2]
            }
        }
    }
    return $result
}

function Save-EnvFile {
    param($Values)
    $path = Join-Path (Get-Location) ".env.spe"
    $lines = @(
        "# SharePoint Embedded configuration"
        "# Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    )
    foreach ($key in $Values.Keys) {
        $lines += "$key=$($Values[$key])"
    }
    $content = $lines -join "`n"
    [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
}

function Get-BootstrapHeaders {
    $token = az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv
    if (-not $token) { throw "Failed to get Graph token. Run 01-auth.ps1 first." }
    return @{
        Authorization  = "Bearer $token"
        "Content-Type" = "application/json"
    }
}

function Get-SpeHeaders {
    $tokenPath = Join-Path (Get-Location) ".spe-token"
    if (-not (Test-Path $tokenPath)) {
        throw "No SPE token found. Run 03-token.ps1 first."
    }
    $token = (Get-Content $tokenPath -Raw).Trim()
    if (-not $token) { throw "SPE token file is empty. Run 03-token.ps1 first." }

    # Check JWT expiry
    $payload = $token.Split('.')[1]
    switch ($payload.Length % 4) {
        2 { $payload += '==' }
        3 { $payload += '=' }
    }
    $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
    $expiry = [DateTimeOffset]::FromUnixTimeSeconds($decoded.exp).LocalDateTime
    if ($expiry -le (Get-Date).AddMinutes(2)) {
        throw "SPE token expired at $($expiry.ToString('HH:mm:ss')). Run 03-token.ps1 again."
    }

    return @{
        Authorization  = "Bearer $token"
        "Content-Type" = "application/json"
    }
}

function Assert-EnvKeys {
    param([string[]]$Keys)
    $env = Read-EnvFile
    foreach ($key in $Keys) {
        if (-not $env[$key]) {
            $stepHint = switch ($key) {
                "TENANT_ID"         { "01-auth.ps1" }
                "CLIENT_ID"         { "02-app.ps1" }
                "APP_OBJECT_ID"     { "02-app.ps1" }
                "CONTAINER_TYPE_ID" { "04-container-type.ps1" }
                "CONTAINER_ID"      { "05-container.ps1" }
                default             { "a previous step" }
            }
            throw "Missing $key in .env.spe. Run $stepHint first."
        }
    }
    return $env
}
