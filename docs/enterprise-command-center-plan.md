# Enterprise Command Center — conversion plan

*Task 3 deliverable. Read with `enterprise-command-center-watermark.md` (W-codes = the
watermark criteria) and `enterprise-command-center-gap-analysis.md` (surface scores).
Every decision cites the W-criterion it serves; per-surface decisions are keep/reshape/replace
per the agreed posture (existing surfaces are restructurable; primitives, tokens, and the
mocks layer are reusable assets, not sacred).*

## 1. Decision matrix (per surface)

| # | Surface | Decision | One-line rationale (W-linked) |
|---|---|---|---|
| S1 | Shell chrome (header, trail stack, backdrop, SmartLaunchers) | **RESHAPE** | Keep the trail-stack orientation (W9 passes), add the two permanent command-center affordances it lacks: a **search entry** (W2) and a **queue/act affordance** (W1, W10); SmartLaunchers chips get superseded by query-scoped filter chips — keep-or-retire decided in P5. |
| S2 | Wall / overview grid (L1) | **KEEP, reduced in role** | Wall stays the *awareness tier* (W4/W7 partial scores come from density/legibility debt, not from existing); it stops being the only way in once search + queue exist (W2, W10). |
| S3 | Workbench canvases | **PER-ARCHETYPE** (below) | Canvas family is the wrong answer for some archetypes and the right answer with new scales for others. |
| S3a | — FLOW (main + n1 mini) | KEEP | Already prompt-shaped (top-down flow, legend, connectors); add act affordances only (W1). |
| S3b | — TOPOLOGY grids (fleet) | KEEP + legend | Grids/mirror entries work; add per-kind legend (W5) and priority marks (W5). |
| S3c | — STATISTICAL | **RESHAPE** | Baselines exist but single-stream; becomes the multi-metric comparative panel (peer/baseline series, trellis-scatter candidate) — W4. |
| S3d | — RULE_GATE | **RESHAPE** | Its gates decide nothing; mitigation clicks must resolve into queue state, not `window.alert` — W1, W10. |
| S3e | — HEATMAP | **REPLACE candidate** | The legend-less density suspect (gap §2 "wall that reacts"); replace with legend-carrying comparative visualization (trellis scatter / ranked bars) if P3 scoring still fails W4. |
| S4 | Drawer layer (DetailDrawer/DrawerShell) | **RESHAPE** | Structurally already the prompt's "action-driven overlay" with the **action half unbuilt**; add input affordances + act controls (W1, W6); keep sticky footer and read-only detail where it serves orientation. |
| S5 | Deep views (fleet drill, mini-FLOW, watch-jump) | **KEEP concept / RESHAPE content** | The orientation tier under search/queue is worth keeping; contents get legends, priority grammar, and mobile-tier scaling (W4, W5, W8). |
| A1 | Mocks substrate (`processStateMocks.ts`, registry) | **KEEP + EXTEND** | Right shape to feed the new loop: search corpus, queue records, and priority rollups get computed **upstream** here (Principle 1 preserved); registry gets plugin-kind entries, not component-name branches (constraint §3.1). |
| A2 | Token layer (variables.css, domain-component.css, tailwind mapping) | **KEEP + EXTEND** | Post-audit layer can absorb what it currently cannot express: spacing family (M1), TV type pairing (M2), priority hues (M3/R3), legend/caption size (M8), mobile tier (W8). |

## 2. Phases

Each phase ends with: DOM probes (clip checks), full Playwright sweep at the viewports
named, before/after comparison, `npm run typecheck` = 0, dev server stopped.

### P1 — Discovery spine (search → filter chips → results) [W2, W3, W9]
- **Build**: global search bar (Shell header, top-left reading axis) parsing Boolean grammar
  (`status:CRITICAL AND dataset:infra-03 AND kind:cluster`); query-scoped filter chips
  (chips *modify results*, unlike navigation chips) whose offered refinements are
  RECALCULATED from each result set — a static facet list is the NOC pattern and fails
  canon W2's tightened test ("search choices… recalculated" — Oracle guides, ref 5);
  cross-dataset result list joining
  processes, fleet entities, and narrative context; results deep-link to the entity's
  existing live instance (one-live-instance rule untouched).
- **Data**: search corpus + query evaluator live in `processStateMocks`/mocks layer —
  the UI renders result sets, never computes them (Principle 1).
- **Tokens/CSS**: query bar and result rows compose from existing scales; new tokens need
  consumers before shipping (audit R5/R6 discipline).
- **Accept**: typing one query from any top-level surface returns a usable result set
  whose refinement options were recomputed from the result (W2 test); empty-state and
  no-match feedback exist (audit R4 pattern); zero second live instance.

### P2 — Act loop (queue + action overlay + feedback) [W1, W6, W10]
- **Build**: work-queue rail (persistent context panel, secondary zone per W9) holding
  task records with upstream-computed state `new → acknowledged → mitigating → resolved`;
  mitigation controls (FLOW/RULE_GATE) and drawer act controls dispatch *into* the queue —
  the `window.alert` stub is deleted (W7 clutter too); action results render as inline
  success/error feedback with retry affordance (audit R4).
- **Data**: queue records + transition rules computed in mocks; TICK cadence may recompute
  queue state (live badge semantics unchanged).
- **Accept**: from any degraded cell an operator starts a resolution in ≤2 interactions;
  queue state persists across navigation without page reloads (prompt §Key bullet 3);
  acting from a search result or drill carries the discovery context to its act target
  (pre-populated, no re-querying — canon W1's source wording); alert-management journey
  (initial access → analysis → alert management) walkable (W10).

### P3 — Analysis density (comparative charts, priority grammar) [W4, W5]
- **Build**: STATISTICAL reshape to multi-metric (peer/baseline comparison series,
  series-toggle; group-title drill buttons per audit V26 kept); HEATMAP → legend-carrying
  comparative viz (trellis scatter or ranked bars; replace candidate S3e decided here by
  scoring); one legend **per kind** (status / priority / severity — three meanings, three
  grammars; W5); priority hues added as a separate token family (audit R3/M3 fold-in).
- **Tokens/CSS**: legend/caption size tier added (fold-in deferred **M8**); chart families
  get media-query scaling instead of one xl-pinned height (W8 debt, finalized in P4).
- **Accept**: every chart with ≥2 series has a legend and passes a glance-time decode test;
  priority and health hues distinguishable at both viewports; legend type ≥10 px (M8).

### P4 — Ergonomics & scaling (desk → wall → mobile) [W7, W8, W9]
- **Build**: mobile tier (~390×844) where search, queue, and drill remain operable —
  grids reflow via the existing `.wall-grid` mechanism extended with a below-lg rule and
  mobile drawer (full-width sheet instead of 480px rail); TV-type pairing tier (title/label
  and legend/caption sizes at wall distance — fold-in deferred **M2**); spacing-scale family
  `--sp-1…6` replacing ad-hoc gap/padding literals (fold-in deferred **M1**); per-surface
  primary-zone declarations checked against sightline order and the source's proportions
  (main ~70% / auxiliary ~30%, borderless chart/summary layers, legends right-placed —
  canon W9's tightened test, refs 5/7/8).
- **Accept**: zero clipped/truncated values at 390×844, 1440×900, 1920×1080; spacing
  literals either on the scale or logged as exceptions; sweep harness gains the mobile viewport.

### P5 — System doc & maintenance (prompt §5 deliverable) [W11, W12]
- **Build**: `docs/design-system.md` — component usage & customization guidelines
  (what a new control must cite to ship: token scales, legend kind, live-instance rule,
  Principle 1), token ledger re-count (44-var baseline drifts as scales are added), and a
  versioning/maintenance plan (who reviews, when the sweep re-runs, how a token retires —
  completes audit R7's "document **or delete**" half); promote the sweep harness
  (testid selectors + per-viewport matrix) to a repeatable Playwright project.
- **Accept**: a contributor adds one component following only the docs, without asking
  anyone (walkthrough documented as proof); docs cross-check clean against terminology.md.

## 3. Cross-phase constraints (in force everywhere)

1. **Principle 1**: search parsing/scoring, queue state, priority/health rollups — all
   computed upstream in the mocks layer; components display. No branching on archetype names.
2. **One live instance per entity, never zero, never two** — results, queue rows, chips,
   and legends are *views/mirrors* that deep-link to the live instance.
3. **Context-depth budget (DEPTH_CAP = 3) counts context frames, not entity depth** —
   search jumps follow the watch-jump precedent; no new free-depth teleports.
4. **Image budget**: screenshot inspection in ≤25–30-image chunks (session rule).
5. **Token discipline**: new scales land *with* consumers; every off-system literal is
   logged in the plan ledger or fixed on the spot (audit §5 R1–R8 continue to apply).
6. Verification always: DOM probe (scrollWidth vs clientWidth on `data-testid` elements)
   + full sweep + typecheck; compare against `docs/assets/audit/` baselines.

## 4. Spikes (built on the scratch branch under this goal; throwaway, never merged)

- **Spike A — search + filter chips** (P1 shape): Boolean query bar, dynamic result-scoped
  chips, cross-dataset result list, empty/no-match/error states.
- **Spike B — action overlay + work-queue** (P2 shape): queue rail with state transitions,
  inline action controls with result feedback (success pill / inline error + retry),
  priority marks distinct from health, act path from a degraded cell in ≤2 interactions.
- **Method**: prototype in place (not production-grade), screenshot-verify at 1920×1080 +
  1440×900 with 0 console errors, score against W-codes; findings feed the plan revision —
  the spikes prove the plan's riskiest assumptions, they do not pre-build the conversion.

## 5.5 Spike findings (evidence from the throwaway branch, not commitments)

The spikes (Spike A search/chips/results; Spike B queue rail/act path) proved the plan's riskiest
assumptions and surfaced four findings — recorded here so the implementation goal inherits them:

- **F1 — vertical budget on TV.** Inserting the search bar made the wall scroll (the `100vh − 13rem`
  grid calc predates the bar; bottom row clipped in `spike-tv-wall-idle`). P1 must dock the bar
  into the header band or shorten the grid calc — W8 (scaling is designed, not accidental).
- **F2 — floating content needs an opaque layer.** The result list rendered on `--surface-overlay`
  (α .55) and the grid bled through behind the rows. Production result panels/lists need the
  raised/elevated tier with shadow — audit R4 ("empty states and result feedback deserve their
  own affordance") generalized: *content layers need elevation*, W7.
- **F3 — workbench dead band.** With the queue rail beside a width-capped canvas, right-side dead
  space appears (spike wb-queue shots). Production: rail docks as the persistent context panel
  (W9 secondary zone), canvas flexes to fill — do not ship the flex-gap sketch as-is.
- **F4 — priority grammar works.** The ●●●/●●/● shape marks stayed distinguishable from health
  hues at both viewports (and read in one glance) — keep shape+text as the priority carrier and
  add the hue family on top only if P3 scoring demands it, W5.

## 6. Prompt-requirements coverage ledger (self-review vs `enterprise-command-center-prompt.md`)

Every prompt item, addressed (A) or deferred (D) with justification + W-code served:

| Prompt requirement | Status | Where / why (W-codes served) |
|---|---|---|
| Dashboard widgets | **A** | S2 keep-reduced: wall grid stays the awareness tier (W4, W7) |
| Data-visualization panels | **A** | P1 cross-dataset result panel + P3 comparative reshapes (W3, W4) |
| Interactive charts | **A** | P3 series-toggle/brush candidates; V26 group-title drill buttons preserved (W4) |
| Alerts & notifications | **A** | P2 work-queue = the alert-management tier with persistent state (W1, W10) |
| Input fields & dropdowns | **A-partial** | P1 search input + removable filter chips; free dropdowns **D** — chips + query grammar express the same filtering with fewer clicks; revisit only if a P-spike shows chips insufficient (W2, W6) |
| Navigation & menu structures | **A** | trail stack kept (orientation tier); search added as second entry (W2, W9) |
| Status indicators | **A** | one grammar per kind (status/priority/severity), per-kind legends (W5) |
| Error handling & feedback | **A** | empty/no-match state (P1), inline error + retry on actions (P2); F2 carries the elevation rule forward (W7) |
| Real-time data panels | **A** | heat-strip keep-or-replace decided by P3 scoring against W4 |
| Task-management widgets | **A** | queue rail + queue substrate (P2) — task records, not decorations (W1, W10) |
| Priority-level indicators | **A** | shape grammar shipped in spike (F4); hue family lands P3 with legend (W5) |
| Contextual info badges | **A-partial** | legend/badge kind-grammars in P3; a full badge catalog **D** — no consumer proven yet (W5) |
| Color palette | **A** | dark palette kept; priority hues added as separate family (W5, W7) |
| Typography hierarchy | **A** | P4 TV pairing tier (title/label + legend/caption tiers; audit M2/M8 fold-in) (W7) |
| Layout principles | **A** | P4 spacing family + sightline ordering; F3 docked-rail rule (W7, W8, W9) |
| Iconography & symbols | **A-partial** | mono-glyph + shape affordances only (audit M6 spirit); full icon set **D** — prompt's own constraint is "avoid unnecessary decorative elements" (W7) |
| Layout flow (top-down, left-right) | **A** | search on the reading axis (P1); rail/panels in secondary zones (W9) |
| Component hierarchy (header/main/side) | **A** | header + main + side panels kept and extended — queue rail is the new side panel (W9) |
| User journey (access→analysis→alert mgmt) | **A** | P2 acceptance: land → search → jump → drawer → workbench → mitigate → queue walkable end-to-end (spike proved the shape) (W10) |
| Responsive + media queries | **A** | P4 mobile tier (~390×844) + below-lg reflow; F1 is the first regression this catches (W8) |
| Utility classes for components | **A** | spikes composed from existing utilities; R2 discipline continues: new scales land with consumers (W11) |
| Design-system README (purpose/scope, versioning + maintenance, usage guidelines) | **A** | P5: `docs/design-system.md` + token-ledger re-count + sweep-harness promotion — completes audit R7 (W12) |

**Overall conclusion:** the prompt's four deliverables are mapped (component list → gap analysis
§2–§3 + this plan §1–2; mockup overview → spikes A/B + P1/P2; CSS structure → P4 + F1–F3
findings; documentation summary → P5 + the watermark canon). No prompt requirement is left
unaddressed without a recorded deferral reason.

*End of plan.*
