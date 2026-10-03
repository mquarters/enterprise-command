import React, { useState } from 'react';
import { FlowArchetype } from './components/archetypes/FlowArchetype';
import { StatArchetype } from './components/archetypes/StatArchetype';
import { TopologyArchetype } from './components/archetypes/TopologyArchetype';
import { RuleGateArchetype } from './components/archetypes/RuleGateArchetype';

export default function App() {
  const [activeTab, setActiveTab] = useState<'FLOW' | 'STAT' | 'TOPOLOGY' | 'RULE'>('FLOW');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <header className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">UI-SDK Archetype Gallery</h1>
        <p className="text-slate-400 text-sm">Previewing L3 Domain Components</p>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4">
          {(['FLOW', 'STAT', 'TOPOLOGY', 'RULE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab} Archetype
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {activeTab === 'FLOW' && (
          <FlowArchetype
            processId="PROC-9901"
            health="CRITICAL"
            data={{
              archetype: 'FLOW',
              nodes: [
                { id: '1', label: 'Ingest Gateway', status: 'HEALTHY', durationMs: 12 },
                { id: '2', label: 'Transform Worker', status: 'WARNING', durationMs: 140, errorRate: 2 },
                { id: '3', label: 'Database Persist', status: 'CRITICAL', durationMs: 850, errorRate: 18 },
              ],
              edges: [
                { source: '1', target: '2', active: true },
                { source: '2', target: '3', active: true },
              ],
            }}
            onExecuteMitigation={async (action) => alert(`Executed action: ${action}`)}
          />
        )}

        {activeTab === 'STAT' && (
          <StatArchetype
            processId="PROC-9902"
            health="HEALTHY"
            data={{
              archetype: 'STATISTICAL',
              metricName: 'Payment Processing Latency (ms)',
              currentValue: 142,
              mean: 120,
              upperControlLimit: 180,
              lowerControlLimit: 60,
              timeSeries: [
                { timestamp: '10:00', value: 110 },
                { timestamp: '10:01', value: 125 },
                { timestamp: '10:02', value: 118 },
                { timestamp: '10:03', value: 195, isOutlier: true },
                { timestamp: '10:04', value: 142 },
              ],
            }}
          />
        )}

        {activeTab === 'TOPOLOGY' && (
          <TopologyArchetype
            processId="PROC-9903"
            health="WARNING"
            data={{
              archetype: 'TOPOLOGY',
              clusterName: 'US-East Production Mesh',
              totalNodes: 4,
              nodes: [
                { nodeId: 'node-a1', status: 'HEALTHY', cpuUtilizationPct: 42, memoryUtilizationPct: 58 },
                { nodeId: 'node-a2', status: 'HEALTHY', cpuUtilizationPct: 38, memoryUtilizationPct: 61 },
                { nodeId: 'node-b1', status: 'WARNING', cpuUtilizationPct: 88, memoryUtilizationPct: 79 },
                { nodeId: 'node-b2', status: 'CRITICAL', cpuUtilizationPct: 96, memoryUtilizationPct: 92 },
              ],
            }}
          />
        )}

        {activeTab === 'RULE' && (
          <RuleGateArchetype
            processId="PROC-9904"
            health="CRITICAL"
            data={{
              archetype: 'RULE_GATE',
              policyId: 'POL-COMPLIANCE-01',
              policyName: 'PCI-DSS Data Scrubbing Gate',
              rules: [
                { ruleId: 'r1', description: 'PAN Masking Active', condition: 'mask == true', actualValue: 'true', targetValue: 'true', passed: true },
                { ruleId: 'r2', description: 'TLS Version Check', condition: 'tls >= 1.3', actualValue: '1.2', targetValue: '1.3', passed: false },
              ],
            }}
            onExecuteMitigation={async (action) => alert(`Executing override: ${action}`)}
          />
        )}
      </main>
    </div>
  );
}