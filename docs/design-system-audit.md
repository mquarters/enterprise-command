# Design-System Audit — vantage-ui / `packages/ui-sdk`

**Date:** 2026-10-04 · **Status:** report-only (prep for a design-system change; no token or component edits are included here)
**Scope:** every rendered surface of the app, captured at **1920×1080 (TV/wall)** and **1440×900 (desk)**, inspected visually, plus a static token-usage audit of `src/tokens/`.

## 0. Method & evidence base

- **Sweep:** Playwright/chromium, one screenshot per surface at each viewport → **53 screenshots** in `docs/assets/audit/{tv,desk}/`, with `manifest.json` recording per-shot console/pageerror logs (**0 errors across the sweep**). The app has no URL router: the Shell is a trail-stack state machine, so the sweep drives clicks via `data-testid`/`data-entity` selectors (tiles, canvas cells, chip strips, drawer rows, `Inspect internals`).
- **Visual evaluation:** all 53 images inspected, in 8 batches of ≤9 images (inside the 25–30-per-request image budget). Per-image findings carry `V` ids; working ledger with full per-image notes lives at `/tmp/audit-notes.md`.
- **Static audit:** every custom property defined in `tokens/variables.css`, `tokens/domain-component.css`, `tokens/tailwind.css` (40 total) was grepped for consumption in three forms: raw `var(--x)`, Tailwind mapped classes (e.g. `bg-surface-card`, `text-ink-*`, `text-tv-*`, `shadow-glow-*`, `w-drawer-*` — mapping table in `tailwind.config.js`), and cross-token reference inside the CSS files themselves.

**Surfaces swept** (each ×2 viewports unless noted): wall grid (+ FEED-PAUSED variant, TV only); 7 process workbench pages (Infra-Fleet, ACH Payment, Auth Pipeline, PCI-DSS, Card-Auth, Liquidity, FX Quote); process drawers (7); workbench canvases (7); infra group drawer (Kafka); infra member drawer (broker); Payment n1 drawer + its private mini-FLOW canvas; Card-Auth `Sample @ 10:03` entity drawer (chip path and canvas-jump path, each viewport); PCI/FX/Liquidity chip drawers; watchjump drawers (Payment, Card-Auth).

## 1. Token matrix — used vs unused (40 variables)

Legend: **U** = consumed (raw `var()` / mapped class / live CSS selector) · **U\*** = consumed only via an applied attribute-driven selector (still live) · **✂** = never consumed anywhere (dead or orphaned).

### 1.1 Surfaces & borders (`variables.css` §1)

| Token | State | Evidence |
|---|---|---|
| `--surface-base` | U | `.bg-surface-base` App.tsx:321,386; StatArchetype.tsx:26; TopologyArchetype.tsx:24 |
| `--surface-card` | U | `.bg-surface-card` FlowArchetype.tsx:20; HeatmapArchetype.tsx:15; RuleGateArchetype.tsx:11; StatArchetype.tsx:13; also `var()` in `.l1-process-card`/`.flow-node` (domain-component.css:8,70) |
| `--surface-overlay` | U | `.bg-surface-overlay` DrawerShell.tsx:96; `var()` domain-component.css:40 |
| `--surface-elevated` | U | `.bg-surface-elevated` RuleGateArchetype.tsx:35; `.smart-launcher-button` domain-component.css:97 |
| `--surface-hover` | U | `.smart-launcher-button:hover` domain-component.css:109 — class applied at App.tsx:325,342,405 |
| `--border-subtle` | U | `.border-border-subtle` App.tsx:351,387; FlowArchetype.tsx:20,97; `var()` domain-component.css:9,71 |
| `--border-strong` | U | RuleGateArchetype.tsx:26; StatArchetype.tsx:40; DrawerShell.tsx:96; `var()` domain-component.css:41,54,98 |

### 1.2 Text (`variables.css` §2)

| Token | State | Evidence |
|---|---|---|
| `--text-primary` | U | `.text-ink-primary` App.tsx:321,386; FlowArchetype.tsx:20; HeatmapArchetype.tsx:15; `var()` domain-component.css:59,76,99 |
| `--text-secondary` | U | `.text-ink-secondary` App.tsx:293,334,353,390 (also focus-ring tints) |
| `--text-muted` | U | `.text-ink-muted` App.tsx:335; FlowArchetype.tsx:84; HeatmapArchetype.tsx:61; RuleGateArchetype.tsx:42 |
| `--scrim` | U | `.bg-scrim` DrawerShell.tsx:86 — but see V6/V18/V42: backdrop *copy* under the scrim drops below readable contrast (the scrim token itself is fine; the dim-on-copy is untokenized) |

### 1.3 Elevation & geometry (`variables.css` §1/§z)

| Token | State | Evidence |
|---|---|---|
| `--shadow-drawer` | U | `.shadow-drawer` DrawerShell.tsx:96 |
| `--z-drawer` / `--z-detail-drawer` | U | `.z-drawer`/`.z-detail` DrawerShell.tsx:11–12,82 |
| `--drawer-width-process` (480px) | U | `.w-drawer-process` DrawerShell.tsx:97 |
| `--drawer-width-entity` (340px) | U | `.w-drawer-entity` DrawerShell.tsx:97 |

### 1.4 Status colors (`variables.css` §2)

| Token | State | Evidence / note |
|---|---|---|
| `--status-critical-fg` | U | FlowArchetype.tsx:53,100; RuleGateArchetype.tsx:39,49; domain-component.css:82 |
| `--status-critical-bg` | U | FlowArchetype.tsx:100; RuleGateArchetype.tsx:49; domain-component.css:20,65 |
| `--status-critical-border` | U | FlowArchetype.tsx:100; RuleGateArchetype.tsx:49; `.stat-control-limit` (dashed control-limit line, StatArchetype.tsx:36) |
| `--status-critical-glow` | U\* | only inside `@keyframes critical-pulse` (variables.css:83,87), reached via `.l1-process-card[data-health=CRITICAL]` (applied, OverviewTile.tsx:107). Live on CRITICAL wall tiles. |
| `--status-warning-fg` | U | StatArchetype.tsx:29; TopologyArchetype.tsx:47 |
| `--status-warning-bg` | **✂** | zero `var()` or class consumers anywhere |
| `--status-warning-border` | U\* | `.l1-process-card[data-health=WARNING]` domain-component.css:24 |
| `--status-warning-glow` | U\* | same selector, domain-component.css:25 |
| `--status-healthy-fg` | U | App.tsx:399; FlowArchetype.tsx:85; RuleGateArchetype.tsx:39,48 |
| `--status-healthy-bg` | U | RuleGateArchetype.tsx:48 (PASSED pill) |
| `--status-healthy-border` | U | RuleGateArchetype.tsx:48. NOTE domain-component.css:29 hardcodes `rgba(34,197,94,.4)` for the HEALTHY tile border instead of the token family. |
| `--status-healthy-glow` | **✂** | zero consumers |
| `--status-unknown-fg` | U | App.tsx:400 (FEED PAUSED grey — visually confirmed on wall) |
| `--status-unknown-bg` | **✂** | zero consumers |
| `--status-unknown-border` | **✂** | zero consumers |
| `--status-unknown-glow` | **✂** | zero consumers |

### 1.5 Typography & fonts (`variables.css` §3)

| Token | State | Evidence |
|---|---|---|
| `--font-size-tv-hero` / `tv-title` / `tv-sub` | U | OverviewTile.tsx:116,117,121,131,142,147 (wall density only) |
| `--font-size-desk-title` | U | App.tsx:352,389; FlowArchetype.tsx:23; HeatmapArchetype.tsx:18 |
| `--font-size-desk-body` | U | FlowArchetype.tsx:46; ArchetypeCanvas.tsx:62; DetailDrawer.tsx:106; OverviewTile.tsx:87; domain-component.css:58 |
| `--font-size-console` | U | App.tsx:293,334,353,390; FlowArchetype.tsx:27,84; HeatmapArchetype.tsx:23; domain-component.css:75,103 |
| `--font-sans` | U | `.font-sans` App.tsx:321,386; domain-component.css:57 |
| `--font-mono` | U | `.font-mono` App.tsx:396; FlowArchetype.tsx:27,84; HeatmapArchetype.tsx:23; domain-component.css:74,102 |

**Totals: 40 defined · 35 consumed · 5 dead** — `--status-warning-bg`, `--status-healthy-glow`, `--status-unknown-bg`, `--status-unknown-border`, `--status-unknown-glow`.

**Correction vs the working ledger** (`/tmp/audit-notes.md` §Token usage matrix, written before cross-token references were traced): the ledger's UNUSED list also included `--surface-hover`, `--status-critical-glow`, `--status-warning-border`, `--status-warning-glow`. All four are consumed *inside the two CSS files* (hover state, pulse keyframes, WARNING-tile selector), so this document supersedes that list: **5 dead, not 9.**

## 2. Styles rendered WITHOUT token backing

### 2.1 Violations — raw color values (off-system colors)

| # | Location | Value | Problem |
|---|---|---|---|
| T1 | domain-component.css:29 (`.l1-process-card[data-health=HEALTHY]`) | `rgba(34,197,94,.4)` | hardcoded healthy-green; a token family exists (`--status-healthy-border/-glow`) but isn't used here |
| T2 | variables.css:87 (critical-pulse 50 % frame) | `inset … rgba(239,68,68,.3)` | raw critical-red, no token |
| T3 | variables.css:88 (critical-pulse 50 % frame) | `border-color: #fca5a5` | raw light-red, breaks the otherwise consistent status set |
| T4 | domain-component.css:53 (`.detail-narrative`, `.l2-narrative-banner`) | `rgba(15,23,42,.6)` | near-`--scrim`/`--status-unknown-bg` slate tint, but exact value appears nowhere in the token set — narrative band defaults to an off-system colour (CRITICAL variant correctly flips to `--status-critical-bg`) |
| T5 | FlowArchetype (connector arrows) | hardcoded green | connector/edge colour has no token (V12) |

### 2.2 Violations — off-system geometry/shadow (duplicated or arbitrary)

| # | Location | Value | Problem |
|---|---|---|---|
| T6 | domain-component.css:38 (`.l2-triage-drawer-container`) | `width:480px` | duplicates `--drawer-width-process` as a literal; **and the whole selector is dead** (components use `DrawerShell`, which correctly uses the `.w-drawer-*` classes) |
| T7 | domain-component.css:42 | `box-shadow:-10px 0 30px rgba(0,0,0,.7)` | byte-for-byte duplicate of `--shadow-drawer`; dead selector |
| T8 | domain-component.css:38–45 (dead selector) | `z-index:1000`, `padding:1.5rem`, `gap:1.25rem` | duplicate `--z-drawer`-adjacent values and ad-hoc spacing; dead selector |
| T9 | OverviewTile.tsx:80 | `shadow-lg` (also FlowArchetype.tsx:66,75) | Tailwind-default shadow, bypasses the shadow/glow token family |
| T10 | OverviewTile.tsx:80 | `min-w-[10rem]` | arbitrary width; duplicates `.flow-node{min-width:140px}` (domain-component.css:77) in a second unit |
| T11 | DrawerShell.tsx:96 | `max-w-[90vw]` | arbitrary clamp, duplicates the dead selector's `max-width:90vw` |
| T12 | literal radii `1rem/0.5rem/0.375rem` and paddings (`1.75rem/1.5rem/1rem/0.75rem/0.5rem`) throughout `domain-component.css` | — | no radius/spacing token exists to violate — listed as a *missing scale* (§3) rather than per-line violations |
| T13 | mitigation/nav/mitigation-adjacent buttons (FlowArchetype, DetailDrawer footer) | emoji glyphs `⚡`/`⛨` inside mono button chrome | emoji renders in its own palette against the mono/slate chrome; no icon token or icon slot exists (V11, V39) |

### 2.3 Waived (off-system but not defects)

- **W1** — Tailwind default spacing/padding/`gap-*` in `App.tsx` and archetypes: functional, low visual risk; recommend a spacing scale (§3) rather than per-site violations.
- **W2** — Tailwind default font-sizes used inside workbench canvases: the *absence of TV-scale counterparts* is the real problem → §3 M2.
- **W3** — chart series hues (cyan/teal/amber dots and lines in Stat/Heatmap/Topology): semantic status colours all stay inside the token set (verified per-image); non-semantic series hues have no token → §3 M3.

## 3. Component needs the token system cannot express (missing scales)

- **M1 · Spacing & sizing scale** — nothing governs drawer interior rhythm (V20), canvas min-heights (fixed `min-h-*` leaves 60–85 % dead canvas at TV scale, V10/V28/V38), or tile height/label wrap (V2).
- **M2 · TV-scale counterpart for workbench/drawer type** — `tv-*` sizes are wired only to OverviewTile wall density; every workbench canvas + drawer renders desk-scale type when projected to a wall (V10, V13).
- **M3 · Chart hues + connector/edge colours** — no tokens for non-semantic series colours or FLOW connector greens (V12, W3).
- **M4 · Backdrop/inert-copy opacity** — `--scrim` exists but the *dimmed page copy* under drawers has no opacity/contrast token; contrast fails at TV (V6, V18, V42, V46).
- **M5 · Nav-vs-action button variant** — "Back one scale" and mitigation actions are visually identical (V21, V29) — needs a variant pair, not one button class.
- **M6 · Icon tokens** — emoji glyphs are the only icon mechanism (T13); at least one icon/affordance token or an icon slot convention is needed.
- **M7 · Group-vs-member hierarchy marks** — container pills and member rows share identical styling; hierarchy is carried by text alone (V5). Needs weight/size/indent or colour-step tokens.
- **M8 · Legend/caption size step** — heatmap legend and canvas captions sit at row size; no de-emphasis step exists (V16, V41).

## 4. Per-surface visual findings (condensed; per-image detail in `/tmp/audit-notes.md`)

**Wall grid (tv/desk `wall*.png`)** — V1 titles truncate with "…" at *both* scales (glance criterion broken by truncation, not size) · V2 desk wall: FX tile clipped below fold, 2-line label wraps → uneven rows; no height/wrap token · V3 TV wall leaves bottom ~40 % dead (grid fills top ~60 % of 16:9) · V7 FEED PAUSED grey correctly on `--status-unknown-fg` ✓ · V8 hero bands correctly tinted by status token ✓.

**Process drawers (tv/desk `drawer-*.png`)** — V4 watchlist member rows truncate CPU **values** ("CPU: 9…") — data loss, worst finding (V27: happens at desk too → layout bug, not viewport) · V5 group header pill ≡ member row styling (M7) · V6 backdrop copy under scrim below comfortable contrast (worst on payment/fx; V18/V42/V46: systemic, both viewports; TV dim deeper than desk) · V9 "Inspect internals" footer sits below fold at TV height (V47) · V20/V22 sparse drawers read as unfinished (M1) · V34 deep-link launchers scroll below long watchlists (workflow note) · V32/V33/V49/V50 status→colour mapping verified intact on every drawer inspected (hero bands, pills, readings all token-backed ✓; one suspected warm-tint band dismissed as JPEG artifact — V50).

**Workbench pages (tv/desk `wb-*.png`)** — V10 every canvas leaves 60–85 % empty canvas below the strip at TV (fixed min-height + desk-scale type; M1/M2) · V11 mitigation button floats detached from its node; emoji icons in mono buttons (T13) · V12 FLOW connector arrows hardcoded green (T5) · V13 infra grids: group-title drill buttons render ✓; mono/console type borderline at 15-ft · V14 PASSED/FAILED pills correctly on status-bg tokens ✓ · V15/V40 two status-colouring conventions coexist (dots vs full-label chips) — inconsistent usage of existing tokens, not a missing one · V16/V41 legend lacks size step (M8) · V17 control-limit line + legend values correctly tokenised ✓ · V26 fleet canvas fills desk width cleanly — dead space is TV-scale-specific (confirms M2).

**Entity/group/member drawers & chips (tv/desk `groupdrawer-`, `memberdrawer-`, `chipdrawer-`, `n1drawer-`, `watchjump-`, `n1mini-*.png`)** — V18 entity-drawer backdrop combo (dim+scrim) below readable contrast (both viewports, V25/V42) · V19 depth-3 crumb chains intact ✓ · V21/V29 nav vs mitigation buttons identical (M5) · V48 chip path and canvas-jump path reach the *identical* entity drawer — one-live-instance rule holds visually ✓ · V49 hero-band colour tracks entity health on every entity drawer inspected ✓ · V22 group drawer footer "No active incident" for a group is a content bug, not a token gap.

## 5. Recommendations (prep only — do not implement blind)

1. **Delete** the 5 dead status variants (`--status-warning-bg`, `--status-healthy-glow`, `--status-unknown-{bg,border,glow}`) **or** wire them into the pill/band variants that currently hardcode equivalents (a HEALTHY pill today would have no bg/border token to reach — `RuleGateArchetype.tsx:48` is the one place that found one).
2. **Replace raw colours** T1–T5 with existing tokens (`--status-healthy-*` for the HEALTHY tile border; add a `--status-critical-mid` or reuse `--status-critical-border` inside critical-pulse; tokenise the narrative-band default as a `--band-neutral` member of the band family).
3. **Delete the dead `.l2-triage-drawer-container` block** (T6–T8) — every value in it either duplicates a live token or bypasses one.
4. **Add a spacing/sizing scale** (M1) and give it TV counterparts (M2) before touching the wall layout; the dead-space and truncation findings (V1–V4, V10, V20, V28, V38) all trace here.
5. **Add a backdrop-copy opacity/contrast token** (M4) and a legend/caption size step (M8).
6. **Split button variants** nav-vs-action (M5) and replace emoji affordances with an icon convention (M6).
7. Fix the two **non-token defects** found while auditing: value-truncation in watchlist rows (V4/V27 — layout bug, data loss) and the "No active incident" footer on group drawers (V22).
8. `docs/assets/workbench-page-annotated.png` predates the chip-strip redesign — regenerate or retire it when the design-system change lands.

## 6. Remediation ledger (post-audit, 2026-10-04)

Every finding above, one line each — **R**esolved (shipped) or **D**eferred (reason). Proof: `docs/assets/audit/after/{tv,desk}/` (53 after-fix screenshots, 0 console errors, `after/manifest.json`).

**Token matrix / R1–R3**
- R1 dead tokens — D-part: reclassified — `warning-bg`, `unknown-bg`, `unknown-border` are LIVE via runtime-interpolated `var(--status-…-bg/-border)` in statusBg/statusBorder helpers (invisible to flat grep); `healthy-glow` wired (HEALTHY tile border); `unknown-glow` deleted (zero consumers).
- R2 raw colours — R: T1 healthy-green tile border → `--status-healthy-glow` (and `--status-unknown-bg` now backs the narrative band, resolving T4); T2/T3 critical-pulse literals → `--status-critical-glow/-border`; T5 reclassified: connectors used the *token* healthy-fg, now replaced by dedicated `--flow-edge-active` (M3).
- R3 dead selector — R: `.l2-triage-drawer-container` block deleted (T6–T8); `flow-line-active` keyframes also removed (dead).
- T9 `shadow-lg` ×3 — R: removed (plain `.flow-node` chrome).
- T10 `min-w-[10rem]` — R: removed (single source `.flow-node{min-width:140px}`).
- T11 `max-w-[90vw]` — kept in DrawerShell (functional narrow-window clamp; duplication with the dead block removed).
- T12 ad-hoc radii — R: `--radius-wall/card/pill` scale added; literals in domain-component.css now token-backed. Spacing scale still Tailwind defaults — D (per-site tokenization judged churn-positive; M1's real defects fixed below).
- T13 emoji affordances — R: ⚡/🛡 removed; mitigation actions get `.mitigation-button` (status-token chrome, no emoji).

**Missing scales (M1–M8)**
- M1 — R (scoped): `--chart-h/-tv` + `.wall-grid` row control added (see V2/V3/V10/V28/V38); no generic spacing token set — D.
- M2 — R (scoped): `h-chart xl:h-chart-tv` gives canvases a TV-scale height step; full TV type tier deferred — D.
- M3 — R: `--flow-edge-active` (connector-edge) separated from status tokens; non-semantic chart series hues unchanged where semantic — D (legend hues stay semantic; V17 judged them conformant).
- M4 — R: `--scrim` lightened to rgba(2,6,23,.45) + `--inert-copy-opacity: 0.62` token (`.inert-copy`) — backdrop copy lift from ~.24 to ~.34 effective contrast.
- M5 — R: mitigation action `.mitigation-button` now distinct from nav `smart-launcher-button` (V21/V29).
- M6 — R: emoji glyphs removed (mono/glyph affordances only).
- M7 — R: group pill (bg+banded) vs member rows (indented, transparent, status-border left rule) — hierarchy visible, not text-only (V5).
- M8 — D: legend/caption size step — heatmap legend rows unchanged; smallest visual gap, no token landed.

**Visual findings (V)**
- V1 R: wall titles wrap (break-words) — no `…` truncation; DOM check 0 clipped titles at TV.
- V2 R: desk wall rows even; no clipped tile (page scrolls naturally; no fixed-height clipping band).
- V3 R: TV wall fills the 16:9 viewport (2×4 even rows, proven `after/tv/wall.png`).
- V4/V27 R: member-row values never truncate (label left / value right, shrink-0); DOM proof 0 clipped values, both viewports.
- V5 R: see M7. V6/V18/V42/V46 R: see M4 (backdrop lifted; TV-only deep dim removed). V9/V47 R: footer pinned `sticky bottom-0` with opaque bg — Inspect-internals stays on screen (after-shot proof).
- V10/V28/V38 R: chart box scales (`h-chart xl:h-chart-tv`); wall grid no longer dead-space-prone.
- V12 R: connectors on `--flow-edge-active`. V13/V14/V17 — no change required (already conformant; group-title drill buttons kept).
- V15/V40 R: one convention now — neutral labels, status colour rides values/markers only (watchlist rows recoloured).
- V19/V23/V43/V48/V49/V50 — verification confirmations (one-live-instance, crumb chains, status mapping intact); unchanged.
- V20 R (partial): sticky footer + tightened drawer rhythm; sparse-drawer emptiness reduced (spacing-token redesign deferred).
- V22 R: degraded group/member extracts now carry `incidentStartedAt` upstream (mock layer); footer no longer contradicts displayed health.
- V25/V26/V31–V34, V44–V45 — workflow/annotation notes, no code defect (launchers-below-fold noted, deferred).

**Method notes**: Principle 1 preserved (all health/incident facts computed in mocks/mocks-level helpers; components only display). Shell navigation semantics (trail stack, DEPTH_CAP, goDeeper) untouched. Typecheck exit 0; dev server stopped after the after-sweep.

*End of report.*
