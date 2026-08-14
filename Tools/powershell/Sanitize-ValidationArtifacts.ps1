param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [string]$OutputDirectory,
    [switch]$ExcludeScreenshots
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRootPath = (Resolve-Path $RepositoryRoot).Path
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutputDirectory = Join-Path $repositoryRootPath ".validation/sanitized/$timestamp"
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$allowedOutputRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRootPath '.validation/sanitized'))
if (-not $outputPath.StartsWith($allowedOutputRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputDirectory must be under '$allowedOutputRoot'."
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

$homePath = [Environment]::GetFolderPath('UserProfile')
$sensitiveKeyPattern = '(?i)(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|client[_-]?secret|password|passwd|access[_-]?token|refresh[_-]?token|id[_-]?token|private[_-]?key|connection[_-]?string|account[_-]?key|sas[_-]?token|secret)'
$querySecretPattern = '(?i)([?&](?:sig|signature|token|code|key|secret|password|client_secret|access_token|refresh_token)=)[^&\s]+'
$jwtPattern = '(?i)\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b'
$emailPattern = '(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b'
$tenantHostPattern = '(?i)\b[A-Z0-9-]+\.(?:onmicrosoft|sharepoint|sharepoint-df)\.com\b'
$guidPattern = '(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b'

function Protect-ValidationText {
    param([Parameter(Mandatory = $true)][string]$Content)

    $protected = $Content
    $protected = [regex]::Replace(
        $protected,
        "(?im)^(\s*$sensitiveKeyPattern\s*[:=]\s*).+$",
        '$1<REDACTED>'
    )
    $protected = [regex]::Replace(
        $protected,
        "(?i)([\""'](?:$sensitiveKeyPattern)[\""']\s*:\s*)[\""'][^\""']*[\""']",
        '$1"<REDACTED>"'
    )
    $protected = [regex]::Replace($protected, $querySecretPattern, '$1<REDACTED>')
    $protected = [regex]::Replace($protected, $jwtPattern, '<REDACTED_JWT>')
    $protected = [regex]::Replace($protected, $emailPattern, '<REDACTED_EMAIL>')
    $protected = [regex]::Replace($protected, $tenantHostPattern, '<REDACTED_TENANT_HOST>')
    $protected = [regex]::Replace(
        $protected,
        $guidPattern,
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($match)
            if ($match.Value -eq '00000000-0000-0000-0000-000000000000') {
                return $match.Value
            }
            return '<REDACTED_GUID>'
        }
    )
    $protected = [regex]::Replace(
        $protected,
        '(?i)((?:Password|Pwd|AccountKey|SharedAccessSignature)\s*=\s*)[^;\r\n]+',
        '$1<REDACTED>'
    )
    $protected = $protected.Replace($repositoryRootPath, '<REPOSITORY_ROOT>')
    if (-not [string]::IsNullOrWhiteSpace($homePath)) {
        $protected = $protected.Replace($homePath, '<USER_HOME>')
    }

    return $protected
}

$textExtensions = @('.json', '.log', '.md', '.txt')
$manifestEntries = New-Object System.Collections.Generic.List[object]
$validationDirectories = Get-ChildItem -Path $repositoryRootPath -Directory -Filter '.validation' -Recurse -Force |
    Where-Object {
        -not $_.FullName.StartsWith($allowedOutputRoot, [System.StringComparison]::OrdinalIgnoreCase)
    }

foreach ($validationDirectory in $validationDirectories) {
    foreach ($sourceFile in Get-ChildItem -Path $validationDirectory.FullName -File -Recurse -Force) {
        if ($sourceFile.FullName.StartsWith($allowedOutputRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }

        $extension = $sourceFile.Extension.ToLowerInvariant()
        $isScreenshot = $extension -eq '.png'
        if ($isScreenshot -and $ExcludeScreenshots) {
            continue
        }
        if (-not $isScreenshot -and $textExtensions -notcontains $extension) {
            continue
        }

        $relativePath = [System.IO.Path]::GetRelativePath($repositoryRootPath, $sourceFile.FullName)
        $destinationPath = Join-Path $outputPath $relativePath
        $destinationDirectory = Split-Path -Parent $destinationPath
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

        if ($isScreenshot) {
            Copy-Item -LiteralPath $sourceFile.FullName -Destination $destinationPath -Force
        }
        else {
            $content = Get-Content -LiteralPath $sourceFile.FullName -Raw
            Set-Content -LiteralPath $destinationPath -Value (Protect-ValidationText -Content $content) -Encoding UTF8
        }

        $hash = (Get-FileHash -LiteralPath $destinationPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $manifestEntries.Add([pscustomobject]@{
            path = [System.IO.Path]::GetRelativePath($outputPath, $destinationPath).Replace('\', '/')
            sha256 = $hash
            screenshotReviewRequired = $isScreenshot
        })
    }
}

$latestReport = Get-ChildItem -Path (Join-Path $repositoryRootPath '.validation/repository') -Filter 'validation-report.md' -File -Recurse -ErrorAction SilentlyContinue |
    Sort-Object -Property LastWriteTimeUtc -Descending |
    Select-Object -First 1
if ($null -ne $latestReport) {
    $publishReportPath = Join-Path $outputPath 'validation-report.md'
    $reportContent = Get-Content -LiteralPath $latestReport.FullName -Raw
    Set-Content -LiteralPath $publishReportPath -Value (Protect-ValidationText -Content $reportContent) -Encoding UTF8
    $manifestEntries.Add([pscustomobject]@{
        path = 'validation-report.md'
        sha256 = (Get-FileHash -LiteralPath $publishReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
        screenshotReviewRequired = $false
    })
}

$evidenceBuilder = New-Object System.Text.StringBuilder
if ($null -ne $latestReport) {
    [void]$evidenceBuilder.AppendLine((Get-Content -LiteralPath (Join-Path $outputPath 'validation-report.md') -Raw))
}
[void]$evidenceBuilder.AppendLine('')
[void]$evidenceBuilder.AppendLine('## Sanitized HTTP evidence')
[void]$evidenceBuilder.AppendLine('')
$httpArtifacts = @(Get-ChildItem -Path $outputPath -Filter '*.http.txt' -File -Recurse |
    Sort-Object -Property FullName)
if ($httpArtifacts.Count -eq 0) {
    [void]$evidenceBuilder.AppendLine('No HTTP transcript was produced. See the exact sample status and skip reason above.')
}
else {
    foreach ($httpArtifact in $httpArtifacts) {
        $relativeHttpPath = [System.IO.Path]::GetRelativePath($outputPath, $httpArtifact.FullName).Replace('\', '/')
        $httpContent = Get-Content -LiteralPath $httpArtifact.FullName -Raw
        if ($httpContent.Length -gt 12000) {
            $httpContent = $httpContent.Substring(0, 12000) + "`n[TRUNCATED]"
        }
        [void]$evidenceBuilder.AppendLine("### ``$relativeHttpPath``")
        [void]$evidenceBuilder.AppendLine('')
        [void]$evidenceBuilder.AppendLine('```text')
        [void]$evidenceBuilder.AppendLine($httpContent.TrimEnd())
        [void]$evidenceBuilder.AppendLine('```')
        [void]$evidenceBuilder.AppendLine('')
    }
}
$evidencePath = Join-Path $outputPath 'validation-evidence.md'
$evidenceText = $evidenceBuilder.ToString()
if ($evidenceText.Length -gt 60000) {
    $evidenceText = $evidenceText.Substring(0, 60000) + "`n`n[TRUNCATED: full sanitized evidence remains in the workflow artifact.]"
}
Set-Content -LiteralPath $evidencePath -Value $evidenceText -Encoding UTF8
$manifestEntries.Add([pscustomobject]@{
    path = 'validation-evidence.md'
    sha256 = (Get-FileHash -LiteralPath $evidencePath -Algorithm SHA256).Hash.ToLowerInvariant()
    screenshotReviewRequired = $false
})

$manifestPath = Join-Path $outputPath 'manifest.json'
[pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    source = '<REPOSITORY_ROOT>/**/.validation'
    screenshotsRequireVisualReview = -not $ExcludeScreenshots
    files = $manifestEntries
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$noticePath = Join-Path $outputPath 'SANITIZATION.md'
@"
# Sanitized validation evidence

Text artifacts were redacted for common credential headers, secret fields,
tokens, signed query parameters, connection-string secrets, and local absolute
paths.

Screenshots cannot be redacted reliably by this script. Every PNG whose manifest
entry has `screenshotReviewRequired: true` must be visually inspected before it
is uploaded to GitHub.
"@ | Set-Content -LiteralPath $noticePath -Encoding UTF8

Write-Host "Sanitized validation artifacts: $outputPath" -ForegroundColor Green
Write-Output $outputPath
