#requires -Version 7.0

param(
    [switch]$SkipInstall,
    [switch]$SkipTests,
    [switch]$SkipBrowser,
    [switch]$Headed,
    [int]$TimeoutSec = 120,
    [switch]$ExcludeScreenshots
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runStartedAtUtc = (Get-Date).ToUniversalTime().AddSeconds(-1)
$runTimestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runRoot = Join-Path $repositoryRoot ".validation/repository/$runTimestamp"
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

$sampleScripts = @(
    'AI/mcp-server/validate-sample.ps1',
    'AI/ocr/validate-sample.ps1',
    'Custom Apps/boilerplate-aspnet-webservice/validate-sample.ps1',
    'Custom Apps/boilerplate-react-azurefunction/validate-sample.ps1',
    'Custom Apps/boilerplate-typescript-react/validate-sample.ps1',
    'Custom Apps/legal-docs/validate-sample.ps1',
    'Custom Apps/project-management/validate-sample.ps1',
    'Custom Apps/webhook/validate-sample.ps1'
)

$discoveredScripts = Get-ChildItem -Path $repositoryRoot -Filter 'validate-sample.ps1' -File -Recurse |
    Where-Object { $_.FullName -notmatch '[\\/](?:node_modules|bin|obj)[\\/]' } |
    ForEach-Object { [System.IO.Path]::GetRelativePath($repositoryRoot, $_.FullName).Replace('\', '/') }

$missingScripts = $sampleScripts | Where-Object { $discoveredScripts -notcontains $_ }
if ($missingScripts) {
    throw "Expected sample validators are missing: $($missingScripts -join ', ')"
}

foreach ($discoveredScript in $discoveredScripts) {
    if ($sampleScripts -notcontains $discoveredScript) {
        $sampleScripts += $discoveredScript
    }
}

$powerShellCommand = 'pwsh'
$results = New-Object System.Collections.Generic.List[object]

foreach ($relativeScript in $sampleScripts) {
    $scriptPath = Join-Path $repositoryRoot $relativeScript
    $sampleName = ($relativeScript -replace '/validate-sample\.ps1$', '') -replace '[^A-Za-z0-9.-]+', '-'
    $logPath = Join-Path $runRoot "$sampleName.log"
    $arguments = @('-NoProfile', '-File', $scriptPath, '-TimeoutSec', [string]$TimeoutSec)
    if ($SkipInstall) { $arguments += '-SkipInstall' }
    if ($SkipTests) { $arguments += '-SkipTests' }
    if ($SkipBrowser) { $arguments += '-SkipBrowser' }
    if ($Headed) { $arguments += '-Headed' }

    Write-Host "`n==> Validating $relativeScript" -ForegroundColor Cyan
    $capturedLines = New-Object System.Collections.Generic.List[string]
    & $powerShellCommand @arguments 2>&1 | ForEach-Object {
        $line = [string]$_
        $capturedLines.Add($line)
        Write-Host $line
    }
    $exitCode = $LASTEXITCODE
    $capturedLines | Set-Content -LiteralPath $logPath -Encoding UTF8

    $resultLine = $capturedLines |
        Where-Object { $_ -match '^VALIDATION_RESULT:\s+' } |
        Select-Object -Last 1
    if ($resultLine -match '^VALIDATION_RESULT:\s+(PASS|FAIL|SKIP_ENV|SKIP_CONFIG)\s+-\s+(.+)$') {
        $status = $Matches[1]
        $message = $Matches[2]
    }
    else {
        $status = 'FAIL'
        $message = "Validator did not emit a recognized VALIDATION_RESULT (exit code $exitCode)."
    }
    if ($exitCode -ne 0 -and $status -ne 'FAIL') {
        $status = 'FAIL'
        $message = "Validator exited with code $exitCode after reporting: $message"
    }

    $results.Add([pscustomobject]@{
        sample = ($relativeScript -replace '/validate-sample\.ps1$', '')
        status = $status
        message = $message
        log = [System.IO.Path]::GetRelativePath($repositoryRoot, $logPath).Replace('\', '/')
    })
}

$summaryPath = Join-Path $runRoot 'validation-summary.json'
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

$reportLines = New-Object System.Collections.Generic.List[string]
$reportLines.Add('# Repository sample validation')
$reportLines.Add('')
$reportLines.Add("Generated: $((Get-Date).ToUniversalTime().ToString('o'))")
$reportLines.Add('')
$reportLines.Add('| Sample | Result | Evidence |')
$reportLines.Add('|---|---|---|')
foreach ($result in $results) {
    $safeMessage = $result.message.Replace('|', '\|')
    $reportLines.Add("| $($result.sample) | **$($result.status)** | $safeMessage ([log]($($result.log))) |")
}
$reportLines.Add('')
$reportLines.Add('`SKIP_CONFIG` and `SKIP_ENV` are not passes. See each log and the sanitized HTTP and screenshot artifacts for concrete evidence.')
$reportPath = Join-Path $runRoot 'validation-report.md'
$reportLines | Set-Content -LiteralPath $reportPath -Encoding UTF8

$sanitizerPath = Join-Path $PSScriptRoot 'Sanitize-ValidationArtifacts.ps1'
$sanitizerArguments = @{
    RepositoryRoot = $repositoryRoot
    ChangedAfterUtc = $runStartedAtUtc
}
if ($ExcludeScreenshots) {
    $sanitizerArguments['ExcludeScreenshots'] = $true
}
$sanitizedPath = & $sanitizerPath @sanitizerArguments | Select-Object -Last 1

Write-Host "`nValidation report: $reportPath" -ForegroundColor Green
Write-Host "Sanitized evidence: $sanitizedPath" -ForegroundColor Green

if ($results.status -contains 'FAIL') {
    throw 'One or more sample validators failed. Review the report and sanitized evidence before opening a pull request.'
}
