---
name: weekly-dependency-upgrade
description: Update dependencies across every runnable sample, validate each updated sample, preserve concrete validation evidence, and prepare a reviewer-ready pull request.
---

# Weekly dependency upgrade

Use this skill for a repository-wide dependency update iteration. Work from the
current `main` branch checkout and treat every sample application as in scope.

## Goals

1. Update direct npm and NuGet dependencies to the newest compatible release in
   their current major version.
2. Refresh every affected lockfile.
3. Resolve vulnerable transitive dependencies when a compatible override,
   resolution, or direct dependency update is available.
4. Validate every updated sample with the repository's own validation entrypoint.
5. Put concrete build, test, audit, HTTP, and browser evidence in the pull request.

Do not perform major-version migrations in this workflow. If a vulnerability can
only be resolved through a major migration, document it as an unresolved security
exception with the dependency chain and available fixed version.

## Repository inventory

Find manifests recursively while excluding generated and dependency directories:

- `package.json` and corresponding npm lockfiles
- `*.csproj`, `Directory.Packages.props`, and NuGet lockfiles

Current runnable samples and validation entrypoints are:

- `AI/mcp-server/validate-sample.ps1`
- `AI/ocr/validate-sample.ps1`
- `Custom Apps/boilerplate-aspnet-webservice/validate-sample.ps1`
- `Custom Apps/boilerplate-react-azurefunction/validate-sample.ps1`
- `Custom Apps/boilerplate-typescript-react/validate-sample.ps1`
- `Custom Apps/legal-docs/validate-sample.ps1`
- `Custom Apps/project-management/validate-sample.ps1`
- `Custom Apps/webhook/validate-sample.ps1`

If the inventory discovers another runnable sample with a
`validate-sample.ps1`, include it. Do not edit generated dependency directories.

## Update procedure

1. Record the current direct dependency versions and available compatible
   updates for every manifest.
2. Apply compatible current-major updates with npm and .NET tooling rather than
   hand-editing lockfiles.
3. Preserve the package manager and lockfile format already used by each sample.
4. Review peer-dependency and engine warnings. Do not use `--force` to conceal an
   incompatible graph.
5. Run `npm audit` for each npm project and NuGet vulnerability checks for each
   .NET project after updating.
6. Use a targeted npm override only when it produces a valid installed graph and
   fixes a vulnerable transitive package. Record why the override is needed.
7. Review the final diff for accidental generated files, credentials, local
   configuration, and unrelated changes.

## Validation procedure

Run every updated sample's `validate-sample.ps1` from the repository root with
PowerShell 7. Do not pass `-SkipBrowser` unless browser tooling is genuinely
unavailable. Capture the full output from each invocation under:

```text
.validation/weekly/<sample-name>/validation.log
```

The validators write process logs, HTTP transcripts, and screenshots below each
sample's `.validation` directory. Preserve those files until the workflow's
artifact upload step completes.

Interpret `VALIDATION_RESULT` exactly:

- `PASS`: the checks named by the validator passed.
- `SKIP_CONFIG`: configuration-independent checks passed, but one or more runtime
  checks were not executed. List each skipped check and reason.
- `SKIP_ENV`: the environment could not run the validator. List the missing
  runtime or tool and do not report the sample as passed.
- `FAIL`: the sample failed validation. Do not open a success-shaped pull request.

Configuration-dependent behavior that is expected in an unconfigured runner:

- MCP runtime needs `AI/mcp-server/.env`.
- OCR backend runtime needs `AI/ocr/.env`; its frontend can use the validator's
  temporary non-secret placeholder client ID.
- ASP.NET runtime needs a usable `appsettings.json` and SQL connection.
- Azure Functions runtimes need Azure Functions Core Tools and local settings.
- Authentication-dependent Vite clients may use the validators' non-secret
  placeholder IDs for unauthenticated render and screenshot checks.
- Legal docs needs Node 20.19+ or 22.12+.

Never claim a skipped or configuration-blocked check passed.

## Evidence report

Create `.validation/weekly-report.md` with:

1. A manifest-by-manifest table of old and new direct dependency versions.
2. A per-sample validation table with the exact `VALIDATION_RESULT`.
3. The commands executed and meaningful terminal excerpts proving builds, tests,
   lint, and audits ran.
4. HTTP request and response excerpts, including method, URL, status, headers
   when useful, and response body.
5. A list of screenshot artifact paths and what each screenshot demonstrates.
6. All skipped checks, warnings, and unresolved vulnerabilities, including their
   dependency chains.
7. A link to the current Actions run and the uploaded artifact named
   `dependency-validation-artifacts`.

The pull request body must contain the report's useful evidence directly, not
only statements such as "validation passed." The pull request body MUST also contain
the sanitized validation artifacts attached (or in a follow up comment), and not just
reference the Actions artifacts. In addition to that, the PR description may point to
the Actions artifacts for complete logs and full-resolution screenshots.

## Pull request behavior

If no dependency or lockfile changes are available, request the workflow's
`noop` safe output and explain that the repository is current.

If changes are available:

- Request one non-draft pull request against `main`.
- Use a source branch beginning with
  `automation/weekly-dependency-upgrades-`.
- Request reviewer `gnjoseph` and `dluces`.
- Include the dependency table, exact validation results, HTTP excerpts,
  screenshot inventory, audit results, skips, and Actions artifact link.
- Do not request a pull request when any updated sample has a `FAIL` result.
  Instead, create a failure issue or report the failure through the workflow's
  available safe output.

Exclude `.validation` evidence from the code patch. It is transient workflow
evidence and is uploaded by the workflow after the agent finishes.
