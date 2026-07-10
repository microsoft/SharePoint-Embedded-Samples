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
$functionApiRoot = Join-Path $appRoot 'function-api'
$clientRoot = Join-Path $appRoot 'react-client'
$localSettingsPath = Join-Path $functionApiRoot 'local.settings.json'
$clientEnvPath = Join-Path $clientRoot '.env'
$nodeEnvironment = Get-ValidationNodeEnvironment
$handles = @()
$runtimeSkipReasons = @()
$clientPreviewUrl = 'http://127.0.0.1:4272'
$clientScreenshotPath = $null

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing root dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot -Environment $nodeEnvironment

        Write-Step 'Installing function-api dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $functionApiRoot -Environment $nodeEnvironment

        Write-Step 'Installing react-client dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install', '--legacy-peer-deps') -WorkingDirectory $clientRoot -Environment $nodeEnvironment
    }

    $hasFunctionConfig = Test-Path $localSettingsPath
    $hasFunctionHost = $null -ne (Get-Command 'func' -ErrorAction SilentlyContinue)
    if (-not $hasFunctionConfig) {
        $runtimeSkipReasons += 'function-api/local.settings.json is missing'
    }
    if (-not $hasFunctionHost) {
        $runtimeSkipReasons += 'Azure Functions Core Tools (func) is not installed'
    }

    $clientBuildEnvironment = $nodeEnvironment
    if (-not (Test-Path $clientEnvPath)) {
        Write-Host 'react-client/.env is missing; using placeholder Vite client values for unauthenticated build and screenshot.' -ForegroundColor Yellow
        $clientBuildEnvironment = Merge-EnvironmentTables @(
            $nodeEnvironment,
            @{
                VITE_AZURE_APP_ID = '00000000-0000-0000-0000-000000000000'
                VITE_TENANT_ID = 'common'
                VITE_SPE_CONTAINER_TYPE_ID = '00000000-0000-0000-0000-000000000000'
                VITE_SAMPLE_API_URL = 'http://localhost:7072/api'
            }
        )
    }

    Write-Step 'Building react-client'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $clientRoot -Environment $clientBuildEnvironment

    Write-Step 'Building function-api'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $functionApiRoot -Environment $nodeEnvironment

    if ($hasFunctionConfig -and $hasFunctionHost) {
        Write-Step 'Starting function-api host'
        $backendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'typescript-react-api'
        $backendHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $functionApiRoot -LogPath $backendLog -Environment $nodeEnvironment
        $handles += $backendHandle
        [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:7072/api/containers' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200, 401) -ProcessHandle $backendHandle)
    }
    else {
        Write-Host "Skipping function-api runtime smoke because $($runtimeSkipReasons -join '; ')." -ForegroundColor Yellow
    }

    if ($SkipBrowser) {
        Write-Host 'Skipping browser smoke because -SkipBrowser was specified.' -ForegroundColor Yellow
    }
    else {
        Write-Step 'Starting react-client Vite preview'
        $frontendLog = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'typescript-react-client'
        $frontendHandle = Start-LoggedProcess -FilePath 'npx' -Arguments @('vite', 'preview', '--host', '127.0.0.1', '--port', '4272') -WorkingDirectory $clientRoot -LogPath $frontendLog -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ PORT = '4272' }))
        $handles += $frontendHandle
        [void](Wait-ForHttpEndpoint -Url $clientPreviewUrl -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200) -ProcessHandle $frontendHandle)

        Write-Step 'Running browser smoke'
        $clientScreenshotPath = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind screenshots -Name 'ts-react-client' -Extension 'png'
        Invoke-BrowserSmoke -ToolRoot $toolRoot -Url $clientPreviewUrl -SkipInstall:$SkipInstall -Headed:$Headed -TimeoutSec $TimeoutSec -ExpectSelector '#root' -ScreenshotPath $clientScreenshotPath
        Write-Host "Client screenshot: $clientScreenshotPath" -ForegroundColor Green
    }

    $functionRuntimeSummary = if ($runtimeSkipReasons.Count -gt 0) {
        "function runtime skipped because $($runtimeSkipReasons -join '; ')."
    }
    else {
        'function runtime smoke passed.'
    }

    if ($SkipBrowser) {
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message "Client and function-api builds passed; client browser smoke skipped by -SkipBrowser; $functionRuntimeSummary"
    }
    else {
        Write-ValidationSummary -Status 'PASS' -Message "Client and function-api builds passed; client runtime screenshot captured at $clientScreenshotPath; $functionRuntimeSummary"
    }

    Write-Host 'TypeScript React sample validation completed.' -ForegroundColor Green
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