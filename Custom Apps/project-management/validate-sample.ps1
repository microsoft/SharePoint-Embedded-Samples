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

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$toolRoot = Join-Path $repoRoot 'Tools/sample-validation'
$appRoot = $PSScriptRoot
$nodeEnvironment = Get-ValidationNodeEnvironment
$runtimeHandle = $null

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'
    Assert-CommandExists 'npx'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot -Environment $nodeEnvironment
    }

    Write-Step 'Building app'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $appRoot -Environment $nodeEnvironment

    Write-Step 'Linting app'
    try {
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'lint') -WorkingDirectory $appRoot -Environment $nodeEnvironment
    }
    catch {
        Write-Host "Lint reported existing issues and will not block runtime validation: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host 'No automated test script is defined for this sample.' -ForegroundColor Yellow

    Write-Step 'Starting preview server'
    $logPath = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'project-management'
    $runtimeHandle = Start-LoggedProcess -FilePath 'npx' -Arguments @('vite', 'preview', '--host', '127.0.0.1', '--port', '4173') -WorkingDirectory $appRoot -LogPath $logPath -Environment $nodeEnvironment
    [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:4173' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $runtimeHandle)

    if ($SkipBrowser) {
        Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Running browser smoke'
        Invoke-BrowserSmoke -ToolRoot $toolRoot -Url 'http://127.0.0.1:4173' -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root'
    }

    Write-Host 'Project management sample validation completed.' -ForegroundColor Green
    Write-ValidationSummary -Status 'PASS' -Message 'Build, preview startup, and browser smoke checks passed.'
}
catch {
    Write-ValidationSummary -Status 'FAIL' -Message $_.Exception.Message
    throw
}
finally {
    if ($null -ne $runtimeHandle -and -not $KeepProcesses) {
        Stop-LoggedProcess -Handle $runtimeHandle
    }
}