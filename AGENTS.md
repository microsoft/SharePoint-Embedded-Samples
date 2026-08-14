# Repository agent requirements

These instructions apply to every agent that changes this repository.

## Pull request validation gate

Before opening or updating a pull request:

1. Run every sample validator with:

   ```pwsh
   pwsh -NoProfile -File Tools/powershell/Invoke-RepositoryValidation.ps1
   ```

2. Review every `VALIDATION_RESULT`. Do not describe `SKIP_CONFIG` or `SKIP_ENV`
   as a pass, and do not open a success-shaped pull request when any sample
   reports `FAIL`.
3. Inspect every screenshot in the generated sanitized evidence directory.
   Delete any screenshot that displays credentials, tenant data, personal data,
   tokens, or other non-public information.
4. Add the sanitized Markdown report and HTTP evidence to the pull request
   description or a comment. After reviewing the screenshots, publish the
   complete bundle with:

   ```pwsh
   pwsh -NoProfile -File Tools/powershell/Publish-ValidationArtifacts.ps1 `
     -PullRequest <pull-request-url-or-number> `
     -ScreenshotsReviewed
   ```
5. Include the exact status for every sample and explain every skipped check.

Never upload files directly from a sample's `.validation` directory. Only
publish files produced under `.validation/sanitized/`.

Follow `.github/skills/sample-validation-evidence/SKILL.md` for the complete
validation, sanitization, and GitHub upload procedure.
