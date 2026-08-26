#requires -Version 7.0

param(
    [Parameter(Mandatory = $true)]
    [string]$PullRequest,

    [string]$Repository,

    [string]$ArtifactDirectory,

    [switch]$ScreenshotsReviewed,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sanitizedRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot '.validation/sanitized'))

function Test-PathIsInDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Directory
    )

    $comparison = if ($IsWindows) { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }
    $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $fullDirectory = [System.IO.Path]::GetFullPath($Directory).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)

    return $fullPath.Equals($fullDirectory, $comparison) -or
        $fullPath.StartsWith($fullDirectory + [System.IO.Path]::DirectorySeparatorChar, $comparison)
}

if ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
    $latestArtifactDirectory = Get-ChildItem -Path $sanitizedRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object -Property LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($null -eq $latestArtifactDirectory) {
        throw "No sanitized validation directory exists under '$sanitizedRoot'."
    }
    $ArtifactDirectory = $latestArtifactDirectory.FullName
}

$artifactPath = (Resolve-Path $ArtifactDirectory).Path
if (-not (Test-PathIsInDirectory -Path $artifactPath -Directory $sanitizedRoot)) {
    throw "ArtifactDirectory must be under '$sanitizedRoot'. Raw validation artifacts cannot be published."
}

$evidencePath = Join-Path $artifactPath 'validation-evidence.md'
if (-not (Test-Path $evidencePath)) {
    throw "Sanitized evidence file is missing: $evidencePath"
}

$screenshots = @(Get-ChildItem -Path $artifactPath -Filter '*.png' -File -Recurse)
if ($screenshots.Count -gt 0 -and -not $ScreenshotsReviewed) {
    throw 'Screenshots are present. Inspect them and pass -ScreenshotsReviewed before publishing.'
}

if ([string]::IsNullOrWhiteSpace($Repository)) {
    if ($PullRequest -match '^https://github\.com/([^/]+/[^/]+)/pull/\d+/?$') {
        $Repository = $Matches[1]
    }
    elseif (-not $DryRun) {
        if (-not (Get-Command 'gh' -ErrorAction SilentlyContinue)) {
            throw 'GitHub CLI (gh) is required to resolve the target repository.'
        }
        $Repository = (& gh repo view --json nameWithOwner --jq '.nameWithOwner').Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Repository)) {
            throw 'Could not resolve the target repository. Pass -Repository owner/repo.'
        }
    }
    else {
        $Repository = 'dry-run/repository'
    }
}

$imageMarkdown = New-Object System.Collections.Generic.List[string]
if ($DryRun) {
    foreach ($screenshot in $screenshots) {
        $imageMarkdown.Add("![$($screenshot.BaseName)](https://github.com/user-attachments/assets/dry-run-$($screenshot.BaseName))")
    }
}
else {
    if (-not (Get-Command 'gh' -ErrorAction SilentlyContinue)) {
        throw 'GitHub CLI (gh) is required to publish validation artifacts.'
    }

    $repoIdText = (& gh api "repos/$Repository" --jq '.id').Trim()
    if ($LASTEXITCODE -ne 0 -or $repoIdText -notmatch '^\d+$') {
        throw "Could not resolve the repository ID for '$Repository'."
    }
    $token = (& gh auth token).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw 'Could not obtain an authenticated GitHub token.'
    }

    foreach ($screenshot in $screenshots) {
        $encodedName = [System.Uri]::EscapeDataString($screenshot.Name)
        $uploadUri = "https://uploads.github.com/user-attachments/assets?name=$encodedName&content_type=image%2Fpng&repository_id=$repoIdText"
        $headers = @{
            Authorization = "Bearer $token"
            Accept = 'application/vnd.github+json'
            'X-GitHub-Api-Version' = '2022-11-28'
        }
        $response = Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType 'application/octet-stream' -InFile $screenshot.FullName
        if ($null -eq $response.url -or [string]$response.url -notmatch '^https://') {
            throw "GitHub did not return an attachment URL for '$($screenshot.Name)'."
        }
        $imageMarkdown.Add("![$($screenshot.BaseName)]($($response.url))")
    }
}

$commentPath = Join-Path $artifactPath 'pull-request-validation-comment.md'
$comment = Get-Content -LiteralPath $evidencePath -Raw
if ($imageMarkdown.Count -gt 0) {
    $comment += "`n`n## Browser validation screenshots`n`n"
    $comment += ($imageMarkdown -join "`n`n")
}
Set-Content -LiteralPath $commentPath -Value $comment -Encoding UTF8

if ($DryRun) {
    Write-Host "Dry-run PR validation comment: $commentPath" -ForegroundColor Green
    Write-Output $commentPath
    return
}

& gh pr comment $PullRequest --repo $Repository --body-file $commentPath
if ($LASTEXITCODE -ne 0) {
    throw "Failed to publish validation evidence to pull request '$PullRequest'."
}

Write-Host "Published sanitized validation evidence to $Repository pull request $PullRequest." -ForegroundColor Green
Write-Output $commentPath
