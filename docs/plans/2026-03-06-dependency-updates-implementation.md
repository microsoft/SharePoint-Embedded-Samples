# Dependency Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all sample application dependencies to latest compatible versions, resolving security vulnerabilities while ensuring build and startup verification.

**Architecture:** Sequential sample-by-sample updates following audit → fix → verify → commit workflow. Each sample is independently updated, verified, and committed before proceeding to the next.

**Tech Stack:** npm (JavaScript/TypeScript samples), dotnet CLI (.NET sample), git

---

## Task 1: Update spa-azurefunction Sample

**Files:**
- Modify: `Samples/spa-azurefunction/package.json`
- Modify: `Samples/spa-azurefunction/package-lock.json` (or regenerate)
- Modify: `Samples/spa-azurefunction/packages/client-app/package.json`
- Modify: `Samples/spa-azurefunction/packages/client-app/package-lock.json` (or regenerate)
- Modify: `Samples/spa-azurefunction/packages/azure-functions/package.json`
- Modify: `Samples/spa-azurefunction/packages/azure-functions/package-lock.json` (or regenerate)

**Step 1: Audit root package**

```bash
cd Samples/spa-azurefunction
npm audit --json > audit-root.json
npm audit
```

Expected: Output showing vulnerabilities by severity (info, low, moderate, high, critical)

**Step 2: Audit client-app package**

```bash
cd packages/client-app
npm audit --json > audit-client.json
npm audit
```

Expected: Output showing vulnerabilities, note critical/high count

**Step 3: Audit azure-functions package**

```bash
cd ../azure-functions
npm audit --json > audit-functions.json
npm audit
```

Expected: Output showing vulnerabilities, note critical/high count

**Step 4: Return to root and apply automated fixes**

```bash
cd ../..
npm audit fix
```

Expected: Some vulnerabilities resolved, output shows what was updated

**Step 5: Apply force fixes if critical/high remain**

```bash
npm audit
# If critical/high vulnerabilities remain:
npm audit fix --force
```

Expected: More aggressive updates applied, check output for breaking changes warnings

**Step 6: Assess remaining vulnerabilities**

```bash
npm audit
```

Decision point:
- If <10 high/critical: Proceed to Step 8
- If ≥10 high/critical: Proceed to Step 7

**Step 7: Regenerate lockfiles if needed**

```bash
# For root
rm -rf node_modules package-lock.json
npm install

# For client-app
cd packages/client-app
rm -rf node_modules package-lock.json
npm install
cd ../..

# For azure-functions
cd packages/azure-functions
rm -rf node_modules package-lock.json
npm install
cd ../..
```

Expected: Fresh lockfiles generated with resolved dependencies

**Step 8: Clean install and build**

```bash
rm -rf node_modules packages/*/node_modules
npm install
npm run build 2>&1 | tee build-output.txt
echo "Exit code: $?"
```

Expected: Exit code 0, successful build with no errors

**Step 9: Start verification**

```bash
timeout 30s npm start 2>&1 | tee start-output.txt
```

Expected: Applications start, see "localhost:3000" for client and "localhost:7071" for functions

**Step 10: Check for errors in output**

```bash
grep -i "error\|fail\|exception" start-output.txt || echo "No errors found"
```

Expected: "No errors found" or only non-critical warnings

**Step 11: Record package changes**

```bash
git diff package.json packages/client-app/package.json packages/azure-functions/package.json > package-changes.txt
cat package-changes.txt
```

Expected: See version changes for updated packages

**Step 12: Commit changes**

```bash
git add Samples/spa-azurefunction/
git commit -m "chore(samples): update spa-azurefunction dependencies

- Resolved vulnerabilities (counts from audit output)
- [Lockfile regenerated | Lockfile preserved]
- Build and startup verified

Major package updates:
[List from package-changes.txt]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

**Rollback Step (use if build/start fails):**

```bash
cd Samples/spa-azurefunction
git checkout HEAD -- package.json package-lock.json packages/*/package.json packages/*/package-lock.json
npm install
npm run build && echo "Rollback successful"
git commit -m "chore(samples): revert spa-azurefunction dependency updates

Updates caused build failure: [describe error from build-output.txt]
Reverted to working state for stability.

Issue: [specific error]
Future work: Investigate fix for [problematic package]"
```

---

## Task 2: Update spe-typescript-react-azurefunction Sample

**Files:**
- Modify: `Samples/spe-typescript-react-azurefunction/package.json`
- Modify: `Samples/spe-typescript-react-azurefunction/package-lock.json` (or regenerate)
- Modify: `Samples/spe-typescript-react-azurefunction/function-api/package.json`
- Modify: `Samples/spe-typescript-react-azurefunction/function-api/package-lock.json` (or regenerate)
- Modify: `Samples/spe-typescript-react-azurefunction/react-client/package.json`
- Modify: `Samples/spe-typescript-react-azurefunction/react-client/package-lock.json` (or regenerate)

**Step 1: Audit root package**

```bash
cd Samples/spe-typescript-react-azurefunction
npm audit --json > audit-root.json
npm audit
```

Expected: Output showing vulnerabilities by severity

**Step 2: Audit function-api package**

```bash
cd function-api
npm audit --json > audit-api.json
npm audit
```

Expected: Output showing vulnerabilities, note critical/high count

**Step 3: Audit react-client package**

```bash
cd ../react-client
npm audit --json > audit-client.json
npm audit
```

Expected: Output showing vulnerabilities, note critical/high count

**Step 4: Return to root and apply automated fixes**

```bash
cd ..
npm audit fix
```

Expected: Some vulnerabilities resolved

**Step 5: Apply force fixes if critical/high remain**

```bash
npm audit
# If critical/high vulnerabilities remain:
npm audit fix --force
```

Expected: More aggressive updates applied

**Step 6: Assess remaining vulnerabilities**

```bash
npm audit
```

Decision point:
- If <10 high/critical: Proceed to Step 8
- If ≥10 high/critical: Proceed to Step 7

**Step 7: Regenerate lockfiles if needed**

```bash
# For root
rm -rf node_modules package-lock.json
npm install

# For function-api
cd function-api
rm -rf node_modules package-lock.json
npm install
cd ..

# For react-client
cd react-client
rm -rf node_modules package-lock.json
npm install
cd ..
```

Expected: Fresh lockfiles generated

**Step 8: Clean install and verify TypeScript compilation**

```bash
rm -rf node_modules function-api/node_modules react-client/node_modules
npm install

# Check function-api build
cd function-api
npm run build 2>&1 | tee build-api-output.txt
echo "API Exit code: $?"
cd ..

# Check react-client build
cd react-client
npm run build 2>&1 | tee build-client-output.txt
echo "Client Exit code: $?"
cd ..
```

Expected: Both exit codes 0, no TypeScript errors

**Step 9: Start verification**

```bash
timeout 30s npm start 2>&1 | tee start-output.txt
```

Expected: Both API and client start successfully

**Step 10: Check for errors in output**

```bash
grep -i "error\|fail\|exception" start-output.txt function-api/build-api-output.txt react-client/build-client-output.txt || echo "No errors found"
```

Expected: "No errors found"

**Step 11: Record package changes**

```bash
git diff package.json function-api/package.json react-client/package.json > package-changes.txt
cat package-changes.txt
```

Expected: See version changes

**Step 12: Commit changes**

```bash
cd ../..
git add Samples/spe-typescript-react-azurefunction/
git commit -m "chore(samples): update spe-typescript-react-azurefunction dependencies

- Resolved vulnerabilities (counts from audit output)
- [Lockfile regenerated | Lockfile preserved]
- Build and startup verified

Major package updates:
[List from package-changes.txt]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

**Rollback Step (use if build/start fails):**

```bash
cd Samples/spe-typescript-react-azurefunction
git checkout HEAD -- package.json package-lock.json function-api/package.json function-api/package-lock.json react-client/package.json react-client/package-lock.json
npm install
npm run build && echo "Rollback successful"
git commit -m "chore(samples): revert spe-typescript-react-azurefunction dependency updates

Updates caused build failure: [describe error]
Reverted to working state for stability.

Issue: [specific error]
Future work: Investigate fix for [problematic package]"
```

---

## Task 3: Update spe-ocr-sample Sample

**Files:**
- Modify: `Samples/spe-ocr-sample/package.json`
- Modify: `Samples/spe-ocr-sample/package-lock.json` (or regenerate)
- Modify: `Samples/spe-ocr-sample/server/tsconfig.json` (potentially if TypeScript updates require)

**Step 1: Audit package**

```bash
cd Samples/spe-ocr-sample
npm audit --json > audit-report.json
npm audit
```

Expected: Output showing vulnerabilities by severity

**Step 2: Apply automated fixes**

```bash
npm audit fix
```

Expected: Some vulnerabilities resolved

**Step 3: Apply force fixes if critical/high remain**

```bash
npm audit
# If critical/high vulnerabilities remain:
npm audit fix --force
```

Expected: More aggressive updates applied

**Step 4: Assess remaining vulnerabilities**

```bash
npm audit
```

Decision point:
- If <10 high/critical: Proceed to Step 6
- If ≥10 high/critical: Proceed to Step 5

**Step 5: Regenerate lockfile if needed**

```bash
rm -rf node_modules package-lock.json
npm install
```

Expected: Fresh lockfile generated

**Step 6: Build backend**

```bash
npm run build:backend 2>&1 | tee build-backend-output.txt
echo "Backend Exit code: $?"
```

Expected: Exit code 0, TypeScript compilation successful

**Step 7: Clean install and build frontend**

```bash
rm -rf node_modules
npm install
npm run build-cre 2>&1 | tee build-frontend-output.txt
echo "Frontend Exit code: $?"
```

Expected: Exit code 0, React build successful

**Step 8: Start verification**

```bash
timeout 30s npm start 2>&1 | tee start-output.txt
```

Expected: Backend starts on expected port, frontend starts on port 3000

**Step 9: Check for errors in output**

```bash
grep -i "error\|fail\|exception" start-output.txt build-backend-output.txt build-frontend-output.txt || echo "No errors found"
```

Expected: "No errors found"

**Step 10: Record package changes**

```bash
git diff package.json > package-changes.txt
cat package-changes.txt
```

Expected: See version changes

**Step 11: Commit changes**

```bash
cd ../..
git add Samples/spe-ocr-sample/
git commit -m "chore(samples): update spe-ocr-sample dependencies

- Resolved vulnerabilities (counts from audit output)
- [Lockfile regenerated | Lockfile preserved]
- Build and startup verified

Major package updates:
[List from package-changes.txt]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

**Rollback Step (use if build/start fails):**

```bash
cd Samples/spe-ocr-sample
git checkout HEAD -- package.json package-lock.json
npm install
npm run build:backend && npm run build-cre && echo "Rollback successful"
git commit -m "chore(samples): revert spe-ocr-sample dependency updates

Updates caused build failure: [describe error]
Reverted to working state for stability.

Issue: [specific error]
Future work: Investigate fix for [problematic package]"
```

---

## Task 4: Update asp.net-webservice Sample

**Files:**
- Modify: `Samples/asp.net-webservice/Demo.csproj`

**Step 1: Check for vulnerable packages**

```bash
cd Samples/asp.net-webservice
dotnet list package --vulnerable 2>&1 | tee vulnerable-packages.txt
cat vulnerable-packages.txt
```

Expected: List of packages with known vulnerabilities (if any)

**Step 2: Check for outdated packages**

```bash
dotnet list package --outdated 2>&1 | tee outdated-packages.txt
cat outdated-packages.txt
```

Expected: List of packages with available updates

**Step 3: Update vulnerable packages first**

```bash
# For each vulnerable package identified in Step 1:
# dotnet add package <PackageName>
# Example:
# dotnet add package Microsoft.AspNetCore.Mvc
```

Expected: Package references updated in Demo.csproj

**Step 4: Update other outdated packages with security relevance**

```bash
# For packages related to authentication, HTTP, security:
# dotnet add package <PackageName>
```

Expected: Additional package references updated

**Step 5: Clean and build**

```bash
dotnet clean
dotnet build 2>&1 | tee build-output.txt
echo "Exit code: $?"
```

Expected: Exit code 0, build succeeds with 0 errors

**Step 6: Run verification**

```bash
timeout 10s dotnet run 2>&1 | tee start-output.txt
```

Expected: Application starts and listens on https://localhost:57750

**Step 7: Check for errors in output**

```bash
grep -i "error\|fail\|exception" start-output.txt build-output.txt || echo "No errors found"
```

Expected: "No errors found" or only startup info messages

**Step 8: Record package changes**

```bash
git diff Demo.csproj > package-changes.txt
cat package-changes.txt
```

Expected: See package version changes in XML format

**Step 9: Commit changes**

```bash
cd ../..
git add Samples/asp.net-webservice/
git commit -m "chore(samples): update asp.net-webservice dependencies

- Resolved vulnerabilities in NuGet packages
- Updated packages to latest compatible versions
- Build and startup verified

Packages updated:
[List from package-changes.txt]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created successfully

**Rollback Step (use if build/run fails):**

```bash
cd Samples/asp.net-webservice
git checkout HEAD -- Demo.csproj
dotnet clean
dotnet build && echo "Rollback successful"
git commit -m "chore(samples): revert asp.net-webservice dependency updates

Updates caused build failure: [describe error]
Reverted to working state for stability.

Issue: [specific error]
Future work: Investigate fix for [problematic package]"
```

---

## Task 5: Update CLAUDE.md with Any Issues Found

**Files:**
- Modify: `CLAUDE.md` (only if patterns or unfixable issues emerged)

**Step 1: Check if any unfixable vulnerabilities were documented**

Review commit messages from Tasks 1-4 to see if any rollbacks occurred or vulnerabilities were documented as unfixable.

**Step 2: If issues found, update CLAUDE.md Common Issues section**

```markdown
## Common Issues

### Dependency Vulnerabilities (Updated 2026-03-06)

**Known Issues:**
- [sample-name]: [package-name] vulnerability requires [breaking-change] to resolve
- Pattern: [describe cross-sample issue if applicable]

**Workarounds:**
- [Describe temporary mitigation if applicable]
```

**Step 3: Commit CLAUDE.md updates if modified**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with dependency update findings

Document known issues from dependency update process:
- [List specific issues]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Expected: Commit created if CLAUDE.md was modified, otherwise skip

---

## Task 6: Final Verification and Summary

**Step 1: Verify all samples were updated**

```bash
git log --oneline -10 | grep "chore(samples): update"
```

Expected: See 4 commit entries (or fewer if rollbacks occurred)

**Step 2: Run final audit check on all samples**

```bash
cd Samples/spa-azurefunction && npm audit | head -20
cd ../spe-typescript-react-azurefunction && npm audit | head -20
cd ../spe-ocr-sample && npm audit | head -20
cd ../asp.net-webservice && dotnet list package --vulnerable
cd ../..
```

Expected: Significantly reduced vulnerability counts compared to initial state

**Step 3: Document summary of work completed**

Create a summary showing:
- Number of vulnerabilities resolved per sample
- Any remaining critical/high vulnerabilities with explanation
- Total packages updated across all samples

**Step 4: Clean up temporary files**

```bash
find Samples -name "audit-*.json" -delete
find Samples -name "build-*.txt" -delete
find Samples -name "start-*.txt" -delete
find Samples -name "package-changes.txt" -delete
find Samples -name "vulnerable-packages.txt" -delete
find Samples -name "outdated-packages.txt" -delete
```

Expected: Temporary audit and output files removed

---

## Notes

**Key Principles:**
- Each sample is independently updated and verified
- Commits are created after each successful sample update
- Rollback procedures are in place for build failures
- YAGNI: Only update what's necessary for security, not wholesale package modernization
- DRY: Same process applied to each sample with sample-specific adjustments

**Error Handling:**
- If a sample fails to build after updates, use rollback step
- Document the issue in commit message
- Continue to next sample (don't block entire process)
- Update CLAUDE.md if patterns emerge

**Testing:**
- Build verification is primary test
- Startup verification ensures no runtime exceptions
- No functional testing required per design decision (build verification only)
