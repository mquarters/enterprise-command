# Terminology & Layers — the disambiguating glossary

The blueprint (`ui-vantage-blueprint.md`) and the field guide
(`viewing-model-field-guide.md`) use words that drift between layers:
"node" names a data row, a payload entry, and a DOM box; "drawer" names a
type, a component, a screen region, and a mode. This doc separates the
layers, gives each concept ONE canonical name, and lists the collisions —
read it before the field guide if the docs have felt like five vocabularies
welded together.

## 0. Three axes — nothing collides once you place a word on them

1. **MODE** (HOW you look): `overview` · `detail` · `deep`. Lowercase,
   always. A mode is a way of looking, available at every scale.
2. **TARGET / SCALE** (WHAT you look at): a **process** (depth 1) → a
   **sub-entity** (depth 2) → a **sub-sub-entity** (depth 3). The cap
   (`DEPTH_CAP = 3`) counts context-path FRAMES, not scales.
3. **LAYER** (WHERE a word lives): data → registry → shell state →
   renderer component → page surface.

Any description is unambiguous once you place it: "the `broker-eu-03`
**entity**" (data, depth-3 target) ≠ "its **mirror entry** in the fleet
payload" (data, display copy) ≠ "its **cell** on the page" (surface, DOM
button). A chip is not an entity — it is a **surface piece** (a
desk-density `OverviewTile`) standing in as the live instance of whatever
unmirrored child it names.

## 1. Data layer — what the upstream engine produces (`types.ts`, `processStateMocks.ts`)

| Canonical name | Type / key | What it is |
|---|---|---|
| **envelope** | `ProcessStatePayload` | One feed unit per process: header + overview extract + detail extract + deep payload + entity chain + launchers. Arrives per Web-Socket message; drifts every tick. |
| **extract** | `OverviewExtract`, `DetailExtract` | Precomputed *view model* — hero reading (overview) or narrative + blast radius + readings (detail). "Extract" is a noun here, not "excerpt". |
| **deep payload** | `ArchetypePayload` | The layout-shaped data a canvas paints: `FLOW`/`STATISTICAL`/`TOPOLOGY`/`RULE_GATE`/`HEATMAP`. |
| **entity chain** | `entities: Record<entityId, EnrichedEntity>` | The keyed TREE inside an envelope: entities linked by `parentId` (depth derived from that link). Say "entity chain" for the data structure; say **drill path** for a navigation route (§3). |
| **entity** | `EnrichedEntity` | One member of the chain: id, parentId, depth, healthState, `detail`, optional private `deep`. A *drillable entity* is one a user can open a drawer for. |
| **entityKind** | e.g. `FLOW_NODE`, `INFRA_MEMBER`, `RULE` | Display hint ONLY — the Shell never branches on it. Structural meaning lives in keys (`parentId`, `entityId`), never in kinds. |
| **group** | entity with `entityKind: INFRA_GROUP` | A *container* entity — one scale ABOVE its members (a Kafka cluster above its brokers). Has a drawer; carries no private canvas. Never listed as a triage row. |
| **member** | entity with `entityKind: INFRA_MEMBER` | A *leaf* entity (broker, DB, worker, ASG). Its drawer terminates the chain. |
| **mirror entry** | payload `nodes[]` / `grids[].nodes` | Display COPIES of entities, keyed by an optional `entityId` link ("this entry mirrors that entity"). Health re-stamped from the drifted entity each tick — a copy can never disagree with the drawer. |
| **edge** | payload `edges[]` | Keyed containment fact (`group → member`). Rebuilt from live membership on drift. Never painted. |
| **watchlist** | `DetailExtract.infraWatch` | The flat fleet-wide triage list (unhealthy nodes, severity-ordered, cross-envelope). `infraGroups` is its group-partitioned view — same data, same tick. |

## 2. Registry layer — presentation knowledge, looked up by id

| Canonical name | Type / key | What it is |
|---|---|---|
| **plugin registry** | `PluginRegistry` | The id→component answer bank. "Where do I show this target?" — never "what does this mean?". |
| **process manifest** | `ProcessPluginManifest` | Per-process registration: title, owner, `archetype` (the layout KIND of the process's own payload), `DeepComponent`, and `subEntities`. |
| **sub-entity manifest** | `SubEntityManifest`, keyed `processId → subEntityId` | Per-entity overrides, auto-derived from data: `detailView?` replaces the generic DetailDrawer for that entity (rare); `deepView?` replaces the shared layout renderer for that entity's private canvas. |
| **canvas resolution chain** | — | What paints a deep target: sub-entity `deepView` → process `DeepComponent` → visible "no canvas registered" fallback. Lookup by key only; no archetype-name conditionals in the Shell. |

## 3. Shell-state layer — navigation bookkeeping (`App.tsx`, not rendered)

| Canonical name | Shape | What it is |
|---|---|---|
| **trail** (context path) | `ContextFrame[]` | The ordered trail of viewing frames — a PATH, not a tier stack. |
| **frame** | `ContextFrame = {target, mode}` | One step on the trail: WHICH target + in WHICH mode. |
| **target** | `ViewTarget = {processId, entityId?}` | A POINTER to an entity (or the process itself when `entityId` is absent). Not a component. |
| **mode** | `ViewMode = 'detail' \| 'deep'` | The mode slot inside a frame. (Overview has no frame — it is the default surface.) |
| **focused view** | `FocusedView` (Shell-internal) | The RESOLVED record for the top frame: label, kind hint, health, extract, deep payload, watchlist. Name it "the focused view" or rename it — it is neither a viewing mode nor a "view" in the loose sense. |
| **childrenOf / mirroredIds / drillChildren** | helpers | Generic keyed lookups: children of a frame's target; entityIds already mirrored by the page's canvas; children left uncovered → the chip strip renders exactly those. |

Frame-budget rule (verified, not folklore): `drillInto` **pushes** a frame
(spends budget; refused at `trail.length >= 3` with a logged refusal);
`goDeeper` **re-modes** the last frame in place (spends nothing).

## 4. Renderer layer — the components that paint

- **view primitives** — the tier-agnostic components, each usable at any
  scale: `OverviewTile` (two densities), `DrawerShell` (the drawer FRAME:
  title, close ✕, health chip, scroll body), `DetailDrawer` (fills a
  DrawerShell with a DetailExtract), `ArchetypeCanvas` (the deep mount
  POINT — resolves and mounts, paints nothing itself), plus
  `SmartLauncherGroup` (external-tool launcher slot).
- **layout renderers** (five) — `FlowArchetype`, `StatArchetype`,
  `TopologyArchetype`, `RuleGateArchetype`, `HeatmapArchetype`. They render
  payloads; they are not the payloads and not the layout KINDS.

When you mean a renderer, say the component's name in code font
(`TopologyArchetype`). When you mean the layout kind, say `TOPOLOGY`. When
you mean the data, say "payload".

## 5. Page-surface layer — what you point at

| Canonical name | What it is |
|---|---|
| **wall tile** | An `OverviewTile` at `density="wall"` on the wall grid (one per registered process). |
| **chip** | An `OverviewTile` at `density="desk"` — a compact DRILL AFFORDANCE shown on canvas (workbench) pages, listing drillable children with NO canvas instance on that page. A chip is a surface piece, not an entity, and not a watchlist row. |
| **drawer** | The slide-out panel: `DrawerShell` framed around `DetailDrawer`. Opens over a backdrop (wall grid at full opacity, or the parent's canvas as an inert 40%-opacity copy). |
| **triage section** | One group's block inside a grouped watchlist (drawer region): group header (drill to the group's drawer) + **rows** (one per unhealthy member node; drill to that node's drawer). |
| **workbench page** | A deep-mode PAGE: context-path nav + entity header + canvas region + (conditional) chip strip. |
| **canvas region** | Where a canvas mounts: `<main>` on a workbench page; the inert backdrop copy on a sub-entity drawer page. |
| **cell** | The DOM box a mirror entry paints: LIVE (button) when the entry carries an `entityId` link, inert (plain div) otherwise. |
| **crumb** | A clickable segment of the context path (truncates the trail). |

## 6. Collision table — the words to stop using bare

| Ambiguous word | It has meant | Say instead |
|---|---|---|
| "node" | entity / mirror entry / cell / (historically) a whole workbench page | `entity` · `mirror entry` · `cell` — and "workbench page" for the page |
| "chip" | desk-density OverviewTile (surface) · once, "overview mode" in a mode list | `chip` only for the desk-density surface piece |
| "drawer" | DetailExtract · DetailDrawer · the panel · "detail mode" | `DetailExtract` (data) · `DetailDrawer` (renderer) · *drawer* (the panel, lowercase) · `detail` (mode) |
| "canvas" | a payload · `ArchetypeCanvas` · a workbench page · the inert backdrop | "deep payload" · `ArchetypeCanvas` · "workbench page" · "backdrop copy" |
| "view" | viewing MODE · `FocusedView` · "deep view" (page or payload) | name the thing: "deep mode" · "the focused view" · "workbench page" / "deep payload" |
| "archetype" | layout kind · payload type · renderer component · manifest field | `TOPOLOGY` (kind) · "TOPOLOGY payload" · `TopologyArchetype` (renderer) |
| "chain" | the keyed entity TREE (data) · a navigation route taken | "entity chain" (data) · "drill path" (route) |
| "primitive" | view primitive (OverviewTile/DetailDrawer/ArchetypeCanvas) · design tokens | "view primitive" vs "design token" — never just "primitive" |
| "extract" | the precomputed view model (noun) | keep — it is a technical noun, not "excerpt" |
| "watchlist" | `infraWatch` (data) · its grouped rendering (sections) | "watchlist" (data) · "triage sections" (surface) |

## 7. Self-check for writers

If a sentence uses `node`, `chip`, `drawer`, `canvas`, `view`, or
`archetype` unqualified, it is ambiguous — rewrite it with the layer name
from §1–§5. A drill path that dies at the frame cap must be written as
refused at the cap, never as "terminating" (terminating = the DATA ends:
entity has no `deep` and no children).

Cross-links: `viewing-model-field-guide.md` §2 keeps a per-page cheat
sheet; this file is authoritative for cross-layer naming. Start here if
either doc stops making sense.
