# React Flow v11 → @xyflow/react v12 Upgrade — Design

Date: 2026-07-20
Branch: `chore/upgrade-reactflow-v12`

## Goal

Migrate from `reactflow@11.11.4` (deprecated package name) to `@xyflow/react@12` and
adopt a locked set of v12 features. Keep behavior intact; add targeted UX improvements.

## Current state

- `package.json` pins `"reactflow": "latest"` → resolves to `11.11.4`.
- ~18 files import from `reactflow`.
- Import surface: `ReactFlow`, `Controls`, `Background`, `Panel`, `MiniMap` (imported but
  never rendered), `useReactFlow`, `useNodesState`, `useEdgesState`, `Handle`, `Position`,
  `NodeResizer`, `BaseEdge`, `getSmoothStepPath`, `EdgeLabelRenderer`, `getNodesBounds`,
  `ReactFlowProvider`, `addEdge`, and types (`Node`, `Edge`, `Connection`, `NodeProps`,
  `EdgeProps`, `ReactFlowInstance`, `FitViewOptions`).
- App's own `updateEdge`/`updateEdges` are local helpers → NO clash with v12's
  `onEdgeUpdate` → `onReconnect` rename. App does not use RF edge reconnection.

## Part 1 — Migration (breaking changes)

1. `package.json`: replace `"reactflow": "latest"` with `"@xyflow/react": "^12"` (pin real
   resolved version after install; no `latest`). Run `npm install`.
2. CSS import: `reactflow/dist/style.css` → `@xyflow/react/dist/style.css`
   (`components/compromise-canvas.tsx:14`).
3. Rewrite every `from "reactflow"` / `from 'reactflow'` import → `@xyflow/react` across all
   ~18 files.
4. Generic type changes:
   - `NodeProps<NodeData>` → `NodeProps<Node<NodeData>>` (v12 `NodeProps` takes the Node
     type, not the data type). Sites: `components/custom-node.tsx:95`,
     `components/labeled-group-node.tsx:9`.
   - `EdgeProps<EdgeData>` → `EdgeProps<Edge<EdgeData>>`. Site: `components/custom-edge.tsx:33`.
   - `useNodesState`/`useEdgesState` are generic in v12; supply the node/edge types where used.
5. `getNodesBounds(nodes)` — verify v12 signature (now `(nodes, options?)`). Plain call in
   `components/download-button.tsx:75` should still work; confirm return shape.
6. Measured dimensions: `node.data.width/height` in `custom-node.tsx` are CUSTOM data fields,
   unaffected by the v12 `node.width/height` → `node.measured.*` change. Confirm no code reads
   RF-measured `node.width`/`node.height` directly.

## Part 2 — Features (locked set)

1. **Per-side fitView padding.** Replace `fitViewOptions={{ padding: 0.2 }}` with per-side
   padding that clears the left asset library and right properties panel. Apply to both the
   `<ReactFlow fitView>` prop and the `handleFitView` handler
   (`hooks/use-compromise-canvas-handlers.ts`).
2. **Native dark mode.** Add `colorMode="dark"` to `<ReactFlow>`. Keep existing hardcoded
   colors; RF CSS vars fill gaps.
3. **connectionDragThreshold.** Add prop (~5–10px) to `<ReactFlow>` to ignore accidental
   micro-drag edge creation.
4. **EdgeToolbar quick actions.** Floating toolbar on the selected edge with Edit (open
   properties), Highlight, Delete. New component `components/edge-toolbar.tsx` rendered from
   `components/custom-edge.tsx` when `selected`. Wire to existing `handleSelectEdge`,
   `handleHighlightEdge`, and edge-delete logic. Toolbar anchored at edge midpoint
   (`labelX`/`labelY` from `getSmoothStepPath`).

## Part 3 — Cleanup

- Remove the dead `MiniMap` import (`components/compromise-canvas.tsx:12`). MiniMap is not
  rendered and not in scope.

## Not in scope

- Node connection counts (`useNodeConnections`/`useNodesData`).
- Keyboard a11y / focus.
- Rendering a MiniMap.

## Verification

- `npm install` succeeds; `@xyflow/react` resolved and pinned.
- `npm run build` clean (no TS errors).
- `npm run lint` clean.
- Manual QA: drag nodes; create + delete edges; fitView clears both side panels; edge toolbar
  Edit/Highlight/Delete work; dark theme visually intact; no accidental edges on tiny drags.
