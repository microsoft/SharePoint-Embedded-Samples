Set-StrictMode -Version Latest

function Write-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-CommandExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Resolve-CommandPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($Name.Contains([System.IO.Path]::DirectorySeparatorChar) -or $Name.Contains([System.IO.Path]::AltDirectorySeparatorChar)) {
        return $Name
    }

    $commands = @(Get-Command $Name -All -ErrorAction Stop)

    # Start-LoggedProcess launches commands through Start-Process, which (when output is
    # redirected) uses the OS CreateProcess API. CreateProcess cannot execute PowerShell
    # script shims (.ps1) and, on Windows, cannot execute the extensionless shell-script
    # shims that npm/npx ship. Get-Command returns the .ps1 shim first by precedence, so
    # prefer a directly executable form (.cmd/.exe/...) that both the call operator and
    # Start-Process can launch.
    $executableExtensions = @('.exe', '.cmd', '.bat', '.com')

    $preferred = $commands | Where-Object {
        $_.CommandType -eq 'Application' -and
        $_.Source -and
        $executableExtensions -contains [System.IO.Path]::GetExtension($_.Source).ToLowerInvariant()
    } | Select-Object -First 1

    if ($null -eq $preferred) {
        # On non-Windows platforms the Application form is typically an extensionless
        # executable or a shebang script that CreateProcess can exec directly.
        $preferred = $commands | Where-Object { $_.CommandType -eq 'Application' } | Select-Object -First 1
    }

    if ($null -eq $preferred) {
        $preferred = $commands | Select-Object -First 1
    }

    if ($null -ne $preferred.Source -and $preferred.Source.Length -gt 0) {
        return $preferred.Source
    }

    return $preferred.Name
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @(),

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [hashtable]$Environment = @{}
    )

    $resolvedFilePath = Resolve-CommandPath -Name $FilePath

    Push-Location $WorkingDirectory
    $previous = @{}

    try {
        foreach ($key in $Environment.Keys) {
            $previous[$key] = [Environment]::GetEnvironmentVariable($key)
            [Environment]::SetEnvironmentVariable($key, [string]$Environment[$key])
        }

        & $resolvedFilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command '$FilePath $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        foreach ($key in $Environment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $previous[$key])
        }
        Pop-Location
    }
}

function Get-DotEnvMap {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $values = @{}
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf('=')
        if ($separatorIndex -lt 1) {
            continue
        }

        $name = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$name] = $value
    }

    return $values
}

function Start-LoggedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @(),

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$LogPath,

        [hashtable]$Environment = @{}
    )

    $resolvedFilePath = Resolve-CommandPath -Name $FilePath
    $logDirectory = Split-Path -Parent $LogPath
    if (-not (Test-Path $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory | Out-Null
    }

    $stdoutPath = "$LogPath.stdout"
    $stderrPath = "$LogPath.stderr"
    if (Test-Path $stdoutPath) {
        Remove-Item $stdoutPath -Force
    }
    if (Test-Path $stderrPath) {
        Remove-Item $stderrPath -Force
    }

    $startSplat = @{
        FilePath = $resolvedFilePath
        ArgumentList = $Arguments
        WorkingDirectory = $WorkingDirectory
        RedirectStandardOutput = $stdoutPath
        RedirectStandardError = $stderrPath
        PassThru = $true
        NoNewWindow = $true
    }

    if ($Environment.Count -gt 0) {
        $startSplat['Environment'] = $Environment
    }

    $process = Start-Process @startSplat
    if ($null -eq $process) {
        throw "Failed to start process '$FilePath'."
    }

    return [pscustomobject]@{
        Process = $process
        LogPath = $LogPath
        StdoutPath = $stdoutPath
        StderrPath = $stderrPath
    }
}

function Stop-LoggedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Handle
    )

    if ($null -ne $Handle.Process -and -not $Handle.Process.HasExited) {
        $Handle.Process.Kill($true)
        $Handle.Process.WaitForExit()
    }

}

function Get-LogTail {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [int]$LineCount = 40
    )

    $paths = @()
    if ($Path) {
        $paths += $Path
    }

    $stdoutPath = "$Path.stdout"
    $stderrPath = "$Path.stderr"
    if (Test-Path $stdoutPath) {
        $paths += $stdoutPath
    }
    if (Test-Path $stderrPath) {
        $paths += $stderrPath
    }

    if ($paths.Count -eq 0) {
        return ''
    }

    $lines = foreach ($candidate in $paths) {
        if (Test-Path $candidate) {
            "[$([System.IO.Path]::GetFileName($candidate))]"
            Get-Content -Path $candidate -Tail $LineCount
        }
    }

    return ($lines -join [Environment]::NewLine)
}

function Wait-ForHttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,

        [int]$TimeoutSec = 60,

        [int[]]$AllowedStatusCodes = @(200),

        [pscustomobject]$ProcessHandle
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ($null -ne $ProcessHandle -and $ProcessHandle.Process.HasExited) {
            $tail = Get-LogTail -Path $ProcessHandle.LogPath
            throw "Process exited while waiting for '$Url'. Recent log output:`n$tail"
        }

        try {
            $invokeWebRequestArguments = @{
                Uri                = $Url
                TimeoutSec         = 5
                MaximumRedirection = 0
            }
            if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey('UseBasicParsing')) {
                $invokeWebRequestArguments['UseBasicParsing'] = $true
            }
            $response = Invoke-WebRequest @invokeWebRequestArguments
            if ($AllowedStatusCodes -contains [int]$response.StatusCode) {
                return $response
            }
        }
        catch {
            $responseProperty = $_.Exception.PSObject.Properties['Response']
            $response = if ($null -ne $responseProperty) { $responseProperty.Value } else { $null }
            if ($null -ne $response) {
                $statusCode = $response.StatusCode.value__
                if ($AllowedStatusCodes -contains [int]$statusCode) {
                    return $response
                }
            }
        }

        Start-Sleep -Milliseconds 500
    }

    $details = ''
    if ($null -ne $ProcessHandle) {
        $details = Get-LogTail -Path $ProcessHandle.LogPath
    }

    throw "Timed out waiting for HTTP endpoint '$Url'. Recent log output:`n$details"
}

function Test-FileContains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Pattern
    )

    if (-not (Test-Path $Path)) {
        return $false
    }

    return Select-String -Path $Path -Pattern $Pattern -SimpleMatch -Quiet
}

function New-ValidationLogPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $logRoot = Join-Path $WorkingDirectory ".validation"
    if (-not (Test-Path $logRoot)) {
        New-Item -ItemType Directory -Path $logRoot | Out-Null
    }

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    return Join-Path $logRoot "$Name-$timestamp.log"
}

function Ensure-BrowserTooling {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ToolRoot,

        [switch]$SkipInstall
    )

    $playwrightPath = Join-Path $ToolRoot 'node_modules/playwright'
    if (-not (Test-Path $playwrightPath)) {
        if ($SkipInstall) {
            Write-Host 'Shared browser validation tooling is missing; installing it even though -SkipInstall was specified.' -ForegroundColor Yellow
        }

        Write-Step 'Installing shared browser validation tooling'
        Invoke-ExternalCommand -FilePath 'npm' -Arguments @('install') -WorkingDirectory $ToolRoot
    }

    Write-Step 'Installing Chromium for Playwright'
    Invoke-ExternalCommand -FilePath 'npx' -Arguments @('playwright', 'install', 'chromium') -WorkingDirectory $ToolRoot
}

function Invoke-BrowserSmoke {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ToolRoot,

        [Parameter(Mandatory = $true)]
        [string]$Url,

        [switch]$SkipInstall,

        [switch]$Headed,

        [int]$TimeoutSec = 60,

        [int]$WaitMs = 1500,

        [string]$ExpectSelector,

        [string]$ExpectedText,

        [string]$ClickSelector,

        [switch]$FailOnConsoleError
    )

    Ensure-BrowserTooling -ToolRoot $ToolRoot -SkipInstall:$SkipInstall

    $arguments = @(
        'browser-smoke.mjs',
        '--url', $Url,
        '--timeout-ms', [string]($TimeoutSec * 1000),
        '--wait-ms', [string]$WaitMs
    )

    if ($Headed) {
        $arguments += '--headed'
    }
    if ($ExpectSelector) {
        $arguments += @('--expect-selector', $ExpectSelector)
    }
    if ($ExpectedText) {
        $arguments += @('--expect-text', $ExpectedText)
    }
    if ($ClickSelector) {
        $arguments += @('--click-selector', $ClickSelector)
    }
    if ($FailOnConsoleError) {
        $arguments += '--fail-on-console-error'
    }

    Invoke-ExternalCommand -FilePath 'node' -Arguments $arguments -WorkingDirectory $ToolRoot
}