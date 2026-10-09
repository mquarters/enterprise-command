# Reference sheet — what command-center screens actually look like

*Throwaway composition canon for the triage-mock re-attempt. Sources actually fetched
this session: Oracle EBS User's Guide + Extending ECC (layout rules, refs 2/3/5),
Kesino Consoles + One Diversified (control-room ergonomics, refs 7/8), plus the W-code
canon in docs/enterprise-command-center-watermark.md. Every rule is a COMPOSITION
DIRECTIVE — a thing the page does — not a decoration note.*

**R1 — Main zone is a WORK SURFACE, not a status mirror.** The primary ~70% of the
page answers "what do I do, in what order, with what context?" (triage queue, case
list, act controls). The auxiliary ~30% carries context (legends, search results,
queue peek) — never floating over the work area. [Oracle 70/30 + "back-and-forth
navigation not necessary"; W9]

**R2 — One panel may answer ONE OPERATIONAL QUESTION across streams.** A chart panel
joins streams (payment latency ↔ Kafka backlog ↔ queue backlog) with compared
series + baselines/peers in the SAME chart, legend right-placed, borderless panels.
A single-metric gauge per entity is NOC furniture. [Oracle charts guidance; W4]

**R3 — The act loop is visible in the layout.** Every degraded item is an ITEM TO
WORK: priority mark + state chip + owner + age + act affordance, with state
transitions (ACK → MITIGATING → RESOLVED), inline feedback, and a trail with
timestamps. Acting from a search result CARRIES the filter context (pre-populated,
no re-query). [Oracle "identify and act on top priorities", "pre-populated… no
re-querying"; W1]

**R4 — Search is an entry verb.** Query bar + filter chips that RECALCULATE
refinement options per result set; cross-dataset result rows jump to live
instances (one live instance per entity, never two). [Oracle "search choices
recalculated"; W2/W3]

**R5 — Three grammars, three affordances.** Health = hue (with legend), priority =
shape (●●●/●●/● + P-label, no hue borrowed from health), queue state = WORD chip
(NEW/ACK/MITIGATING/RESOLVED). One legend per kind, right-placed; never one shared
"red" doing three jobs. [W5; audit R3/M3]

**R6 — Hierarchy marks are visible, not text-only.** Group rows (banded, bg + ▸)
vs member rows (indented, transparent, status-border left rule). [M7]

**R7 — At wall distance the same work surface must stay readable.** TV type tiers
(title/label + legend/caption tiers), chart heights at wall scale (h-chart →
h-chart-tv), no information below the size floor, glance-time decode; dark palette
kept, clutter minimal — "make complexity feel simple." [Kesino sightlines/fatigue;
One Diversified clutter; Oracle layout; W7/W8]

**Anti-patterns that keep collapsing to NOC (watch for these in the re-read):**
per-entity status-mirror grid as the primary zone; gauge-per-entity density;
decorative search bar; legend-less charts; one shared "red" for health/severity/
priority; act affordances that resolve into nothing.
