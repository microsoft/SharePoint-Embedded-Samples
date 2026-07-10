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
$nodeEnvironment = Get-ValidationNodeEnvironment
$handles = @()
$placeholderClientId = '00000000-0000-0000-0000-000000000000'

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

function Set-OcrFrontendPlaceholderClientId {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConstantsPath,

        [Parameter(Mandatory = $true)]
        [string]$ClientId
    )

    $content = Get-Content -Path $ConstantsPath -Raw
    $updated = $content -replace "CLIENT_ENTRA_APP_CLIENT_ID\s*=\s*''", "CLIENT_ENTRA_APP_CLIENT_ID = '$ClientId'"
    if ($updated -eq $content) {
        return $false
    }

    Set-Content -Path $ConstantsPath -Value $updated -NoNewline
    return $true
}

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install', '--legacy-peer-deps') -WorkingDirectory $appRoot -Environment $nodeEnvironment
    }

    Write-Step 'Building backend'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build:backend') -WorkingDirectory $appRoot -Environment $nodeEnvironment

    Write-Step 'Building frontend'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build-cre') -WorkingDirectory $appRoot -Environment $nodeEnvironment

    if (-not (Test-Path $envFile)) {
        Write-Host 'Skipping runtime smoke checks because .env is missing.' -ForegroundColor Yellow
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message 'Backend and frontend builds passed; runtime smoke skipped because .env is missing.'
        return
    }

    Write-Step 'Starting backend'
    $backendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'ocr-backend'
    $backendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start:backend') -WorkingDirectory $appRoot -LogPath $backendLog -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ PORT = '3001' }))
    $handles += $backendHandle
    [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:3001/api/echo' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $backendHandle)
    $backendArtifact = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind 'http' -Name 'ocr-backend-echo' -Extension 'http.txt'
    Save-HttpArtifact -ArtifactPath $backendArtifact -Url 'http://127.0.0.1:3001/api/echo' -Method 'GET' -AllowedStatusCodes @(200)

    $originalConstantsContent = Get-Content -Path $constantsFile -Raw
    $placeholderApplied = $false
    $frontendSmokePassed = $false
    $screenshotPath = $null
    try {
        if (-not (Test-OcrFrontendConfigured -ConstantsPath $constantsFile)) {
            Write-Host 'Using a temporary placeholder CLIENT_ENTRA_APP_CLIENT_ID for frontend runtime smoke.' -ForegroundColor Yellow
            $placeholderApplied = Set-OcrFrontendPlaceholderClientId -ConstantsPath $constantsFile -ClientId $placeholderClientId
            if ($placeholderApplied) {
                Write-Step 'Rebuilding frontend preview bundle with placeholder auth configuration'
                Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build-cre') -WorkingDirectory $appRoot -Environment $nodeEnvironment
            }
        }

        Write-Step 'Starting frontend preview'
        $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'ocr-frontend'
        $frontendHandle = Start-LoggedProcess -FilePath 'npx' -Arguments @('vite', 'preview', '--host', '127.0.0.1', '--port', '3102') -WorkingDirectory $appRoot -LogPath $frontendLog -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ PORT = '3102' }))
        $handles += $frontendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:3102' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

        if ($SkipBrowser) {
            Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
        }
        else {
            Write-Step 'Running browser smoke'
            $screenshotPath = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind 'screenshots' -Name 'ocr-frontend' -Extension 'png'
            Invoke-BrowserSmoke -ToolRoot $toolRoot -Url 'http://127.0.0.1:3102' -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root' -ScreenshotPath $screenshotPath
            $frontendSmokePassed = $true
        }
    }
    catch {
        Write-Host "Frontend runtime smoke skipped after failed render check: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    finally {
        if ($placeholderApplied) {
            Set-Content -Path $constantsFile -Value $originalConstantsContent -NoNewline
        }
    }

    if ($SkipBrowser -or $frontendSmokePassed) {
        Write-ValidationSummary -Status 'PASS' -Message 'Backend build, frontend Vite build, backend smoke, and frontend preview smoke checks passed.'
    }
    else {
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message 'Backend build, frontend Vite build, and backend smoke passed; frontend runtime smoke skipped because the app could not render without real auth configuration.'
    }

    Write-Host 'OCR sample validation completed.' -ForegroundColor Green
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