# Instructions for Qwen
You are a decisive, highly accurate assistant. When processing your thoughts:
- Do not use phrases like "Wait," "Let me rethink," "Hold on," or "Is that right?".
- Trust your first principles and follow a direct, linear path to the solution.
- Only correct your course if you encounter a definitive mathematical or logical contradiction, not out of generalized doubt.
- Maintain a confident, analytical tone in your internal reasoning.


# Vantage UI

A React 19 + Vite + Tailwind 3 UI SDK for a Domain-Driven Command Center Platform.
Read `ui-vantage-blueprint.md` (architecture — authoritative) before building
components; `starting-prompt.md` is the original draft intent/specs and loses any
conflict against the blueprint.

## Layout (paths relative to the repo root)

- npm-workspaces monorepo; all code lives in `packages/ui-sdk` (package
  `@platform/ui-sdk`). One hoisted `node_modules` at the repo root.
- `packages/ui-sdk/src/App.tsx` IS the Shell (path-based context stack). `src/main.tsx`
  mounts it as the dev-harness preview app; `src/index.ts` re-exports the SDK surface.
- `src/types.ts` — domain contracts (`EnrichedEntity`, `DetailExtract`,
  `ArchetypePayload`, `SubEntityManifest`, `DEPTH_CAP = 3`).
- `src/plugin-registry.ts` — id-keyed registry (`get(processId)`,
  `getSubEntity(processId, entityId)`); seeded by `src/mocks/pluginSeeds.ts`.
- `src/components/primitives/` — the three viewing primitives + `DrawerShell`
  (OverviewTile, DetailDrawer, DrawerShell, ArchetypeCanvas).
- `src/components/archetypes/` — the five canvas LAYOUTS (Flow, Stat, Topology,
  RuleGate, Heatmap); layout-agnostic mount via `ArchetypeCanvas`.
- `src/components/SmartLaunchers.tsx` — deep-link launcher slot (data → URL injection).
- `src/mocks/` — the mock backend = the "upstream": `processStateMocks.ts` derives
  ALL health/detail/blast data; `pluginSeeds.ts` seeds the registry from that data.
- `src/tokens/` — `variables.css` (single source of raw values), `tailwind.config.js`
  (token→class mappings — a token class without a mapping is a DEAD class, not
  allowed), `domain-component.css` (component classes), `tailwind.css` (dev-harness
  directives). `packages/ui-sdk/tailwind.config.js` (package root) re-exports the
  token config for Vite/PostCSS. `vite.config.mts` sits at the package root.

## Commands (from the repo root)

- `npm run dev` — Vite dev harness on http://localhost:5173 (picks the next port if
  busy; read the log). Delegates to `npm run dev -w @platform/ui-sdk`
  (config: `packages/ui-sdk/vite.config.mts`).
- `npm run typecheck` — `tsc --noEmit` inside the workspace (also delegated via
  `-w @platform/ui-sdk`). Run it before saying a change is done.

## Checking the UI in a browser (Playwright)

Verify visual changes in a real browser. Do not claim a UI change works from reading
code alone.

1. Start the dev server in the background, then read the URL from its log.
2. Run a script by piping it to node (`node - <<'EOF' ... EOF`) from the repo root
   or from `packages/ui-sdk`, so `require('playwright')` resolves from the hoisted
   `node_modules`. A script file saved in `/tmp` will not find it. Don't put
   scripts in `src/`:

   ```js
   const { chromium } = require('playwright');
   (async () => {
     const browser = await chromium.launch();           // headless
     const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
     const errors = [];
     page.on('console', m => m.type() === 'error' && errors.push(m.text()));
     page.on('pageerror', e => errors.push(String(e)));
     await page.goto('http://localhost:5173');
     await page.waitForSelector('#root > *');
     await page.screenshot({ path: '/tmp/ui.png', fullPage: true });
     console.log(errors.length ? errors : 'no console errors');
     await browser.close();
   })();
   ```

3. Look at the screenshot with the Read tool, and report any console errors.
4. Stop the dev server when done.

Chromium and its headless shell are already installed. If launch fails with
`Executable doesn't exist`, tell the user; do not try to download browsers.

## Conventions

- **Viewing modes ≠ data tiers.** Overview / detail / deep are MODES that apply at
  any scale. `OverviewTile` has two densities (`wall` = process tile, `desk` =
  sub-entity drill chip). `DetailDrawer` renders ANY entity's `DetailExtract`
  (process-scale drawer = 480px/`z-drawer`; entity-scale = 340px/`z-detail`, both
  token-driven). `DrawerShell` owns the ONE global Esc handler + ONE focus manager —
  the Shell mounts at most one drawer at a time, so Esc pops exactly one hop.
  `ArchetypeCanvas` mounts ANY entity's deep payload via registry lookup.
- **Principle 1 — never compute health, per primitive.** OverviewTile only maps a
  precomputed `health`/per-reading status to `var(--status-*)` token classes
  (display-only). DetailDrawer displays the upstream narrative, blast radius and
  per-metric `status` verbatim. ArchetypeCanvas resolves *which* canvas paints by
  id lookup (`getSubEntity` → process `DeepComponent` → visible fallback) — never
  by derivation, never by archetype branching.
- **Recursion + depth cap.** Entity chains recurse to depth 3 (`DEPTH_CAP`,
  `src/types.ts`), enforced generically in the Shell at the drill affordance
  (trail-length + `entity.depth` guards). Chains may terminate earlier — depth is
  a ceiling, not a guarantee; continuation/termination is DATA
  (`EnrichedEntity.deep?`), never code.
- **Single source of truth.** No per-archetype `if`s and no archetype-name
  literals in the Shell or shared code — layout resolution is a data lookup
  (`ARCHETYPE_COMPONENTS[payload.archetype]`, kept in `mocks/pluginSeeds.ts`).
  `entityKind` is a display hint only.
- **Tokens.** Token classes/CSS vars only — zero raw palette colors (status colors
  travel via `var(--status-*)` templates or `bg-/text-/border-status-*` classes).
  Drawer geometry uses the geometry tokens (`--z-drawer`, `--z-detail-drawer`,
  `--drawer-width-*`), never hard-coded `z-[…]`/px values.
- Visual consistency is judged by ROLE (viewing mode + scale), not by historic
  tier name; density/shape changes belong only to primitives whose role changed.
- Don't commit `dist/`, `node_modules/` or `.env`.
