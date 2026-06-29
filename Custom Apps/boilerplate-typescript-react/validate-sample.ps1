param(
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$SkipBrowser,
    [switch]$KeepProcesses,
    [switch]$Headed,
    [int]$TimeoutSec = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\..\Tools\powershell\SampleValidation.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$toolRoot = Join-Path $repoRoot 'Tools\sample-validation'
$appRoot = $PSScriptRoot
$functionApiRoot = Join-Path $appRoot 'function-api'
$clientRoot = Join-Path $appRoot 'react-client'
$localSettingsPath = Join-Path $functionApiRoot 'local.settings.json'
$clientEnvPath = Join-Path $clientRoot '.env'
$handles = @()

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing root dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot

        Write-Step 'Installing function-api dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $functionApiRoot

        Write-Step 'Installing react-client dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $clientRoot
    }

    Write-Step 'Building function-api'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $functionApiRoot

    Write-Step 'Building react-client'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $clientRoot

    if ($SkipTests) {
        Write-Host 'Skipping react-client tests because -SkipTests was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Running react-client tests'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'test', '--', '--watchAll=false') -WorkingDirectory $clientRoot -Environment @{ CI = 'true' }
    }

    if (Test-Path $localSettingsPath) {
        Assert-CommandExists 'func'
        Write-Step 'Starting function-api host'
        $backendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'typescript-react-api'
        $backendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $functionApiRoot -LogPath $backendLog
        $handles += $backendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:7072/api/containers' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200, 401) -ProcessHandle $backendHandle)
    }
    else {
        Write-Host 'Skipping function-api runtime smoke because local.settings.json is missing.' -ForegroundColor Yellow
    }

    if (Test-Path $clientEnvPath) {
        $clientEnv = Get-DotEnvMap -Path $clientEnvPath
        $clientPort = if ($clientEnv.ContainsKey('PORT')) { $clientEnv['PORT'] } else { '8080' }

        Write-Step 'Starting react-client'
        $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'typescript-react-client'
        $frontendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $clientRoot -LogPath $frontendLog -Environment @{ BROWSER = 'none' }
        $handles += $frontendHandle
        [void](Wait-ForHttpEndpoint -Url "http://127.0.0.1:$clientPort" -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

        if ($SkipBrowser) {
            Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
        }
        else {
            Write-Step 'Running browser smoke'
            Invoke-BrowserSmoke -ToolRoot $toolRoot -Url "http://127.0.0.1:$clientPort" -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root'
        }
    }
    else {
        Write-Host 'Skipping react-client runtime smoke because .env is missing.' -ForegroundColor Yellow
    }

    Write-Host 'TypeScript React sample validation completed.' -ForegroundColor Green
}
finally {
    if (-not $KeepProcesses) {
        foreach ($handle in ($handles | Sort-Object -Descending -Property LogPath)) {
            Stop-LoggedProcess -Handle $handle
        }
    }
}