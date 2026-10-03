/**
 * Tier L1 Micro-Component: `L1ProcessCard` (ProcessTile)
 * -------------------------------------------------------------------------
 * Passive-glanceability tile for the NOC Wall Display Grid.
 * Rules honored:
 *  - Zero visible buttons / chrome: the whole tile is one flat clickable
 *    surface (no interactive affordances rendered inside).
 *  - Distance typography only (`text-tv-*` tokens); readable from ~20 ft.
 *  - NO client-side status computation: `health` arrives precomputed
 *    upstream and is only *displayed* (color mapped from status tokens).
 *    The trend arrow is a neutral glyph — it never derives health.
 */

import React from 'react';
import { HealthState, L1SummaryExtract, TrendDirection } from '../../types';

/** Neutral trend glyphs — direction of travel only, never a health verdict. */
const TREND_GLYPH: Record<TrendDirection, string> = {
  UP: '▲',
  DOWN: '▼',
  STABLE: '◆',
  NEUTRAL: '—',
};

export interface ProcessTileProps {
  processId: string;
  title: string;
  ownerTeam?: string;
  /** Precomputed upstream — display-only mapping to color tokens. */
  health: HealthState;
  summary: L1SummaryExtract;
  /**
   * Staleness flag computed upstream (heartbeat gap detection).
   * When true the tile desaturates to signal "do not trust this data".
   */
  stale?: boolean;
  /** Tile-select handler (tile-level click, not a rendered button). */
  onSelect?: (processId: string) => void;
}

const statusFg = (h: HealthState) => `var(--status-${h.toLowerCase()}-fg)`;
const statusBg = (h: HealthState) => `var(--status-${h.toLowerCase()}-bg)`;
const statusBorder = (h: HealthState) => `var(--status-${h.toLowerCase()}-border)`;

export const ProcessTile: React.FC<ProcessTileProps> = ({
  processId,
  title,
  ownerTeam,
  health,
  summary,
  stale = false,
  onSelect,
}) => {
  const heroLabel = summary.heroMetricUnit
    ? `${summary.heroMetricLabel} (${summary.heroMetricUnit})`
    : summary.heroMetricLabel;

  return (
    <button
      type="button"
      data-health={health}
      data-stale={stale ? 'true' : undefined}
      onClick={() => onSelect?.(processId)}
      className="l1-process-card w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
      style={{
        opacity: stale ? 0.35 : 1,
        filter: stale ? 'grayscale(0.9)' : undefined,
      }}
      aria-label={`${title} — ${health}. ${heroLabel}: ${summary.heroMetricValue}`}
    >
      {/* Identity row: title + health chip + trend glyph */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-tv-title font-bold truncate">{title}</h2>
          {ownerTeam && <p className="text-tv-sub text-ink-secondary">{ownerTeam}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className="px-3 py-1 rounded font-mono font-bold text-tv-sub"
            style={{
              color: statusFg(health),
              backgroundColor: statusBg(health),
              border: `1px solid ${statusBorder(health)}`,
            }}
          >
            {health}
          </span>
          <span className="font-mono text-tv-sub text-ink-primary" aria-hidden="true">
            {TREND_GLYPH[summary.trend]}
          </span>
        </div>
      </div>

      {/* Hero row: the instant "is it working?" answer */}
      <div className="flex items-baseline gap-3 mt-6">
        <span
          className="text-tv-hero font-mono font-bold"
          style={{ color: statusFg(health) }}
        >
          {summary.heroMetricValue}
        </span>
        <span className="text-tv-sub text-ink-secondary">{heroLabel}</span>
      </div>
    </button>
  );
};
