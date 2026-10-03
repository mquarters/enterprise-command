import { ProcessStatePayload } from '../types';

export const mockFlowState: ProcessStatePayload = {
  header: {
    processId: 'proc-payment-clearing-01',
    title: 'ACH Payment Settlement Engine',
    ownerTeam: 'Core Banking Ops',
    updatedAt: new Date().toISOString(),
    healthState: 'CRITICAL',
  },
  l1Summary: {
    heroMetricLabel: 'Processing Latency',
    heroMetricValue: 1420,
    heroMetricUnit: 'ms',
    trend: 'UP',
  },
  l2Detail: {
    narrativeSummary: 'Settlement queue depth exceeded capacity due to high latency in FedWire validation step.',
    impactedCount: 14250,
    impactedUnit: 'transactions',
    primaryFailureKey: 'ERR_FEDWIRE_TIMEOUT_504',
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
  ],
};