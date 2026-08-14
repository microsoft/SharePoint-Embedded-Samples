---
description: Update and validate dependencies across every sample application each week.
labels: [automation, dependencies, validation]
on:
  workflow_dispatch:
  schedule: weekly on monday
permissions:
  contents: read
  pull-requests: read
  issues: read
  copilot-requests: write
engine: copilot
runs-on: windows-latest
timeout-minutes: 180
concurrency:
  group: weekly-dependency-upgrades
  cancel-in-progress: false
network:
  allowed:
    - defaults
    - node
    - dotnet
    - playwright
tools:
  edit:
  bash: [":*"]
  playwright:
    mode: cli
skills:
  - .github/skills/weekly-dependency-upgrade
post-steps:
  - name: Upload dependency validation artifacts
    if: always()
    uses: actions/upload-artifact@v7.0.1
    with:
      name: dependency-validation-artifacts
      path: |
        .validation/**
        **/.validation/**
      if-no-files-found: warn
      include-hidden-files: true
      retention-days: 30
safe-outputs:
  create-pull-request:
    title-prefix: "[weekly dependency updates] "
    base-branch: main
    allowed-branches:
      - "automation/weekly-dependency-upgrades-*"
    reviewers:
      - gnjoseph
    draft: false
    if-no-changes: ignore
    fallback-as-issue: false
    excluded-files:
      - ".validation/**"
      - "**/.validation/**"
    max-patch-files: 300
  create-issue:
    title-prefix: "[weekly dependency updates] "
    labels:
      - dependencies
    max: 1
---

# Weekly dependency updates

Read `.github/agents/dependency-upgrade.agent.md`, then use the installed
`weekly-dependency-upgrade` skill to perform one complete repository-wide
dependency update iteration.

The source branch for a pull request must be named
`automation/weekly-dependency-upgrades-YYYY-MM-DD`, using the current UTC date.
The pull request must target `main`, be ready for review, and contain concrete
validation evidence for every updated sample. Include the current workflow run
URL and tell reviewers to download the `dependency-validation-artifacts`
artifact for complete logs, HTTP transcripts, and full-resolution screenshots.

If there are no compatible updates, call `noop`. If an updated sample fails
validation, do not create a pull request; create one issue containing the failed
command, error output, and artifact link.
