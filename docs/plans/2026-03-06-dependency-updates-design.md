# Dependency Updates for SharePoint Embedded Samples

**Date**: 2026-03-06
**Status**: Approved
**Author**: Claude Sonnet 4.5

## Overview

Update all sample application dependencies to latest compatible versions to resolve security vulnerabilities while ensuring applications continue to build and start successfully.

## Scope

**Samples to Update:**
1. `spa-azurefunction` (JavaScript/React + Azure Functions)
2. `spe-typescript-react-azurefunction` (TypeScript variant)
3. `spe-ocr-sample` (React + TypeScript + Restify backend)
4. `asp.net-webservice` (C#/.NET Core)

**Success Criteria:**
- Zero critical/high vulnerabilities (or documented exceptions)
- Application builds successfully
- Application starts without errors
- Changes tracked via git commits with descriptive messages

## Design

### 1. Process Flow

**Sample Processing Order:**
Sequential, one sample at a time in the order listed above.

**Per-Sample Workflow:**
```
Audit → Automated Fix → Assess Remaining → Manual Updates (if needed)
  → Lockfile Decision → Build Verification → Commit
```

**Lockfile Strategy:**
- If ≥10 high/critical vulnerabilities remain after `npm audit fix`: Delete and regenerate lockfile
- If <10 high/critical vulnerabilities: Keep existing lockfile, use `npm update` for specific packages
- For .NET: No lockfile considerations, just update .csproj packages

### 2. Per-Sample Update Strategy

**Phase 1: Initial Assessment**
```bash
cd Samples/<sample-name>
npm audit --json > audit-report.json
npm audit  # Human-readable summary
```
Record total vulnerabilities by severity and outdated packages.

**Phase 2: Automated Fixes**
```bash
npm audit fix
npm audit fix --force  # Only if regular fix doesn't resolve critical/high
```

**Phase 3: Remaining Vulnerability Evaluation**

For each remaining vulnerability:
- **Patch/minor available**: `npm update <package-name>`
- **Major version required**: Check release notes for breaking changes
  - Minimal breaking changes: Apply major update
  - Complex breaking changes: Document as "unfixable without refactoring"
- **Transitive dependency**: Check if updating parent package resolves it

**Phase 4: Lockfile Decision**
```bash
# Count remaining high/critical
npm audit --json | jq '.metadata.vulnerabilities | .high + .critical'

# If ≥10: Regenerate
rm -rf node_modules package-lock.json
npm install

# If <10: Keep existing lockfile
```

**Phase 5: .NET Specific Strategy**
```bash
cd Samples/asp.net-webservice
dotnet list package --vulnerable
dotnet list package --outdated
dotnet add package <PackageName>  # Updates to latest compatible
```

### 3. Build Verification

**For JavaScript/TypeScript Samples:**
```bash
# Clean install
rm -rf node_modules
npm install

# Build verification
npm run build 2>&1 | tee build-output.txt
# Exit code must be 0

# Start verification (kill after successful startup)
timeout 30s npm start 2>&1 | tee start-output.txt
```

**Success Indicators:**
- Build completes with exit code 0
- No TypeScript compilation errors
- Webpack builds successfully
- Server starts and binds to expected port
- No uncaught exceptions during startup

**For .NET Sample:**
```bash
dotnet clean
dotnet build
timeout 10s dotnet run 2>&1 | tee start-output.txt
```

**Success Indicators:**
- Build completes with 0 errors
- Application starts and binds to port 57750
- No runtime exceptions during startup

### 4. Error Handling & Rollback

**Build Failure Response:**

1. Check build-output.txt for specific error
2. Quick assessment (5 min max): simple vs complex fix
3. Decision tree:
   - Simple fix (<20 lines): Apply and continue
   - Complex fix: Revert to previous state, document issue
   - Dependency conflict: Pin problematic package to previous major version

**Rollback Process:**
```bash
git checkout HEAD -- package.json package-lock.json
npm install
npm run build && echo "Rollback successful"
git commit -m "chore: attempted updates for <sample>, reverted due to <reason>"
```

**Unfixable Vulnerabilities:**

If vulnerability requires major refactoring:
1. Document in commit message
2. Continue to next sample
3. Update CLAUDE.md if multiple samples affected

**Cross-Sample Issues:**

If same package causes problems across samples:
- Document the pattern
- Consider fundamental incompatibility
- May accept older version until upstream fix

### 5. Commit Strategy

**One commit per sample after successful update:**

```bash
git add Samples/<sample-name>/
git commit -m "chore(samples): update <sample-name> dependencies

- Resolved X critical, Y high, Z moderate vulnerabilities
- Updated <key-packages> to latest versions
- <Lockfile regenerated | Lockfile preserved>
- Build and startup verified

Packages updated:
- <package1>: v1.0.0 -> v2.0.0
- <package2>: v3.1.0 -> v3.2.5
[... list major updates only]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**For .NET sample:**
```bash
git commit -m "chore(samples): update asp.net-webservice dependencies

- Resolved X vulnerabilities in NuGet packages
- Updated <key-packages> to latest versions
- Build and startup verified

Packages updated:
- <Package1>: 1.0.0 -> 2.0.0

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**If rollback occurs:**
```bash
git commit -m "chore(samples): revert <sample-name> dependency updates

Updates caused build failure: <brief-description>
Reverted to working state for stability.

Issue: <specific-error-or-breaking-change>
Future work: Investigate fix for <problematic-package>"
```

**Branch Strategy:**
Work directly on current branch (main). Commits are incremental and individually revertible.

**CLAUDE.md Updates:**
- Add patterns to Common Issues section if they emerge
- Note unfixable vulnerabilities in relevant sample build instructions

## Trade-offs

**Chosen Approach (Sequential):**
- ✅ Controlled, predictable process
- ✅ Easy to isolate build failures
- ✅ Clear commit history per sample
- ❌ Takes longer than parallel approach

**Alternative Considered (Parallel):**
- ✅ Faster completion
- ✅ Identifies cross-sample patterns
- ❌ Harder to debug failures
- ❌ Complex rollback

## Future Considerations

- Consider automated dependency update tooling (Dependabot, Renovate)
- Add basic smoke tests for critical functionality
- Evaluate containerized build verification
