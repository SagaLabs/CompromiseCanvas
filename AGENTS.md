# AGENTS.md

This file applies to the whole repository. It is guidance for coding agents working on Compromise Canvas.

## What this project is

Compromise Canvas is a browser-only visual editor for mapping cyberattack paths and incident-response timelines. Users drag security assets onto a React Flow canvas, connect them with ATT&CK-style actions, annotate nodes and edges, keep an incident log, load templates, and export JSON, PNG, or PDF reports.

There is no application backend or database. Diagram, incident-log, and custom-template data stays in browser memory or `localStorage`; exports are generated in the browser.

## Stack and entry points

- Next.js 15 App Router, React 19, and strict TypeScript.
- React Flow owns graph rendering and interaction.
- Tailwind CSS 3 and shadcn/Radix primitives provide styling and UI controls.
- `app/page.tsx` is a client entry point and wraps `components/compromise-canvas.tsx` in `ReactFlowProvider`.
- `app/layout.tsx` supplies fonts, theme handling, metadata, and the global layout.
- `app/globals.css` is the active global stylesheet. `styles/globals.css` is a tracked legacy duplicate and is not imported by the app.

## Repository map

- `components/compromise-canvas.tsx`: top-level composition of the editor. Keep orchestration here and move reusable behavior into hooks/components.
- `hooks/use-compromise-canvas-state.ts`: canonical live canvas/UI state plus undo/redo, copy/paste, and keyboard integration.
- `hooks/use-reactflow-callbacks.ts`: React Flow interaction callbacks such as drop, connect, select, update, and delete.
- `hooks/use-compromise-canvas-handlers.ts`: commands such as save/load/import/export, template loading, clearing, alignment, and panel toggles.
- `hooks/use-undo-redo.ts` and `hooks/use-copy-paste.ts`: history and in-memory clipboard mechanics.
- `components/custom-node.tsx`, `components/custom-edge.tsx`, and `components/labeled-group-node.tsx`: graph renderers registered by type name.
- `components/properties-panel.tsx`: editing UI for the selected graph element. It is large and tightly coupled to `NodeData` and `EdgeData`; make narrow changes.
- `components/asset-library.tsx`: asset catalog and drag source.
- `components/template-panel.tsx` and `lib/templates.ts`: custom-template UI and built-in template fixtures.
- `components/timeline-modal.tsx`, `components/incident-log-panel.tsx`, `components/export-report-button.tsx`, and `components/download-button.tsx`: timeline/log and browser-side exports.
- `lib/types.ts`: shared domain model. Prefer these types over new local lookalikes or `any`.
- `lib/utils/compromise-canvas-constants.ts`: default node/edge display settings, initial graph state, z-index policy, and IDs.
- `lib/utils/compromise-canvas-utils.tsx`: edge-type creation, layout helpers, and compromised-host CSV generation.
- `components/ui/`: shadcn-style primitives. Change these only for behavior or styling that should affect every consumer.
- `public/`: logo and favicon assets.

## State and schema rules

- Treat `nodes` and `edges` as one logical graph state. A node deletion must also remove its connected edges.
- For user graph edits, go through `updateNodes`/`updateEdges` so history snapshots are recorded. Direct `setNodes`/`setEdges` is reserved for coordinated replacements such as load, import, clear, or undo/redo; reset history when replacing the whole graph.
- React Flow callbacks may close over graph state. When changing history, paste, delete, or multi-step updates, check for stale-state and double-snapshot behavior.
- Graph renderer keys are contracts: normal assets use `customNode`, groups use `labeledGroupNode`, and annotated edges use `customEdge`. Selection/deletion logic also relies on these strings.
- Preserve layering from `LAYER_Z_INDEX`: groups behind edges, ordinary nodes above them, selected items highest.
- Keep timestamps as ISO-8601 strings. Incident-log datetime inputs are local in the UI and converted to ISO for storage.
- Keep node and edge IDs unique across drops, copies, imported files, and templates.
- When adding or changing a domain field, update all affected surfaces: `lib/types.ts`, creation defaults, property editing, node/edge rendering, built-in templates, save/load hydration, JSON import/export, timeline/report output, and display settings.
- Display-setting defaults currently exist in more than one place (`lib/utils/compromise-canvas-constants.ts`, `components/template-panel.tsx`, and `lib/templates.ts`). Keep them synchronized unless the task explicitly consolidates them.
- Saved browser flow uses the `compromise-canvas-flow` key; the incident log uses `compromise-canvas-incident-log`; custom templates use `compromise-canvas-templates`. Treat these keys and exported JSON shape as user data contracts.
- New load/import behavior should tolerate older documents by supplying missing defaults. Validate untrusted JSON before replacing current state, preserve the current diagram on failure, and surface errors through the existing toast pattern.
- Do not introduce server persistence, telemetry, or network transmission without an explicit product decision. The client-only privacy promise is a core feature.

## UI conventions

- Browser APIs (`window`, `document`, `localStorage`, `FileReader`, canvas/image/PDF APIs) belong in client components, event handlers, effects, or guarded initializers.
- Copy/paste uses an in-memory application clipboard, not the operating-system clipboard.
- Use the `@/` path alias for cross-directory imports and relative imports for nearby component siblings, matching surrounding code.
- Reuse `components/ui` primitives, Lucide icons, CSS variables, and the existing `cn` helper instead of adding another component or styling system.
- Duplicate toast and mobile hooks exist under both `hooks/` and `components/ui/`, and the mobile variants expose different names. Follow current imports; do not consolidate or swap them incidentally.
- The application is dark-theme-first and desktop-canvas-first. Preserve the mobile warning, keyboard shortcuts, focus behavior, labels, and `aria-*` attributes when editing controls.
- Avoid expensive recreation during dragging. Keep node type maps stable, memoize edge types/renderers where appropriate, and avoid rebuilding the full graph for purely visual changes.
- There is no enforced formatter. Follow the touched file's local quote/semicolon style and avoid repository-wide formatting churn.

## Install and run

The README and CI-oriented workflow use the npm command surface:

```bash
npm ci
npm run dev
npm run build
npm run start
```

The repository tracks both `package-lock.json` and `pnpm-lock.yaml` but does not declare a `packageManager`; the pnpm lockfile currently contains settings but no dependency graph. Do not update both lockfiles incidentally. Use the package manager requested by the task; otherwise prefer npm to match the README and complete lockfile, and update only `package-lock.json`. Use `npm install` only when intentionally changing dependencies. Do not hand-edit lockfiles.

Two Next config files are also tracked. The current production build applies `next.config.mjs`, which skips lint and type errors and enables unoptimized images; `next.config.ts` contains the package-import optimization. Do not assume both configurations are merged. If changing Next configuration, first establish which behavior is intended and avoid maintaining conflicting copies.

## Validation

Run checks proportional to the change and report exactly what passed or failed.

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Known baseline at the time this file was written:

- There is no automated test suite or `test` script.
- `npm run build` succeeds, but the active Next config explicitly skips type validation and linting; a green build is not a full correctness check.
- `npx tsc --noEmit` has existing errors in asset-library keyboard handling, timeline edge typing, the sidebar mobile-hook import, and copy/paste edge typing.
- `npm run lint` currently fails in the deprecated `next lint` path with the installed flat ESLint configuration.

Do not hide new failures behind those baselines. For a touched area, run the closest available static check and manually exercise the relevant browser flow. A canvas/state change should normally smoke-test: add and connect assets, edit node/edge properties, select/delete, copy/paste, undo/redo, save/load, JSON round-trip, template load, incident-log/timeline behavior, and any affected export. Also check an empty canvas and malformed or older imported data where relevant.

## Change discipline

- Inspect `git status` before editing and preserve unrelated or uncommitted user work.
- Keep changes scoped; this codebase contains several large, coupled files where opportunistic refactors create broad regression risk.
- Do not edit generated build output such as `.next/`.
- Do not silently weaken TypeScript, lint, data validation, or accessibility to get a check green.
- If behavior or setup changes, update `README.md` and this file when their guidance would otherwise become inaccurate.
