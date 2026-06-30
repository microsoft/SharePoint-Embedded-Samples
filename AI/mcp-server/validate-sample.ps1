param(
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$SkipBrowser,
    [switch]$KeepProcesses,
    [switch]$Headed,
    [int]$TimeoutSec = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../Tools/powershell/SampleValidation.ps1')

$appRoot = $PSScriptRoot
$envFile = Join-Path $appRoot '.env'
$runtimeHandle = $null

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot
    }

    Write-Step 'Building MCP server'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $appRoot

    if ($SkipTests) {
        Write-Host 'Skipping tests because -SkipTests was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Host 'No automated test script is defined for this sample.' -ForegroundColor Yellow
    }

    if (-not (Test-Path $envFile)) {
        Write-Host 'Skipping runtime smoke check because .env is missing.' -ForegroundColor Yellow
        Write-Host 'Build validation completed.' -ForegroundColor Green
        return
    }

    $environment = Get-DotEnvMap -Path $envFile
    if (-not $environment.ContainsKey('PORT')) {
        $environment['PORT'] = '3100'
    }

    Write-Step 'Starting MCP server'
    $logPath = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'mcp-server'
    $runtimeHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $appRoot -LogPath $logPath -Environment $environment

    $healthUrl = "http://localhost:$($environment['PORT'])/health"
    $healthResponse = Wait-ForHttpEndpoint -Url $healthUrl -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200)
    $body = [string]$healthResponse.Content
    if ($body -notmatch '"status"\s*:\s*"ok"') {
        throw "Health endpoint returned an unexpected response: $body"
    }

    Write-Host "Runtime smoke check passed at $healthUrl" -ForegroundColor Green
}
finally {
    if ($null -ne $runtimeHandle -and -not $KeepProcesses) {
        Stop-LoggedProcess -Handle $runtimeHandle
    }
}