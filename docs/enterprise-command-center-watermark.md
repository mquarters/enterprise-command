# The Enterprise Command Center Watermark

*What "command center" must mean for vantage-ui — the canon every plan decision and spike
is scored against. Derived from `enterprise-command-center-prompt.md` (the prompt file) and its
cited findings [1–9]; paired with `docs/design-system-audit.md` (the token/visual audit) which
shares the same source material. Read this before the plan (`enterprise-command-center-plan.md`).*

## 1. The line between NOC and command center

The prompt's opening sentence is the whole test: a command center exists for
**"monitoring, analyzing, *and acting on* complex operational data streams across an organization."**
A NOC wall stops at *monitoring* — it watches one stream, it notifies, it is read.
A command center runs the full loop: **discover → orient → decide → act → confirm.**

| | NOC-adjacent (what vantage-ui mostly is) | Command center (the watermark) |
|---|---|---|
| Primary verb | watch, drill to *see more* | search, pick, **act**, confirm |
| Entry | walk the wall / hierarchy | guided discovery (search + filter chips) |
| Scope | one process/stream per surface | cross-dataset lookups, org-wide joins |
| Output | understanding | a **task resolved** or a transaction started |
| Modality | read-only wall legibility | read **and input**; desk→wall→mobile scaling |

Everything below is either a criterion scored pass/fail on a surface, or an explicit
"keep" statement. Criteria are written so a surface (wall, drawer, workbench, a spike)
can be checked against them without re-reading the prompt file.

## 2. Criteria (W-codes)

**W1 — The act loop closes.** Surfaces permit *direct task resolution or navigation to
transaction screens without page reloads* via contextual pop-ups, sliding drawers, and inline
views (prompt §Key Components, Action-Driven Overlays, refs [2, 6]). A degraded entity is an
*item to work*, not a thing to view. **Pass:** from any red cell an operator starts a
resolution action in ≤2 interactions, and the result persists as a queued/tracked task.
**Now:** FAIL — drill and chips only navigate; mitigation buttons (RuleGate/Flow) resolve nothing and leave no trace.

**W2 — Guided discovery exists.** A consumer-like search bar with Boolean parameters and
dynamic filter chips is a first-class way *in* (prompt §Key Components, Guided Discovery,
refs [2, 5]). **Pass:** `status:CRITICAL AND dataset:infra-03` typed once returns a usable
result set. **Now:** FAIL — the only "search" is walking the trail stack; `SmartLaunchers`
chips are navigation shortcuts, not queries.

**W3 — Discovery crosses datasets.** Multi-dataset lookups join operational streams —
metrics, logs, topology, and business context — instead of showing one stream per surface
(prompt §Key Components [2, 5]; §1 lists cross-cutting "Data visualization panels,
Interactive charts"). **Pass:** one panel answers a cross-stream question ("do payment
degradations correlate with topology errors?") without leaving the surface.
**Now:** FAIL — every surface is scoped to one process; the watchlist is the closest thing
and it is one-process-only.

**W4 — Visualizations are dense and comparative.** High-density summary bars, *multi-metric*
time-series, tag clouds, trellis scatter plots, "optimized for quick comprehension"
(prompt §Key Components, Data Visualizations, ref [5]). **Pass:** a chart carries ≥2
compared series (baseline/forecast/peer) and is graspable in a wall-glance; density never
drops below what a wall reader can decode. **Now:** PARTIAL — StatArchetype baselines exist
(UCL/Mean/LCL); no trellis/tag-cloud/scatter vocabulary; heat-strip is density with no legend.

**W5 — Status and priority have one grammar.** Status indicators, priority-level
indicators, and contextual information badges are *the same marks* everywhere (prompt §1
Status indicators; §Example Components). **Pass:** one legend per kind (status, priority,
severity) and a cell's meaning never depends on which canvas drew it. **Now:** PARTIAL —
audit V15/V40 unified the drawer's coloring convention, but per-canvas reinvention is allowed;
priority ≠ severity ≠ health still share one word ("red").

**W6 — Input affordances exist.** Input fields, dropdowns, and task-management widgets
(prompt §1; §Example Components) — the UI accepts commands, not just reads. **Pass:** every
primary surface has ≥1 enabled input control that changes state somewhere.
**Now:** FAIL — nothing in the app accepts input; every drawer is read-only detail.

**W7 — Operator ergonomics.** Dark-mode palettes, minimal visual clutter, human-centric
sightlines to prevent fatigue during extended shifts (prompt §Best Practices, ref [7, 8];
§2 Typography hierarchy, Layout principles; §Constraints "avoid unnecessary decorative
elements"). **Pass:** text below 12 px never carries information on any viewport; decorative
elements must pass a "serves an operational task?" gate; glance-time legibility at 3–6 m.
**Now:** PARTIAL — dark palette shipped; audit M2 (TV type pairing) and M8 (legend size) deferred,
V7 (heat-strip legend) deferred; some decoration remains (emoji glyphs — M6 deferred).

**W8 — Scaling is designed, not accidental.** Modular components and flexible dashboard
grids adapting **from desktop desks to video walls to mobile** (prompt §Best Practices,
refs [8, 9]; §2 responsiveness; §4 media queries). **Pass:** desk (1440×900), wall
(1920×1080), **and** a phone-width tier (~390×844) each render the core journey with zero
clipped values; grids reflow per tier. **Now:** PARTIAL — desk+wall handled (post-audit);
mobile absent; grids pinned to xl breakpoints.

**W9 — Layout flow and hierarchy.** Top-down, left-to-right flow; header / main content /
side panels as a deliberate hierarchy (prompt §3 Mockup Structure). **Pass:** each surface
names its primary zone (what answers "is anything wrong?") and secondary context lives in
panels, not floating over the work area. **Now:** PASS-with-debt — Shell header + right
drawer already match the header/main/panel pattern (audit §3.1); the debt is content
*inside* zones, not the zones.

**W10 — The journey is walkable end-to-end.** Initial access → data analysis → alert
management (prompt §3 User journey). **Pass:** a user lands, finds the degraded thing in
≤2 hops, and *acts on it*; alert management is a surface with a queue, not a side effect of
opening a drawer. **Now:** FAIL — the journey dead-ends at viewing; no alerts surface, no
queue, no act step exists to walk into.

**W11 — The CSS layer can express the system.** Responsive principles, media queries, and
utility classes for component styling (prompt §4 CSS Implementation). **Pass:** a new
component's chrome composes from named scales (spacing/type/radius/series hues); one-off
hex/px literals are the exception and get logged, not the rule (audit §5 R1–R8 discipline).
**Now:** PARTIAL — audit R5/R6/R8 mostly landed (wall-grid, chart heights, mitigation-button
class); dead-token sweep done; media queries still only `lg/xl`.

**W12 — Documentation outlives the sprint.** A README/design-system doc with purpose &
scope, a versioning and maintenance plan, and guidelines for component usage and
customization (prompt §5 Documentation). **Pass:** a contributor adding a component finds
(where to place it, what tokens apply, who reviews) without asking anyone.
**Now:** PARTIAL — audit report + terminology + field-guide exist (audit §5 R7's fix), but
there is no usage-guideline/versioning story; R7 was "document or delete," only half done.

## 3. How to score a surface against W-codes

- Score each surface **pass / partial / fail per W-code** before deciding keep/reshape/replace.
- A surface that **fails W1 (act loop)** is by definition still "a wall that reacts" —
  NOC-adjacent — no matter how good it looks.
- Cross-cutting checks: one-live-instance per entity (unchanged platform rule), glance-time
  legibility, and every derived number computed upstream — UI displays (Principle 1).
- Spikes (search+chips; action overlay/queue) must be scored against W1–W3, W5–W7, W10
  at both viewports **and** the mobile tier where applicable.

*Companion: `docs/design-system-audit.md` (token/visual evidence), `docs/terminology.md`
(what "layer/depth/archetype" mean here), `docs/viewing-model-field-guide.md` (how to read a page).*
