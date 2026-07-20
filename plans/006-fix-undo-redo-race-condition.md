# Plan 006: Fix undo/redo race condition in state synchronization

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- hooks/use-undo-redo.ts hooks/use-compromise-canvas-state.ts`
> If either file changed significantly since this plan was written, compare the
> key sections (undo/redo functions) against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED
- **Depends on**: 005 (tests help verify fix)
- **Category**: correctness
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

The undo/redo hook has a timing bug: `undo()` and `redo()` return the previous/next state immediately, but `setState()` is asynchronous. If the caller uses the returned state before React has processed the state update, they get stale state. In rapid undo/redo clicks (or under slow device conditions), this causes the wrong state to be applied, and the skipSave ref can miss updates. While rare in practice (requires fast clicking), fixing it makes the code correct and easier to reason about.

## Current state

**Relevant file:**
- `hooks/use-undo-redo.ts` — undo/redo functions with timing issue

**Problem code** (`hooks/use-undo-redo.ts:52–71`):
```typescript
const undo = useCallback(() => {
  if (!canUndo) return { nodes: state.present.nodes, edges: state.present.edges }

  skipSave.current = true  // Flag set synchronously
  
  setState((currentState) => {  // setState is async; state update happens later
    const previous = currentState.past[currentState.past.length - 1]
    const newPast = currentState.past.slice(0, currentState.past.length - 1)

    return {
      past: newPast,
      present: previous,
      future: [currentState.present, ...currentState.future]
    }
  })

  // Return immediately, but state hasn't updated yet!
  const previous = state.past[state.past.length - 1]
  return { nodes: previous.nodes, edges: previous.edges }
}, [canUndo, state.past, state.present])
```

**Issue**: The function returns from closure state (captured when callback was created), not from the setState update. If called rapidly:
1. Call undo() → returns old state, sets skipSave=true
2. Before React processes setState, call undo() again
3. skipSave is already true from step 1, so it's not reset properly
4. State gets out of sync

**How it's used** (`hooks/use-compromise-canvas-state.ts:75–82`):
```typescript
const handleUndo = useCallback(() => {
  const previousState = undo()  // Gets return value (may be stale)
  if (previousState) {
    setNodes(previousState.nodes)  // Applies returned state
    setEdges(previousState.edges)
  }
}, [undo, setNodes, setEdges])
```

The caller applies the returned state immediately, assuming it's correct. But if setState is still in flight, it's wrong.

## Solution approach

Instead of returning the state synchronously, remove the return value and have the caller read state from the updated hook state. The hook's internal state is the source of truth; don't return a copy.

Better pattern:
```typescript
const [state, setState] = useState(...)
const undo = useCallback(() => {
  // Don't return state; instead, setState and let the component read from hook state
  setState((currentState) => {
    // ... mutation logic ...
    return newState
  })
}, [...deps...])

// Caller:
const handleUndo = useCallback(() => {
  undo()  // Just trigger the action; read state from hook after
}, [...deps...])
```

But this requires the caller to re-read state from the hook after undo. Simpler alternative: use a ref to track the "current" state after every setState, so the return value is always correct.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run build` | exit 0 |
| Test | `npm test -- use-undo-redo` | all tests pass |

## Scope

**In scope** (the only files you should modify):
- `hooks/use-undo-redo.ts` — fix undo/redo timing bug

**Out of scope** (do NOT touch):
- Callers of useUndoRedo (they don't need to change if the hook is fixed correctly)
- Test files (already exist from Plan 005; may need updates but follow the existing test)

## Git workflow

- Branch: `improve/006-fix-undo-redo-race-condition`
- Commit message: `fix: resolve undo/redo state synchronization race condition`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Understand the current implementation

Read the full `use-undo-redo.ts` file to understand the state structure and all entry points.

**Verify**: 
```bash
head -100 hooks/use-undo-redo.ts
```
Expected: shows the full hook implementation

### Step 2: Refactor undo/redo to return correct state

The safest fix is to track the current state in a ref that's always updated after setState, then return from that ref instead of the closure state.

**Current code** (`hooks/use-undo-redo.ts:15–50`):
```typescript
export function useUndoRedo(initialState: FlowState) {
  const [state, setState] = useState<UndoRedoState>({...})
  const skipSave = useRef(false)

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const takeSnapshot = useCallback((newState: FlowState) => { ... }, [])

  const undo = useCallback(() => {
    if (!canUndo) return { nodes: state.present.nodes, edges: state.present.edges }
    skipSave.current = true
    setState((currentState) => { ... return newUndoState })
    const previous = state.past[state.past.length - 1]
    return { nodes: previous.nodes, edges: previous.edges }
  }, [canUndo, state.past, state.present])
```

**Target code** (refactored):
```typescript
export function useUndoRedo(initialState: FlowState) {
  const [state, setState] = useState<UndoRedoState>({
    past: [],
    present: initialState,
    future: []
  })
  const skipSave = useRef(false)
  const currentStateRef = useRef(state)  // Track current state in ref

  // Update ref whenever state changes
  useEffect(() => {
    currentStateRef.current = state
  }, [state])

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const takeSnapshot = useCallback((newState: FlowState) => {
    // Don't save state if we're in the middle of an undo/redo operation
    if (skipSave.current) {
      skipSave.current = false
      return
    }

    setState((currentState) => {
      // Don't save if the state hasn't actually changed
      if (
        JSON.stringify(currentState.present.nodes) === JSON.stringify(newState.nodes) &&
        JSON.stringify(currentState.present.edges) === JSON.stringify(newState.edges)
      ) {
        return currentState
      }

      return {
        past: [...currentState.past, currentState.present].slice(-50), // Keep last 50 states
        present: newState,
        future: [], // Clear future when new action is taken
      }
    })
  }, [])

  const undo = useCallback(() => {
    const currentState = currentStateRef.current

    if (currentState.past.length === 0) {
      return { nodes: currentState.present.nodes, edges: currentState.present.edges }
    }

    skipSave.current = true

    const previous = currentState.past[currentState.past.length - 1]
    const newPast = currentState.past.slice(0, currentState.past.length - 1)

    setState({
      past: newPast,
      present: previous,
      future: [currentState.present, ...currentState.future]
    })

    // Return the previous state that we just set
    return { nodes: previous.nodes, edges: previous.edges }
  }, [])

  const redo = useCallback(() => {
    const currentState = currentStateRef.current

    if (currentState.future.length === 0) {
      return { nodes: currentState.present.nodes, edges: currentState.present.edges }
    }

    skipSave.current = true

    const next = currentState.future[0]
    const newFuture = currentState.future.slice(1)

    setState({
      past: [...currentState.past, currentState.present],
      present: next,
      future: newFuture
    })

    return { nodes: next.nodes, edges: next.edges }
  }, [])

  const reset = (newState: FlowState) => {
    setState({
      past: [],
      present: newState,
      future: []
    })
  }

  return {
    canUndo: currentState.past.length > 0,
    canRedo: currentState.future.length > 0,
    takeSnapshot,
    undo,
    redo,
    reset
  }
}
```

**Key changes:**
1. Add `currentStateRef` to always track the current state
2. Update the ref in a useEffect whenever state changes
3. In `undo()` and `redo()`, read from the ref instead of closure state
4. Return the state we're actually about to set (still synchronous from the caller's perspective, but now correct)
5. Simplified logic by removing the useCallback dependencies on `state` (no longer needed since ref is always current)

**Verify**: 
```bash
grep "currentStateRef" hooks/use-undo-redo.ts
```
Expected: shows the ref being used in undo/redo/reset functions

### Step 3: Update the canUndo and canRedo exports

The hook exports canUndo and canRedo, but they're derived from state. Make sure they reflect the ref state correctly.

**Current code**:
```typescript
const canUndo = state.past.length > 0
const canRedo = state.future.length > 0
```

**Target code** (optional but safer):
```typescript
const canUndo = state.past.length > 0
const canRedo = state.future.length > 0
```

Keep as-is (they derive from state, which is updated by setState). The ref is internal implementation detail.

**Verify**: Tests should verify this behavior

### Step 4: Run tests to verify the fix

Run the characterization tests from Plan 005 (if they exist) to ensure undo/redo still works correctly.

```bash
npm test -- use-undo-redo
```

**Expected**: 
- All existing tests pass
- undo() and redo() return correct states
- Rapid undo/redo clicks don't cause state inconsistency

If tests don't exist yet (Plan 005 not done), run a manual test:

```bash
npm run build
```
Expected: exit 0

### Step 5: Verify in the app (manual test)

1. Open the app
2. Create a few nodes (each node creation is a snapshot)
3. Click Undo multiple times rapidly
4. Click Redo multiple times rapidly
5. Verify diagram reverts and restores correctly without glitches

**Expected**: diagram state matches the undo/redo history; no visual anomalies

### Step 6: Commit the fix

```bash
git add hooks/use-undo-redo.ts
git commit -m "fix: resolve undo/redo state synchronization race condition with currentStateRef"
```

**Verify**: 
```bash
git log --oneline -1
```
Expected: shows the commit

## Test plan

Existing characterization tests (from Plan 005) should pass without modification. The bug is subtle (only manifests under rapid clicks), so manual testing is essential:

1. Manual test: Create 5 nodes, undo 3, redo 2, undo 1 — verify correct state at each step
2. Stress test: Rapid clicks (undo/redo spam) — should not crash or corrupt state
3. Browser DevTools: Open React DevTools Profiler, undo/redo, verify state updates match rendered output

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep "currentStateRef" hooks/use-undo-redo.ts` shows ref declared and used
- [ ] `npm test -- use-undo-redo` exits 0 (all tests pass)
- [ ] `npm run build` exits 0
- [ ] Manual test: undo/redo sequence works correctly without state corruption
- [ ] No files outside scope are modified
- [ ] Commit created with message matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Tests fail after the fix (may indicate the fix introduced a regression; report the test output)
- TypeScript errors appear (state ref type mismatch; report error)
- Manual test shows state inconsistency (e.g., undo restores wrong state; report the issue and provide repro steps)

## Maintenance notes

- The ref pattern is safe because refs are always updated synchronously (same render cycle as setState)
- Future state management improvements: consider using Immer for immutable updates, or a more robust state machine library
- This fix makes the hook correct under all conditions, including edge cases like rapid clicks or app backgrounding
