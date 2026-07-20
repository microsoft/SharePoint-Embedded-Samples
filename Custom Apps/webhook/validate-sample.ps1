param(
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$SkipBrowser,
    [switch]$KeepProcesses,
    [switch]$Headed,
    [int]$TimeoutSec = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../Tools/powershell/SampleValidation.ps1')

$appRoot = $PSScriptRoot
$packageRoot = Join-Path $appRoot 'src'
$nodeEnvironment = Get-ValidationNodeEnvironment
$runtimeHandle = $null

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'node'
    Assert-CommandExists 'npm'

    if (-not $SkipInstall) {
        Write-Step 'Installing dependencies'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $packageRoot -Environment $nodeEnvironment
    }

    Write-Host 'No automated test script is defined for this sample.' -ForegroundColor Yellow

    Write-Step 'Starting webhook listener'
    $logPath = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'webhook'
    $runtimeHandle = Start-LoggedProcess -FilePath 'npm' -Arguments @('run', 'start') -WorkingDirectory $packageRoot -LogPath $logPath -Environment (Merge-EnvironmentTables @($nodeEnvironment, @{ PORT = '3000' }))

    $validationToken = 'sample-validation-token'
    $validationUrl = "http://127.0.0.1:3000/webhook?validationToken=$validationToken"
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $validated = $false

    while ((Get-Date) -lt $deadline) {
        if ($runtimeHandle.Process.HasExited) {
            $tail = Get-LogTail -Path $runtimeHandle.LogPath
            throw "Webhook listener exited before responding. Recent log output:`n$tail"
        }

        try {
            $invokeWebRequestArguments = @{
                Method      = 'Post'
                Uri         = $validationUrl
                TimeoutSec  = 5
                ContentType = 'application/json'
                Body        = '{}'
            }
            if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('UseBasicParsing')) {
                $invokeWebRequestArguments['UseBasicParsing'] = $true
            }
            $response = Invoke-WebRequest @invokeWebRequestArguments
            if ([string]$response.Content -eq $validationToken) {
                $validated = $true
                break
            }
        }
        catch {
        }

        Start-Sleep -Milliseconds 500
    }

    if (-not $validated) {
        throw 'Webhook validation token echo check did not succeed.'
    }

    Write-Step 'Capturing HTTP validation artifact'
    $artifactPath = New-ValidationArtifactPath -WorkingDirectory $appRoot -Kind 'http' -Name 'webhook-validation-token' -Extension 'http.txt'
    Save-HttpArtifact -ArtifactPath $artifactPath -Url $validationUrl -Method 'POST' -Headers @{ 'Content-Type' = 'application/json' } -Body '{}' -AllowedStatusCodes @(200) | Out-Null

    Write-Host 'Webhook sample validation completed.' -ForegroundColor Green
    Write-ValidationSummary -Status 'PASS' -Message 'Webhook listener startup and validation-token echo checks passed.'
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