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
$envFile = Join-Path $appRoot '.env'
$constantsFile = Join-Path $appRoot 'src/common/constants.ts'
$handles = @()

function Test-OcrFrontendConfigured {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConstantsPath
    )

    if (-not (Test-Path $ConstantsPath)) {
        return $false
    }

    $content = Get-Content -Path $ConstantsPath -Raw
    $clientIdMatch = [regex]::Match($content, "CLIENT_ENTRA_APP_CLIENT_ID\s*=\s*'([^']*)'")
    if (-not $clientIdMatch.Success) {
        return $false
    }

    return -not [string]::IsNullOrWhiteSpace($clientIdMatch.Groups[1].Value)
}

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot
    }

    Write-Step 'Building backend'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build:backend') -WorkingDirectory $appRoot

    Write-Step 'Building frontend'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build-cre') -WorkingDirectory $appRoot

    if ($SkipTests) {
        Write-Host 'Skipping frontend tests because -SkipTests was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Running frontend tests'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'test-cre', '--', '--watchAll=false') -WorkingDirectory $appRoot -Environment @{ CI = 'true' }
    }

    if (-not (Test-Path $envFile)) {
        Write-Host 'Skipping runtime smoke checks because .env is missing.' -ForegroundColor Yellow
        Write-Host 'Build and test validation completed.' -ForegroundColor Green
        return
    }

    Write-Step 'Starting backend'
    $backendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'ocr-backend'
    $backendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start:backend') -WorkingDirectory $appRoot -LogPath $backendLog -Environment @{ PORT = '3001' }
    $handles += $backendHandle
    [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:3001/api/echo' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $backendHandle)

    if (-not (Test-OcrFrontendConfigured -ConstantsPath $constantsFile)) {
        Write-Host 'Skipping frontend runtime smoke because src/common/constants.ts does not contain a configured CLIENT_ENTRA_APP_CLIENT_ID.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Starting frontend'
        $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'ocr-frontend'
        $frontendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start-cre') -WorkingDirectory $appRoot -LogPath $frontendLog -Environment @{ BROWSER = 'none'; PORT = '3102' }
        $handles += $frontendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:3102' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

        if ($SkipBrowser) {
            Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
        }
        else {
            Write-Step 'Running browser smoke'
            Invoke-BrowserSmoke -ToolRoot $toolRoot -Url 'http://127.0.0.1:3102' -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root'
        }
    }

    Write-Host 'OCR sample validation completed.' -ForegroundColor Green
}
finally {
    if (-not $KeepProcesses) {
        foreach ($handle in ($handles | Sort-Object -Descending -Property LogPath)) {
            Stop-LoggedProcess -Handle $handle
        }
    }
}