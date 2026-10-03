import React from 'react';
import { HealthState, HeatmapArchetypeProps } from '../../types';

/**
 * Archetype 5 — Service × Time error-rate heatmap (L3 workbench tier).
 * Each square is one (service, time bucket) sample, painted with the
 * HealthState that upstream computed. The Shell never derives health from
 * this payload; this primitive only displays it (Principle 1).
 */

const LEGEND_STATES: readonly HealthState[] = ['HEALTHY', 'WARNING', 'CRITICAL', 'UNKNOWN'];

export const HeatmapArchetype: React.FC<HeatmapArchetypeProps> = ({ processId, data }) => {
  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-ink-primary">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-desk-title font-bold">{data.metricName}</h3>
          <p className="text-console text-ink-secondary">
            {data.serviceRows.length} services × {data.columns} buckets × {data.bucketMinutes} min · {processId}
          </p>
        </div>
        <div className="flex items-center gap-3 text-console font-mono text-ink-secondary">
          {LEGEND_STATES.map((state) => (
            <span key={state} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: `var(--status-${state.toLowerCase()}-fg)`,
                  opacity: state === 'HEALTHY' ? 0.45 : 1,
                }}
              />
              {state}
            </span>
          ))}
        </div>
      </div>

      {/* Heat rows: one per monitored service, oldest bucket on the left */}
      <div className="space-y-3">
        {data.serviceRows.map((row) => (
          <div key={row.serviceId} className="flex items-center gap-3">
            <span className="font-mono text-console truncate w-44 shrink-0">{row.label}</span>
            <div className="flex gap-1">
              {row.cells.map((cell) => (
                <span
                  key={cell.bucket}
                  title={`${row.serviceId} · bucket ${cell.bucket} · ${cell.errorRate}%`}
                  className="w-5 h-5 rounded"
                  style={{
                    backgroundColor: `var(--status-${cell.status.toLowerCase()}-fg)`,
                    opacity: cell.status === 'HEALTHY' ? 0.45 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 pt-4 border-t border-border-subtle text-console text-ink-muted">
        Oldest bucket on the left · newest on the right. Nominal error-rate squares are dimmed so
        WARNING/CRITICAL bursts stand out on the wall.
      </p>
    </div>
  );
};
