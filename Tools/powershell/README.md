# PowerShell

Admin scripts for provisioning SharePoint Embedded resources.

| Script | Description |
|--------|-------------|
| `RegisterContainer.ps1` | Registers a Container Type in a SharePoint tenant |
| `CreateContainer.ps1` | Creates a Container instance for a registered Container Type |
| `SampleValidation.ps1` | Shared helpers dot-sourced by each sample's `validate-sample.ps1` |

## Sample validation harness

Each sample app has a `validate-sample.ps1` that dot-sources `SampleValidation.ps1` and drives its own install/build/runtime smoke checks. Run one with:

```pwsh
pwsh -NoProfile -File "<app>/validate-sample.ps1"
```

It emits a final `VALIDATION_RESULT: PASS | FAIL | SKIP_CONFIG - <detail>` line. `SKIP_CONFIG` means the build succeeded but a runtime check was skipped because required configuration (e.g. `.env`, `appsettings.json`, `local.settings.json`, or the `func` Azure Functions Core Tools) was not present.

### Validation artifacts

`SampleValidation.ps1` persists artifacts for UI and background/API samples under each app's git-ignored `.validation/` folder:

- **Screenshots** — `Invoke-BrowserSmoke -ScreenshotPath <path>` runs the Playwright smoke in `Tools/sample-validation/browser-smoke.mjs` with `--screenshot <path>`, saving a full-page PNG under `.validation/screenshots/`.
- **HTTP transcripts** — `Save-HttpArtifact` writes a REQUEST/RESPONSE transcript under `.validation/http/` for background/API samples (e.g. `/health`, webhook echo).
- `New-ValidationArtifactPath -Kind screenshots|http` generates timestamped artifact paths.

Everything under `.validation/` is git-ignored and is **never committed**; these artifacts are published only in the pull request description.

## Prerequisites

- PowerShell 5.1 or later
- An M365 tenant with SharePoint Embedded enabled
- An app registration in Azure Entra ID with the appropriate permissions
