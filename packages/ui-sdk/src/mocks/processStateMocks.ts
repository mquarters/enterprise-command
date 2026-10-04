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
  DEPTH_CAP,
  InfraGroupExcerpt,
  InfraWatchEntry,
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
    case 'TOPOLOGY': {
      const statuses = [
        ...payload.nodes.map((n) => n.status),
        ...(payload.grids ?? []).flatMap((g) => g.nodes.map((n) => n.status)),
      ];
      return rollupHealth(statuses);
    }
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

/** Seed-authoring helper: when upstream marks an entity degraded, the
 * incident is ACTIVE from the mock's point of view — give it a start time so
 * the drawer footer never contradicts the health it displays (audit V22). */
const seedIncidentStart = (health: 'CRITICAL' | 'WARNING' | 'UNKNOWN') =>
  new Date(Date.now() - (health === 'CRITICAL' ? 24 : 31) * 60 * 1000).toISOString();

/** Detail-extract builder (seed-authoring shorthand). */
function det(
  narrativeSummary: string,
  impactedCount: number,
  impactedUnit: string,
  primaryFailureKey?: string,
  metrics?: MetricReading[],
  incidentStartedAt?: string
): DetailExtract {
  return {
    narrativeSummary,
    impactedCount,
    impactedUnit,
    primaryFailureKey,
    metrics,
    ...(incidentStartedAt ? { incidentStartedAt } : {}),
  };
}

/** Roll-up of a DetailExtract's metric readings (used for seeded entities
 * whose health is derived from their own readings, upstream of any UI). */
function rollupFromReadings(detail: DetailExtract): HealthState {
  return rollupHealth((detail.metrics ?? []).map((m) => m.status ?? 'HEALTHY'));
}

/** Roll-up across the member-node readings of a container (group) entity —
 * recomputed upstream every tick so a group never shows HEALTHY over
 * unhealthy members (Principle 1: computed upstream, displayed verbatim). */
function groupMemberRollup(
  group: EnrichedEntity,
  entities: Record<string, EnrichedEntity>
): HealthState {
  const members = Object.values(entities).filter((e) => e.parentId === group.entityId);
  return rollupHealth(members.map((m) => m.healthState));
}

/**
 * Builds one drillable sub-entity. Its health state is rolled up from the
 * supplied metric readings — computed HERE, upstream of any component
 * (Principle 1). `depth` is derived from the parent: processes host depth-2
 * entities; entity chains terminate at DEPTH_CAP. The Infrastructure
 * envelope instead supplies depth explicitly (groups at depth 2, member
 * nodes at depth 3 — the cap), so its chains stay inside the cap.
 */
function ent(
  parentId: string,
  entityId: string,
  entityKind: string,
  label: string,
  depthOrHealth: number | HealthState,
  detail: DetailExtract,
  deep?: ArchetypePayload
): EnrichedEntity {
  const numericDepth =
    typeof depthOrHealth === 'number' ? depthOrHealth : parentId.startsWith('proc-') ? 2 : 3;
  const healthState =
    typeof depthOrHealth === 'number' ? rollupFromReadings(detail) : depthOrHealth;
  return {
    entityId,
    parentId,
    entityKind,
    label,
    depth: Math.min(numericDepth, DEPTH_CAP),
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

/** Edge endpoints are keyed (group → member); rebuild them from the
 * drifted grids so a thinned mesh never keeps stale edges (single source
 * of truth: the drifted grid data, not a second copy). */
function mirrorEdges(
  edges: Array<{ source: string; target: string; active: boolean }>,
  grids: Array<{ groupName: string; nodes: Array<{ nodeId: string }> }>
): Array<{ source: string; target: string; active: boolean }> {
  const alive = new Set(grids.flatMap((g) => g.nodes.map((n) => n.nodeId)));
  return edges.map((e) => ({ ...e, active: alive.has(e.source) && alive.has(e.target) }));
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
      if (payload.grids?.length) {
        const grids = payload.grids.map((grid) => ({
          ...grid,
          nodes: mirrorNodes(grid.nodes, entities),
        }));
        return { ...payload, grids, edges: mirrorEdges(payload.edges ?? [], grids) };
      }
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
 * Seed data — six business processes plus the generic Infrastructure (Fleet)
 * envelope, which CONTAINS all four infrastructure groups (Kafka, Data
 * Layer, Kubernetes, Compute) as drillable sub-entity chains whose member
 * nodes are leaf entities (no custom canvas payload — their status rides in
 * the mesh data + triage rows). Health rollups, watchlist membership, and
 * drift are all computed upstream here (Principle 1).
 */

// ---------------------------------------------------------------------------
// Infrastructure (Fleet) — one generic envelope containing every infra group
// ---------------------------------------------------------------------------

const INFRA_GROUP_KIND = 'INFRA_GROUP';
const INFRA_MEMBER_KIND = 'INFRA_MEMBER';

/** One seeded infrastructure member node: [id, health, cpu%, mem%, impact, unit, failureKey?]
 * — health is seed-time truth; every tick re-derives it from drifted data. */
type InfraMemberSeed = [string, HealthState, number, number, number, string, string?];

const KAFKA_FLEET: InfraMemberSeed[] = [
  ['broker-east-01', 'HEALTHY', 42, 58, 0, 'partitions'],
  ['broker-east-02', 'HEALTHY', 38, 61, 0, 'partitions'],
  ['broker-east-03', 'WARNING', 88, 79, 9400000, 'msgs/day', 'WARN_BROKER_PRESSURE_EAST'],
  ['broker-east-04', 'CRITICAL', 96, 92, 14400000, 'msgs/day', 'FAIL_BROKER_SATURATION_EAST'],
  ['controller-east-01', 'HEALTHY', 21, 34, 0, 'elections'],
  ['broker-eu-01', 'WARNING', 88, 72, 6100000, 'msgs/day', 'WARN_ISR_SHRINK_EU'],
  ['broker-eu-02', 'HEALTHY', 31, 44, 0, 'partitions'],
  ['broker-eu-03', 'CRITICAL', 97, 71, 12200000, 'msgs/day', 'FAIL_PRODUCER_STALL_EU'],
  ['controller-eu-01', 'HEALTHY', 18, 29, 0, 'elections'],
  ['controller-eu-02', 'UNKNOWN', 12, 22, 0, 'elections', 'STALE_CONTROLLER_HEARTBEAT'],
];

const DATA_FLEET: InfraMemberSeed[] = [
  ['pg-us-primary', 'HEALTHY', 38, 55, 0, 'queries'],
  ['pg-us-replica-1', 'WARNING', 61, 88, 6100, 'stale reads', 'WARN_REPLICA_LAG_US'],
  ['pg-eu-primary', 'WARNING', 55, 87, 2900, 'stale reads', 'WARN_CHECKPOINT_STALL_EU'],
  ['redis-cache-01', 'CRITICAL', 96, 94, 9200, 'cache misses', 'FAIL_EVICT_STORM_CACHE'],
  ['redis-cache-02', 'HEALTHY', 44, 49, 0, 'cache misses'],
  ['mongo-eu-01', 'CRITICAL', 96, 61, 3400, 'documents', 'FAIL_OPLOG_WINDOW'],
  ['mongo-eu-02', 'UNKNOWN', 12, 12, 0, 'documents', 'STALE_MEMBER_HEARTBEAT'],
];

const K8S_FLEET: InfraMemberSeed[] = [
  ['node-us-01', 'HEALTHY', 46, 52, 0, 'pods'],
  ['node-us-02', 'WARNING', 78, 88, 14, 'pods', 'WARN_NODE_MEM_PRESSURE'],
  ['node-us-03', 'HEALTHY', 33, 41, 0, 'pods'],
  ['node-eu-01', 'WARNING', 71, 86, 22, 'pods', 'WARN_NODE_MEM_PRESSURE'],
  ['cp-eu-01', 'CRITICAL', 96, 94, 12, 'services', 'FAIL_ETCD_DISK_LATENCY'],
  ['cp-eu-02', 'UNKNOWN', 12, 18, 0, 'services', 'STALE_CONTROLPLANE_HEARTBEAT'],
];

const EC2_FLEET: InfraMemberSeed[] = [
  ['web-us-a', 'HEALTHY', 62, 55, 0, 'rows/min stalled'],
  ['batch-us-a', 'CRITICAL', 97, 91, 14200, 'rows/min stalled', 'FAIL_BATCH_CPU_SATURATION'],
  ['web-eu-b', 'WARNING', 88, 64, 2100, 'rows/min stalled', 'WARN_WEB_HEADROOM_SHRINKING'],
  ['edge-eu-c', 'HEALTHY', 35, 40, 0, 'rows/min stalled'],
];

const INFRA_FLEET: Array<[string, string, string, InfraMemberSeed[]]> = [
  ['group-kafka-mesh', 'Message Broker Mesh (Kafka)', 'KAFKA_BROKER / KAFKA_CONTROLLER', KAFKA_FLEET],
  ['group-data-layer', 'Data Layer (Postgres · Redis · MongoDB)', 'DATABASE / CACHE', DATA_FLEET],
  ['group-container-platform', 'Container Platform (Kubernetes)', 'K8S_NODE / K8S_CONTROL_PLANE', K8S_FLEET],
  ['group-compute-fleet', 'Compute Fleet (EC2 Auto-Scaling Groups)', 'EC2_INSTANCE', EC2_FLEET],
];

/** Member-node entity for one group (depth 3 — the chain cap). Its readings
 * carry the same upstream-computed status as its healthState, so the canvas
 * mirror and the entity drawer can never disagree. */
function infraMemberEntity(groupId: string, seed: InfraMemberSeed): EnrichedEntity {
  const [id, health, cpu, mem, impact, unit, key] = seed;
  return ent(
    groupId,
    id,
    INFRA_MEMBER_KIND,
    id,
    health,
    det(
      narrativeFor(id, health),
      impact,
      unit,
      health === 'HEALTHY' ? undefined : key,
      [
        metric(`${id} CPU`, cpu, '%', health),
        metric(`${id} Memory`, mem, '%', health),
      ],
      health === 'HEALTHY' ? undefined : seedIncidentStart(health)
    )
  );
}

/** Group entity (depth 2). Its healthState is the rollup of its member
 * nodes — computed upstream from data, and re-derived every tick. */
function infraGroupEntity(
  groupId: string,
  label: string,
  members: EnrichedEntity[],
  detail: DetailExtract,
  deep?: ArchetypePayload
): EnrichedEntity {
  const healthState = rollupHealth(members.map((m) => m.healthState));
  return {
    entityId: groupId,
    parentId: 'proc-infra-03',
    entityKind: INFRA_GROUP_KIND,
    label,
    depth: 2,
    healthState,
    // A degraded group IS an active incident upstream — the footer line must
    // not contradict the rollup it displays (audit V22).
    detail:
      healthState === 'HEALTHY'
        ? detail
        : { ...detail, incidentStartedAt: seedIncidentStart(healthState) },
    deep,
  };
}

/** The fleet-scale deep view: one mesh grid per infrastructure group, each
 * listing its member nodes — every group, node, and status on one canvas.
 * A group is ONE SCALE ABOVE its nodes: each grid is keyed to its group
 * entity (groupId), so the section title carries the group and the cells
 * under it carry its nodes — said once, not twice (no duplicate chip strip
 * below the canvas). */
function infraFleetDeep(): ArchetypePayload {
  return {
    archetype: 'TOPOLOGY',
    clusterName: 'Infrastructure Fleet — 4 meshes · 27 nodes',
    totalNodes: INFRA_FLEET.reduce((n, group) => n + group[3].length, 0),
    nodes: [],
    grids: INFRA_FLEET.map(([groupId, label, kind, members]) => ({
      groupId: groupId, // mirrors the group entity — its ONE live instance is the section title
      groupName: `${label} — ${kind}`,
      nodes: members.map(([id, health, cpu, mem]) => ({
        nodeId: id,
        status: health,
        cpuUtilizationPct: cpu,
        memoryUtilizationPct: mem,
        entityId: id,
      })),
    })),
    edges: INFRA_FLEET.flatMap(([groupId, , , members]) =>
      members.map(([id]) => ({ source: groupId, target: id, active: true }))
    ),
  };
}

/** Assembles the generic Infrastructure (Fleet) envelope. */
function infraFleetEnvelope(): ProcessStatePayload {
  const entities = chain(
    ...INFRA_FLEET.flatMap(([groupId, label, kind, members]) => [
      infraGroupEntity(
        groupId,
        label,
        members.map((m) => infraMemberEntity(groupId, m)),
        det(
          `${label}: ${members.length - members.filter((m) => m[1] === 'HEALTHY').length} of ${
            members.length
          } nodes outside healthy thresholds (${kind.toLowerCase()}).`,
          members.reduce((total, m) => total + m[4], 0),
          members[0][5],
          'DEGRADED_INFRA_FLEET'
        )
      ),
      ...members.map((m) => infraMemberEntity(groupId, m)),
    ])
  );
  const unhealthy = Object.values(entities).filter(
    (e) => e.entityKind === INFRA_MEMBER_KIND && (e.healthState === 'CRITICAL' || e.healthState === 'WARNING')
  ).length;
  return {
    header: {
      processId: 'proc-infra-03',
      title: 'Infrastructure (Fleet)',
      ownerTeam: 'Platform SRE',
      updatedAt: new Date().toISOString(),
      healthState: 'CRITICAL',
      staleHeartbeatThresholdSeconds: 10,
    },
    overview: {
      heroMetricLabel: 'Unhealthy Fleet Nodes',
      heroMetricValue: unhealthy,
      heroMetricUnit: `of ${INFRA_FLEET.reduce((n, g) => n + g[3].length, 0)}`,
      trend: 'UP',
    },
    detail: {
      narrativeSummary: `Infrastructure (Fleet): degraded — ${unhealthy} of ${INFRA_FLEET.reduce(
        (n, g) => n + g[3].length,
        0
      )} nodes across the Kafka, Data, Kubernetes and Compute meshes are outside healthy thresholds.`,
      impactedCount: INFRA_FLEET.flatMap((g) => g[3]).reduce((total, m) => total + m[4], 0),
      impactedUnit: 'workload units at risk',
      primaryFailureKey: 'DEGRADED_INFRA_FLEET',
      incidentStartedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    deep: infraFleetDeep(),
    entities,
    smartLaunchers: [
      {
        id: 'sl-1',
        label: 'Broker Metrics Wallboard',
        targetTool: 'GRAFANA',
        url: 'https://grafana.internal/d/fleet-mesh/infrastructure',
        parameters: { mesh: 'all' },
      },
      {
        id: 'sl-2',
        label: 'Datadog Infrastructure Agents',
        targetTool: 'DATADOG',
        url: 'https://datadog.internal/dash/infrastructure-fleet',
        parameters: { env: 'prod' },
      },
    ],
  };
}

const SEED_PROCESS_STATES: ProcessStatePayload[] = [
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

  infraFleetEnvelope(),
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


// ============================================================================
const INFRA_PROCESS_IDS: readonly string[] = ['proc-infra-03'];

/** Triage-list membership: unhealthy means WARNING or CRITICAL (upstream rule). */
const UNHEALTHY_STATES: readonly HealthState[] = ['CRITICAL', 'WARNING'];

/** Triage rows are member nodes only — groups are containers, never rows. */
const isInfraMember = (entity: EnrichedEntity): boolean => entity.entityKind === INFRA_MEMBER_KIND;

/**
 * Fleet watchlist builder: collect every WARNING/CRITICAL member node of the
 * Infrastructure envelope into one cross-group, severity-ordered list.
 * The UI only ever displays this data — it never derives membership or order.
 */
function buildInfraWatch(fleet: ProcessStatePayload[]): InfraWatchEntry[] {
  const entries: InfraWatchEntry[] = [];
  for (const processId of INFRA_PROCESS_IDS) {
    const envelope = fleet.find((state) => state.header.processId === processId);
    if (!envelope?.entities) continue;
    for (const entity of Object.values(envelope.entities)) {
      if (!isInfraMember(entity) || !UNHEALTHY_STATES.includes(entity.healthState)) continue;
      const first = entity.detail.metrics?.[0];
      entries.push({
        processId: envelope.header.processId,
        processTitle: envelope.header.title,
        groupId: entity.parentId,
        entityId: entity.entityId,
        entityKind: entity.entityKind,
        health: entity.healthState,
        hero: {
          heroMetricLabel: first?.label ?? entity.entityKind,
          heroMetricValue: first?.value ?? 0,
          heroMetricUnit: first?.unit,
          trend: 'STABLE',
        },
      });
    }
  }
  const severity = (h: HealthState) => (h === 'CRITICAL' ? 0 : 1);
  entries.sort(
    (a, b) =>
      severity(a.health) - severity(b.health) ||
      (a.groupId ?? '').localeCompare(b.groupId ?? '') ||
      a.entityId.localeCompare(b.entityId)
  );
  return entries;
}

/** Group partition of the watchlist: one section per group (sections stay
 * ordered by member severity, matching the flat list's ordering rules). */
function buildInfraGroups(fleet: ProcessStatePayload[]): InfraGroupExcerpt[] {
  const watch = buildInfraWatch(fleet);
  const groups = new Map<string, InfraGroupExcerpt>();
  for (const processId of INFRA_PROCESS_IDS) {
    const envelope = fleet.find((state) => state.header.processId === processId);
    if (!envelope?.entities) continue;
    for (const entity of Object.values(envelope.entities)) {
      if (entity.entityKind !== INFRA_GROUP_KIND) continue;
      groups.set(entity.entityId, {
        processId: envelope.header.processId,
        groupId: entity.entityId,
        groupLabel: entity.label,
        groupHealth: 'HEALTHY',
        members: [],
      });
    }
  }
  for (const entry of watch) {
    groups.get(entry.groupId ?? '')?.members.push(entry);
  }
  for (const group of groups.values()) {
    if (group.members.length > 0) {
      group.groupHealth = rollupHealth(group.members.map((m) => m.health));
    }
  }
  return [...groups.values()];
}

/** Re-stamp upstream data into every envelope's DetailExtract: group health
 *  is re-derived from member health, then the fleet-wide watchlist (flat +
 *  grouped views of the SAME drifted data) is recomputed and stamped, so
 *  every drawer's triage list is live upstream state, never a stale literal. */
function stampFleetWatch(fleet: ProcessStatePayload[]): ProcessStatePayload[] {
  const reDerived = fleet.map((state) => {
    if (!state.entities) return state;
    let entities = state.entities;
    for (const [entityId, entity] of Object.entries(state.entities)) {
      if (entity.entityKind !== INFRA_GROUP_KIND) continue;
      const healthState = groupMemberRollup(entity, state.entities!);
      if (healthState === entity.healthState) continue;
      entities = { ...entities, [entityId]: { ...entity, healthState } };
    }
    return entities === state.entities ? state : { ...state, entities };
  });
  const watch = buildInfraWatch(reDerived);
  const groups = buildInfraGroups(reDerived);
  return reDerived.map((state) => ({
    ...state,
    detail: {
      ...state.detail,
      infraWatch: watch.map((entry) => ({ ...entry })),
      infraGroups: groups.map((group) => ({ ...group, members: [...group.members] })),
    },
  }));
}

/** The exported fleet: seeds carry their first upstream-computed watchlist. */
export const mockProcessStates: ProcessStatePayload[] = stampFleetWatch(SEED_PROCESS_STATES);

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
    // Fresh envelope drift first, then a fresh fleet-wide watchlist.
    current = stampFleetWatch(current.map(nextMockState));
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
