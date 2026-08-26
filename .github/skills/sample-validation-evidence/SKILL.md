---
name: sample-validation-evidence
description: Run every sample validator, sanitize its evidence, and attach concrete validation artifacts to a pull request.
---

# Sample validation evidence

Use this skill before any agent opens or updates a pull request in this
repository.

## Run all validators

From the repository root, run:

```pwsh
pwsh -NoProfile -File Tools/powershell/Invoke-RepositoryValidation.ps1
```

The command runs every tracked `validate-sample.ps1`, captures its complete
output, records the exact `VALIDATION_RESULT`, and creates a sanitized evidence
bundle under `.validation/sanitized/<timestamp>/`.

Pass validator switches only when necessary:

```pwsh
pwsh -NoProfile -File Tools/powershell/Invoke-RepositoryValidation.ps1 -SkipInstall
```

Do not use `-SkipBrowser` merely to save time. A skipped browser check does not
satisfy screenshot validation.

## Review the evidence

1. Open `.validation/sanitized/<timestamp>/validation-report.md`.
2. Confirm that every sample is present.
3. Treat `PASS`, `FAIL`, `SKIP_CONFIG`, and `SKIP_ENV` exactly as emitted.
4. Inspect every PNG before upload. The sanitizer copies screenshots because
   automatic text redaction cannot inspect pixels. Delete any image containing
   secrets, tenant content, personal data, or other non-public information.
5. Search the sanitized directory for credentials or tenant data. If anything
   sensitive remains, remove it and improve
   `Tools/powershell/Sanitize-ValidationArtifacts.ps1` before publishing.

Never upload directly from an app's raw `.validation` directory.

## Add evidence to the pull request

The pull request description or a follow-up comment must include the sanitized
`validation-report.md` content and meaningful sanitized HTTP excerpts.

After visually reviewing every screenshot, publish the sanitized report, HTTP
evidence, and screenshots with:

```pwsh
pwsh -NoProfile -File Tools/powershell/Publish-ValidationArtifacts.ps1 `
  -PullRequest <pull-request-url-or-number> `
  -ScreenshotsReviewed
```

For a pull request number, pass `-Repository owner/repo` when the checkout remote
is not the target repository. The publisher refuses directories outside
`.validation/sanitized`, uploads PNGs through GitHub's user attachments API, and
posts `validation-evidence.md` plus embedded screenshots as a PR comment.

Confirm the GitHub page contains the report, HTTP evidence, and rendered
screenshots before declaring the pull request complete.

If artifact upload fails, report the failure and keep working. Do not replace
the evidence with an unsupported statement that validation passed.
