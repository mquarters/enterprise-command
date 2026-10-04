# Consolidated System Blueprint: Domain-Driven Command Center Platform

## 0. The model in one paragraph

The platform has no "tiers." It has three **viewing MODES** — overview, detail, deep —
and every mode applies to **any entity at any scale**. An 80-inch wall tile and a
depth-3 sub-entity chip differ in *density and geometry*, not in kind. The Shell is a
**path-based context stack**: its state is an ordered trail of viewing frames
`{ processId, entityId?, mode }`. Drills push frames onto the trail; "back one scale"
pops one frame; crumb clicks truncate. Chains recurse downward until the data
terminates or the cap `DEPTH_CAP = 3` is reached (named in `src/types.ts`,
runtime-enforced by generic guards in the Shell). All health states, blast radii,
narratives and per-metric statuses are computed **upstream** (the mock generator now,
the real engine later); the UI **displays** them — it never derives them (Principle 1).

```
  Overview mode ── <OverviewTile />   wall density (tiles) · desk density (drill chips)
  Detail mode   ── <DetailDrawer />   any entity's DetailExtract, inside <DrawerShell />
  Deep mode     ── <ArchetypeCanvas /> mounts any entity's deep payload via registry lookup
```

## 1. The Enriched Data Pipeline (Data Engine)

The backend pipeline processes business rules, threshold evaluations and impact
metrics *before* emitting anything. One **ProcessStatePayload** envelope per process
travels over the transport (test run: the mock generator in
`packages/ui-sdk/src/mocks/processStateMocks.ts`, which stands in for WebSocket/SSE)
and powers every viewing mode at every scale simultaneously.

### Canonical Data Contract

```
+-----------------------------------------------------------------------------------+
| PROCESS STATE ENVELOPE (ProcessStatePayload)                                      |
+-----------------------------------------------------------------------------------+
| HEADER   : processId, title, ownerTeam, updatedAt, healthState,                   |
|            staleHeartbeatThresholdSeconds (heartbeat-gap / staleness input)      |
| OVERVIEW : OverviewExtract — heroMetricLabel/Value/Unit, trend                   |
| DETAIL   : DetailExtract — narrativeSummary, impactedCount, impactedUnit,        |
|            primaryFailureKey, incidentStartedAt, metrics[]                       |
| DEEP     : ArchetypePayload — one of five canvas layouts (see §4)                |
| ENTITIES : Record<entityId, EnrichedEntity> — the sub-entity chains              |
| LAUNCHERS: SmartLauncherContext[] — deep-link DATA, rendered by SmartLaunchers   |
+-----------------------------------------------------------------------------------+
```

Every `EnrichedEntity` carries its own chain:

```
EnrichedEntity { entityId, parentId, entityKind, depth, healthState, detail, deep? }
```

- Keys inside `entities` are entityIds; `parentId` points at the owning process
  (depth 2) or at a parent entity's entityId (depth 3).
- `detail` (its drawer content) always exists; `deep` (its own custom canvas payload)
  is optional — **chains continue or terminate as DATA, never as code**.
- `entityKind` is a display hint only. The Shell and the primitives never branch
  on it.
- `MetricReading.status` and each entity's `healthState` are computed upstream.

**Health Engine Rule (Principle 1):** `healthState` (`HEALTHY | WARNING | CRITICAL |
UNKNOWN`) and every per-metric status are evaluated upstream to prevent UI-client
re-calculation lag. UI components map those values to token classes; they never
evaluate thresholds or derive health themselves.

## 2. Core Platform Shell & Plugin Registry (ID-keyed, not name-keyed)

The Platform Shell hosts the Plugin Registry, the mock feed, and the Automated View
Controller. Feature teams build isolated Process Plugins (`defineProcessPlugin`) and
register them with the Shell; in the test run, `src/mocks/pluginSeeds.ts` seeds
equivalent mock manifests from the mock states.

```
                     ┌──────────────────────────────────────────────┐
                     │ PROCESS PLUGIN (ProcessPluginManifest)       │
                     │  title/ownerTeam/archetype + DeepComponent   │
                     │  subEntities?: Record<subEntityId,           │
                     │      SubEntityManifest {detailView?,deepView?}│
                     └──────────────────┬───────────────────────────┘
                                        │ registered by processId
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ CORE PLATFORM UI SHELL (src/App.tsx — the preview harness mounts it via main.tsx)│
│                                                                                  │
│  Plugin Registry (src/plugin-registry.ts)                                         │
│    get(processId) ───────────────► process DeepComponent fallback                │
│    getSubEntity(processId, entityId) ─► SubEntityManifest (optional overrides)   │
│                                                                                  │
│  Automated View Controller — context-path navigation, all generic:                │
│    push (drill into a sub-entity) · pop ("back one scale", Esc, ✕)               │
│    · truncate (crumb click) · mode swap (detail ⇄ deep for the SAME target)      │
│                                                                                  │
│  Deep-canvas resolution chain (ArchetypeCanvas):                                  │
│    getSubEntity(pid, entityId)?.deepView                                          │
│      → get(processId).DeepComponent          (shared layout fallback)            │
│      → VISIBLE "no canvas registered" fallback (never a blank canvas)            │
│                                                                                  │
│  Layout resolution is a DATA LOOKUP keyed by id —                                │
│  ARCHETYPE_COMPONENTS[payload.archetype] (mocks/pluginSeeds.ts) and the          │
│  registry chain above. There is no per-archetype `if` and no archetype-name     │
│  literal anywhere in the Shell or shared code.                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### The Smart Link Context Injector

When an operator transitions out of the platform into third-party observability
tools, `SmartLauncherGroup` + `buildLauncherUrl` (`src/components/SmartLaunchers.tsx`)
inject time-window bounds (`from`/`to`) and filtered tags (`process_id`,
`failure_key`, launcher parameters) into the launcher DATA. Launchers arrive as
payload data (`smartLaunchers`); the Shell merely composes the slot into
`DetailDrawer.launcherSlot`.

### Context-path trail — what the Shell state looks like

```
trail = []                                        → wall grid (overview mode, every process)
trail = [{P, detail}]                             → process DetailDrawer over the grid
trail = [{P, deep}]                               → process workbench (deep mode of the PROCESS)
trail = [{P, deep}, {n1, detail}]                 → Ingest Batch drawer OVER the process canvas
trail = [{P, deep}, {n1, deep}]                   → Ingest Batch's OWN mini-FLOW canvas
trail = [{P, deep}, {n1, deep}, {c3, detail}]     → Queue Writer depth-3 detail — at the cap,
                                                    the chain terminates (c3 has no `deep`)
```

- Esc / ✕ / "back one scale" pops exactly one frame — one hop up per press.
- The depth cap is enforced generically at the drill affordance: a push whose target
  sits beyond depth 3 is refused (trail-length guard + `entity.depth` guard). Because
  seeded chains terminate as data at the cap, the guard is defense-in-depth for
  future data, not a per-case special case.
- Depth is a CEILING, not a guarantee: most chains stop at depth 2 (detail-only
  extracts); only Ingest Batch recurses to depth 3.

## 3. Three Viewing Modes ≠ Data Tiers

| Mode | Primitive | Densities & geometry | Display-only rule (Principle 1) |
| --- | --- | --- | --- |
| **Overview** | `OverviewTile` | `density="wall"`: process-scale wall tile (distance type, grid cell) · `density="desk"`: compact sub-entity drill chip | Maps the precomputed `health` prop to `--status-*` token classes; shows the hero reading verbatim. Derives no color, no verdict, no trend semantics. |
| **Detail** | `DetailDrawer` (framed by `DrawerShell`) | process scale: 480px wide, `--z-drawer` · sub-entity scale: 340px wide, `--z-detail-drawer` | Renders ANY entity's `DetailExtract` verbatim — narrative, blast radius, per-metric statuses all arrive precomputed. |
| **Deep** | `ArchetypeCanvas` | full-page canvas, identical mount path whether the payload belongs to a process or to a depth-2/3 entity | Resolves WHICH canvas paints via registry lookup by id; never validates or re-evaluates the payload. |

- At most **one DrawerShell is mounted at a time**, and it owns the ONE global Esc
  keydown handler and the ONE focus manager (Tab cycles inside the panel; focus is
  restored to the opener on close). The old stack of two Esc handlers is gone.
- Drawer geometry comes from tokens, not hard-coded numbers:
  `--z-drawer`/`--z-detail-drawer` (900/1000) and `--drawer-width-process` /
  `--drawer-width-entity` (480px/340px), each with a matching Tailwind class mapping.
- A detail drawer floats above a backdrop (the grid, or the parent canvas rendered
  `aria-hidden` + `pointer-events-none`); the backdrop is contextual depth cue, never
  a second interactive surface. Canvas nodes that mirror a drillable entity carry that
  entity's id as a seed-data `entityId` link and render as the ONE live instance on
  canvas pages (button → entity drawer; nav affordance only, colors stay upstream).
  The desk chip strip therefore lists only children with NO canvas instance — every
  entity keeps exactly one clickable instance per page, never zero and never two.

## 4. The Five Canvas Layouts, at Any Scale

Five standardized layouts — `FLOW`, `STATISTICAL`, `TOPOLOGY`, `RULE_GATE`,
`HEATMAP` — are **layouts, not tiers**. A layout is never bound to a scale:

- Payment Clearing's process workbench and Ingest Batch's internals are BOTH FLOW
  canvases — one FlowArchetype paints both, chosen by lookup, not by `if`.
- A sub-entity whose `deep` is absent simply ends its chain at the detail drawer.
- A payload whose layout has no registered component paints the VISIBLE canvas
  fallback (a registered blind spot is a bug, so it must be loud).

## 5. Technology Layer Division

```
LOGICAL ENGINE (TypeScript)
  src/types.ts ............ contracts + DEPTH_CAP = 3 (EnrichedEntity, DetailExtract,
                            MetricReading.status, ArchetypePayload, SubEntityManifest)
  src/plugin-registry.ts .. id-keyed registry (get / getSubEntity / getAll / has)
  src/mocks/ .............. mock backend = the "upstream": processStateMocks.ts
                            computes all health/detail/blast data; pluginSeeds.ts
                            seeds the registry from that data (test-run stand-in for
                            real feature-team bundles)

STYLING ENGINE (Tailwind CSS + CSS Variables)
  src/tokens/variables.css .......... raw values live ONCE here (colors, --scrim,
                                      --z-drawer, --z-detail-drawer, --drawer-width-*,
                                      --shadow-drawer, tv-*/desk-*/console type scales)
  src/tokens/tailwind.config.js ..... maps every token to a class (z-drawer/z-detail,
                                      w-drawer-*, shadow-drawer, text-tv-*, status colors)
                                      — unmapped = dead class, not allowed
  packages/ui-sdk/tailwind.config.js  dev-harness re-export of the token config
  src/tokens/domain-component.css ... component classes (.l1-process-card, .flow-node
                                      [data-status], .detail-narrative, launcher button)
  packages/ui-sdk/vite.config.mts ... dev harness Vite config (react dedupe)
```

- Zero raw palette colors in primitives or Shell — status colors travel through
  `var(--status-*)` templates or `bg-/text-/border-status-*` token classes.
- Dual-scale typography (wall distance type vs dense console monospace) is a
  *density* concern, handled by token choices inside the same primitives.

## 6. Glossary

- **Viewing mode** — overview · detail · deep; available for ANY target at ANY depth.
- **Viewing target** — the entity under focus (a process, or a depth-2/3 entity).
- **Context path (trail)** — the Shell's navigation state: the ordered stack of
  (target, mode) frames.
- **Chain** — one entity's drill path; continues while data continues (each
  EnrichedEntity's optional `deep`), always capped at depth 3.
- **Principle 1** — compute upstream, display downstream. Per primitive this means:
  OverviewTile only maps a status to a token; DetailDrawer only displays an extract;
  ArchetypeCanvas only looks up which layout paints.
