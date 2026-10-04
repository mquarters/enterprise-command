import React from 'react';
import { TopologyArchetypeProps } from '../../types';

/**
 * Mesh cells mirror real cluster members; a cell whose `entityId` link
 * matches a drillable EnrichedEntity becomes the ONE live instance of that
 * entity on the page (button), instead of an inert cell + duplicate chip.
 * Status colors stay seeded upstream — the button is a nav affordance only,
 * never a place where the UI computes health (Principle 1).
 */
export const TopologyArchetype: React.FC<TopologyArchetypeProps> = ({
  processId,
  data,
  onSelectEntity,
}) => {
  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-ink-primary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-desk-title font-bold">{data.clusterName}</h3>
          <p className="text-console text-ink-secondary">Total Mesh Nodes: {data.totalNodes}</p>
        </div>
      </div>

      {/* Cluster Node Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.nodes.map((node) => {
          const linked = node.entityId;
          const cellClass = 'p-3 bg-surface-base border rounded-lg flex flex-col justify-between';
          const cellStyle = {
            borderColor: `var(--status-${node.status.toLowerCase()}-border)`,
          };
          const cellBody = (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-console font-bold truncate">{node.nodeId}</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: `var(--status-${node.status.toLowerCase()}-fg)` }}
                />
              </div>

              <div className="space-y-1 text-console font-mono text-ink-secondary">
                <div className="flex justify-between">
                  <span>CPU:</span>
                  <span className={node.cpuUtilizationPct > 85 ? 'text-status-critical-fg' : 'text-ink-primary'}>
                    {node.cpuUtilizationPct}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>MEM:</span>
                  <span className={node.memoryUtilizationPct > 85 ? 'text-status-warning-fg' : 'text-ink-primary'}>
                    {node.memoryUtilizationPct}%
                  </span>
                </div>
              </div>
            </>
          );
          return linked && onSelectEntity ? (
            <button
              key={node.nodeId}
              type="button"
              className={`${cellClass} text-left cursor-pointer`}
              data-entity={linked}
              data-status={node.status}
              style={cellStyle}
              onClick={() => onSelectEntity(linked)}
            >
              {cellBody}
            </button>
          ) : (
            <div
              key={node.nodeId}
              className={cellClass}
              data-status={node.status}
              style={cellStyle}
            >
              {cellBody}
            </div>
          );
        })}
      </div>
    </div>
  );
};
