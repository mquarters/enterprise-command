/**
 * Mock State Generator (test-run stand-in for the Enriched Data Pipeline)
 * -------------------------------------------------------------------------
 * Emits schema-compliant `ProcessStatePayload` envelopes for the mock
 * WebSocket feed. This module plays the role of the UPSTREAM state engine:
 * health rollups, blast-radius drift, and staleness-relevant `updatedAt`
 * are all computed HERE so the UI layer never computes status (Principle 1).
 *
 * Every tick returns FRESH objects — input envelopes are never mutated,
 * so React state updates always produce new references.
 */

import {
  HealthState,
  ArchetypePayload,
  DetailExtract,
  EnrichedEntity,
  MetricReading,
  ProcessStatePayload,
  TrendDirection,
} from '../types';

// ============================================================================
// Helpers (upstream-side computation)
// ============================================================================

const HEALTH_POOL: readonly HealthState[] = ['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'];

const round2 = (v: number): number => Math.round(v * 100) / 100;

const jitter = (value: number, pct: number, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const delta = value * pct * (Math.random() * 2 - 1);
  return round2(Math.min(max, Math.max(min, value + delta)));
};

/** 15% chance a node/status leaf drifts to a random health state. */
function driftStatus(status: HealthState): HealthState {
  if (Math.random() > 0.15) return status;
  return HEALTH_POOL[Math.floor(Math.random() * HEALTH_POOL.length)];
}

function rollupHealth(statuses: HealthState[]): HealthState {
  if (statuses.includes('CRITICAL')) return 'CRITICAL';
  if (statuses.includes('WARNING')) return 'WARNING';
  if (statuses.includes('UNKNOWN')) return 'UNKNOWN';
  return 'HEALTHY';
}

/** Upstream health engine: derives process health from drifted domain data. */
function deriveHealthState(payload: ArchetypePayload): HealthState {
  switch (payload.archetype) {
    case 'FLOW':
      return rollupHealth(payload.nodes.map((n) => n.status));
    case 'STATISTICAL': {
      const { currentValue, mean, upperControlLimit, lowerControlLimit } = payload;
      if (currentValue > upperControlLimit || currentValue < lowerControlLimit) return 'CRITICAL';
      const band = upperControlLimit - lowerControlLimit;
      if (Math.abs(currentValue - mean) > band * 0.45) return 'WARNING';
      return 'HEALTHY';
    }
    case 'TOPOLOGY':
      return rollupHealth(payload.nodes.map((n) => n.status));
    case 'RULE_GATE':
      return payload.rules.some((r) => !r.passed) ? 'CRITICAL' : 'HEALTHY';
    case 'HEATMAP': {
      const cells = payload.serviceRows.flatMap((row) => row.cells);
      const critical = cells.filter((c) => c.status === 'CRITICAL').length;
      if (critical >= 2) return 'CRITICAL';
      if (critical === 1 || cells.some((c) => c.status === 'WARNING' || c.status === 'UNKNOWN')) {
        return 'WARNING';
      }
      return 'HEALTHY';
    }
  }
}

function trendFor(previous: number, next: number): TrendDirection {
  const delta = (next - previous) / (Math.abs(previous) || 1);
  if (delta > 0.02) return 'UP';
  if (delta < -0.02) return 'DOWN';
  return 'STABLE';
}

function narrativeFor(title: string, health: HealthState): string {
  switch (health) {
    case 'CRITICAL':
      return `${title}: degraded — primary failure path active, mitigation required.`;
    case 'WARNING':
      return `${title}: degraded — operating outside monitoring thresholds.`;
    case 'UNKNOWN':
      return `${title}: telemetry incomplete — data freshness cannot be verified.`;
    default:
      return `${title}: operating within normal parameters.`;
  }
}

function driftImpactedCount(health: HealthState, count: number): number {
  if (health === 'CRITICAL') return Math.round(count * (1.05 + Math.random() * 0.3));
  if (health === 'WARNING') return Math.round(count * (0.95 + Math.random() * 0.1));
  if (health === 'HEALTHY') return Math.round(count * 0.9);
  return count;
}

// ============================================================================
// Archetype payload drift (fresh objects only)
// ============================================================================

function driftDeepPayload(payload: ArchetypePayload): ArchetypePayload {
  switch (payload.archetype) {
    case 'FLOW': {
      const nodes = payload.nodes.map((node) => ({
        ...node,
        durationMs: node.durationMs === undefined ? undefined : jitter(node.durationMs, 0.25, 1, 5000),
        errorRate: node.errorRate === undefined ? undefined : jitter(node.errorRate, 0.4, 0, 100),
        status: driftStatus(node.status),
      }));
      return { ...payload, nodes };
    }

    case 'STATISTICAL': {
      const series = [...payload.timeSeries];
      const last = series[series.length - 1]?.value ?? payload.mean;
      const nextValue = jitter(last, 0.15, 0, Number.MAX_SAFE_INTEGER);
      series.push({
        timestamp: new Date().toISOString(),
        value: nextValue,
        isOutlier: Math.random() < 0.08,
      });
      if (series.length > 20) series.splice(0, series.length - 20);

      const values = series.map((p) => p.value);
      const mean = round2(values.reduce((a, b) => a + b, 0) / values.length);
      const sigma =
        round2(Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)) || 1;

      return {
        ...payload,
        currentValue: nextValue,
        mean,
        upperControlLimit: round2(mean + 3 * sigma),
        lowerControlLimit: round2(Math.max(0, mean - 3 * sigma)),
        timeSeries: series,
      };
    }

    case 'TOPOLOGY': {
      const nodes = payload.nodes.map((node) => {
        const cpuUtilizationPct = jitter(node.cpuUtilizationPct, 0.15, 0, 100);
        const memoryUtilizationPct = jitter(node.memoryUtilizationPct, 0.15, 0, 100);
        const status: HealthState =
          cpuUtilizationPct > 95 || memoryUtilizationPct > 95
            ? 'CRITICAL'
            : cpuUtilizationPct > 85 || memoryUtilizationPct > 85
              ? 'WARNING'
              : 'HEALTHY';
        return { ...node, cpuUtilizationPct, memoryUtilizationPct, status };
      });
      return { ...payload, nodes };
    }

    case 'RULE_GATE': {
      const rules = payload.rules.map((rule) => {
        if (typeof rule.actualValue !== 'number' || typeof rule.targetValue !== 'number') {
          return rule;
        }
        const actualValue = jitter(rule.actualValue, 0.08, 0, Number.MAX_SAFE_INTEGER);
        return { ...rule, actualValue, passed: actualValue >= rule.targetValue };
      });
      return { ...payload, rules };
    }

    case 'HEATMAP': {
      const serviceRows = payload.serviceRows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          const errorRate = jitter(cell.errorRate, 0.3, 0, 100);
          const status: HealthState =
            errorRate > 4 ? 'CRITICAL' : errorRate > 1.5 ? 'WARNING' : 'HEALTHY';
          return { ...cell, errorRate, status };
        }),
      }));
      return { ...payload, serviceRows };
    }
  }
}

/** Builds one heatmap row; status per bucket is computed upstream, never in the UI. */
function heatRow(
  serviceId: string,
  label: string,
  rates: number[]
): {
  serviceId: string;
  label: string;
  cells: Array<{ bucket: number; errorRate: number; status: HealthState }>;
} {
  return {
    serviceId,
    label,
    cells: rates.map((errorRate, bucket) => ({
      bucket,
      errorRate,
      status: errorRate > 4 ? 'CRITICAL' : errorRate > 1.5 ? 'WARNING' : 'HEALTHY',
    })),
  };
}

// ============================================================================
// Entity chains (seed authoring helpers + bounded per-tick drift)
// ============================================================================

const metric = (
  label: string,
  value: string | number,
  unit: string | undefined,
  status: HealthState = 'HEALTHY'
): MetricReading => ({ label, value, unit, status });

/** Detail-extract builder (seed-authoring shorthand). */
function det(
  narrativeSummary: string,
  impactedCount: number,
  impactedUnit: string,
  primaryFailureKey?: string,
  metrics?: MetricReading[]
): DetailExtract {
  return { narrativeSummary, impactedCount, impactedUnit, primaryFailureKey, metrics };
}

/**
 * Builds one drillable sub-entity. Its health state is rolled up from the
 * supplied metric readings — computed HERE, upstream of any component
 * (Principle 1). `depth` is derived from the parent: processes host depth-2
 * entities; entity chains terminate at DEPTH_CAP.
 */
function ent(
  parentId: string,
  entityId: string,
  entityKind: string,
  label: string,
  healthState: HealthState,
  detail: DetailExtract,
  deep?: ArchetypePayload
): EnrichedEntity {
  return {
    entityId,
    parentId,
    entityKind,
    label,
    depth: parentId.startsWith('proc-') ? 2 : 3,
    healthState,
    detail,
    deep,
  };
}

const chain = (...entities: EnrichedEntity[]): Record<string, EnrichedEntity> =>
  Object.fromEntries(entities.map((e) => [e.entityId, e]));

/**
 * Bounded entity-chain drift: at most TWO entity chains are touched per
 * envelope per tick (never the full tree). Touched chains get jittered
 * readings, a 15% status roll (same rule as domain drift), and — when the
 * roll changes health — re-derived blast radius and narrative. This stays
 * generator-side math; components only ever display the result.
 */
function driftEntityChains(
  entities: Record<string, EnrichedEntity> | undefined
): Record<string, EnrichedEntity> | undefined {
  if (!entities) return entities;
  const keys = Object.keys(entities);
  if (keys.length === 0) return entities;

  const touched = new Set<string>();
  const budget = Math.min(2, keys.length);
  while (touched.size < budget) {
    touched.add(keys[Math.floor(Math.random() * keys.length)]);
  }

  let next: Record<string, EnrichedEntity> | null = null;
  for (const key of touched) {
    const entity = entities[key];
    const healthState = driftStatus(entity.healthState);
    const metrics = entity.detail.metrics?.map((reading) => ({
      ...reading,
      value:
        typeof reading.value === 'number'
          ? jitter(reading.value, 0.15, 0, Number.MAX_SAFE_INTEGER)
          : reading.value,
    }));
    const healthChanged = healthState !== entity.healthState;
    const updated: EnrichedEntity = {
      ...entity,
      healthState,
      detail: {
        ...entity.detail,
        impactedCount: healthChanged
          ? driftImpactedCount(healthState, entity.detail.impactedCount)
          : entity.detail.impactedCount,
        narrativeSummary: healthChanged
          ? narrativeFor(entity.label, healthState)
          : entity.detail.narrativeSummary,
        metrics,
      },
    };
    if (next === null) {
      next = { ...entities };
    }
    next[key] = updated;
  }
  return next ?? entities;
}

// ============================================================================
// Envelope tick
// ============================================================================

/**
 * Chain-mirror resync (generator-side, Principle 1): nodes that carry an
 * `entityId` link are re-stamped with the drifted chain entity's current
 * healthState, so the canvas copy of a service never disagrees with the
 * entity drawer opened from it. The link itself is seeded data resolved
 * through a keyed lookup — the switch below mirrors driftDeepPayload's
 * per-shape drift style; no archetype assumption reaches Shell or UI.
 */
function mirrorNodes<T extends { status: HealthState; entityId?: string }>(
  nodes: T[],
  entities: Record<string, EnrichedEntity>
): T[] {
  return nodes.map((node) => {
    const mirror = node.entityId ? entities[node.entityId] : undefined;
    return mirror && mirror.healthState !== node.status
      ? { ...node, status: mirror.healthState }
      : node;
  });
}

function mirrorChainHealth(
  payload: ArchetypePayload,
  entities: Record<string, EnrichedEntity> | undefined
): ArchetypePayload {
  if (!entities) return payload;
  switch (payload.archetype) {
    case 'FLOW': {
      const nodes = mirrorNodes(payload.nodes, entities);
      return nodes.some((n, i) => n !== payload.nodes[i]) ? { ...payload, nodes } : payload;
    }
    case 'TOPOLOGY': {
      const nodes = mirrorNodes(payload.nodes, entities);
      return nodes.some((n, i) => n !== payload.nodes[i]) ? { ...payload, nodes } : payload;
    }
    default:
      return payload;
  }
}

/** Produces a fresh, drifted copy of an envelope. Never mutates the input. */
export function nextMockState(previous: ProcessStatePayload): ProcessStatePayload {
  const entities = driftEntityChains(previous.entities);
  const deep = mirrorChainHealth(driftDeepPayload(previous.deep), entities);
  const healthState = deriveHealthState(deep);
  const healthChanged = healthState !== previous.header.healthState;

  const previousHero = previous.overview.heroMetricValue;
  const heroMetricValue =
    typeof previousHero === 'number'
      ? jitter(previousHero, 0.15, 0, Number.MAX_SAFE_INTEGER)
      : previousHero;
  const trend: TrendDirection =
    typeof previousHero === 'number' && typeof heroMetricValue === 'number'
      ? trendFor(previousHero, heroMetricValue)
      : previous.overview.trend;

  const impactedCount = driftImpactedCount(healthState, previous.detail.impactedCount);

  return {
    header: { ...previous.header, healthState, updatedAt: new Date().toISOString() },
    overview: { ...previous.overview, heroMetricValue, trend },
    detail: {
      ...previous.detail,
      impactedCount,
      narrativeSummary: healthChanged
        ? narrativeFor(previous.header.title, healthState)
        : previous.detail.narrativeSummary,
    },
    deep,
    entities,
    smartLaunchers: previous.smartLaunchers,
  };
}

/**
 * Seed data — seven processes across the five L3 archetypes
 */

export const mockProcessStates: ProcessStatePayload[] = [
  {
    header: {
      processId: 'proc-payment-clearing-01',
      title: 'ACH Payment Settlement',
      ownerTeam: 'Core Banking Ops',
      updatedAt: new Date().toISOString(),
      healthState: 'CRITICAL',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Processing Latency',
      heroMetricValue: 1420,
      heroMetricUnit: 'ms',
      trend: 'UP',
    },
    detail: {
      narrativeSummary:
        'Settlement queue depth exceeded capacity due to high latency in the FedWire validation step.',
      impactedCount: 14250,
      impactedUnit: 'transactions',
      primaryFailureKey: 'ERR_FEDWIRE_TIMEOUT_504',
      incidentStartedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    deep: {
      archetype: 'FLOW',
      nodes: [
        { id: 'n1', label: 'Ingest Batch', status: 'WARNING', durationMs: 45, entityId: 'n1' },
        { id: 'n2', label: 'FedWire Validation', status: 'CRITICAL', durationMs: 1350, errorRate: 12.4, entityId: 'n2' },
        { id: 'n3', label: 'Ledger Post', status: 'UNKNOWN', entityId: 'n3' },
      ],
      edges: [
        { source: 'n1', target: 'n2', active: true },
        { source: 'n2', target: 'n3', active: false },
      ],
    },
    entities: chain(
      ent(
        'proc-payment-clearing-01',
        'n1',
        'FLOW_NODE',
        'Ingest Batch',
        'WARNING',
        det(
          'Batch intake queue is backing up while the validation lane drains slowly; oldest batch is 14 minutes stale.',
          212,
          'batches',
          'FAIL_BATCH_QUEUE_BACKLOG',
          [
            metric('Queue Depth', 212, 'batches', 'WARNING'),
            metric('Oldest Message Age', 14, 'min', 'WARNING'),
            metric('Ingestion Rate', 118, 'batches/min', 'HEALTHY'),
          ]
        ),
        {
          archetype: 'FLOW',
          nodes: [
            { id: 'c1', label: 'Batch Parser', status: 'HEALTHY', durationMs: 12, entityId: 'c1' },
            { id: 'c2', label: 'Dedup Cache', status: 'WARNING', durationMs: 38, errorRate: 2.1, entityId: 'c2' },
            { id: 'c3', label: 'Queue Writer', status: 'CRITICAL', durationMs: 210, errorRate: 9.8, entityId: 'c3' },
          ],
          edges: [
            { source: 'c1', target: 'c2', active: true },
            { source: 'c2', target: 'c3', active: true },
          ],
        }
      ),
      // Depth-3 members of Ingest Batch's own chain — chains terminate here.
      ent('n1', 'c1', 'QUEUE_CONSUMER', 'Batch Parser', 'HEALTHY',
        det('Parser pool nominal; no poison messages observed.', 0, 'messages', undefined, [
          metric('Decode p50', 12, 'ms', 'HEALTHY'),
          metric('Parse Errors', 0.02, '%', 'HEALTHY'),
        ])),
      ent('n1', 'c2', 'QUEUE_CONSUMER', 'Dedup Cache', 'WARNING',
        det('Dedup lookups miss 4.3% of re-published batches; duplicate writes reach the ledger.', 312, 'batches', 'WARN_DEDUP_MISS_RATE', [
          metric('Dedup Hit Rate', 95.7, '%', 'WARNING'),
          metric('Lookup Latency', 4.8, 'ms', 'HEALTHY'),
        ])),
      ent('n1', 'c3', 'QUEUE_CONSUMER', 'Queue Writer', 'CRITICAL',
        det('Writer stalled on broker ACK timeouts; back-pressure propagating upstream.', 812, 'in-flight batches', 'FAIL_KAFKA_ACK_TIMEOUT', [
          metric('Ack Timeout Rate', 6.4, '%', 'CRITICAL'),
          metric('In-Flight Batches', 812, 'batches', 'CRITICAL'),
          metric('Writer Lag', 41, 's', 'WARNING'),
        ])),
      ent('proc-payment-clearing-01', 'n2', 'FLOW_NODE', 'FedWire Validation', 'CRITICAL',
        det('TLS handshake timeouts (HTTP 504) on 12.4% of validation calls.', 1770, 'transactions', 'ERR_FEDWIRE_TIMEOUT_504', [
          metric('Step Latency', 1350, 'ms', 'CRITICAL'),
          metric('Timeout Rate', 12.4, '%', 'CRITICAL'),
        ])),
      ent('proc-payment-clearing-01', 'n3', 'FLOW_NODE', 'Ledger Post', 'UNKNOWN',
        det('No heartbeat from ledger relay since 12:04 — posting latency unverified.', 0, 'records', 'STALE_LEDGER_HEARTBEAT', [
          metric('Heartbeat Gap', 41, 's', 'UNKNOWN'),
          metric('Replay Queue', 214, 'records', 'UNKNOWN'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'View Splunk Ingest Logs',
        targetTool: 'SPLUNK',
        url: 'https://splunk.internal/app/banking/search?q=ERR_FEDWIRE_TIMEOUT_504',
        parameters: { traceId: 'tx-883912' },
      },
      {
        id: 'sl-2',
        label: 'Trace in Jaeger',
        targetTool: 'JAEGER',
        url: 'https://jaeger.internal/trace/tx-883912',
      },
    ],
  },
  {
    header: {
      processId: 'proc-auth-pipeline-02',
      title: 'Auth Pipeline (OAuth)',
      ownerTeam: 'Identity Platform',
      updatedAt: new Date().toISOString(),
      healthState: 'HEALTHY',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Token Issuance Rate',
      heroMetricValue: 98.4,
      heroMetricUnit: '%',
      trend: 'STABLE',
    },
    detail: {
      narrativeSummary: 'Auth Pipeline (OAuth): operating within normal parameters.',
      impactedCount: 0,
      impactedUnit: 'sessions',
    },
    deep: {
      archetype: 'FLOW',
      nodes: [
        { id: 'n1', label: 'Token Mint', status: 'HEALTHY', durationMs: 8, entityId: 'n1' },
        { id: 'n2', label: 'Session Cache', status: 'HEALTHY', durationMs: 3, entityId: 'n2' },
        { id: 'n3', label: 'Consent Gate', status: 'HEALTHY', durationMs: 12, entityId: 'n3' },
      ],
      edges: [
        { source: 'n1', target: 'n2', active: true },
        { source: 'n2', target: 'n3', active: true },
      ],
    },
    entities: chain(
      ent('proc-auth-pipeline-02', 'n1', 'FLOW_NODE', 'Token Mint', 'HEALTHY',
        det('Token minting nominal; 8 ms p50 issuance latency.', 0, 'sessions', undefined, [
          metric('Mint p50', 8, 'ms', 'HEALTHY'),
          metric('Clock Skew', 2, 'ms', 'HEALTHY'),
        ])),
      ent('proc-auth-pipeline-02', 'n2', 'FLOW_NODE', 'Session Cache', 'HEALTHY',
        det('Cache hit rate 99.2%; evictions within budget.', 0, 'sessions', undefined, [
          metric('Cache Hit Rate', 99.2, '%', 'HEALTHY'),
          metric('Evictions', 3, '/min', 'HEALTHY'),
        ])),
      ent('proc-auth-pipeline-02', 'n3', 'FLOW_NODE', 'Consent Gate', 'HEALTHY',
        det('Consent checks pass within budget; deny rate nominal.', 0, 'sessions', undefined, [
          metric('Consent p50', 12, 'ms', 'HEALTHY'),
          metric('Deny Rate', 0.4, '%', 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Token Trace Explorer',
        targetTool: 'JAEGER',
        url: 'https://jaeger.internal/search?service=auth-pipeline',
      },
      {
        id: 'sl-2',
        label: 'Auth Audit Logs',
        targetTool: 'SPLUNK',
        url: 'https://splunk.internal/app/identity/search?service=auth-pipeline',
      },
    ],
  },
  {
    header: {
      processId: 'proc-kafka-east-03',
      title: 'Kafka Cluster US-East',
      ownerTeam: 'Data Platform',
      updatedAt: new Date().toISOString(),
      healthState: 'WARNING',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Cluster CPU',
      heroMetricValue: 88,
      heroMetricUnit: '%',
      trend: 'UP',
    },
    detail: {
      narrativeSummary:
        'Two brokers in the US-East mesh are above 85% utilization; partition rebalance is in progress.',
      impactedCount: 312000000,
      impactedUnit: 'msgs/day',
      primaryFailureKey: 'WARN_BROKER_PRESSURE_EAST',
      incidentStartedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    deep: {
      archetype: 'TOPOLOGY',
      clusterName: 'US-East Production Mesh',
      totalNodes: 6,
      nodes: [
        { nodeId: 'broker-east-01', status: 'HEALTHY', cpuUtilizationPct: 42, memoryUtilizationPct: 58, entityId: 'broker-east-01' },
        { nodeId: 'broker-east-02', status: 'HEALTHY', cpuUtilizationPct: 38, memoryUtilizationPct: 61, entityId: 'broker-east-02' },
        { nodeId: 'broker-east-03', status: 'WARNING', cpuUtilizationPct: 88, memoryUtilizationPct: 79, entityId: 'broker-east-03' },
        { nodeId: 'broker-east-04', status: 'CRITICAL', cpuUtilizationPct: 96, memoryUtilizationPct: 92, entityId: 'broker-east-04' },
        { nodeId: 'controller-01', status: 'HEALTHY', cpuUtilizationPct: 21, memoryUtilizationPct: 34, entityId: 'controller-01' },
        { nodeId: 'controller-02', status: 'HEALTHY', cpuUtilizationPct: 19, memoryUtilizationPct: 31, entityId: 'controller-02' },
      ],
    },
    entities: chain(
      ent('proc-kafka-east-03', 'broker-east-01', 'CLUSTER_NODE', 'broker-east-01', 'HEALTHY',
        det('Broker steady; replica lag nominal.', 0, 'partitions', undefined, [
          metric('CPU Utilization', 42, '%', 'HEALTHY'),
          metric('Memory Utilization', 58, '%', 'HEALTHY'),
        ])),
      ent('proc-kafka-east-03', 'broker-east-02', 'CLUSTER_NODE', 'broker-east-02', 'HEALTHY',
        det('Broker steady; replica lag nominal.', 0, 'partitions', undefined, [
          metric('CPU Utilization', 38, '%', 'HEALTHY'),
          metric('Memory Utilization', 61, '%', 'HEALTHY'),
        ])),
      ent('proc-kafka-east-03', 'broker-east-03', 'CLUSTER_NODE', 'broker-east-03', 'WARNING',
        det('CPU at 88% under rebalance load; leader for 2 hot FX-quote topics.', 9400000, 'msgs/day', 'WARN_BROKER_PRESSURE_EAST', [
          metric('CPU Utilization', 88, '%', 'WARNING'),
          metric('Memory Utilization', 79, '%', 'WARNING'),
        ])),
      ent('proc-kafka-east-03', 'broker-east-04', 'CLUSTER_NODE', 'broker-east-04', 'CRITICAL',
        det('Broker saturated — leader for 3 hot FX-quote topics; throttle under consideration.', 14400000, 'msgs/day', 'WARN_BROKER_PRESSURE_EAST', [
          metric('CPU Utilization', 96, '%', 'CRITICAL'),
          metric('Memory Utilization', 92, '%', 'CRITICAL'),
        ])),
      ent('proc-kafka-east-03', 'controller-01', 'CLUSTER_NODE', 'controller-01', 'HEALTHY',
        det('Controller quorum nominal; no leadership elections pending.', 0, 'elections', undefined, [
          metric('CPU Utilization', 21, '%', 'HEALTHY'),
          metric('Memory Utilization', 34, '%', 'HEALTHY'),
        ])),
      ent('proc-kafka-east-03', 'controller-02', 'CLUSTER_NODE', 'controller-02', 'HEALTHY',
        det('Controller quorum nominal; no leadership elections pending.', 0, 'elections', undefined, [
          metric('CPU Utilization', 19, '%', 'HEALTHY'),
          metric('Memory Utilization', 31, '%', 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Broker Metrics Wallboard',
        targetTool: 'GRAFANA',
        url: 'https://grafana.internal/d/kafka-east/cluster-overview',
        parameters: { cluster_id: 'kafka-us-east' },
      },
      {
        id: 'sl-2',
        label: 'Datadog Broker Agents',
        targetTool: 'DATADOG',
        url: 'https://datadog.internal/dash/kafka-east',
        parameters: { env: 'prod' },
      },
    ],
  },
  {
    header: {
      processId: 'proc-pci-gate-04',
      title: 'PCI-DSS Scrubbing Gate',
      ownerTeam: 'Compliance Engineering',
      updatedAt: new Date().toISOString(),
      healthState: 'CRITICAL',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Rules Violated',
      heroMetricValue: 2,
      heroMetricUnit: 'of 3',
      trend: 'UP',
    },
    detail: {
      narrativeSummary:
        'TLS 1.2 downgrade detected on the scrubbing lane and tokenization rotation is overdue.',
      impactedCount: 8400,
      impactedUnit: 'records at risk',
      primaryFailureKey: 'FAIL_TLS_VERSION_CHECK',
      incidentStartedAt: new Date(Date.now() - 96 * 60 * 1000).toISOString(),
    },
    deep: {
      archetype: 'RULE_GATE',
      policyId: 'POL-COMPLIANCE-01',
      policyName: 'PCI-DSS Data Scrubbing Gate',
      rules: [
        { ruleId: 'r1', description: 'PAN Masking Active', condition: 'mask == true', actualValue: 'true', targetValue: 'true', passed: true },
        { ruleId: 'r2', description: 'TLS Version Check', condition: 'tls >= 1.3', actualValue: '1.2', targetValue: '1.3', passed: false },
        { ruleId: 'r3', description: 'Tokenization Rotation', condition: 'rotate <= 30 days', actualValue: '45 days', targetValue: '30 days', passed: false },
      ],
    },
    entities: chain(
      ent('proc-pci-gate-04', 'r1', 'RULE', 'PAN Masking Active', 'HEALTHY',
        det('Masking active on all lanes; no plaintext exposure observed.', 0, 'records at risk', undefined, [
          metric('Mask Coverage', 100, '%', 'HEALTHY'),
        ])),
      ent('proc-pci-gate-04', 'r2', 'RULE', 'TLS Version Check', 'CRITICAL',
        det('Scrubbing lane negotiates TLS 1.2; the standard mandates 1.3.', 8400, 'records at risk', 'FAIL_TLS_VERSION_CHECK', [
          metric('Negotiated TLS', '1.2', undefined, 'CRITICAL'),
          metric('Mandated Floor', '1.3', undefined, 'HEALTHY'),
        ])),
      ent('proc-pci-gate-04', 'r3', 'RULE', 'Tokenization Rotation', 'WARNING',
        det('Token rotation window is 45 days stale against the 30-day maximum.', 2400, 'tokens', 'FAIL_TOKEN_ROTATION_OVERDUE', [
          metric('Rotation Age', 45, 'days', 'WARNING'),
          metric('Max Window', 30, 'days', 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Compliance Audit Search',
        targetTool: 'SPLUNK',
        url: 'https://splunk.internal/app/compliance/search?policy=POL-COMPLIANCE-01',
      },
      {
        id: 'sl-2',
        label: 'Internal Audit Trail',
        targetTool: 'CUSTOM',
        url: 'https://audit.internal/trail/POL-COMPLIANCE-01',
      },
    ],
  },
  {
    header: {
      processId: 'proc-card-latency-05',
      title: 'Card Auth Latency',
      ownerTeam: 'Payment Reliability',
      updatedAt: new Date().toISOString(),
      healthState: 'HEALTHY',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Auth Latency',
      heroMetricValue: 118,
      heroMetricUnit: 'ms',
      trend: 'DOWN',
    },
    detail: {
      narrativeSummary: 'Card Auth Latency: operating within normal parameters.',
      impactedCount: 0,
      impactedUnit: 'authorizations',
    },
    deep: {
      archetype: 'STATISTICAL',
      metricName: 'Card Authorization Latency (ms)',
      currentValue: 118,
      mean: 120,
      upperControlLimit: 180,
      lowerControlLimit: 60,
      timeSeries: [
        { timestamp: '10:00', value: 110 },
        { timestamp: '10:01', value: 125 },
        { timestamp: '10:02', value: 118 },
        { timestamp: '10:03', value: 132 },
        { timestamp: '10:04', value: 112 },
        { timestamp: '10:05', value: 121 },
        { timestamp: '10:06', value: 118 },
      ],
    },
    entities: chain(
      ent('proc-card-latency-05', '10:03', 'OBSERVATION', 'Sample @ 10:03', 'WARNING',
        det('Authorization latency burst at 132 ms — tracking toward the upper control band.', 612, 'authorizations', 'WARN_AUTH_LATENCY_BURST', [
          metric('Sample Latency', 132, 'ms', 'WARNING'),
          metric('Band Position', 'upper', undefined, 'WARNING'),
        ])),
      ent('proc-card-latency-05', '10:04', 'OBSERVATION', 'Sample @ 10:04', 'HEALTHY',
        det('Sample latency nominal at 112 ms; inside the control band.', 0, 'authorizations', undefined, [
          metric('Sample Latency', 112, 'ms', 'HEALTHY'),
          metric('Band Position', 'inside limits', undefined, 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Latency Control Chart',
        targetTool: 'GRAFANA',
        url: 'https://grafana.internal/d/card-auth/latency',
        parameters: { panel: 'control-chart' },
      },
      {
        id: 'sl-2',
        label: 'Gateway Logs (Kibana)',
        targetTool: 'KIBANA',
        url: 'https://kibana.internal/app/discover#/card-auth',
      },
    ],
  },
  {
    header: {
      processId: 'proc-liquidity-gate-06',
      title: 'Treasury Liquidity Gate',
      ownerTeam: 'Treasury Risk',
      updatedAt: new Date().toISOString(),
      healthState: 'CRITICAL',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Liquidity Ratio',
      heroMetricValue: 11.2,
      heroMetricUnit: '%',
      trend: 'DOWN',
    },
    detail: {
      narrativeSummary:
        'Liquidity ratio fell below the 15% regulatory floor; reserve coverage remains compliant.',
      impactedCount: 2,
      impactedUnit: 'settlement rails',
      primaryFailureKey: 'FAIL_LIQUIDITY_RATIO_FLOOR',
      incidentStartedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    deep: {
      archetype: 'RULE_GATE',
      policyId: 'POL-TREASURY-07',
      policyName: 'Basel III Liquidity Policy Gate',
      rules: [
        { ruleId: 'r1', description: 'Liquidity Ratio Floor', condition: 'liquidity_ratio >= 15%', actualValue: 11.2, targetValue: 15, passed: false },
        { ruleId: 'r2', description: 'Reserve Coverage', condition: 'coverage >= 110%', actualValue: 118, targetValue: 110, passed: true },
      ],
    },
    entities: chain(
      ent('proc-liquidity-gate-06', 'r1', 'RULE', 'Liquidity Ratio Floor', 'CRITICAL',
        det('Liquidity ratio 11.2% is below the 15% regulatory floor; two rails throttled.', 2, 'settlement rails', 'FAIL_LIQUIDITY_RATIO_FLOOR', [
          metric('Liquidity Ratio', 11.2, '%', 'CRITICAL'),
          metric('Regulatory Floor', 15, '%', 'HEALTHY'),
        ])),
      ent('proc-liquidity-gate-06', 'r2', 'RULE', 'Reserve Coverage', 'HEALTHY',
        det('Reserve coverage 118% exceeds the 110% requirement.', 0, 'settlement rails', undefined, [
          metric('Coverage Ratio', 118, '%', 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Treasury Metrics Board',
        targetTool: 'GRAFANA',
        url: 'https://grafana.internal/d/treasury/liquidity',
        parameters: { desk: 'treasury-risk' },
      },
      {
        id: 'sl-2',
        label: 'Regulatory Report Vault',
        targetTool: 'CUSTOM',
        url: 'https://regrep.internal/reports/liquidity',
      },
    ],
  },
  {
    header: {
      processId: 'proc-fx-quote-mesh-07',
      title: 'FX Quote Broadcast Mesh',
      ownerTeam: 'Payments Reliability',
      updatedAt: new Date().toISOString(),
      healthState: 'WARNING',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Peak Error Rate',
      heroMetricValue: 3.9,
      heroMetricUnit: '%',
      trend: 'UP',
    },
    detail: {
      narrativeSummary:
        'FX quote staleness above SLA on OTC Quote Gateway and FX Matching Engine; matching engine may throttle on stale feeds.',
      impactedCount: 240,
      impactedUnit: 'quotes',
      primaryFailureKey: 'FAIL_FX_QUOTE_STALE_SLA',
      incidentStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    deep: {
      archetype: 'HEATMAP',
      metricName: 'Error rate % per service per 5-min bucket',
      columns: 12,
      bucketMinutes: 5,
      serviceRows: [
        heatRow('svc-otc-quotes', 'OTC Quote Gateway', [1.1, 0.9, 1.4, 0.7, 1.2, 0.8, 1.6, 1.3, 1.1, 0.9, 1.5, 1.8]),
        heatRow('svc-fx-matcher', 'FX Matching Engine', [2.1, 2.4, 1.9, 2.8, 3.1, 2.6, 3.4, 3.9, 3.6, 3.1, 2.8, 3.4]),
        heatRow('svc-nostro-recon', 'Nostro Reconciliation', [0.2, 0.1, 0.3, 0.2, 0.1, 0.2, 0.3, 0.1, 0.2, 0.4, 0.2, 0.3]),
        heatRow('svc-ems-ingress', 'EMS Order Ingress', [0.4, 0.6, 0.3, 0.5, 0.4, 0.2, 0.5, 0.3, 0.4, 0.6, 0.3, 0.4]),
      ],
    },
    entities: chain(
      ent('proc-fx-quote-mesh-07', 'svc-otc-quotes', 'HEATMAP_ROW', 'OTC Quote Gateway', 'WARNING',
        det('Quote error bursts up to 1.8%; staleness risk on EUR/USD pairs.', 44, 'quotes', 'WARN_OTC_QUOTE_BURST', [
          metric('Peak Error Rate', 1.8, '%', 'WARNING'),
          metric('Quote Throughput', 90, 'quotes/min', 'HEALTHY'),
        ])),
      ent('proc-fx-quote-mesh-07', 'svc-fx-matcher', 'HEATMAP_ROW', 'FX Matching Engine', 'WARNING',
        det('Matching engine throttles on stale feeds; error bursts to 3.9% in the last hour.', 240, 'quotes', 'FAIL_FX_QUOTE_STALE_SLA', [
          metric('Peak Error Rate', 3.9, '%', 'WARNING'),
          metric('Feed Freshness', 45, 's', 'WARNING'),
        ])),
      ent('proc-fx-quote-mesh-07', 'svc-nostro-recon', 'HEATMAP_ROW', 'Nostro Reconciliation', 'HEALTHY',
        det('Recon feed nominal; error bursts never exceeded 0.4%.', 0, 'reconciliations', undefined, [
          metric('Peak Error Rate', 0.4, '%', 'HEALTHY'),
        ])),
      ent('proc-fx-quote-mesh-07', 'svc-ems-ingress', 'HEATMAP_ROW', 'EMS Order Ingress', 'HEALTHY',
        det('Order ingress nominal; error bursts never exceeded 0.6%.', 0, 'orders', undefined, [
          metric('Peak Error Rate', 0.6, '%', 'HEALTHY'),
        ])),
    ),
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'FX Quote Heatmap',
        targetTool: 'GRAFANA',
        url: 'https://grafana.internal/d/fx/quote-heatmap',
        parameters: { window: '60m' },
      },
      {
        id: 'sl-2',
        label: 'Matching Engine Traces',
        targetTool: 'JAEGER',
        url: 'https://jaeger.internal/trace/fx-matcher',
      },
    ],
  },
];

/** Back-compat alias: the original single FLOW fixture. */
export const mockFlowState: ProcessStatePayload = mockProcessStates[0];

// ============================================================================
// Mock WebSocket stream generator
// ============================================================================

export interface MockStateStreamOptions {
  /** Emission cadence in ms (default 2500). */
  intervalMs?: number;
  /** Receives a fresh snapshot of ALL process states on every tick. */
  onTick: (states: ProcessStatePayload[]) => void;
}

export interface MockStateStream {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Creates a pausable mock telemetry feed. `start()`/`stop()` model the
 * network-connection override so the Shell can demo stale-data behavior:
 * after `stop()`, heartbeat gaps grow until staleness thresholds are crossed.
 */
export function createMockStateStream(
  initial: ProcessStatePayload[],
  options: MockStateStreamOptions
): MockStateStream {
  const intervalMs = options.intervalMs ?? 2500;
  let current = initial.map((state) => ({ ...state }));
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = (): void => {
    current = current.map(nextMockState);
    options.onTick(current);
  };

  return {
    start(): void {
      if (timer === null) {
        timer = setInterval(tick, intervalMs);
      }
    },
    stop(): void {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
    isRunning(): boolean {
      return timer !== null;
    },
  };
}
