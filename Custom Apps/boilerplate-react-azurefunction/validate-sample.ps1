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
$nodeEnvironment = Get-ValidationNodeEnvironment
$placeholderClientId = '00000000-0000-0000-0000-000000000000'
$clientEnv = @{}
if (-not (Test-Path $clientEnvPath)) {
    $clientEnv = @{
        VITE_CLIENT_ID = $placeholderClientId
        VITE_TENANT_ID = 'common'
    }
}
$clientBuildEnvironment = Merge-EnvironmentTables @($nodeEnvironment, $clientEnv, @{ CI = '' })
$handles = @()
$runtimeSkipReasons = @('Azure Functions runtime smoke skipped because Azure Functions Core Tools (func) is not installed in this environment')

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing workspace dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install', '--legacy-peer-deps') -WorkingDirectory $appRoot -Environment $nodeEnvironment
    }

    Write-Step 'Building client-app with Vite'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $clientRoot -Environment $clientBuildEnvironment

    if ($SkipTests) {
        Write-Host 'Skipping client-app tests because -SkipTests was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Host 'Skipping client-app tests because this sample was migrated from CRA to Vite and no test runner is configured.' -ForegroundColor Yellow
    }

    Write-Host 'Skipping Azure Functions runtime smoke because func is not installed; package validation remains build/runtime-client focused.' -ForegroundColor Yellow

    if ($SkipBrowser) {
        Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message 'Client build passed; browser smoke was skipped by request; Functions runtime skipped because func is not installed.'
        return
    }

    Write-Step 'Starting Vite preview for client-app'
    $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'react-azure-functions-client-vite-preview'
    $frontendHandle = Start-LoggedProcess -FilePath 'npx' -Arguments @('vite', 'preview', '--host', '127.0.0.1', '--port', '4273') -WorkingDirectory $clientRoot -LogPath $frontendLog -Environment (Merge-EnvironmentTables @($nodeEnvironment, $clientEnv, @{ PORT = '4273' }))
    $handles += $frontendHandle
    [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:4273' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

    Write-Step 'Running browser smoke against Vite preview'
    $screenshotPath = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind screenshots -Name 'react-azfunc-client' -Extension '.png'
    Invoke-BrowserSmoke -ToolRoot $toolRoot -Url 'http://127.0.0.1:4273' -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root' -ScreenshotPath $screenshotPath

    Write-Host 'React Azure Functions client validation completed.' -ForegroundColor Green
    Write-ValidationSummary -Status 'PASS' -Message "Client Vite build and browser screenshot passed; Functions runtime skipped: $($runtimeSkipReasons -join '; '). Screenshot: $screenshotPath"
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
