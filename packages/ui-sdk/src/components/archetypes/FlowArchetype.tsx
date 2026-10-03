import React from 'react';
import { FlowArchetypeProps } from '../../types';

export const FlowArchetype: React.FC<FlowArchetypeProps> = ({
  processId,
  data,
  health,
  onExecuteMitigation,
}) => {
  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-ink-primary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-desk-title font-bold">Execution Flow Topology</h3>
          <p className="text-console text-ink-secondary">Process ID: {processId}</p>
        </div>
        <span
          className="px-3 py-1 text-console font-mono rounded-full font-semibold"
          style={{
            backgroundColor: `var(--status-${health.toLowerCase()}-bg)`,
            color: `var(--status-${health.toLowerCase()}-fg)`,
            border: `1px solid var(--status-${health.toLowerCase()}-border)`,
          }}
        >
          {health}
        </span>
      </div>

      {/* Visual Graph Nodes */}
      <div className="flex flex-wrap items-center gap-4 my-8">
        {data.nodes.map((node, index) => {
          const outgoingEdge = data.edges.find((e) => e.source === node.id);
          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                className="flow-node shadow-lg flex flex-col justify-between"
                data-status={node.status}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-desk-body">{node.label}</span>
                  <span className="text-console opacity-75">{node.id}</span>
                </div>

                <div className="text-console opacity-80 flex flex-col gap-0.5">
                  {node.durationMs !== undefined && <span>Lat: {node.durationMs}ms</span>}
                  {node.errorRate !== undefined && (
                    <span className={node.errorRate > 5 ? 'text-status-critical-fg' : ''}>
                      Err: {node.errorRate}%
                    </span>
                  )}
                </div>
              </div>

              {/* Connector Arrow / Edge */}
              {index < data.nodes.length - 1 && (
                <div className="flex items-center text-ink-muted font-mono">
                  <span className={outgoingEdge?.active ? 'text-status-healthy-fg animate-pulse' : ''}>
                    ──►
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Action Controls */}
      {onExecuteMitigation && health === 'CRITICAL' && (
        <div className="pt-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={() => onExecuteMitigation('RETRY_FAILED_STEP')}
            className="smart-launcher-button bg-status-critical-bg text-status-critical-fg border-status-critical-border hover:brightness-125"
          >
            ⚡ Trigger Automatic Retry / Bypass
          </button>
        </div>
      )}
    </div>
  );
};