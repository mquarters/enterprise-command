import React from 'react';
import { StatisticalArchetypeProps } from '../../types';

export const StatArchetype: React.FC<StatisticalArchetypeProps> = ({
  processId,
  data,
  health,
}) => {
  const maxVal = Math.max(...data.timeSeries.map((d) => d.value), data.upperControlLimit * 1.1);
  const minVal = Math.min(...data.timeSeries.map((d) => d.value), data.lowerControlLimit * 0.9);

  return (
    <div className="p-6 bg-surface-card border border-border-subtle rounded-xl text-ink-primary">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-desk-title font-bold">{data.metricName}</h3>
          <p className="text-console text-ink-secondary">Statistical Process Control Chart ({processId})</p>
        </div>
        <div className="text-right">
          <span className="text-desk-title font-mono font-bold">{data.currentValue}</span>
          <span className="text-console text-ink-secondary block">Current Reading</span>
        </div>
      </div>

      {/* Stat Summary Bar */}
      <div className="grid grid-cols-3 gap-2 bg-surface-base p-3 rounded-lg text-console mb-6">
        <div>UCL: <span className="text-status-critical-fg font-mono">{data.upperControlLimit}</span></div>
        <div>Mean: <span className="text-status-healthy-fg font-mono">{data.mean}</span></div>
        <div>LCL: <span className="text-status-warning-fg font-mono">{data.lowerControlLimit}</span></div>
      </div>

      {/* SVG Time Series Sparkline with Outliers — box height scales with the wall (M1/M2) */}
      <div className="h-chart xl:h-chart-tv w-full relative">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120">
          {/* Upper Control Limit Line */}
          <line x1="0" y1="20" x2="500" y2="20" className="stat-control-limit" />
          <text x="5" y="15" fill="var(--status-critical-fg)" fontSize="10">UCL</text>

          {/* Mean Line */}
          <line x1="0" y1="60" x2="500" y2="60" stroke="var(--border-strong)" strokeDasharray="2 2" />

          {/* Points */}
          {data.timeSeries.map((pt, i) => {
            const x = (i / (data.timeSeries.length - 1)) * 500;
            // Normalize y between 10 and 110
            const y = 110 - ((pt.value - minVal) / (maxVal - minVal || 1)) * 100;

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={pt.isOutlier ? 6 : 3}
                  fill={pt.isOutlier ? 'var(--status-critical-fg)' : 'var(--status-healthy-fg)'}
                  className={pt.isOutlier ? 'animate-ping' : ''}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={pt.isOutlier ? 4 : 2}
                  fill={pt.isOutlier ? 'var(--status-critical-fg)' : 'var(--status-healthy-fg)'}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};