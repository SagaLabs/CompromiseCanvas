# Plan 003: Split properties-panel.tsx into focused sub-components

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 2c03057..HEAD -- components/properties-panel.tsx`
> If this file changed significantly since this plan was written, compare the
> structure against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001, 002 (can run in parallel if confident in refactoring)
- **Category**: tech-debt
- **Planned at**: commit `2c03057`, 2026-07-08
- **Issue**: none

## Why this matters

`components/properties-panel.tsx` is 2593 lines — 15% of the entire codebase in a single component. It handles node editing, edge editing, identity data, exfiltration data, C2 data, cloud tenant data, and attacker data all in one file. This creates:

1. **Hard to test** — once tests exist, this component is untestable without mocking the world
2. **Maintenance friction** — small edits require scrolling through 2500 lines; unclear which state lives where
3. **Performance risk** — entire component re-renders on any prop change; memoization is hard at this scale
4. **Code reuse barrier** — edit panels for different asset types can't be used elsewhere

Splitting into focused sub-components (IdentityEditPanel, ExfiltrationEditPanel, etc.) makes each testable, reusable, and maintainable while keeping the parent PropertiesPanel as a thin dispatcher.

## Current state

**Main file:**
- `components/properties-panel.tsx` (2593 lines) — single component handling all asset types

**Structure overview** (from code inspection):
- Lines 1–66: imports and type definitions
- Lines 70–2593: single `PropertiesPanel` component with nested render logic

**Key asset-type handlers** (inline in the component):
- Lines ~500–800: Node editing (generic)
- Lines ~800–1000: Identity editing (IdentityData fields)
- Lines ~1000–1200: Exfiltration editing (ExfiltrationData fields)
- Lines ~1200–1400: C2 editing (CommandControlData fields)
- Lines ~1400–1600: Cloud Tenant editing (CloudTenantData fields)
- Lines ~1600–1800: Attacker editing (AttackerData fields)
- Lines ~1800–2100: Edge editing
- Lines ~2100–2593: UI panels and layout

**Repo conventions** (from existing code):
- Components in `components/` directory
- Sub-components use descriptive names: `custom-node.tsx`, `custom-edge.tsx`, `asset-library.tsx`
- Props pass through callbacks and setters for state mutation
- Each component manages its own useState if needed

**Related types** (from `lib/types.ts`):
```typescript
export interface IdentityData { ... }
export interface ExfiltrationData { ... }
export interface CommandControlData { ... }
export interface CloudTenantData { ... }
export interface AttackerData { ... }
export type NodeData = { ... identityData?: IdentityData; ... }
```

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run build` | exit 0, no errors |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope** (the only files you should create/modify):
- `components/properties-panel.tsx` — refactor into a dispatcher component
- `components/properties-panels/identity-edit-panel.tsx` — create (new)
- `components/properties-panels/exfiltration-edit-panel.tsx` — create (new)
- `components/properties-panels/command-control-edit-panel.tsx` — create (new)
- `components/properties-panels/cloud-tenant-edit-panel.tsx` — create (new)
- `components/properties-panels/attacker-edit-panel.tsx` — create (new)
- `components/properties-panels/node-edit-panel.tsx` — create (new; generic node fields)
- `components/properties-panels/edge-edit-panel.tsx` — create (new)

**Out of scope** (do NOT touch):
- Any hook files
- Test files
- Other component files
- Type definitions (lib/types.ts)

## Git workflow

- Branch: `improve/003-split-properties-panel`
- Commit per sub-component creation + final refactor of parent; message style: `refactor: extract <component> from properties-panel` then `refactor: properties-panel now dispatches to sub-components`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Create properties-panels sub-directory

```bash
mkdir -p components/properties-panels
```

**Verify**: `ls -d components/properties-panels` → shows directory created

### Step 2: Extract IdentityEditPanel

Create `components/properties-panels/identity-edit-panel.tsx`. This component handles all IdentityData editing. Copy the relevant UI sections from properties-panel.tsx.

**Target component structure:**
```typescript
import { useState, useEffect } from "react"
import type { IdentityData, DisplaySettings } from "@/lib/types"
// ... imports for UI components

interface IdentityEditPanelProps {
  identityData: IdentityData | undefined
  displaySettings: DisplaySettings
  onIdentityChange: (field: keyof IdentityData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}

export function IdentityEditPanel({
  identityData,
  displaySettings,
  onIdentityChange,
  onDisplaySettingsChange,
}: IdentityEditPanelProps) {
  if (!identityData) return null

  return (
    <div className="space-y-4">
      {/* All identity-related fields from the original component */}
      {/* Username, domain, account type, privileges, groups, MFA, etc. */}
    </div>
  )
}
```

Extract all fields for IdentityData from properties-panel.tsx (roughly lines 1000–1200 or wherever identity editing lives) and move into this component. Keep the exact same UI and handlers.

**Verify**: `wc -l components/properties-panels/identity-edit-panel.tsx` → reports ~200–300 lines

### Step 3: Extract ExfiltrationEditPanel

Create `components/properties-panels/exfiltration-edit-panel.tsx`. Same pattern as Step 2.

**Target structure:**
```typescript
interface ExfiltrationEditPanelProps {
  exfiltrationData: ExfiltrationData | undefined
  displaySettings: EdgeDisplaySettings
  onExfiltrationChange: (field: keyof ExfiltrationData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}

export function ExfiltrationEditPanel({ ... }) {
  if (!exfiltrationData) return null
  return (
    <div className="space-y-4">
      {/* Method, destination, protocol, data types, volume, encryption, etc. */}
    </div>
  )
}
```

**Verify**: `wc -l components/properties-panels/exfiltration-edit-panel.tsx` → reports ~200–300 lines

### Step 4: Extract CommandControlEditPanel

Create `components/properties-panels/command-control-edit-panel.tsx`.

**Target structure:**
```typescript
interface CommandControlEditPanelProps {
  c2Data: CommandControlData | undefined
  displaySettings: EdgeDisplaySettings
  onC2Change: (field: keyof CommandControlData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}

export function CommandControlEditPanel({ ... }) {
  if (!c2Data) return null
  return (
    <div className="space-y-4">
      {/* C2 type, server, protocol, beacon interval, implant type, etc. */}
    </div>
  )
}
```

**Verify**: `wc -l components/properties-panels/command-control-edit-panel.tsx` → reports ~200–300 lines

### Step 5: Extract CloudTenantEditPanel

Create `components/properties-panels/cloud-tenant-edit-panel.tsx`.

```typescript
interface CloudTenantEditPanelProps {
  tenantData: CloudTenantData | undefined
  displaySettings: DisplaySettings
  onTenantChange: (field: keyof CloudTenantData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}
```

**Verify**: `wc -l components/properties-panels/cloud-tenant-edit-panel.tsx` → reports ~200–300 lines

### Step 6: Extract AttackerEditPanel

Create `components/properties-panels/attacker-edit-panel.tsx`.

```typescript
interface AttackerEditPanelProps {
  attackerData: AttackerData | undefined
  displaySettings: DisplaySettings
  onAttackerChange: (field: keyof AttackerData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}
```

**Verify**: `wc -l components/properties-panels/attacker-edit-panel.tsx` → reports ~200–300 lines

### Step 7: Extract NodeEditPanel (generic node fields)

Create `components/properties-panels/node-edit-panel.tsx` for non-asset-type-specific node fields (label, criticality, services, actions, etc.).

```typescript
interface NodeEditPanelProps {
  nodeData: NodeData
  onNodeChange: (field: keyof NodeData, value: any) => void
  onActionAdd: () => void
  onActionRemove: (index: number) => void
  onActionChange: (index: number, field: keyof NodeAction, value: any) => void
}
```

**Verify**: `wc -l components/properties-panels/node-edit-panel.tsx` → reports ~300–400 lines

### Step 8: Extract EdgeEditPanel

Create `components/properties-panels/edge-edit-panel.tsx` for edge (connection) editing.

```typescript
interface EdgeEditPanelProps {
  edgeData: EdgeData
  onEdgeChange: (field: keyof EdgeData, value: any) => void
  onDisplaySettingsChange: (field: string, value: boolean) => void
}
```

**Verify**: `wc -l components/properties-panels/edge-edit-panel.tsx` → reports ~200–300 lines

### Step 9: Refactor PropertiesPanel to dispatcher pattern

Rewrite `components/properties-panel.tsx` to be a thin dispatcher that imports all sub-components and renders the appropriate one based on `selectedElement.data.type` or edge type.

**Target structure** (new properties-panel.tsx):
```typescript
"use client"

import { useState, useEffect } from "react"
import type { NodeData, EdgeData, CustomNode, CustomEdge } from "@/lib/types"
import { NodeEditPanel } from "./properties-panels/node-edit-panel"
import { IdentityEditPanel } from "./properties-panels/identity-edit-panel"
import { ExfiltrationEditPanel } from "./properties-panels/exfiltration-edit-panel"
import { CommandControlEditPanel } from "./properties-panels/command-control-edit-panel"
import { CloudTenantEditPanel } from "./properties-panels/cloud-tenant-edit-panel"
import { AttackerEditPanel } from "./properties-panels/attacker-edit-panel"
import { EdgeEditPanel } from "./properties-panels/edge-edit-panel"

interface PropertiesPanelProps {
  selectedElement: CustomNode | CustomEdge | null
  updateNode: (id: string, data: Partial<NodeData>) => void
  updateEdge: (id: string, data: Partial<EdgeData>) => void
  onDelete: () => void
}

export default function PropertiesPanel({
  selectedElement,
  updateNode,
  updateEdge,
  onDelete,
}: PropertiesPanelProps) {
  if (!selectedElement) {
    return <div className="p-4">Select a node or edge to edit properties</div>
  }

  // Determine if it's a node or edge
  const isEdge = selectedElement.type === "customEdge" || "source" in selectedElement

  if (isEdge) {
    // Render EdgeEditPanel
    return (
      <EdgeEditPanel
        edgeData={selectedElement.data as EdgeData}
        onEdgeChange={(field, value) => updateEdge(selectedElement.id, { [field]: value })}
        onDisplaySettingsChange={(field, value) => updateEdge(selectedElement.id, {...})}
      />
    )
  }

  // It's a node; dispatch to appropriate edit panel
  const nodeData = selectedElement.data as NodeData
  return (
    <div className="flex flex-col h-full">
      {/* Common node fields */}
      <NodeEditPanel
        nodeData={nodeData}
        onNodeChange={(field, value) => updateNode(selectedElement.id, { [field]: value })}
        onActionAdd={() => { /* ... */ }}
        onActionRemove={(idx) => { /* ... */ }}
        onActionChange={(idx, field, value) => { /* ... */ }}
      />

      {/* Conditional rendering for asset-type-specific panels */}
      {nodeData.type === "identity" && (
        <IdentityEditPanel
          identityData={nodeData.identityData}
          displaySettings={nodeData.displaySettings}
          onIdentityChange={(field, value) => updateNode(selectedElement.id, {
            identityData: { ...nodeData.identityData, [field]: value }
          })}
          onDisplaySettingsChange={(field, value) => updateNode(selectedElement.id, {
            displaySettings: { ...nodeData.displaySettings, [field]: value }
          })}
        />
      )}

      {nodeData.type === "exfiltration" && (
        <ExfiltrationEditPanel
          exfiltrationData={nodeData.exfiltrationData}
          displaySettings={nodeData.displaySettings}
          onExfiltrationChange={(field, value) => updateNode(selectedElement.id, {
            exfiltrationData: { ...nodeData.exfiltrationData, [field]: value }
          })}
          onDisplaySettingsChange={(field, value) => updateNode(selectedElement.id, {
            displaySettings: { ...nodeData.displaySettings, [field]: value }
          })}
        />
      )}

      {/* ... similar blocks for C2, cloud tenant, attacker ... */}

      {/* Delete button at bottom */}
      <button onClick={onDelete} className="mt-auto">Delete</button>
    </div>
  )
}
```

Reduce properties-panel.tsx from 2593 lines to ~150–200 lines of dispatcher logic.

**Verify**: `wc -l components/properties-panel.tsx` → reports ~150–250 lines; `npm run build` exits 0

### Step 10: Verify all imports and exports

Check that all sub-components are imported and used correctly in the new dispatcher.

**Verify**:
```bash
grep -c "import.*from.*properties-panels" components/properties-panel.tsx
```
Expected: 7 (one per sub-component)

```bash
grep "EditPanel" components/properties-panel.tsx | wc -l
```
Expected: >10 (component usage)

### Step 11: Rebuild and lint

Run full build and lint to ensure no errors.

**Verify**:
```bash
npm run build && npm run lint
```
Expected: exit 0, no errors

### Step 12: Commit changes

First commit: create all sub-components.

```bash
git add components/properties-panels/
git commit -m "refactor: extract edit panels from properties-panel component"
```

Second commit: refactor parent component.

```bash
git add components/properties-panel.tsx
git commit -m "refactor: properties-panel now dispatches to focused sub-components"
```

**Verify**: `git log --oneline -2` shows both commits

## Test plan

No automated tests (yet). Manual verification:

1. Open a diagram with various asset types (identity, exfiltration, C2, cloud tenant, attacker)
2. Click each asset type and verify its edit panel loads and all fields are editable
3. Click edges and verify edge edit panel loads
4. Verify no fields are missing or broken
5. Verify delete button works

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ls components/properties-panels/` shows 7 .tsx files created
- [ ] `wc -l components/properties-panel.tsx` reports <300 lines (was 2593)
- [ ] `npm run build` exits 0, no TypeScript errors
- [ ] `npm run lint` exits 0
- [ ] All previous functionality works (smoke test via manual verification)
- [ ] No files outside scope are modified
- [ ] 2 commits created with messages matching repo convention
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Build fails with "component not exported" or import errors (verify all sub-components export default or named exports correctly)
- Functionality is missing after refactor (e.g., a field that was in the original isn't in the new panels)
- The parent component's logic for determining which panel to show becomes ambiguous (this is a complexity trade-off; report if unclear)

## Maintenance notes

- These sub-components are now independently testable (future test writing can start here)
- If new asset types are added (e.g., a new form of threat), follow this pattern: create a new `<AssetType>EditPanel` and conditionally render it in the dispatcher
- The dispatcher in properties-panel.tsx should remain thin; don't add new logic here — keep it in the focused panels
- Consider future extraction: the dispatcher pattern could scale to a factory/registry if the asset-type list grows much larger
