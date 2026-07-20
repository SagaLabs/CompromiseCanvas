# Plan 002: Add error handling for localStorage JSON.parse failures

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- hooks/use-compromise-canvas-state.ts hooks/use-compromise-canvas-handlers.ts components/export-report-button.tsx components/template-panel.tsx`
> If any of these files changed since this plan was written, compare the
> affected JSON.parse lines against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

The app persists diagrams and incident logs to localStorage as JSON strings. When users load these, the code calls `JSON.parse()` without try-catch wrapping. If localStorage data is corrupted, manually edited by browser dev tools, or partially written, the parse throws an uncaught error and crashes the entire app with a blank screen. Users lose the ability to use the tool until they clear localStorage — poor UX and data loss. Adding try-catch with fallback to empty/default state ensures the app is resilient to corrupted local data.

## Current state

**Relevant files:**
- `hooks/use-compromise-canvas-state.ts` — initializes incident log from localStorage; JSON.parse unprotected at line 41
- `hooks/use-compromise-canvas-handlers.ts` — loads diagram from localStorage; JSON.parse unprotected at line 70; also at line 105 (file import handler has try-catch — use it as pattern)
- `components/export-report-button.tsx` — loads incident log; JSON.parse unprotected (check exact line)
- `components/template-panel.tsx` — loads templates from localStorage; JSON.parse unprotected (check exact line)

**Unprotected JSON.parse sites:**

1. `hooks/use-compromise-canvas-state.ts:41`:
```typescript
const storedLog = localStorage.getItem("compromise-canvas-incident-log")
return storedLog ? JSON.parse(storedLog) : []
```

2. `hooks/use-compromise-canvas-handlers.ts:70` (in handleLoad):
```typescript
const flowString = localStorage.getItem("compromise-canvas-flow")
if (flowString) {
  const flow = JSON.parse(flowString)  // <-- unprotected
```

3. `components/export-report-button.tsx` (check via grep):
```bash
grep -n "JSON.parse" components/export-report-button.tsx
```

4. `components/template-panel.tsx` (check via grep):
```bash
grep -n "JSON.parse" components/template-panel.tsx
```

**Good pattern to follow** (`hooks/use-compromise-canvas-handlers.ts:110` — file import handler):
```typescript
try {
  const jsonData = JSON.parse(e.target?.result as string)
  // use jsonData
} catch (error) {
  toast({
    title: "Import failed",
    description: "Invalid JSON format",
    variant: "destructive",
  })
  return
}
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run lint` or `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `hooks/use-compromise-canvas-state.ts` — wrap JSON.parse calls in try-catch
- `hooks/use-compromise-canvas-handlers.ts` — wrap JSON.parse calls in try-catch
- `components/export-report-button.tsx` — wrap JSON.parse calls in try-catch
- `components/template-panel.tsx` — wrap JSON.parse calls in try-catch

**Out of scope** (do NOT touch):
- Test files (none exist yet; skip)
- Any other components

## Git workflow

- Branch: `improve/002-json-parse-error-handling`
- Commit per file; message style: `fix: add error handling for localStorage JSON.parse in <file>`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Fix use-compromise-canvas-state.ts (incident log initialization)

Locate line 41 where incident log is loaded. Wrap JSON.parse in try-catch.

**Current code** (`hooks/use-compromise-canvas-state.ts:38-42`):
```typescript
const [incidentLog, setIncidentLog] = useState<any[]>(() => {
  if (typeof window === "undefined") return []
  const storedLog = localStorage.getItem("compromise-canvas-incident-log")
  return storedLog ? JSON.parse(storedLog) : []
})
```

**Target code**:
```typescript
const [incidentLog, setIncidentLog] = useState<any[]>(() => {
  if (typeof window === "undefined") return []
  const storedLog = localStorage.getItem("compromise-canvas-incident-log")
  if (!storedLog) return []
  try {
    return JSON.parse(storedLog)
  } catch (error) {
    console.error("Failed to parse incident log from localStorage:", error)
    // Clear corrupted data and return empty log
    localStorage.removeItem("compromise-canvas-incident-log")
    return []
  }
})
```

**Verify**: `grep -A 10 "compromise-canvas-incident-log" hooks/use-compromise-canvas-state.ts | head -15` → shows try-catch block present

### Step 2: Fix use-compromise-canvas-handlers.ts (diagram load)

Locate the handleLoad function (around line 67–70). Wrap the main JSON.parse in try-catch. Follow the pattern from the file import handler (around line 110).

**Current code** (`hooks/use-compromise-canvas-handlers.ts:67-71`):
```typescript
const handleLoad = useCallback(() => {
  const flowString = localStorage.getItem("compromise-canvas-flow")
  if (flowString) {
    const flow = JSON.parse(flowString)  // <-- unprotected
    if (flow.nodes && flow.edges) {
```

**Target code**:
```typescript
const handleLoad = useCallback(() => {
  const flowString = localStorage.getItem("compromise-canvas-flow")
  if (!flowString) return
  try {
    const flow = JSON.parse(flowString)
    if (flow.nodes && flow.edges) {
      // existing code below
```

Keep the rest of the handleLoad function unchanged. The try-catch should wrap only the parse and the immediate use of flow.

Full wrapped version:
```typescript
const handleLoad = useCallback(() => {
  const flowString = localStorage.getItem("compromise-canvas-flow")
  if (!flowString) {
    toast({
      title: "No saved diagram",
      description: "No previously saved diagram found",
      variant: "default",
    })
    return
  }
  try {
    const flow = JSON.parse(flowString)
    if (flow.nodes && flow.edges) {
      const nodesWithDisplaySettings = flow.nodes.map((node: any) => ({
        // ... rest of existing code (lines 73-96)
      }))
      // ... rest of function
    }
  } catch (error) {
    console.error("Failed to parse saved diagram:", error)
    toast({
      title: "Load failed",
      description: "Saved diagram is corrupted. Starting fresh.",
      variant: "destructive",
    })
    localStorage.removeItem("compromise-canvas-flow")
  }
}, [reactFlowInstance, setNodes, setEdges, toast, ...])
```

**Verify**: `grep -A 5 "const handleLoad" hooks/use-compromise-canvas-handlers.ts` → shows try-catch wrapping the parse

### Step 3: Fix export-report-button.tsx (incident log read)

Find all JSON.parse calls in this file.

```bash
grep -n "JSON.parse" components/export-report-button.tsx
```

Wrap each with try-catch. Likely pattern (check actual code):
```typescript
const incidentLogRaw = localStorage.getItem("compromise-canvas-incident-log")
const incidentLog: IncidentLogEntry[] = incidentLogRaw ? JSON.parse(incidentLogRaw) : [];
```

**Target pattern**:
```typescript
const incidentLogRaw = localStorage.getItem("compromise-canvas-incident-log")
let incidentLog: IncidentLogEntry[] = []
if (incidentLogRaw) {
  try {
    incidentLog = JSON.parse(incidentLogRaw)
  } catch (error) {
    console.error("Failed to parse incident log:", error)
  }
}
```

**Verify**: `grep -B 2 -A 3 "JSON.parse" components/export-report-button.tsx` → shows try-catch blocks

### Step 4: Fix template-panel.tsx (template load/save)

Find all JSON.parse calls in this file.

```bash
grep -n "JSON.parse" components/template-panel.tsx
```

Wrap each with try-catch. Look for patterns like:
```typescript
const savedTemplates = localStorage.getItem("compromise-canvas-templates")
const userTemplates = savedTemplates ? JSON.parse(savedTemplates) : []
```

**Target pattern**:
```typescript
const savedTemplates = localStorage.getItem("compromise-canvas-templates")
let userTemplates = []
if (savedTemplates) {
  try {
    userTemplates = JSON.parse(savedTemplates)
  } catch (error) {
    console.error("Failed to parse templates:", error)
    localStorage.removeItem("compromise-canvas-templates")
  }
}
```

**Verify**: `grep -B 2 -A 3 "JSON.parse" components/template-panel.tsx` → shows try-catch blocks

### Step 5: Verify builds

Run build to catch TypeScript errors or syntax issues.

**Verify**:
```bash
npm run build
```
Expected: exit 0, no errors.

### Step 6: Commit all changes

Create a single commit for all JSON.parse error handling changes.

```bash
git add hooks/use-compromise-canvas-state.ts hooks/use-compromise-canvas-handlers.ts components/export-report-button.tsx components/template-panel.tsx
git commit -m "fix: add error handling for corrupted localStorage data (JSON.parse protection)"
```

**Verify**: `git log --oneline -1` shows the commit.

## Test plan

No automated tests exist yet (see Plan 005). Manual verification:

1. Open DevTools → Storage → LocalStorage → find `compromise-canvas-*` keys
2. Edit one to invalid JSON (e.g., change `}` to `}``)
3. Refresh the page — app should load without crashing, show toast about corruption, and reset that storage key
4. Verify incident log, templates, and diagram still function normally after refresh

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "JSON.parse" hooks/use-compromise-canvas-state.ts` shows all parses inside try blocks
- [ ] `grep -n "JSON.parse" hooks/use-compromise-canvas-handlers.ts` shows all parses inside try blocks
- [ ] `grep -n "JSON.parse" components/export-report-button.tsx` shows all parses inside try blocks
- [ ] `grep -n "JSON.parse" components/template-panel.tsx` shows all parses inside try blocks
- [ ] `npm run build` exits 0
- [ ] No files outside scope are modified
- [ ] Commit created with message matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Additional JSON.parse calls are found in files not listed (search full codebase and report locations)
- Build fails with TypeScript errors after changes
- The try-catch change alters control flow such that essential code after the parse is skipped (review logic carefully)

## Maintenance notes

- This fix applies the same error-handling pattern used in the file-import handler (line 110 of use-compromise-canvas-handlers.ts) — consistency is important for maintainability.
- Future localStorage reads (if any are added) should follow this pattern automatically.
- Consider centralizing localStorage access into a utility function (out of scope for this plan, but a future refactor candidate).
