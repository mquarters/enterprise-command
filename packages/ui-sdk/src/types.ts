/**
 * @package `@platform/ui-sdk`
 * @file src/types.ts
 * Core contracts: entity-chain envelopes, scale-agnostic view models, and
 * archetype props for Command Center plugins.
 *
 * MODEL (v2 — recursive, scale-agnostic)
 * --------------------------------------
 * A viewing MODE is one of: overview (tile/chip) · detail (drawer) · deep
 * (canvas). A viewing TARGET is an entity at some scale: depth 1 = process,
 * depth 2 = sub-entity, depth 3 = sub-sub-entity (cap: DEPTH_CAP). The same
 * three primitives serve every scale; nothing here is bound to a tier.
 * Components consume enriched view models computed upstream and never derive
 * health, blast radius, or narrative themselves (Principle 1).
 */

import { ComponentType } from 'react';

// ============================================================================
// 1. CORE ENUMS & CONSTANTS
// ============================================================================

/** Health state evaluated upstream by backend engine */
export type HealthState = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

/** The five standardized deep-view layouts (these are layouts, not tiers) */
export type ArchetypeType = 'FLOW' | 'STATISTICAL' | 'TOPOLOGY' | 'RULE_GATE' | 'HEATMAP';

/** Trend direction for overview-tier hero metrics */
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE' | 'NEUTRAL';

/**
 * Maximum entity-chain depth (1 = process … 3 = sub-sub-entity).
 * The Shell blocks drill attempts beyond DEPTH_CAP; chains may terminate
 * earlier — depth is a ceiling, not a guarantee.
 */
export const DEPTH_CAP = 3;

/** One quantified reading displayed by a detail view (e.g. queue depth). */
export interface MetricReading {
  label: string;
  value: string | number;
  unit?: string;
  /** Computed upstream (mock engine); components only display it. */
  status?: HealthState;
}

// ============================================================================
// 2. SCALE-AGNOSTIC VIEW MODELS (any depth, any entity kind)
// ============================================================================

/** Overview-tier extract — what an OverviewTile/chip paints at ANY scale. */
export interface OverviewExtract {
  heroMetricLabel: string;
  heroMetricValue: string | number;
  heroMetricUnit?: string;
  trend: TrendDirection;
}

/** Detail-tier extract — what a DetailDrawer renders at ANY scale. */
export interface DetailExtract {
  narrativeSummary: string; // Plain-English incident description
  impactedCount: number; // Quantitative blast radius
  impactedUnit: string; // e.g., "accounts", "transactions", "nodes"
  primaryFailureKey?: string; // Failure code or classification
  incidentStartedAt?: string;
  /** Entity-scoped readings (queue depth, oldest-message age, …). */
  metrics?: MetricReading[];
  /**
   * Fleet-wide unhealthy-infrastructure watchlist (WARNING/CRITICAL only),
   * computed upstream by the state engine and recomputed every tick.
   * Displayed verbatim by process-scale drawers; drill rows resolve through
   * the Shell's context-path guards (Principle 1 — never derived in the UI).
   */
  infraWatch?: InfraWatchEntry[];
}

/** One unhealthy-infra element listed by the fleet-wide triage watchlist. */
export interface InfraWatchEntry {
  /** Envelope owning the element — resolution key, not a display hint. */
  processId: string;
  /** Title of that envelope (display hint on the triage row). */
  processTitle: string;
  /** The unhealthy element itself (its entityKind stays a display hint). */
  entityId: string;
  entityKind: string;
  /** Precomputed upstream — drives only the triage-row chip. */
  health: HealthState;
  /** Hero reading shown verbatim on the triage row (display-only). */
  hero: OverviewExtract;
}

/** Deep links generated for third-party external tools */
export interface SmartLauncherContext {
  id: string;
  label: string;
  targetTool: 'GRAFANA' | 'SPLUNK' | 'JAEGER' | 'DATADOG' | 'KIBANA' | 'CUSTOM';
  url: string;
  parameters?: Record<string, string | number | boolean>;
}

// ============================================================================
// 3. ARCHETYPE-SPECIFIC DEEP PAYLOADS (layouts usable at ANY scale)
// ============================================================================

/** Archetype 1: Pipeline / Sequential Flow Data */
export interface FlowArchetypePayload {
  archetype: 'FLOW';
  nodes: Array<{
    id: string;
    label: string;
    status: HealthState;
    durationMs?: number;
    errorRate?: number;
    /**
     * Display link to the EnrichedEntity this node mirrors (same service,
     * same id). Seed data + nav affordance only — never a health source.
     */
    entityId?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    active: boolean;
  }>;
}

/** Archetype 2: Statistical & Control Chart Data */
export interface StatisticalArchetypePayload {
  archetype: 'STATISTICAL';
  metricName: string;
  currentValue: number;
  mean: number;
  upperControlLimit: number;
  lowerControlLimit: number;
  timeSeries: Array<{
    timestamp: string;
    value: number;
    isOutlier?: boolean;
  }>;
}

/** Archetype 3: Topology Mesh & Cluster Data */
export interface TopologyArchetypePayload {
  archetype: 'TOPOLOGY';
  clusterName: string;
  totalNodes: number;
  nodes: Array<{
    nodeId: string;
    status: HealthState;
    cpuUtilizationPct: number;
    memoryUtilizationPct: number;
    /**
     * Display link to the EnrichedEntity this node chip mirrors (same
     * broker/service, same id). Seed data + nav affordance only.
     */
    entityId?: string;
  }>;
}

/** Archetype 4: Business Rule & Policy Gate Data */
export interface RuleGateArchetypePayload {
  archetype: 'RULE_GATE';
  policyId: string;
  policyName: string;
  rules: Array<{
    ruleId: string;
    description: string;
    condition: string;
    actualValue: string | number;
    targetValue: string | number;
    passed: boolean;
  }>;
}

/** Archetype 5: Service × Time Error-Rate Heatmap Data */
export interface HeatmapArchetypePayload {
  archetype: 'HEATMAP';
  metricName: string;
  columns: number; // time buckets per row (oldest → newest)
  bucketMinutes: number; // width of one time bucket, in minutes
  serviceRows: Array<{
    serviceId: string;
    label: string;
    cells: Array<{
      bucket: number;
      errorRate: number; // error-rate % for that bucket
      status: HealthState;
    }>;
  }>;
}

/** Discriminated union for every deep-view payload, at any entity scale */
export type ArchetypePayload =
  | FlowArchetypePayload
  | StatisticalArchetypePayload
  | TopologyArchetypePayload
  | RuleGateArchetypePayload
  | HeatmapArchetypePayload;

// ============================================================================
// 4. ENTITY CHAINS & THE CANONICAL ENVELOPE
// ============================================================================

/** Base metadata present on every process state update */
export interface ProcessStateHeader {
  processId: string;
  title: string;
  ownerTeam: string;
  updatedAt: string; // ISO-8061 string or epoch ms
  healthState: HealthState;
  staleHeartbeatThresholdSeconds?: number;
}

/**
 * A drillable entity nested inside a process envelope. Carries its own chain:
 * `detail` (its drawer content) and optionally `deep` (its own custom deep
 * view) — so chains continue or terminate as DATA, not code. Keys inside
 * ProcessStatePayload.entities are entityIds; parentId points at the owning
 * process (depth 2) or at another entity's entityId (depth 3).
 */
export interface EnrichedEntity {
  entityId: string; // unique within its process envelope (== the entities[] key)
  parentId: string; // processId at depth 2; parent entityId at depth 3
  entityKind: string; // display hint only (FLOW_NODE, CLUSTER_NODE, RULE, HEATMAP_ROW, …) — the Shell never branches on it
  label: string;
  depth: number; // 1..DEPTH_CAP
  healthState: HealthState;
  detail: DetailExtract; // what its DetailDrawer renders
  deep?: ArchetypePayload; // optional custom deep view for this entity
}

/** The canonical state envelope received over WebSockets / API (per process) */
export interface ProcessStatePayload {
  header: ProcessStateHeader;
  /** Process-scale overview extract (wall tile) */
  overview: OverviewExtract;
  /** Process-scale detail extract (triage drawer) */
  detail: DetailExtract;
  /** Process-scale deep payload (workbench canvas) */
  deep: ArchetypePayload;
  /** Sub-entity chains keyed by entityId — data for drills into sub-entities */
  entities?: Record<string, EnrichedEntity>;
  smartLaunchers?: SmartLauncherContext[];
}

// ============================================================================
// 5. ARCHETYPE COMPONENT PROPS (deep-view primitives)
// ============================================================================

export interface BaseArchetypeProps<T extends ArchetypePayload = ArchetypePayload> {
  processId: string;
  /** The deep payload of the entity being viewed, whatever its scale */
  data: T;
  health: HealthState;
  /** Drill affordance: called with a clicked sub-entity's entityId; omit to hide drills */
  onSelectEntity?: (entityId: string) => void;
  onExecuteMitigation?: (actionKey: string, payload?: unknown) => Promise<void>;
}

export type FlowArchetypeProps = BaseArchetypeProps<FlowArchetypePayload>;
export type StatisticalArchetypeProps = BaseArchetypeProps<StatisticalArchetypePayload>;
export type TopologyArchetypeProps = BaseArchetypeProps<TopologyArchetypePayload>;
export type RuleGateArchetypeProps = BaseArchetypeProps<RuleGateArchetypePayload>;
export type HeatmapArchetypeProps = BaseArchetypeProps<HeatmapArchetypePayload>;

// ============================================================================
// 6. PLUGIN REGISTRATION CONTRACT
// ============================================================================

/**
 * Presentation knowledge for ONE sub-entity, declared per subEntityId.
 * Both slots are optional: a sub-entity with neither gets the generic
 * DetailDrawer (from its EnrichedEntity.detail); one with `deepView` +
 * a `deep` payload in data gets its own custom canvas.
 */
export interface SubEntityManifest {
  /** Replaces the generic DetailDrawer for this entity (rare; default exists) */
  detailView?: ComponentType<{ entity: EnrichedEntity }>;
  /** Custom canvas mounted when this entity's `deep` payload is present */
  deepView?: ComponentType<BaseArchetypeProps>;
}

/** Configuration object required when registering a process plugin */
export interface ProcessPluginManifest<T extends ArchetypePayload = ArchetypePayload> {
  processId: string;
  title: string;
  ownerTeam: string;
  description: string;
  archetype: ArchetypeType;

  /** Deep view for the process itself (archetype-selected deep payload) */
  DeepComponent: ComponentType<BaseArchetypeProps<T>>;

  /** Optional custom fallback component for payload validation errors */
  ErrorFallbackComponent?: ComponentType<{ error: Error; processId: string }>;

  /** Sub-entity presentation knowledge, keyed by subEntityId */
  subEntities?: Record<string, SubEntityManifest>;
}

/** Registry interface maintained by the Core Platform Shell */
export interface PluginRegistry {
  register<T extends ArchetypePayload>(manifest: ProcessPluginManifest<T>): void;
  get(processId: string): ProcessPluginManifest | undefined;
  getSubEntity(processId: string, entityId: string): SubEntityManifest | undefined;
  getAll(): ProcessPluginManifest[];
  has(processId: string): boolean;
}

// ============================================================================
// 7. DEPRECATED ALIASES (name history, not architecture — do not extend)
// ============================================================================

/** @deprecated Renamed to ArchetypePayload: layouts are scale-agnostic */
export type L3DomainPayload = ArchetypePayload;
/** @deprecated Renamed to OverviewExtract */
export type L1SummaryExtract = OverviewExtract;
/** @deprecated Renamed to DetailExtract */
export type L2DetailExtract = DetailExtract;
