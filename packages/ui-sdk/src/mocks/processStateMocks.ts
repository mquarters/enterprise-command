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
  L3DomainPayload,
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
function deriveHealthState(payload: L3DomainPayload): HealthState {
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

function driftL3Payload(payload: L3DomainPayload): L3DomainPayload {
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
// Envelope tick
// ============================================================================

/** Produces a fresh, drifted copy of an envelope. Never mutates the input. */
export function nextMockState(previous: ProcessStatePayload): ProcessStatePayload {
  const l3Payload = driftL3Payload(previous.l3Payload);
  const healthState = deriveHealthState(l3Payload);
  const healthChanged = healthState !== previous.header.healthState;

  const previousHero = previous.l1Summary.heroMetricValue;
  const heroMetricValue =
    typeof previousHero === 'number'
      ? jitter(previousHero, 0.15, 0, Number.MAX_SAFE_INTEGER)
      : previousHero;
  const trend: TrendDirection =
    typeof previousHero === 'number' && typeof heroMetricValue === 'number'
      ? trendFor(previousHero, heroMetricValue)
      : previous.l1Summary.trend;

  const impactedCount = driftImpactedCount(healthState, previous.l2Detail.impactedCount);

  return {
    header: { ...previous.header, healthState, updatedAt: new Date().toISOString() },
    l1Summary: { ...previous.l1Summary, heroMetricValue, trend },
    l2Detail: {
      ...previous.l2Detail,
      impactedCount,
      narrativeSummary: healthChanged
        ? narrativeFor(previous.header.title, healthState)
        : previous.l2Detail.narrativeSummary,
    },
    l3Payload,
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
    l1Summary: {
      heroMetricLabel: 'Processing Latency',
      heroMetricValue: 1420,
      heroMetricUnit: 'ms',
      trend: 'UP',
    },
    l2Detail: {
      narrativeSummary:
        'Settlement queue depth exceeded capacity due to high latency in the FedWire validation step.',
      impactedCount: 14250,
      impactedUnit: 'transactions',
      primaryFailureKey: 'ERR_FEDWIRE_TIMEOUT_504',
      incidentStartedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    l3Payload: {
      archetype: 'FLOW',
      nodes: [
        { id: 'n1', label: 'Ingest Batch', status: 'HEALTHY', durationMs: 45 },
        { id: 'n2', label: 'FedWire Validation', status: 'CRITICAL', durationMs: 1350, errorRate: 12.4 },
        { id: 'n3', label: 'Ledger Post', status: 'UNKNOWN' },
      ],
      edges: [
        { source: 'n1', target: 'n2', active: true },
        { source: 'n2', target: 'n3', active: false },
      ],
    },
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
    l1Summary: {
      heroMetricLabel: 'Token Issuance Rate',
      heroMetricValue: 98.4,
      heroMetricUnit: '%',
      trend: 'STABLE',
    },
    l2Detail: {
      narrativeSummary: 'Auth Pipeline (OAuth): operating within normal parameters.',
      impactedCount: 0,
      impactedUnit: 'sessions',
    },
    l3Payload: {
      archetype: 'FLOW',
      nodes: [
        { id: 'n1', label: 'Token Mint', status: 'HEALTHY', durationMs: 8 },
        { id: 'n2', label: 'Session Cache', status: 'HEALTHY', durationMs: 3 },
        { id: 'n3', label: 'Consent Gate', status: 'HEALTHY', durationMs: 12 },
      ],
      edges: [
        { source: 'n1', target: 'n2', active: true },
        { source: 'n2', target: 'n3', active: true },
      ],
    },
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
    l1Summary: {
      heroMetricLabel: 'Cluster CPU',
      heroMetricValue: 88,
      heroMetricUnit: '%',
      trend: 'UP',
    },
    l2Detail: {
      narrativeSummary:
        'Two brokers in the US-East mesh are above 85% utilization; partition rebalance is in progress.',
      impactedCount: 312000000,
      impactedUnit: 'msgs/day',
      primaryFailureKey: 'WARN_BROKER_PRESSURE_EAST',
      incidentStartedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    l3Payload: {
      archetype: 'TOPOLOGY',
      clusterName: 'US-East Production Mesh',
      totalNodes: 6,
      nodes: [
        { nodeId: 'broker-east-01', status: 'HEALTHY', cpuUtilizationPct: 42, memoryUtilizationPct: 58 },
        { nodeId: 'broker-east-02', status: 'HEALTHY', cpuUtilizationPct: 38, memoryUtilizationPct: 61 },
        { nodeId: 'broker-east-03', status: 'WARNING', cpuUtilizationPct: 88, memoryUtilizationPct: 79 },
        { nodeId: 'broker-east-04', status: 'CRITICAL', cpuUtilizationPct: 96, memoryUtilizationPct: 92 },
        { nodeId: 'controller-01', status: 'HEALTHY', cpuUtilizationPct: 21, memoryUtilizationPct: 34 },
        { nodeId: 'controller-02', status: 'HEALTHY', cpuUtilizationPct: 19, memoryUtilizationPct: 31 },
      ],
    },
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
    l1Summary: {
      heroMetricLabel: 'Rules Violated',
      heroMetricValue: 2,
      heroMetricUnit: 'of 3',
      trend: 'UP',
    },
    l2Detail: {
      narrativeSummary:
        'TLS 1.2 downgrade detected on the scrubbing lane and tokenization rotation is overdue.',
      impactedCount: 8400,
      impactedUnit: 'records at risk',
      primaryFailureKey: 'FAIL_TLS_VERSION_CHECK',
      incidentStartedAt: new Date(Date.now() - 96 * 60 * 1000).toISOString(),
    },
    l3Payload: {
      archetype: 'RULE_GATE',
      policyId: 'POL-COMPLIANCE-01',
      policyName: 'PCI-DSS Data Scrubbing Gate',
      rules: [
        { ruleId: 'r1', description: 'PAN Masking Active', condition: 'mask == true', actualValue: 'true', targetValue: 'true', passed: true },
        { ruleId: 'r2', description: 'TLS Version Check', condition: 'tls >= 1.3', actualValue: '1.2', targetValue: '1.3', passed: false },
        { ruleId: 'r3', description: 'Tokenization Rotation', condition: 'rotate <= 30 days', actualValue: '45 days', targetValue: '30 days', passed: false },
      ],
    },
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
    l1Summary: {
      heroMetricLabel: 'Auth Latency',
      heroMetricValue: 118,
      heroMetricUnit: 'ms',
      trend: 'DOWN',
    },
    l2Detail: {
      narrativeSummary: 'Card Auth Latency: operating within normal parameters.',
      impactedCount: 0,
      impactedUnit: 'authorizations',
    },
    l3Payload: {
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
    l1Summary: {
      heroMetricLabel: 'Liquidity Ratio',
      heroMetricValue: 11.2,
      heroMetricUnit: '%',
      trend: 'DOWN',
    },
    l2Detail: {
      narrativeSummary:
        'Liquidity ratio fell below the 15% regulatory floor; reserve coverage remains compliant.',
      impactedCount: 2,
      impactedUnit: 'settlement rails',
      primaryFailureKey: 'FAIL_LIQUIDITY_RATIO_FLOOR',
      incidentStartedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    l3Payload: {
      archetype: 'RULE_GATE',
      policyId: 'POL-TREASURY-07',
      policyName: 'Basel III Liquidity Policy Gate',
      rules: [
        { ruleId: 'r1', description: 'Liquidity Ratio Floor', condition: 'liquidity_ratio >= 15%', actualValue: 11.2, targetValue: 15, passed: false },
        { ruleId: 'r2', description: 'Reserve Coverage', condition: 'coverage >= 110%', actualValue: 118, targetValue: 110, passed: true },
      ],
    },
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
    l1Summary: {
      heroMetricLabel: 'Peak Error Rate',
      heroMetricValue: 3.9,
      heroMetricUnit: '%',
      trend: 'UP',
    },
    l2Detail: {
      narrativeSummary:
        'FX quote staleness above SLA on OTC Quote Gateway and FX Matching Engine; matching engine may throttle on stale feeds.',
      impactedCount: 240,
      impactedUnit: 'quotes',
      primaryFailureKey: 'FAIL_FX_QUOTE_STALE_SLA',
      incidentStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    l3Payload: {
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
