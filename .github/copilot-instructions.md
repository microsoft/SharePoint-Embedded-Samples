# SharePoint Embedded Samples instructions

Follow the repository-wide requirements in `AGENTS.md` for every change.

Before creating or updating any pull request, use the
`sample-validation-evidence` skill in
`.github/skills/sample-validation-evidence/SKILL.md`. Run all sample validation
scripts through `Tools/powershell/Invoke-RepositoryValidation.ps1`, inspect the
result, and publish only the generated sanitized artifacts with
`Tools/powershell/Publish-ValidationArtifacts.ps1`.

A pull request is incomplete until its description or a comment contains:

- The exact `VALIDATION_RESULT` for every sample.
- Concrete build, test, lint, audit, and HTTP evidence that was produced.
- Embedded screenshots for successful browser smoke checks.
- Explicit reasons for `SKIP_CONFIG` and `SKIP_ENV` results.

Never claim that a skipped check passed. Never publish raw `.validation`
contents, local configuration, credentials, access tokens, cookies, connection
strings, tenant identifiers, or personal data.
