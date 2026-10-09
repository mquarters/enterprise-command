/**
 * THROWAWAY MOCKUP HARNESS DATA — not production, not shipped, do not import.
 * Shapes mirror processStateMocks.ts (header/entities/queue) so truncation and
 * density problems are catchable at real sizes (audit V4/V27 lesson).
 */
window.MOCK = {
  processes: [
    { id: 'ach-pay', title: 'ACH Payment Settlement', team: 'Core Banking Ops', health: 'CRITICAL', heroLabel: 'Processing Latency', heroValue: '1420', heroUnit: 'ms', trend: 'up' },
    { id: 'auth-oauth', title: 'Auth Pipeline (OAuth)', team: 'Identity Platform', health: 'HEALTHY', heroLabel: 'Token Issuance Rate', heroValue: '98.4', heroUnit: '%', trend: 'flat' },
    { id: 'fleet-pl', title: 'Infrastructure (Fleet)', team: 'Platform SRE', health: 'CRITICAL', heroLabel: 'Unhealthy Fleet Nodes', heroValue: '13', heroUnit: '(of 27)', trend: 'up' },
    { id: 'pci-gate', title: 'PCI-DSS Scrubbing Gate', team: 'Compliance Engineering', health: 'CRITICAL', heroLabel: 'Rules Violated', heroValue: '2', heroUnit: '(of 3)', trend: 'flat' },
    { id: 'card-lat', title: 'Card Auth Latency', team: 'Payment Reliability', health: 'HEALTHY', heroLabel: 'Auth Latency', heroValue: '118', heroUnit: 'ms', trend: 'down' },
    { id: 'treasury-gate', title: 'Treasury Liquidity Gate', team: 'Treasury Risk', health: 'CRITICAL', heroLabel: 'Liquidity Ratio', heroValue: '11.2', heroUnit: '%', trend: 'down' },
    { id: 'fx-mesh', title: 'FX Quote Broadcast Mesh', team: 'Payments Reliability', health: 'WARNING', heroLabel: 'Peak Error Rate', heroValue: '3.9', heroUnit: '%', trend: 'flat' },
  ],
  // cross-dataset search corpus (processes + fleet members + narrative context)
  corpus: [
    { kind: 'PROCESS', label: 'ACH Payment Settlement', health: 'CRITICAL', ds: 'ach-pay' },
    { kind: 'PROCESS', label: 'Infrastructure (Fleet)', health: 'CRITICAL', ds: 'fleet-pl' },
    { kind: 'PROCESS', label: 'PCI-DSS Scrubbing Gate', health: 'CRITICAL', ds: 'pci-gate' },
    { kind: 'PROCESS', label: 'Treasury Liquidity Gate', health: 'CRITICAL', ds: 'treasury-gate' },
    { kind: 'FLOW_NODE', label: 'FedWire Validation', health: 'CRITICAL', ds: 'ach-pay', detail: 'lat 1350ms · err 12.4%' },
    { kind: 'QUEUE_CONSUMER', label: 'Queue Writer', health: 'CRITICAL', ds: 'ach-pay', detail: 'lag 812 msgs/min' },
    { kind: 'INFRA_MEMBER', label: 'broker-east-04', health: 'CRITICAL', ds: 'fleet-pl', detail: 'CPU: 96 %' },
    { kind: 'INFRA_MEMBER', label: 'broker-eu-03', health: 'CRITICAL', ds: 'fleet-pl', detail: 'CPU: 88 %' },
    { kind: 'INFRA_MEMBER', label: 'redis-cache-01', health: 'CRITICAL', ds: 'fleet-pl', detail: 'CPU: 96 %' },
    { kind: 'INFRA_MEMBER', label: 'pg-eu-primary', health: 'WARNING', ds: 'fleet-pl', detail: 'CPU: 55 %' },
    { kind: 'GATE', label: 'PAN Scrub Gate', health: 'CRITICAL', ds: 'pci-gate', detail: 'rule 2/3 breached' },
    { kind: 'HEATMAP_ROW', label: 'EUR/GBP spot leg', health: 'WARNING', ds: 'fx-mesh', detail: 'err 3.9 %' },
  ],
  // workbench region grids (fleet drill): region -> cluster -> member cells
  regions: [
    { name: 'AWS us-east-1', health: 'CRITICAL', cells: ['broker-east-04 CPU: 96 %', 'broker-east-03 CPU: 88 %', 'batch-us-a CPU: 97 %', 'web-us-b CPU: 88 %'] },
    { name: 'AWS eu-west-2', health: 'CRITICAL', cells: ['broker-eu-03 CPU: 88 %', 'redis-cache-01 CPU: 96 %', 'pg-eu-primary CPU: 55 %', 'web-eu-b CPU: 88 %'] },
    { name: 'GCP us-central1', health: 'WARNING', cells: ['broker-us-c1 CPU: 71 %', 'cache-us-c1 CPU: 44 %'] },
    { name: 'AZ East-2 (edge)', health: 'WARNING', cells: ['edge-cache-07 CPU: 62 %', 'edge-cache-08 CPU: 58 %'] },
  ],
  queue: [
    { origin: 'ACH Payment Router · FedWire Validation', title: 'Retry failed settlement batches', state: 'NEW', pri: 'P1' },
    { origin: 'Kafka · us-east', title: 'Drain hot Kafka partitions', state: 'ACK', pri: 'P2' },
    { origin: 'Card Auth', title: 'Review latency alert with vendor', state: 'MITIGATING', pri: 'P3' },
  ],
};
