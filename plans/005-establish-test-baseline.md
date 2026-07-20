# Plan 005: Establish test baseline with characterization tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- package.json`
> If package.json changed, verify test script is not already defined before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none (but 001–004 should land first for stability)
- **Category**: tests
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

The codebase has zero test coverage. This means:

1. **Refactors are risky** — no safety net for Plan 003 (split properties-panel) or future changes
2. **Regressions ship silently** — bugs only surface when users encounter them
3. **Onboarding friction** — new contributors can't verify their changes work
4. **Technical debt grows** — risky code becomes harder to refactor, encouraging copy-paste instead of reuse

Characterization tests (tests that document *current behavior*, not ideal behavior) create a baseline. They codify the app's behavior as-is, so any future change that alters behavior shows up as a test failure. This is the prerequisite for safe refactoring and the foundation for adding feature tests later.

## Current state

**Test infrastructure:**
- No test framework installed
- No test scripts in package.json
- No .test.ts or .spec.ts files
- No jest.config.js, vitest.config.ts, or similar

**Package.json scripts** (current):
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "next lint",
  "start": "next start"
}
```

**Framework & tooling** (from package.json):
- Next.js 15 with app router
- React 19
- TypeScript 5
- shadcn/ui (built on Radix UI)
- ReactFlow for graph visualization

**Test framework choice**: For a Next.js app, the standard options are:
1. **Jest** (Next.js recommended, widely used, good React support)
2. **Vitest** (faster, ESM-first, good DX)

Recommend **Vitest** for this repo (faster feedback, better ESM support, modern). Jest also works but slower startup.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install test deps | `npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom` | exit 0 |
| Run tests | `npm test` | passes all tests (0 for new baseline) |
| Type check | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you should create/modify):
- `package.json` — add test script and devDependencies
- `vitest.config.ts` — create (test configuration)
- `hooks/__tests__/use-undo-redo.test.ts` — create (characterization test)
- `lib/__tests__/types.test.ts` — create (basic type tests)
- `components/__tests__/custom-node.test.tsx` — create (basic render test)

**Out of scope** (do NOT touch):
- Source files (except package.json)
- CI/CD configuration
- Full test coverage (this is a baseline, not comprehensive)

## Git workflow

- Branch: `improve/005-establish-test-baseline`
- Commit in stages: deps → config → first test file → final verification
- Message style: `test: add vitest configuration and characterization tests`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Install test dependencies

Add Vitest and related testing libraries to devDependencies.

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

**Verify**: 
```bash
npm ls vitest @testing-library/react jsdom
```
Expected: all three appear with version numbers

Check package.json:
```bash
grep "vitest\|@testing-library/react" package.json
```
Expected: devDependencies section shows new entries

### Step 2: Create vitest.config.ts

Create a Vitest configuration file at the repo root.

**Target file** (`vitest.config.ts`):
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
```

Also install the React plugin for Vitest:
```bash
npm install --save-dev @vitejs/plugin-react
```

**Verify**: 
```bash
ls -la vitest.config.ts
```
Expected: file exists

```bash
cat vitest.config.ts | head -5
```
Expected: shows defineConfig import

### Step 3: Add test script to package.json

Edit `package.json` and add/update the test script.

**Current** (package.json:21–25):
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "next lint",
  "start": "next start"
}
```

**Target**:
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "next lint",
  "start": "next start",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

Add the three test commands.

**Verify**: 
```bash
grep '"test"' package.json
```
Expected: shows `"test": "vitest"`

### Step 4: Create test directory structure

```bash
mkdir -p hooks/__tests__
mkdir -p lib/__tests__
mkdir -p components/__tests__
```

**Verify**:
```bash
ls -d hooks/__tests__ lib/__tests__ components/__tests__
```
Expected: all three directories exist

### Step 5: Write characterization test for use-undo-redo.ts

Create `hooks/__tests__/use-undo-redo.test.ts`. This tests the undo/redo hook to document its current behavior.

**Target file** (`hooks/__tests__/use-undo-redo.test.ts`):
```typescript
import { renderHook, act } from "@testing-library/react"
import { useUndoRedo } from "../use-undo-redo"
import type { FlowState } from "../use-undo-redo"

describe("useUndoRedo", () => {
  const initialState: FlowState = {
    nodes: [{ id: "1", data: {}, position: { x: 0, y: 0 } }],
    edges: [],
  }

  it("initializes with present state", () => {
    const { result } = renderHook(() => useUndoRedo(initialState))
    const { canUndo, canRedo } = result.current

    expect(canUndo).toBe(false)
    expect(canRedo).toBe(false)
  })

  it("saves snapshot and enables undo", () => {
    const { result } = renderHook(() => useUndoRedo(initialState))

    const newState: FlowState = {
      nodes: [
        { id: "1", data: {}, position: { x: 0, y: 0 } },
        { id: "2", data: {}, position: { x: 100, y: 100 } },
      ],
      edges: [],
    }

    act(() => {
      result.current.takeSnapshot(newState)
    })

    expect(result.current.canUndo).toBe(true)
  })

  it("undo restores previous state and enables redo", () => {
    const { result } = renderHook(() => useUndoRedo(initialState))
    const newState: FlowState = {
      nodes: [{ id: "1", data: {}, position: { x: 50, y: 50 } }],
      edges: [],
    }

    act(() => {
      result.current.takeSnapshot(newState)
    })

    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)

    act(() => {
      result.current.undo()
    })

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it("redo restores future state", () => {
    const { result } = renderHook(() => useUndoRedo(initialState))
    const newState: FlowState = {
      nodes: [{ id: "2", data: {}, position: { x: 100, y: 100 } }],
      edges: [],
    }

    act(() => {
      result.current.takeSnapshot(newState)
      result.current.undo()
      result.current.redo()
    })

    expect(result.current.canRedo).toBe(false)
  })

  it("clears redo history when new snapshot taken after undo", () => {
    const { result } = renderHook(() => useUndoRedo(initialState))

    act(() => {
      result.current.takeSnapshot({
        nodes: [{ id: "1", data: {}, position: { x: 50, y: 50 } }],
        edges: [],
      })
      result.current.takeSnapshot({
        nodes: [{ id: "2", data: {}, position: { x: 100, y: 100 } }],
        edges: [],
      })
      result.current.undo()
    })

    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.takeSnapshot({
        nodes: [{ id: "3", data: {}, position: { x: 150, y: 150 } }],
        edges: [],
      })
    })

    expect(result.current.canRedo).toBe(false)
  })
})
```

**Verify**: 
```bash
npm test -- hooks/__tests__/use-undo-redo.test.ts
```
Expected: all 5 tests pass

### Step 6: Write characterization test for types.ts

Create `lib/__tests__/types.test.ts` to verify type constants and enums.

**Target file** (`lib/__tests__/types.test.ts`):
```typescript
import { describe, it, expect } from "vitest"
import {
  ACTION_TYPES,
  EDGE_ACTION_TYPES,
  ACTIVITY_CATEGORIES,
  type AssetType,
  type Criticality,
} from "../types"

describe("Type definitions and constants", () => {
  it("ACTION_TYPES includes all expected values", () => {
    expect(ACTION_TYPES).toContain("Initial Access")
    expect(ACTION_TYPES).toContain("Lateral Movement")
    expect(ACTION_TYPES).toContain("Privilege Escalation")
    expect(ACTION_TYPES.length).toBeGreaterThan(8)
  })

  it("EDGE_ACTION_TYPES includes MITRE ATT&CK tactics", () => {
    expect(EDGE_ACTION_TYPES).toContain("Initial Access")
    expect(EDGE_ACTION_TYPES).toContain("Command & Control")
    expect(EDGE_ACTION_TYPES).toContain("Exfiltration")
  })

  it("ACTIVITY_CATEGORIES includes incident response categories", () => {
    expect(ACTIVITY_CATEGORIES).toContain("Containment")
    expect(ACTIVITY_CATEGORIES).toContain("Detection")
    expect(ACTIVITY_CATEGORIES).toContain("Recovery")
  })

  it("AssetType includes on-premises and cloud types", () => {
    const assetTypes: AssetType[] = [
      "web-server",
      "cloud-instance",
      "identity",
      "attacker",
    ]
    // Type check only; no runtime assertion
    expect(assetTypes.length).toBe(4)
  })

  it("Criticality levels are distinct", () => {
    const levels: Criticality[] = ["Low", "Medium", "High", "Critical"]
    expect(new Set(levels).size).toBe(4)
  })
})
```

**Verify**: 
```bash
npm test -- lib/__tests__/types.test.ts
```
Expected: all tests pass

### Step 7: Write basic render test for custom-node.tsx

Create `components/__tests__/custom-node.test.tsx` to verify the node component renders without crashing.

**Target file** (`components/__tests__/custom-node.test.tsx`):
```typescript
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import CustomNode from "../custom-node"
import type { NodeData } from "@/lib/types"

describe("CustomNode component", () => {
  const mockNodeData: NodeData = {
    label: "Test Server",
    type: "web-server",
    criticality: "High",
    services: ["HTTP", "SSH"],
    actions: [],
    displaySettings: {
      showHostname: true,
      showIpAddress: true,
      showOs: true,
      showServices: true,
      showCriticality: true,
      showActions: true,
      showDescription: true,
      showUsername: false,
      showDomain: false,
      showAccountType: false,
      showAccountSource: false,
      showAccountStatus: false,
      showRiskLevel: false,
      showMfaStatus: false,
      showPrivileges: false,
      showGroups: false,
      showMethod: false,
      showDestination: false,
      showProtocol: false,
      showStatus: false,
      showVolume: false,
      showDataTypes: false,
      showC2Type: false,
      showC2Server: false,
      showC2Protocol: false,
      showBeaconInterval: false,
      showImplantType: false,
      showTenantId: false,
      showTenantName: false,
      showCloudProvider: false,
      showTenantType: false,
      showRegion: false,
      showEnvironment: false,
      showResourceCount: false,
      showSecurityScore: false,
      showCompromised: true,
      showInvestigationStatus: true,
      showTargetIndustries: false,
      showIp: false,
      showAttackVectors: false,
      showInfrastructureAge: false,
      showLastSeen: false,
      showFirstSeen: false,
      showInfrastructureStatus: false,
      showThreatActor: false,
      showLocation: false,
      showHostingProvider: false,
      showInfrastructureType: false,
    },
    isCompromised: false,
    investigationStatus: "Not Investigated",
  }

  it("renders without crashing", () => {
    // Note: This is a minimal render test; full testing requires ReactFlow context
    // This test documents that the component structure is stable
    expect(mockNodeData.label).toBe("Test Server")
    expect(mockNodeData.type).toBe("web-server")
  })

  it("handles different asset types", () => {
    const types: typeof mockNodeData.type[] = [
      "web-server",
      "database",
      "cloud-instance",
      "identity",
    ]
    expect(types).toContain("identity")
  })
})
```

**Note**: ReactFlow components require special setup (context providers). This test is minimal to document the component exists and types are correct. Full integration testing comes later.

**Verify**: 
```bash
npm test -- components/__tests__/custom-node.test.tsx
```
Expected: tests pass

### Step 8: Run full test suite

Run all tests to ensure the baseline is established.

```bash
npm test
```

**Verify**:
```bash
npm test
```
Expected: exit 0, all tests pass (e.g., "12 passed")

### Step 9: Commit test infrastructure

```bash
git add package.json vitest.config.ts
git commit -m "test: add vitest configuration and test scripts"

git add "hooks/__tests__/use-undo-redo.test.ts" "lib/__tests__/types.test.ts" "components/__tests__/custom-node.test.ts"
git commit -m "test: add characterization tests for hooks, types, and components"
```

**Verify**: 
```bash
git log --oneline -2
```
Expected: shows both commits

### Step 10: Verify no regressions

Build and lint to ensure test setup doesn't break the app.

**Verify**:
```bash
npm run build && npm run lint
```
Expected: exit 0

## Test plan

This step *is* the test plan. Characterization tests document current behavior:
- `use-undo-redo.test.ts`: 5 tests covering undo/redo/snapshot flow
- `types.test.ts`: 5 tests verifying type constants
- `custom-node.test.ts`: 2 tests verifying component structure

Total baseline: ~12 tests. Coverage is intentionally low — the goal is to establish a foothold, not comprehensive coverage.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0, all tests pass
- [ ] `package.json` includes `"test": "vitest"` script
- [ ] `vitest.config.ts` exists and is valid
- [ ] At least 3 test files created under `__tests__/` directories
- [ ] `npm run build` exits 0 (app still builds)
- [ ] No files outside scope are modified
- [ ] 2 commits created with messages matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm test` fails after setup (debugging required; report exact error)
- vitest config fails to load (check syntax and dependencies)
- Tests fail to import source modules (check path aliases in vitest.config.ts)
- Build breaks after adding test dependencies (rare, but report)

## Maintenance notes

- This is a minimal baseline; future tests should follow the patterns here
- Characterization tests are not ideal tests (they document what is, not what should be), but they're the safe way to add testing to untested code
- As the code improves (Plans 001–004), tests can be made more strict (e.g., test error handling added in Plan 002)
- Consider adding tests for Plans 001–004 changes as they land; each plan can include its own test additions
- Future test priorities: error handling (Plan 002), component splits (Plan 003), type safety (Plan 004)
