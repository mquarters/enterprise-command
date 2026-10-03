import React from 'react';
import { TopologyArchetypeProps } from '../../types';

export const TopologyArchetype: React.FC<TopologyArchetypeProps> = ({
  processId,
  data,
}) => {
  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-desk-title font-bold">{data.clusterName}</h3>
          <p className="text-console text-slate-400">Total Mesh Nodes: {data.totalNodes}</p>
        </div>
      </div>

      {/* Cluster Node Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.nodes.map((node) => (
          <div
            key={node.nodeId}
            className="p-3 bg-surface-base border rounded-lg flex flex-col justify-between"
            style={{
              borderColor: `var(--status-${node.status.toLowerCase()}-border)`,
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-console font-bold truncate">{node.nodeId}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: `var(--status-${node.status.toLowerCase()}-fg)` }}
              />
            </div>

            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>CPU:</span>
                <span className={node.cpuUtilizationPct > 85 ? 'text-status-critical-fg' : 'text-slate-200'}>
                  {node.cpuUtilizationPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>MEM:</span>
                <span className={node.memoryUtilizationPct > 85 ? 'text-status-warning-fg' : 'text-slate-200'}>
                  {node.memoryUtilizationPct}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};