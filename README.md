# Vantage UI

A React 19 + Vite + Tailwind 3 UI SDK for a **Domain-Driven Command Center Platform**:
observability surfaces that stay legible from three viewing distances — the **NOC wall**
(L1), the **triage drawer** (L2), and the **SRE workbench** (L3).

## What's in the box

- **npm workspace** (root = workspace root; run everything from here). One package today: `packages/ui-sdk`.
- `packages/ui-sdk/src` — the SDK: archetype canvases (FLOW, TOPOLOGY, STATISTICAL, RULE_GATE, HEATMAP),
  drawer/tile primitives, the plugin registry (`plugin-registry.ts`), and the mock state layer
  (`mocks/`) that precomputes health, narratives, and drill payloads.
- `packages/ui-sdk/src/App.tsx` — the preview harness app (`src/main.tsx` mounts it).
- `packages/ui-sdk/src/tokens` — the design-token layer: `variables.css` (palette, status colors,
  distance-based type scale, geometry), `domain-component.css` (component classes), and
  `tailwind.config.js` (token → Tailwind mappings).
- `docs/` — the viewing-model field guide, the terminology glossary, and the design-system audit
  (`docs/design-system-audit.md`). Its before/after screenshot evidence under
  `docs/assets/audit/` is git-ignored and regenerated locally — the audit text is the deliverable.

## Quick start

```bash
npm install          # once, at the repo root (hoisted node_modules)
npm run dev          # Vite dev server → http://localhost:5173 (auto-increments if busy)
npm run typecheck    # tsc --noEmit — run this before calling a change done
npm run build        # tsup bundle of @platform/ui-sdk (cjs + esm + d.ts)
```

The SDK is consumed as `@platform/ui-sdk` with token entrypoints exported
(`@platform/ui-sdk/tokens` and `@platform/ui-sdk/tokens/tailwind`).

## How this UI is verified

Visual changes are checked in a real browser, not by reading code: a headless Playwright
script (piped to `node` from the repo root) walks every surface at **1920×1080** (wall) and
**1440×900** (desk) and captures screenshots — see `AGENTS.md` for the recipe and the repo's
standing rules (display-only components, one live drillable instance per entity, the
depth-cap budget). Read `AGENTS.md`, `docs/terminology.md`, and
`docs/viewing-model-field-guide.md` before touching Shell navigation or canvases.

## Conventions that bite

- Components **display** health/narratives computed upstream (the `mocks/` layer); they never
  derive or branch on archetype names (Principle 1).
- Use design **tokens** (`tokens/`), not raw colors or ad-hoc geometry. The token audit
  (`docs/design-system-audit.md`) lists what each token is for and what the system cannot
  express yet.
- `dist/`, `node_modules/`, `.env*`, `.pi/` (agent state), `scratch.txt`, and
  `docs/assets/` (screenshot evidence) are git-ignored on purpose.
