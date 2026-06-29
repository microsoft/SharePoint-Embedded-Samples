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

. (Join-Path $PSScriptRoot '..\..\Tools\powershell\SampleValidation.ps1')

$appRoot = $PSScriptRoot
$appSettingsPath = Join-Path $appRoot 'appsettings.json'
$runtimeHandle = $null

try {
    Write-Step 'Preflight checks'
    Assert-CommandExists 'dotnet'

    Write-Step 'Restoring packages'
    Invoke-ExternalCommand -FilePath 'dotnet' -Arguments @('restore') -WorkingDirectory $appRoot

    Write-Step 'Building app'
    Invoke-ExternalCommand -FilePath 'dotnet' -Arguments @('build') -WorkingDirectory $appRoot

    Write-Host 'No automated test project is defined for this sample.' -ForegroundColor Yellow

    if (-not (Test-Path $appSettingsPath)) {
        Write-Host 'Skipping runtime smoke check because appsettings.json is missing.' -ForegroundColor Yellow
        Write-Host 'Build validation completed.' -ForegroundColor Green
        return
    }

    Write-Step 'Starting web app'
    $logPath = New-ValidationLogPath -WorkingDirectory $appRoot -Name 'aspnet-webservice'
    $runtimeHandle = Start-LoggedProcess -FilePath 'dotnet' -Arguments @('run', '--urls', 'http://127.0.0.1:5080') -WorkingDirectory $appRoot -LogPath $logPath
    [void](Wait-ForHttpEndpoint -Url 'http://127.0.0.1:5080' -TimeoutSec $TimeoutSec -AllowedStatusCodes @(200, 302) -ProcessHandle $runtimeHandle)

    Write-Host 'ASP.NET sample validation completed.' -ForegroundColor Green
}
finally {
    if ($null -ne $runtimeHandle -and -not $KeepProcesses) {
        Stop-LoggedProcess -Handle $runtimeHandle
    }
}