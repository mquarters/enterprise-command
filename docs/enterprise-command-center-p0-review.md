# P0 review pack — mockup gate for the command-center plan

*Throwaway mock pages built under plan §2 P0 (docs/enterprise-command-center-plan.md).
Everything here is review evidence, NOT commitments: the pages live in
`scratch/mockups/` (throwaway harness, never under src/) and the screenshots in
`docs/assets/mockups/` (git-ignored, regenerated locally). Method per P0: static pages
reuse the real `variables.css` tokens (no new colors) and a ~50-line mock dataset in
processStateMocks shapes (real entity strings, so truncation is catchable — audit V4/V27).*

**How to re-run the evidence:** `scratch/mockups/*.html` opened in Playwright at
1920×1080 / 1440×900 / 390×844 (clean + red-outline annotated pairs + manifest.json in
`docs/assets/mockups/`). All runs: **0 console/page errors**.

## 1. Wall + docked search (wall.html) — TV + desk

**Gate verdict: PASS with caveats (C1/C2).**

| W-code | Score | One-line justification |
|---|---|---|
| W2 (guided discovery) | **PASS** | Query bar + removable chips; offered refinements RECALCULATE from the result set (dataset:/kind: chips derived per result) — not a static facet list. |
| W3 (cross-dataset) | **PASS** | One rail joins PROCESS / FLOW_NODE / QUEUE_CONSUMER / INFRA_MEMBER / GATE rows; jump = one frame. |
| W4 (dense viz) | PARTIAL | Grid fits the viewport but tiles are sparse (title+hero only); density below audit V2 bar — mock proves fit, not yet density. |
| W7 (ergonomics) | **PASS (TV)** | 0 truncated elements at 1920×1080 (F1 re-test passes). Desk 1440×900: **1 truncated result row** — long kind·label·detail rows clip (finding C1). |
| W8 (scaling) | PARTIAL | Fits both desktop tiers; below-lg reflow not exercised in the mock (mobile page covers the small tier). |
| W9 (layout flow) | **PASS** | main ~70% (wall grid) / auxiliary ~30% (legend+results+queue rail) with right-placed legend — the source proportions hold. |

**Proofs:** F1 (vertical budget) — search docked INSIDE the header band keeps the wall
inside the viewport budget: fit=true, 0 clipped tiles at TV. 70/30 split renders at real
sizes. **Caveats:** C1 — long result rows need a wrap/2-line rule (V4/V27 class, caught
pre-code). C2 — tile internal whitespace (density work belongs to P3, not this gate).

## 2. Workbench + docked queue rail (workbench.html) — TV + desk

**Gate verdict: PASS with caveat (C3).**

| W-code | Score | One-line justification |
|---|---|---|
| W1 (act loop) | **PASS** | Act from a search result or mirrored cell in ≤2 interactions; the act overlay **carries the filter context** (query chip persists into the act target — the Oracle "pre-populated, no re-querying" rule). |
| W3 | **PASS** | Workbench search slot joins cross-dataset results over the canvas (matched cells outline in `--flow-edge-active`). |
| W4 | PARTIAL | Legend glyphs (■○▲▼) legible but small at desk size — legend SIZE tier is still deferred (M8 class). |
| W5 (grammar) | **PASS** | Three meanings, three grammars: health legend (right of canvas, health states ONLY), priority ●●●/●●/● in the queue rail, no shared "red". |
| W9 (layout flow) | **PASS** | Queue rail DOCKED as secondary zone (F3 dead band gone: 0 dead-space probes fired); legend right-placed per source rule. |
| W10 (journey) | **PASS** | land → search → jump → act → queue walkable; error case has inline feedback + retry (R4 discipline). |

**Proofs:** F3 (rail docked, canvas flexes — do-not-ship finding from the spike era, now
answered at layout level); right-placed legends; act-context carried. **Caveat:** C3 —
act-overlay placement is sketched as floating; production should dock it (F3 class).

## 3. Mobile tier (mobile.html) — 390×844

**Gate verdict: PASS with required fix (C4).** Walk recorded end-to-end by Playwright:
query → 10-result list → result tap → act sheet → ACKNOWLEDGE→MITIGATING with queue-peek
update, no reload (W10 walkable at mobile width, W1 operable, W3 cross-dataset rows).

| W-code | Score | One-line justification |
|---|---|---|
| W1 | **PASS** | act control operable; state change persists to queue peek (no reload). |
| W2 | PARTIAL | search grammar present; chip recalculation only partially modelled at mobile. |
| W3 | **PASS** | Cross-dataset rows joined in one mobile list. |
| W4/W27 class | **FAIL → finding** | **3 result rows truncated** (kind·label·detail clipped at 390px). The truncation detector caught a V4/V27-class problem BEFORE code — exactly the gate's purpose. Fix rule inherited: full-width rows, wrap or two-line layout, values never truncate. |
| W8 | PASS-caveat | stacked layout operable; the truncated rows above must be fixed in any production tier. |
| W10 | **PASS** | initial access → analysis → act walkable without leaving the page. |

## 4. Spike-fragment re-score (branch `spike/command-center-spikes`)

Scored by direct code review against the TIGHTENED W-tests (the fragments predate them):

| Fragment | Tightened-test result | One-line justification |
|---|---|---|
| Search + filter chips | W2 **PARTIAL→narrowed**, W1-context clause **FAIL** | Chips were removable QUERY TERMS (activeChips parses the query string), not recalculated result options; and jumpToResult() **cleared the query**, so acting after a jump restarted context — the no-re-query clause the mock pages now satisfy. |
| Action overlay / queue rail | W1 shape **PASS** | Act path resolved without reload (NEW→ACK→MITIGATING→RESOLVED machine, origin populated) but queue rows carried no filter context (origin label only). |

**Net:** the fragments proved the interaction SHAPE; the P0 mock pages close both gaps —
recalculated chips and context-carrying act targets now exist at layout level and are
what a later implementation phase must build from.

## 5. Decision log

- **Proven:** F1 fix (TV fit, docked search); 70/30 main/aux; right-placed per-kind
  legends; W5 three-grammar split; W1 act loop incl. no-re-query context carry; mobile
  tier can carry the full journey; truncation detector works (3 catches before code).
- **Disproven / fixed at layout level:** static-facet chips (spike era) → recalculated
  refinements; dead band between canvas and rail (F3) → docked rail.
- **Unproven (deferred, with reason):** production-scale live-instance checks (mock had
  8 rows; rule itself respected in mock layouts); queue TICK recompute; mobile native
  gestures; legend SIZE tier (C3/M8 class); W4 density bar for the wall (C2 → P3).
- **Per-page gate summary:** wall PASS(C1,C2) · workbench PASS(C3) · mobile PASS(C4,
  C4 = required pre-code fix) · spike re-score COMPLETE (gaps recorded, none blocking).

*Evidence files: docs/assets/mockups/{wall,workbench,mobile}-*{clean,annot}.png +
manifest.json (git-ignored). Harness: scratch/mockups/ (throwaway, untracked). No
shipped component, token, or mock file was touched building this pack.*
