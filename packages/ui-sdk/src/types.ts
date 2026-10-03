/**
 * @package `@platform/ui-sdk`
 * @file src/types.ts
 * Core contracts, state envelopes, and archetype props for Command Center plugins.
 */

import { ComponentType } from 'react';

// ============================================================================
// 1. CORE ENUMS & PRIMITIVE TYPES
// ============================================================================

/** Health state evaluated upstream by backend engine */
export type HealthState = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

/** The four standardized L3 visual layouts */
export type ArchetypeType = 'FLOW' | 'STATISTICAL' | 'TOPOLOGY' | 'RULE_GATE';

/** Trend direction for L1 hero metrics */
export type TrendDirection = 'UP' | 'DOWN' | 'STABLE' | 'NEUTRAL';

// ============================================================================
// 2. POLYMORPHIC STATE ENVELOPE (Data Pipeline -> UI Shell)
// ============================================================================

/** Base metadata present on every process state update */
export interface ProcessStateHeader {
  processId: string;
  title: string;
  ownerTeam: string;
  updatedAt: string; // ISO-8601 string or epoch ms
  healthState: HealthState;
  staleHeartbeatThresholdSeconds?: number;
}

/** Data extracted strictly for Tier L1 Wall Display Tiles */
export interface L1SummaryExtract {
  heroMetricLabel: string;
  heroMetricValue: string | number;
  heroMetricUnit?: string;
  trend: TrendDirection;
}

/** Context extracted strictly for Tier L2 Triage Drawers */
export interface L2DetailExtract {
  narrativeSummary: string; // Plain-English incident description
  impactedCount: number; // Quantitative blast radius
  impactedUnit: string; // e.g., "accounts", "transactions", "nodes"
  primaryFailureKey?: string; // Failure code or classification
  incidentStartedAt?: string;
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
// 3. ARCHETYPE-SPECIFIC L3 PAYLOADS
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

/** Discriminated Union for all L3 Domain Data Payloads */
export type L3DomainPayload =
  | FlowArchetypePayload
  | StatisticalArchetypePayload
  | TopologyArchetypePayload
  | RuleGateArchetypePayload;

/** The Canonical State Envelope received over WebSockets / API */
export interface ProcessStatePayload {
  header: ProcessStateHeader;
  l1Summary: L1SummaryExtract;
  l2Detail: L2DetailExtract;
  l3Payload: L3DomainPayload;
  smartLaunchers?: SmartLauncherContext[];
}

// ============================================================================
// 4. ARCHETYPE COMPONENT PROPS (Tier L3 View Primitives)
// ============================================================================

export interface BaseArchetypeProps<T extends L3DomainPayload = L3DomainPayload> {
  processId: string;
  data: T;
  health: HealthState;
  onExecuteMitigation?: (actionKey: string, payload?: unknown) => Promise<void>;
}

export type FlowArchetypeProps = BaseArchetypeProps<FlowArchetypePayload>;
export type StatisticalArchetypeProps = BaseArchetypeProps<StatisticalArchetypePayload>;
export type TopologyArchetypeProps = BaseArchetypeProps<TopologyArchetypePayload>;
export type RuleGateArchetypeProps = BaseArchetypeProps<RuleGateArchetypePayload>;

// ============================================================================
// 5. PLUGIN REGISTRATION CONTRACT
// ============================================================================

/** Configuration object required when registering a process plugin */
export interface ProcessPluginManifest<T extends L3DomainPayload = L3DomainPayload> {
  processId: string;
  title: string;
  ownerTeam: string;
  description: string;
  archetype: ArchetypeType;
  
  /** Component mounted when operator opens Tier L3 Workbench */
  L3Component: ComponentType<BaseArchetypeProps<T>>;
  
  /** Optional custom fallback component for payload validation errors */
  ErrorFallbackComponent?: ComponentType<{ error: Error; processId: string }>;
}

/** Registry interface maintained by the Core Platform Shell */
export interface PluginRegistry {
  register<T extends L3DomainPayload>(manifest: ProcessPluginManifest<T>): void;
  get(processId: string): ProcessPluginManifest | undefined;
  getAll(): ProcessPluginManifest[];
  has(processId: string): boolean;
}