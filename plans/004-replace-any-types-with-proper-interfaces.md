# Plan 004: Replace loose `any` typing with proper interfaces

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- hooks/use-compromise-canvas-state.ts hooks/use-compromise-canvas-handlers.ts lib/types.ts components/compromise-canvas.tsx`
> If any of these files changed significantly since this plan was written, compare the
> affected sections against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (can run in parallel)
- **Category**: correctness
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

The codebase uses `any` type in 12+ critical locations: `reactFlowInstance`, incident log state, toast options, generic node/edge handlers. Using `any` defeats TypeScript's type safety and IDE support. It hides bugs that type checking would catch (e.g., wrong field names, missing null checks). Replacing `any` with proper interfaces (already mostly defined in `lib/types.ts`) makes the code safer and easier to refactor.

## Current state

**Relevant files:**
- `hooks/use-compromise-canvas-state.ts` — reactFlowInstance, incidentLog typed as `any` or `any[]`
- `hooks/use-compromise-canvas-handlers.ts` — many function parameters typed as `any`
- `components/compromise-canvas.tsx` — lines 270, 274 use `as any` type assertions
- `lib/types.ts` — contains proper interface definitions for most data types

**Current `any` usage:**

1. `hooks/use-compromise-canvas-state.ts:23`:
```typescript
const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
```

2. `hooks/use-compromise-canvas-state.ts:38`:
```typescript
const [incidentLog, setIncidentLog] = useState<any[]>(() => { ... })
```

3. `hooks/use-compromise-canvas-handlers.ts:12, 23, 26`:
```typescript
incidentLog: any[]
setIncidentLog: (log: any[] | ((prev: any[]) => any[])) => void
toast: (options: any) => void
```

4. `components/compromise-canvas.tsx:270, 274`:
```typescript
connectionLineType={"smoothstep" as any}
variant={"dots" as any}
```

5. Multiple handler functions in properties-panel.tsx use `any` parameter types

**Proper types available in lib/types.ts:**
```typescript
// Already defined, can reuse:
export type ActivityLogEntry { ... }
export type IncidentLogEntry { ... }
export interface DisplaySettings { ... }
// etc.
```

**Toast type** — need to check the toast hook's expected shape:
```bash
grep -A 10 "export const useToast" components/ui/use-toast.ts
```

**ReactFlow instance type** — ReactFlow already provides a type:
```typescript
import type { ReactFlowInstance } from "reactflow"
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run build` or `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `hooks/use-compromise-canvas-state.ts` — fix reactFlowInstance and incidentLog types
- `hooks/use-compromise-canvas-handlers.ts` — fix function parameter types (incidentLog, setIncidentLog, toast)
- `components/compromise-canvas.tsx` — replace `as any` assertions
- `components/properties-panel.tsx` — replace `any` in handler function parameters (if present)

**Out of scope** (do NOT touch):
- `lib/types.ts` — type definitions are fine as-is
- Test files (don't exist yet)
- Other files

## Git workflow

- Branch: `improve/004-replace-any-types`
- Commit per file; message style: `refactor: replace any types with proper interfaces in <file>`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Fix reactFlowInstance type in use-compromise-canvas-state.ts

Import ReactFlowInstance type and replace `any`.

**Current code** (`hooks/use-compromise-canvas-state.ts:1–23`):
```typescript
import { useState, useCallback, useEffect, useMemo } from "react"
import { useNodesState, useEdgesState, type Node, type Edge } from "reactflow"
// ... more imports ...

const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
```

**Target code**:
```typescript
import { useState, useCallback, useEffect, useMemo } from "react"
import { useNodesState, useEdgesState, type Node, type Edge, type ReactFlowInstance } from "reactflow"
// ... more imports ...

const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
```

**Verify**: `grep "useState.*ReactFlowInstance" hooks/use-compromise-canvas-state.ts` → shows new type

### Step 2: Fix incidentLog type in use-compromise-canvas-state.ts

Define or import an IncidentLogEntry type and use it.

**Current code** (`hooks/use-compromise-canvas-state.ts:38`):
```typescript
const [incidentLog, setIncidentLog] = useState<any[]>(() => { ... })
```

From `lib/types.ts` (already defined):
```typescript
export interface IncidentLogEntry {
  id: string
  timestamp: string
  description: string
  category: "Response" | "Observation" | "Meeting" | "Containment" | "Eradication" | "Recovery" | "Acquisition" | "Other"
}
```

**Target code**:
```typescript
import type { IncidentLogEntry } from "@/lib/types"  // Add this import

// ...

const [incidentLog, setIncidentLog] = useState<IncidentLogEntry[]>(() => { ... })
```

**Verify**: `grep "useState.*IncidentLogEntry" hooks/use-compromise-canvas-state.ts` → shows new type

### Step 3: Fix function parameter types in use-compromise-canvas-handlers.ts

Update the interface `UseCompromiseCanvasHandlersProps` to use proper types for `incidentLog`, `setIncidentLog`, and `toast`.

**Current code** (`hooks/use-compromise-canvas-handlers.ts:7–26`):
```typescript
interface UseCompromiseCanvasHandlersProps {
  // ...
  incidentLog: any[]
  setIncidentLog: (log: any[] | ((prev: any[]) => any[])) => void
  toast: (options: any) => void
}
```

For `incidentLog` and `setIncidentLog`, use IncidentLogEntry from Step 2.

For `toast`, check what shape is expected:
```bash
grep -B 5 -A 10 "export const useToast\|export function useToast" components/ui/use-toast.ts
```

Typical toast shape (from shadcn/ui):
```typescript
interface Toast {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
  variant?: "default" | "destructive"
}
```

**Target code**:
```typescript
import type { IncidentLogEntry } from "@/lib/types"
import type { Toast } from "@/components/ui/use-toast"  // or wherever Toast is defined

interface UseCompromiseCanvasHandlersProps {
  // ...
  incidentLog: IncidentLogEntry[]
  setIncidentLog: (log: IncidentLogEntry[] | ((prev: IncidentLogEntry[]) => IncidentLogEntry[])) => void
  toast: (options: Omit<Toast, 'id' | 'open'>) => void  // adjust per actual API
}
```

**Verify**: `grep -A 5 "incidentLog:" hooks/use-compromise-canvas-handlers.ts` → shows IncidentLogEntry[] type

### Step 4: Fix type assertions in compromise-canvas.tsx

Replace `as any` assertions. These are at lines 270 and 274.

**Current code** (`components/compromise-canvas.tsx:270, 274`):
```typescript
connectionLineType={"smoothstep" as any}
// ...
<Background variant={"dots" as any} gap={12} size={1} color="#4B5563" />
```

Check ReactFlow prop types:
- `connectionLineType` expects a `ConnectionLineType` from reactflow
- `variant` on Background expects `"dots" | "cross" | "line"`

**Target code**:
```typescript
connectionLineType="smoothstep"
// ...
<Background variant="dots" gap={12} size={1} color="#4B5563" />
```

If TypeScript still complains, import the exact type:
```typescript
import { type ConnectionLineType } from "reactflow"
```

And use as:
```typescript
const connectionType: ConnectionLineType = "smoothstep"
// then
connectionLineType={connectionType}
```

**Verify**: `grep "as any" components/compromise-canvas.tsx` → returns no matches

### Step 5: Fix handler function parameters in properties-panel.tsx (if present)

Find all `any` type parameters in handler functions.

```bash
grep -n "value: any\|field:.*any\|index:.*any" components/properties-panel.tsx
```

Replace with proper types from lib/types.ts.

Example (from earlier audit):
```typescript
const handleNodeChange = (field: keyof NodeData, value: any) => { ... }
```

**Target**:
```typescript
const handleNodeChange = (field: keyof NodeData, value: string | number | boolean | string[] | object) => { ... }
```

Or more precisely, determine the value type from the field:
```typescript
const handleNodeChange = <K extends keyof NodeData>(field: K, value: NodeData[K]) => { ... }
```

Go through each handler and apply similar fixes. This requires careful reading of what values are actually passed.

**Verify**: `grep ": any" components/properties-panel.tsx | wc -l` → reports 0 (or significantly fewer)

### Step 6: Rebuild and lint

Run full build and lint to verify all types are satisfied.

**Verify**:
```bash
npm run build
```
Expected: exit 0, no TypeScript errors

```bash
npm run lint
```
Expected: exit 0

### Step 7: Commit changes per file

```bash
git add hooks/use-compromise-canvas-state.ts
git commit -m "refactor: replace any types with ReactFlowInstance and IncidentLogEntry"

git add hooks/use-compromise-canvas-handlers.ts
git commit -m "refactor: replace any types in handler props with proper interfaces"

git add components/compromise-canvas.tsx
git commit -m "refactor: remove as any type assertions"

git add components/properties-panel.tsx  # if modified
git commit -m "refactor: replace any in handler functions with proper types"
```

**Verify**: `git log --oneline -4` shows all commits

## Test plan

No new tests needed. Type safety is verified by TypeScript compiler. Manual check:

1. Open the app in browser
2. Create a diagram with all node and edge types
3. Edit nodes and edges — verify no console errors
4. Save and load — verify incident log loads correctly

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep ": any" hooks/use-compromise-canvas-state.ts` → no matches (or only in comments)
- [ ] `grep ": any" hooks/use-compromise-canvas-handlers.ts` → no matches
- [ ] `grep " as any" components/compromise-canvas.tsx` → no matches
- [ ] `grep ": any" components/properties-panel.tsx` → fewer than before (ideally 0)
- [ ] `npm run build` exits 0, no TypeScript errors
- [ ] `npm run lint` exits 0
- [ ] No files outside scope are modified
- [ ] Commits created with messages matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- TypeScript errors appear after replacements (types don't match callers' usage; report the error and file)
- A proper type doesn't exist for something that was `any` (may need to define a new interface in lib/types.ts — report this as out-of-scope and stop)
- More than 3 files need type fixes beyond the ones listed (indicates broader refactoring needed; report)

## Maintenance notes

- This change makes future refactoring of these modules much safer; type errors will catch regressions
- If new callbacks or handlers are added, apply the same pattern: avoid `any` in function signatures — always type parameters and return values
- Consider running `npm run build` before committing any changes as a habit
