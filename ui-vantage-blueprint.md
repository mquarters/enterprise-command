# Consolidated System Blueprint: Domain-Driven Command Center Platform

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           1. ENRICHED DATA PIPELINE                               │
│     Evaluates business logic, health rules, and blast radius in the DB layer      │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                        WebSocket / SSE Stream (Polymorphic Payload)
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         2. CORE PLATFORM UI SHELL                                 │
│         Hosts Plugin Registry, Global State Router, and Smart Launcher Engine     │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
      ┌───────────────────────────────────┼───────────────────────────────────┐
      │ Auto-renders array                │ Auto-renders container            │ Mounts on demand
      ▼                                   ▼                                   ▼
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│ 3. TIER L1 VIEW           │   │ 4. TIER L2 VIEW           │   │ 5. TIER L3 VIEW           │
│ (NOC Wall Display Grid)   │   │ (Triage Drawer Container) │   │ (SRE Workbench Workspace) │
│ ┌───────────────────────┐ │   │ ┌───────────────────────┐ │   │ ┌───────────────────────┐ │
│ │ L1 Micro Components   │ │   │ │ L2 Micro Components   │ │   │ │ L3 Archetype Shells   │ │
│ │  - L1ProcessCard      │ │   │ │  - L2NarrativeBanner  │ │   │ │  - Flow Canvas        │ │
│ │  - HeroValue          │ │   │ │  - L2BlastRadiusBadge │ │   │ │  - ControlLimitChart  │ │
│ │  - PulseAlertHalo     │ │   │ │  - SmartLauncherGroup │ │   │ │  - ClusterNodeGrid    │ │
│ └───────────────────────┘ │   │ └───────────────────────┘ │   │ └───────────────────────┘ │
└───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘

```

---

## 1. The Enriched Data Pipeline (Data Engine)

The backend pipeline processes business rules, threshold evaluations, and impact metrics before emitting data. Instead of raw telemetry, it streams a single **Polymorphic State Envelope** (`ProcessStatePayload`) over WebSockets to power all view levels simultaneously.

### Canonical Data Contract

```
+-----------------------------------------------------------------------------------+
| PROCESS STATE ENVELOPE (ProcessStatePayload)                                      |
+-----------------------------------------------------------------------------------+
| HEADER        : processId, title, ownerTeam, updatedAt, healthState               |
| L1 EXTRACT    : heroMetricLabel, heroMetricValue, trendDirection                  |
| L2 EXTRACT    : narrativeSummary, impactedCount, impactedUnit, primaryFailureKey  |
| L3 DOMAIN DATA: archetype ('FLOW'|'STATISTICAL'|'TOPOLOGY'|'RULE_GATE'),          |
|                  l3Payload                                                        |
+-----------------------------------------------------------------------------------+

```

* **Health Engine Rule:** `healthState` (`HEALTHY`, `WARNING`, `CRITICAL`, `UNKNOWN`) is computed upstream to prevent UI client re-calculation lag.

---

## 2. Core Platform UI Shell & Plugin Architecture

The **Platform Shell** acts as the parent host environment. Feature teams build isolated **Process Plugins** using a unified SDK, which register their L3 visual views and metadata with the Shell.

```
                           ┌─────────────────────────┐
                           │      PROCESS PLUGIN     │
                           ├─────────────────────────┤
                           │ - Metadata & Identity   │
                           │ - Archetype Selector    │
                           │ - Custom L3 Component   │
                           └────────────┬────────────┘
                                        │
                                        ▼ (Registers via `@platform/ui-sdk`)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ CORE PLATFORM UI SHELL                                                           │
│                                                                                  │
│ ┌──────────────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ PLUGIN REGISTRY                  │  │ WEBSOCKET DATA MANAGER                 │ │
│ │ (Map of registered process keys) │  │ (Ingests DB stream & validates schema) │ │
│ └─────────────────┬────────────────┘  └───────────────────┬────────────────────┘ │
│                   │                                       │                      │
│                   └───────────────────┬───────────────────┘                      │
│                                       ▼                                          │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ AUTOMATED VIEW CONTROLLER                                                    │ │
│ │  - L1 View: Iterates registry to render array of <L1ProcessCard /> items.    │ │
│ │  - L2 View: Opens <L2TriageDrawerContainer /> on tile click.                 │ │
│ │  - L3 View: Mounts registered L3 Archetype layout on workbench request.      │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘

```

### The Smart Link Context Injector

When an operator transitions out of the platform into third-party observability tools, the Shell dynamic link generator passes structured state:

* Time window bounds (`from`, `to`).
* Filtered tags (`process_id`, `cluster_id`, `trace_id`).

---

## 3. View Containers vs. Micro-Component Primitives

The system strictly divides **View Containers** (the layouts and grids) from **Micro Components** (the reusable UI building blocks).

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ TIER L1 VIEW (NOC Wall Display Grid)                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐        │
│ │ L1ProcessCard        │ │ L1ProcessCard        │ │ L1ProcessCard        │ ...    │
│ │ (Billing Ingestion)  │ │ (Auth Pipeline)      │ │ (Kafka Cluster)      │        │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘        │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ Click Tile
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ TIER L2 VIEW (Triage Drawer Overlay)                                              │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ L2NarrativeBanner  │  L2BlastRadiusBadge  │  SmartLauncherGroup               │ │
│ └───────────────────────────────────────┬───────────────────────────────────────┘ │
└─────────────────────────────────────────┼─────────────────────────────────────────┘
                                          │ Click "Launch SRE Workbench"
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ TIER L3 VIEW (SRE Workbench Page)                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ L3 Archetype Container (Flow Canvas / Control Chart / Mesh Grid)              │ │
│ │ Populated by Micro-Primitives: FlowNodes, Metric Gauges, Stage Trackers       │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘

```

### Tier Structural Breakdown

| Tier Level | Container View (The Canvas) | Contained Component Primitives (The Elements) | Visual & Operational Rules |
| --- | --- | --- | --- |
| **Tier L1** | **`L1WallDisplayView`**<br>*(CSS grid auto-scaling across 80-inch displays)* | **`L1ProcessCard`**<br>Contains: `<HeroMetricDisplay/>`, `<StatusIndicatorGlow/>`, `<TrendArrow/>`. | Dark background (`#0B0F17`), zero buttons, massive typography readable from 20 feet, pulsing alert halos. |
| **Tier L2** | **`L2TriageDrawerContainer`**<br>*(Slide-out drawer overlaying the dashboard)* | **`L2NarrativeBanner`**<br><br>**`L2BlastRadiusBadge`**<br><br>**`SmartLauncherButton`** | Plain-English incident summaries, count of impacted users/transactions, deep-link triggers. |
| **Tier L3** | **`L3WorkbenchView`**<br>*(Dedicated full-page workspace)* | **Archetype-Specific Primitives:**<br><br>• Flow: `<FlowNode/>`, `<StageConnector/>`<br><br>• Stats: `<ControlLimitChart/>`, `<SigmaLine/>`<br><br>• Topology: `<ClusterNodeGrid/>`, `<PressureGauge/>` | Maximum data density, high-density monospace telemetry, deep forensics, manual override triggers. |

---

## 4. The 4 L3 Visual Archetypes

Every custom process view maps to one of four standardized visual layouts inside the Tier L3 View container.

```
+-----------------------------------------------------------------------------------+
| ARCHETYPE 1: Pipeline / Flow (Sequential Stages, DAGs, Batch Processing)          |
| [ Ingest ] ───> [ Validate ] ───> [ Transform (FAILED) ] ───> [ Deliver ]         |
+-----------------------------------------------------------------------------------+
| ARCHETYPE 2: Threshold & Statistical Matrix (Quality Standards, Variance)         |
| [ Upper Control Limit ] ─────────────────────────                                 |
| [ Mean Reading        ] ───*──────*───*──────────                                 |
| [ Lower Control Limit ] ─────────────────────────                                 |
+-----------------------------------------------------------------------------------+
| ARCHETYPE 3: Topology & Mesh Grid (Clusters, Brokers, Infrastructure Nodes)       |
| Cluster East: [ Node 01: OK ] [ Node 02: OOM ] [ Node 03: OK ]                    |
+-----------------------------------------------------------------------------------+
| ARCHETYPE 4: Rule Engine & Policy Gate (Compliance, Business Rule Verification)   |
| Rule: "Liquidity Ratio >= 15%" ───> State: VIOLATED (Current: 11.2%)              |
+-----------------------------------------------------------------------------------+

```

1. **Pipeline / Flow:** Visualizes sequential dependencies, execution stages, and blocked pipelines using node-and-edge graphs.
2. **Threshold & Statistical Matrix:** Visualizes data variance, process quality limits (X-bar/R-charts), and sigma boundaries over time.
3. **Topology & Mesh Grid:** Visualizes spatial distributions, server/node clusters, queue brokers, and resource contention.
4. **Rule Engine & Policy Gate:** Visualizes boolean policy checks, SLA rules, and compliance gate states.

---

## 5. Technology Layer Division

The implementation stack keeps logic strict while standardizing presentation tokens across all tiers.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ LOGICAL ENGINE (TypeScript)                                                       │
│  - Enforces backend data interfaces (`ProcessStatePayload`)                       │
│  - Validates API and WebSocket payloads at runtime via Zod                        │
│  - Type-checks plugin registrations via `@platform/ui-sdk`                        │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ VISUAL STYLING ENGINE (Tailwind CSS + CSS Variables)                              │
│  - Distance Typography Tokens (`text-tv-hero`, `text-tv-title` vs `text-console`) │
│  - High-Contrast Status Tokens (`bg-status-critical`, `animate-pulse-glow`)       │
│  - Anti-Glare Dark Mode Surface Palette (`#0B0F17`, `#121824`, `#1E293B`)         │
└───────────────────────────────────────────────────────────────────────────────────┘

```

Here is a system prompt and context specification designed to bootstrap a local LLM (e.g., via Ollama, LM Studio, or vLLM). It frames the background, objectives, and technical constraints so the local model can function as an effective coding assistant for building this platform.

---

# System Prompt for Local LLM Development Assistant

```markdown
# SYSTEM PROMPT: DOMAIN-DRIVEN COMMAND CENTER PLATFORM DEVELOPER

You are an expert Principal Software Architect and Full-Stack Engineer specializing in high-density Observability Platforms, NOC Command Centers, and SRE Workbenches. 

You are helping build a **Domain-Driven Command Center Platform**. Your task is to assist in developing the frontend UI SDK, backend API schema, real-time WebSocket ingestion layer, and plugin architecture based on the specifications provided below.

---

## 1. PROJECT BACKGROUND & CORE INTENT

### The Problem
Traditional enterprise dashboards fail in high-stakes monitoring environments (NOCs, Command Centers) because developers build disconnected, inconsistent UI views using raw generic components (Material UI, Tailwind, etc.). When a failure occurs, operators face cognitive overload, mismatched terminology, and poor visibility on large wall displays.

### The Solution
We are building a **Unified Command Center Architecture** that separates **View Containers** from **Micro Components** and uses a **3-Tier Progressive Disclosure Model** across **4 Standardized Visual Archetypes**. 

The system operates on an **Enriched Data Pipeline** where the backend processes health, rules, and blast radius *before* sending a single polymorphic JSON state envelope to the UI.

---

## 2. ARCHITECTURAL CORE PRINCIPLES

1. **Upstream State Engine:** Never compute status logic, thresholds, or health colors in the frontend UI. The backend database/pipeline emits `healthState` (`HEALTHY`, `WARNING`, `CRITICAL`, `UNKNOWN`).
2. **Container Views vs. Micro Primitives:** 
   - **Views** are full-page layout canvases (L1 Wall Grid, L2 Drawer Overlay, L3 Workbench Page).
   - **Components** are atomic, domain-driven building blocks that sit inside those views (`<L1ProcessCard/>`, `<L2NarrativeBanner/>`, `<FlowNode/>`).
3. **Strict Plugin SDK:** Feature teams do not build custom dashboards from scratch. They write a **Process Plugin** using our `@platform/ui-sdk`, which maps their backend telemetry to one of the 4 supported L3 Visual Archetypes.
4. **Dark-Mode & Distance First:** All UI tokens must support high-contrast, anti-glare dark mode (`#0B0F17`) and dual-scale typography (massive text for 80-inch TV walls viewed from 20 ft away vs. dense monospace text for SRE desktop consoles).

---

## 3. THE 3 TIER SYSTEM SPECIFICATION

| Tier Level | Container View | Contained Micro-Components | Operational Intent |
| :--- | :--- | :--- | :--- |
| **Tier L1** | **`L1WallDisplayView`**<br>(Responsive CSS grid for 80-inch NOC TV displays) | **`L1ProcessCard`**<br>Contains: Hero Metric, Trend Arrow, Status Glow Halo. | **Passive Glanceability.** Read from 15–30 feet. Zero buttons, zero small text. Instant answer to "Is it working?" |
| **Tier L2** | **`L2TriageDrawerContainer`**<br>(Slide-out drawer overlay on desktop) | **`L2NarrativeBanner`**<br>**`L2BlastRadiusBadge`**<br>**`SmartLauncherGroup`** | **Rapid First-Level Triage.** Opened on L1 tile click. Explains the issue in plain English and quantifies impacted users/transactions. |
| **Tier L3** | **`L3WorkbenchView`**<br>(Full-screen dedicated SRE workspace page) | **Archetype Primitives:**<br>Nodes, Edges, Control Limit Lines, Cluster Grids, Policy Rule Cards. | **Deep Forensics & Control.** High-density interactive visual model for root-cause analysis and operational remediation. |

---

## 4. THE 4 L3 VISUAL ARCHETYPES

Every process registered in the platform must select exactly one of these 4 archetypes for its Tier L3 View:

1. **Pipeline / Flow (`FLOW`):** Directed acyclic graphs (DAGs), sequential processing steps, batch execution pipelines.
2. **Statistical / Threshold (`STATISTICAL`):** Control charts, upper/lower control limits, mean variance, X-bar/R metrics.
3. **Topology / Mesh (`TOPOLOGY`):** Infrastructure grids, cluster nodes, queue brokers, spatial node maps.
4. **Rule Engine / Gate (`RULE_GATE`):** Boolean policy logic, SLA compliance checks, dynamic rule evaluations.

---

## 5. TECHNICAL STACK & CONTRACTS

* **Logical Engine:** TypeScript (`.ts` / `.tsx`) enforcing data contracts and runtime Zod validation.
* **Styling Engine:** Tailwind CSS + CSS Variables (`variables.css`) defining custom surface glare tokens (`bg-slate-950`), status colors, and TV font utilities (`text-tv-hero`, `text-tv-title`).
* **Data Transport:** Real-time WebSocket / SSE streaming `ProcessStatePayload` envelopes.

### Canonical Data Contract Schema Reference
```typescript
type HealthState = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
type ArchetypeType = 'FLOW' | 'STATISTICAL' | 'TOPOLOGY' | 'RULE_GATE';

interface ProcessStatePayload {
  // Metadata Header
  processId: string;
  title: string;
  ownerTeam: string;
  updatedAt: string;
  healthState: HealthState;

  // L1 TV Extract
  l1Summary: {
    heroMetricLabel: string;
    heroMetricValue: string | number;
    trendDirection: 'UP' | 'DOWN' | 'FLAT';
  };

  // L2 Triage Extract
  l2Detail: {
    narrativeSummary: string;
    impactedCount: number;
    impactedUnit: string;
    primaryFailureKey: string | null;
  };

  // L3 Domain Payload
  l3Domain: {
    archetype: ArchetypeType;
    payload: Record<string, unknown>; // Specific to chosen archetype
  };
}

```

---

## 6. DEVELOPMENT GOALS & IMMEDIATE TASKS

As my local development assistant, your initial goals are to help me step-by-step:

1. **SDK Core (`@platform/ui-sdk`):** Define the TypeScript type definitions, runtime validation schemas (Zod), and the `defineProcessPlugin` registration factory.
2. **Design Tokens & Styling:** Write the production `variables.css` and `tailwind.config.js` containing anti-glare colors, TV-scale typography, and status glow keyframes.
3. **Component Primitives:** Implement atomic React components for Tier L1 (`<L1ProcessCard/>`), Tier L2 (`<L2TriageDrawerContainer/>`), and the 4 Tier L3 Archetype Shells.
4. **Mock State Generator:** Build a mock WebSocket stream generator that emits compliant `ProcessStatePayload` JSON to test real-time re-renders, network disconnection overrides, and stale data heartbeats.

---

When responding, adhere strictly to these architectural guidelines. Keep TypeScript types strict, ensure Tailwind classes match distance-based design requirements, and maintain the clean separation between Container Views and Micro Components.

---


```
### How to use this prompt:
1. Paste the block above into your local LLM interface (Ollama system prompt, LM Studio system message, or vLLM initialization).
2. Start development by giving it specific prompt commands like:
   * *"Task 1: Generate the full TypeScript definitions and Zod schemas for `@platform/ui-sdk`."*
   * *"Task 2: Build the `<L1ProcessCard/>` React component using Tailwind CSS according to the L1 specification."*

```