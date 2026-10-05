# Gap analysis — vantage-ui today vs the command-center watermark

*Task 2 deliverable. Companion to `enterprise-command-center-watermark.md` (W-codes) and
input to `enterprise-command-center-plan.md`. Verified against source as of 2026-10-04.*

## 1. Surface inventory (what exists today)

| # | Surface | What it is (verified in code) |
|---|---|---|
| S1 | **Shell chrome** | Persistent header (product, live badge, clock, pause) + context **trail stack** (breadcrumb frames, back) + backdrop; `SmartLaunchers` chip strip = contextual navigation shortcuts → `drillInto`. No search field, no alerts affordance. |
| S2 | **Wall / overview** (L1) | `.wall-grid` of `OverviewTile`s (2×4 at ≥1536px, scroll-natural below): per-process tile = health color, one-line narrative, trend spark, metric rows. Tile click → workbench. Desk variant exists (`overview-tile-desk`). |
| S3 | **Workbench / process pages** (L3) | `ArchetypeCanvas` (header: name, legend, meta) + one archetype per process: FLOW (payment-01, auth-02), TOPOLOGY (infra-03: 4 grids / 27 members), STATISTICAL (card-05: baselines + charts), RULE_GATE (pci-04, liquidity-06), HEATMAP (fx-07). Child-drill chips for non-mirrored children; `mitigation-button` in FLOW/RULE_GATE dispatches `onExecuteMitigation` → **Shell stub `console.info + window.alert`** (App.tsx ~370). |
| S4 | **Drawer layer** (L2) | `DetailDrawer` in `DrawerShell`: entity detail (metrics, narrative, watchlist rows with group/member drill buttons, sticky footer "Inspect internals" → deep view). Opens from wall and workbench. |
| S5 | **Deep views** (DEPTH_CAP=3) | infra-03 fleet drill (PL→region→cluster→member cells), payment-01 n1 private mini-FLOW, watch-jump paths (watchlist → cross-process deep view). |
| A1 | **Data substrate (asset)** | `processStateMocks.ts` (1,274 lines): precomputed health/narrative/deep payloads, group rollups, `seedIncidentStart` — Principle 1 source. `plugin-registry.ts` maps archetype name → renderer. |
| A2 | **Token substrate (asset)** | `variables.css` (~44 vars incl. post-audit additions), `domain-component.css` (`.wall-grid`, `.flow-node`, `.mitigation-button`, `.smart-launcher-button`, `.detail-narrative`…), Tailwind mappings (`surface/ink/tv/desk/console/glow/edge.active/chart`). |

## 2. W-code scores (pass / partial / fail per surface)

| Surface | W1 act loop | W2 search | W3 cross-dataset | W4 dense viz | W5 status grammar | W6 input | W7 ergonomics | W8 scaling | W9 layout flow | W10 journey | W11 CSS expressiveness |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 Shell | **F** (no act affordance) | **F** (no search anywhere) | P (trail is per-process) | — | P (legend lives per-canvas) | F (clock/pause only) | P (backdrop contrast fixed, copy still dim) | P (no mobile tier) | **P** (header/main/panel correct — audit §3.1) | **F** (no journey entry beyond walking) | P (chrome mostly token-mapped) |
| S2 Wall | **F** (tile click = navigate only) | F | F (one process per tile) | P (spark + metric rows; single-stream) | P (tile legend per-archetype) | F | **P** (wall-legible after audit fixes; fixed 2×4) | P (grid reflows but xl-pinned) | P | **P** (awareness tier only) | P |
| S3 Workbench | **F** (mitigation dispatches into a `window.alert` stub) | F | F (canvas = one process's one stream) | P (Stat baselines; no trellis/scatter/tag cloud) | P | F | P (heat-strip legend still missing, audit V7) | P | **P** | **F** (dead-ends at viewing) | P |
| S4 Drawer | **F** (Inspect internals = navigate, not act) | F | **P** (watchlist + watch-jump = seed of cross-entity discovery) | P | P | F | P | P | **P** (right panel matches pattern) | **F** (no queue) | P |
| S5 Deep views | F | F | P | P (heat-strip no legend; region grids map-ish) | P | F | P | P | P | F | P |

No surface scores better than PARTIAL on W1/W2 — the two criteria that define "command
center, not NOC". The app is a **wall that can drill**: awareness and navigation tiers
exist; analysis is partial; **action is absent by construction**.

## 3. Prompt §1 component list — presence check

| Prompt §1 item | Present today? | Note |
|---|---|---|
| Dashboard widgets | **Yes** | `OverviewTile` (wall + desk variants) |
| Data-visualization panels | Partial | archetype canvases exist but are per-process silos (W3 fail) |
| Interactive charts | Minimal | clickable nodes/cells navigate only; no brush/zoom/series-toggle; V26 kept group-title drill buttons but interactivity ≠ analysis |
| **Alerts and notifications** | **No** | health color + narrative only; no alert feed, queue, or ack state |
| **Input fields and dropdowns** | **No** | grep: zero `input/select/textarea` in `components/` |
| Navigation and menu structures | Yes | trail stack, chips, watch-jump — navigation-only tier |
| Status indicators | Yes, fractured | one convention after audit V15/V40, but health/priority/severity still share one red (W5) |
| **Error handling and feedback** | **No** | the only act affordance terminates in `window.alert` — a placeholder, and clutter by W7 |
| Example: real-time data panel | Partial | heat-strip (no legend, V7) |
| Example: task-management widget | **No** | the prompt's example set assumes a task *substrate* exists; none does |
| Example: priority-level indicator | **No** | priority ≠ health; no priority concept in types/mocks |
| Example: contextual info badges | Partial | legend/meta glyphs exist; not a badge grammar |

## 4. Prompt §2–§5 — practice presence

- **§2 styling**: dark palette + distance-based type scale + `--chart-h` exist (post-audit); deferred M2 (TV type pairing), M8 (legend size step), iconography still emoji-adjacent (M6 deferred) — "avoid unnecessary decorative elements" not yet a gate.
- **§3 mockup structure**: header/main/side-panel hierarchy correct (audit §3.1 PASS-with-debt); journey (initial access → analysis → **alert management**) breaks at alert management — no such surface exists to walk into.
- **§4 CSS**: token layer + mappings exist; media queries sparse (wall-grid, chart height); utility layer thin — new components today need ad-hoc classes (audit §5 R2 discipline applies to every spike).
- **§5 docs**: README/terminology/field-guide/audit exist, but R7's "document **or delete**" landed half-done: there is no component-usage guideline or versioning/maintenance plan — the prompt's §5 deliverable is not yet met by any doc.

## 5. What has no home anywhere (the actual delta)

1. **Act loop target** — mitigation dispatches exist but resolve into `window.alert`; no state, no queue, no confirmation (W1, W10).
2. **Guided discovery** — no search bar, no Boolean/filter chips, no cross-dataset lookup (W2, W3).
3. **Input affordances** — zero input components app-wide (W6).
4. **Priority & severity semantics** — one color carries health, severity, and "reference only" meaning (W5).
5. **Mobile tier** — desk+wall handled; ~390px absent (W8).
6. **Design-system doc with maintenance plan** — the §5 deliverable (W12).

**Assets worth keeping** (per posture decision — restructurable, not sacred): the mocks
substrate already computes rollups/narratives upstream (Principle 1 intact) — it is the
right shape to feed search + queues; the token layer post-audit can absorb new scales;
the drawer is structurally the prompt's "action-driven overlay" with its *action half
unbuilt* — reshape candidate, not replace.

*Conclusion: every surface fails or barely passes W1–W2; the conversion plan's center of
gravity must be (a) discovery (search+chips+cross-dataset) and (b) the act loop
(queue/overlay/feedback), with monitoring surfaces reshaped around them — not more wall
legibility.*
