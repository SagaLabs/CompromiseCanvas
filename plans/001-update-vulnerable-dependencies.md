# Plan 001: Update dompurify and flatted to fix security vulnerabilities

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- package.json package-lock.json`
> If either file changed since this plan was written, compare the versions
> in the live code against the plan excerpt before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

The project uses dompurify ≤3.4.10 (has 8+ reported XSS and prototype pollution CVEs) and flatted ≤3.4.1 (unbounded recursion DoS vulnerability). These are direct dependencies in the browser app that parse untrusted user input (diagrams loaded from localStorage, imported JSON files). Exploitation could corrupt user diagrams, leak local data, or hang the browser. Updating to latest patches removes these vectors with no code changes.

## Current state

**Relevant files:**
- `package.json` — dependency manifest; dompurify and flatted versions are pinned
- `package-lock.json` — lock file; must be updated after package.json changes

**Current versions (from package.json as of 2c03057):**
```json
"dompurify": "<=3.4.10",   // Multiple XSS/Prototype Pollution CVEs
"flatted": "<=3.4.1",      // Unbounded recursion DoS CVE
```

**Vulnerabilities from `npm audit`:**
- dompurify <=3.4.10: GHSA-v2wj-7wpq-c8vv, GHSA-cjmm-f4jc-qw8r, GHSA-cj63-jhhr-wcxv, GHSA-39q2-94rc-95cp, GHSA-h7mw-gpvr-xq4m, GHSA-crv5-9vww-q3g8, GHSA-v9jr-rg53-9pgp, GHSA-h8r8-wccr-v5f2, GHSA-x4vx-rjvf-j5p4, GHSA-76mc-f452-cxcm, GHSA-hpcv-96wg-7vj8, GHSA-r47g-fvhr-h676, GHSA-vxr8-fq34-vvx9, GHSA-gvmj-g25r-r7wr, GHSA-rp9w-3fw7-7cwq, GHSA-cmwh-pvxp-8882
- flatted <=3.4.1: GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install deps | `npm install` | exit 0 |
| Audit check | `npm audit --audit-level=moderate` | exit 0 (no moderate/high/critical advisories) |
| Typecheck | `npm run typecheck` (if exists) or `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `package.json` — version constraints only
- `package-lock.json` — auto-generated; do NOT edit manually; let npm regenerate

**Out of scope** (do NOT touch):
- `package-lock.json` — do not edit manually; npm will regenerate it
- Any source code files — no code changes needed

## Git workflow

- Branch: `improve/001-update-vulnerable-dependencies`
- Commit style: follow repo convention from `git log --oneline -5` (appears to be semantic: `type: message`)
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Update dompurify to latest patch

Edit `package.json` and change the dompurify constraint from `"<=3.4.10"` to a recent stable version. Check npm registry for latest (as of plan write date, 3.5.0+ is available and patches all reported CVEs).

**Current excerpt** (`package.json:48`):
```json
"dompurify": "<=3.4.10",
```

**Target excerpt**:
```json
"dompurify": "^3.5.0",
```

Replace `<=3.4.10` with `^3.5.0` (caret allows patch+minor updates, standard npm practice).

**Verify**: `grep "dompurify" package.json` → shows `"^3.5.0"`

### Step 2: Update flatted to latest patch

Edit `package.json` and change flatted constraint from `"<=3.4.1"` to a recent stable version (3.3.1+ or later patches the DoS vulnerability).

**Current excerpt** (`package.json:65`):
```json
"flatted": "<=3.4.1",
```

**Target excerpt**:
```json
"flatted": "^3.3.1",
```

Replace `<=3.4.1` with `^3.3.1`.

**Verify**: `grep "flatted" package.json` → shows `"^3.3.1"`

### Step 3: Reinstall dependencies

Run `npm install` to fetch new versions and regenerate lock file.

**Verify**: 
```bash
npm install
```
Expected: exit 0, no error messages. New versions of dompurify and flatted appear in `package-lock.json` with newer versions.

Confirm versions:
```bash
npm ls dompurify flatted
```
Expected: dompurify@3.5.0+ and flatted@3.3.1+ listed.

### Step 4: Verify no security advisories remain

Run audit with current threshold.

**Verify**:
```bash
npm audit --audit-level=moderate
```
Expected: exit 0. No "moderate" or higher advisories for dompurify or flatted.

### Step 5: Build to ensure no regressions

Run the build command to catch any incompatibilities.

**Verify**:
```bash
npm run build
```
Expected: exit 0, no TypeScript errors, build completes successfully.

### Step 6: Commit changes

Commit the package.json and package-lock.json updates.

```bash
git add package.json package-lock.json
git commit -m "security: update dompurify and flatted to fix CVEs"
```

**Verify**: `git log --oneline -1` shows the new commit.

## Test plan

No new tests needed — dependency updates do not change business logic. Existing build and type checking serve as verification.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `package.json` shows dompurify ^3.5.0+ and flatted ^3.3.1+
- [ ] `npm install` exits 0
- [ ] `npm audit --audit-level=moderate` exits 0 (no dompurify/flatted advisories)
- [ ] `npm run build` exits 0
- [ ] No files outside scope (package.json, package-lock.json) are modified
- [ ] Commit created with message matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm audit` still shows dompurify or flatted CVEs after update (may indicate upstream not patched; report to maintainer)
- Build fails after upgrade (may indicate breaking change in dependency; report error and current versions)
- `package-lock.json` merge conflicts occur (stop and report; coordinator should resolve)

## Maintenance notes

- These are foundational dependencies; check npm registry periodically (set reminder quarterly) for new advisories.
- If reports emerge that these newer versions have *new* CVEs, escalate immediately.
- No code changes tie into this dependency update, so no review needed on compatibility.
