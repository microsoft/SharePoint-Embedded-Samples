param(
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$KeepProcesses,
    [int]$TimeoutSec = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../Tools/powershell/SampleValidation.ps1')

$appRoot = $PSScriptRoot
$localSettingsPath = Join-Path $appRoot 'local.settings.json'
$localSettingsExamplePath = Join-Path $appRoot 'local.settings.json.example'
$testsRoot = Join-Path $appRoot 'tests'
$nodeEnvironment = Get-ValidationNodeEnvironment
$runtimeHandle = $null
$createdPlaceholderSettings = $false
$skipReasons = @()

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $appRoot -Environment $nodeEnvironment
    }

    Write-Step 'Building function app'
    Invoke-ExternalCommand -FilePath 'npm' -Arguments @('run', 'build') -WorkingDirectory $appRoot -Environment $nodeEnvironment

    # Runtime smoke test: real Entra credentials aren't required to prove the
    # host boots and the CMIS route is wired up correctly - without valid
    # config the request is simply expected to fail auth/lookup (401/403/500)
    # rather than return CMIS repository data. So this always runs when Azure
    # Functions Core Tools are available, creating (and cleaning up) a
    # placeholder local.settings.json if one isn't already present, instead
    # of skipping the whole check just because real config is missing.
    $hasFunctionHost = $null -ne (Get-Command 'func' -ErrorAction SilentlyContinue)
    if (-not $hasFunctionHost) {
        Write-Host 'Azure Functions Core Tools (func) not found; skipping runtime smoke test.' -ForegroundColor Yellow
        $skipReasons += 'runtime smoke test skipped (func is not installed)'
    }
    else {
        if (-not (Test-Path $localSettingsPath)) {
            Write-Step 'Creating a placeholder local.settings.json for the smoke test'
            (Get-Content $localSettingsExamplePath -Raw) `
                -replace '<your Entra app \(client\) ID>', '00000000-0000-0000-0000-000000000000' `
                -replace '<your Entra app client secret>', 'placeholder' |
                Set-Content -Path $localSettingsPath
            $createdPlaceholderSettings = $true
        }

        Write-Step 'Starting function host'
        $logPath = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'spe-cmis-func'
        # Start-LoggedProcess has no -Environment parameter (it forwards to Start-Process,
        # which doesn't support one either) - apply the node PATH override to this process
        # directly so the child inherits it, then restore it afterwards.
        $previousPath = $env:PATH
        if ($nodeEnvironment.ContainsKey('PATH')) {
            $env:PATH = $nodeEnvironment['PATH']
        }
        try {
            $runtimeHandle = Start-LoggedProcess -FilePath 'npx' -Arguments @('func', 'start') -WorkingDirectory $appRoot -LogPath $logPath
        }
        finally {
            $env:PATH = $previousPath
        }

        # A placeholder containerTypeId is enough to prove the CMIS getRepositories route is
        # wired up end to end; without an Authorization header the call must be rejected by
        # authenticateRequest() with 401 - any other status (including 500) indicates a real
        # problem and should fail this check rather than be treated as a pass.
        $probeUrl = 'http://127.0.0.1:7071/api/storage/fileStorage/containerTypes/00000000-0000-0000-0000-000000000000/cmis/browser'
        [void](Wait-ForHttpEndpoint -Url $probeUrl -TimeoutSec $TimeoutSec -AllowedStatusCodes @(401) -ProcessHandle $runtimeHandle)

        Write-Step 'Capturing HTTP validation artifact'
        $artifactPath = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind 'http' -Name 'get-repositories' -Extension 'http.txt'
        Save-HttpArtifact -ArtifactPath $artifactPath -Url $probeUrl -Method 'GET' -AllowedStatusCodes @(401) | Out-Null
    }

    # Python CMIS client scripts (tests/) exercise the full stack against a
    # live SharePoint Embedded tenant and real CMIS user credentials (see
    # tests/.env.example) - they can't run unattended in CI. Still validate
    # what's possible without that config instead of skipping tests/ entirely:
    # dependencies install cleanly and the scripts are syntactically valid.
    if ($SkipTests) {
        Write-Host 'Skipping tests/ validation (-SkipTests specified).' -ForegroundColor Yellow
    }
    else {
        $pythonCommand = @('python', 'python3') | Where-Object { Get-Command $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
        if (-not $pythonCommand) {
            Write-Host 'Python not found; skipping tests/ validation.' -ForegroundColor Yellow
            $skipReasons += 'tests/ validation skipped (python is not installed)'
        }
        else {
            Write-Step 'Installing Python test client dependencies'
            Invoke-ExternalCommand -FilePath $pythonCommand -Arguments @('-m', 'pip', 'install', '-q', '-r', 'requirements.txt') -WorkingDirectory $testsRoot

            Write-Step 'Validating tests/ Python source compiles'
            Invoke-ExternalCommand -FilePath $pythonCommand -Arguments @('-m', 'compileall', '-q', '.') -WorkingDirectory $testsRoot

            if (Test-Path (Join-Path $testsRoot '.env')) {
                Write-Step 'Running tests/test_gaps.py and tests/test_http_edge_cases.py against a live server'
                Invoke-ExternalCommand -FilePath $pythonCommand -Arguments @('test_gaps.py') -WorkingDirectory $testsRoot
                Invoke-ExternalCommand -FilePath $pythonCommand -Arguments @('test_http_edge_cases.py') -WorkingDirectory $testsRoot
            }
            else {
                Write-Host 'tests/.env not present; skipping live end-to-end run (copy tests/.env.example and fill in a real Container Type ID and CMIS user credentials to enable it).' -ForegroundColor Yellow
                $skipReasons += 'tests/ live end-to-end run skipped (tests/.env is not configured)'
            }
        }
    }

    if ($skipReasons.Count -eq 0) {
        Write-ValidationSummary -Status 'PASS' -Message 'Build, runtime smoke test, and Python test validation all succeeded.'
    }
    else {
        Write-ValidationSummary -Status 'SKIP_CONFIG' -Message "Build succeeded; some checks were skipped because $($skipReasons -join '; ')."
    }

    Write-Host 'spe-cmis sample validation completed.' -ForegroundColor Green
}
catch {
    Write-ValidationSummary -Status 'FAIL' -Message $_.Exception.Message
    throw
}
finally {
    if (-not $KeepProcesses -and $null -ne $runtimeHandle) {
        Stop-LoggedProcess -Handle $runtimeHandle
    }
    if ($createdPlaceholderSettings -and (Test-Path $localSettingsPath)) {
        Remove-Item $localSettingsPath -Force
    }
}
