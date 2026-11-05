# Copyright (c) Microsoft Corporation. Licensed under the MIT license.
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../../Tools/powershell/SampleValidation.ps1')

try {
    Write-Step 'Preflight checks'
    $nodeCommand = Get-ValidationNodeCommand
    Assert-CommandExists -Name $nodeCommand
    if ((Get-ValidationNodeVersion).Major -lt 22) {
        Write-ValidationSummary -Status 'SKIP_ENV' -Message 'The playground requires Node.js 22 or later. Set VALIDATION_NODE_COMMAND to a compatible existing executable.'
        return
    }

    $testFiles = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'test') -Filter '*.test.mjs' -File |
        Sort-Object Name |
        ForEach-Object { $_.FullName })
    if ($testFiles.Count -eq 0) {
        throw 'No playground test files were found. Validation cannot pass without executing the suite.'
    }

    Write-Step 'Running native engine, controller, browser, and HTTP tests'
    Invoke-ExternalCommand -FilePath $nodeCommand -Arguments (@('--test') + $testFiles) -WorkingDirectory $PSScriptRoot
    Write-ValidationSummary -Status 'PASS' -Message 'The complete native playground suite passed, including browser interaction, storage, navigation, and static HTTP checks.'
}
catch {
    Write-ValidationSummary -Status 'FAIL' -Message $_.Exception.Message
    throw
}
