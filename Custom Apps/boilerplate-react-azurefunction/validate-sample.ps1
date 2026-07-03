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

. (Join-Path $PSScriptRoot '../../Tools/powershell/SampleValidation.ps1')

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$toolRoot = Join-Path $repoRoot 'Tools/sample-validation'
$appRoot = $PSScriptRoot
$clientRoot = Join-Path $appRoot 'packages/client-app'
$functionsRoot = Join-Path $appRoot 'packages/azure-functions'
$clientEnvPath = Join-Path $clientRoot '.env'
$localSettingsPath = Join-Path $functionsRoot 'local.settings.json'
$nodeEnvironment = Get-ValidationNodeEnvironment
$handles = @()
$runtimeSkipReasons = @()

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing root dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot -Environment $nodeEnvironment

        Write-Step 'Installing client-app dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $clientRoot -Environment $nodeEnvironment

        Write-Step 'Installing azure-functions dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $functionsRoot -Environment $nodeEnvironment
    }

    Write-Step 'Building client-app'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $clientRoot -Environment $nodeEnvironment

    if ($SkipTests) {
        Write-Host 'Skipping client-app tests because -SkipTests was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Running client-app tests'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'test', '--', '--watchAll=false') -WorkingDirectory $clientRoot -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ CI = 'true' }))
    }

    if (Test-Path $localSettingsPath) {
        Assert-CommandExists 'func'
        Write-Step 'Starting Azure Functions host'
        $backendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'react-azure-functions-api'
        $backendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $functionsRoot -LogPath $backendLog -Environment $nodeEnvironment
        $handles += $backendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:7071/api/ListContainers' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200, 401) -ProcessHandle $backendHandle)
    }
    else {
        Write-Host 'Skipping Azure Functions runtime smoke because local.settings.json is missing.' -ForegroundColor Yellow
        $runtimeSkipReasons += 'packages/azure-functions/local.settings.json is missing'
    }

    if (Test-Path $clientEnvPath) {
        Write-Step 'Starting client-app'
        $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'react-azure-functions-client'
        $frontendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $clientRoot -LogPath $frontendLog -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ BROWSER = 'none'; PORT = '3000' }))
        $handles += $frontendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:3000' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

        if ($SkipBrowser) {
            Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
        }
        else {
            Write-Step 'Running browser smoke'
            Invoke-BrowserSmoke -ToolRoot $toolRoot -Url 'http://127.0.0.1:3000' -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root'
        }
    }
    else {
        Write-Host 'Skipping client-app runtime smoke because .env is missing.' -ForegroundColor Yellow
        $runtimeSkipReasons += 'packages/client-app/.env is missing'
    }

    Write-Host 'React Azure Functions sample validation completed.' -ForegroundColor Green

    if ($runtimeSkipReasons.Count -gt 0) {
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message "Build and tests passed; runtime smoke skipped because $($runtimeSkipReasons -join '; ')."
    }
    else {
        Write-ValidationSummary -Status 'PASS' -Message 'Build, tests, Functions host startup, and frontend runtime smoke checks passed.'
    }
}
catch {
    Write-ValidationSummary -Status 'FAIL' -Message $_.Exception.Message
    throw
}
finally {
    if (-not $KeepProcesses) {
        foreach ($handle in ($handles | Sort-Object -Descending -Property LogPath)) {
            Stop-LoggedProcess -Handle $handle
        }
    }
}