/**
 * OverviewTile — scale-agnostic overview primitive (two densities).
 * -------------------------------------------------------------------------
 * ONE component that paints an overview reading at ANY scale:
 *  - density="wall": full wall-display tile (process scale, distance type);
 *  - density="desk": compact sub-entity chip inside a canvas view.
 *
 * `health` (and per-reading statuses) arrive PRECOMPUTED from upstream and
 * are only displayed — color is mapped from status tokens, never derived
 * here (Principle 1). The trend glyph is a neutral direction indicator.
 */

import React from 'react';
import { HealthState, TrendDirection } from '../../types';

/** Neutral trend glyphs — direction of travel only, never a health verdict. */
const TREND_GLYPH: Record<TrendDirection, string> = {
  UP: '▲',
  DOWN: '▼',
  STABLE: '◆',
  NEUTRAL: '—',
};

const statusFg = (h: HealthState) => `var(--status-${h.toLowerCase()}-fg)`;
const statusBg = (h: HealthState) => `var(--status-${h.toLowerCase()}-bg)`;
const statusBorder = (h: HealthState) => `var(--status-${h.toLowerCase()}-border)`;

export interface OverviewTileProps {
  /** What selecting this tile drills into (processId or entityId). */
  entityKey: string;
  entityLabel: string;
  /** Optional secondary line (owner team at wall scale, parent at desk). */
  subtitle?: string;
  /** Precomputed upstream — display-only mapping to color tokens. */
  health: HealthState;
  /** The one hero reading this entity leads with (display-only). */
  heroLabel?: string;
  heroValue?: string | number;
  heroUnit?: string;
  trend?: TrendDirection;
  /** 'wall' = process-scale tile; 'desk' = compact sub-entity chip. */
  density?: 'wall' | 'desk';
  /**
   * Staleness flag computed upstream (heartbeat-gap detection).
   * When true the tile desaturates to signal "do not trust this data".
   */
  stale?: boolean;
  /** Whole-surface select affordance (no inner buttons — flat surface). */
  onSelect?: (entityKey: string) => void;
}

export const OverviewTile: React.FC<OverviewTileProps> = ({
  entityKey,
  entityLabel,
  subtitle,
  health,
  heroLabel,
  heroValue,
  heroUnit,
  trend,
  density = 'wall',
  stale = false,
  onSelect,
}) => {
  const heroText =
    heroLabel === undefined || heroValue === undefined
      ? undefined
      : `${heroLabel}: ${heroValue}${heroUnit ? ` ${heroUnit}` : ''}`;

  if (density === 'desk') {
    return (
      <button
        type="button"
        data-testid="overview-tile-desk"
        data-entity={entityKey}
        data-status={health}
        data-stale={stale ? 'true' : undefined}
        onClick={() => onSelect?.(entityKey)}
        aria-label={`${entityLabel} — ${health}${heroText ? `. ${heroText}` : ''}`}
        className="flow-node flex cursor-pointer flex-col justify-between gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
        style={{
          opacity: stale ? 0.35 : 1,
          filter: stale ? 'grayscale(0.9)' : undefined,
        }}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-desk-body">{entityLabel}</span>
          <span aria-hidden="true">{health === 'HEALTHY' ? '' : '●'}</span>
        </span>
        <span className="flex items-baseline justify-between gap-2 text-console opacity-90">
          {heroText && <span>{heroText}</span>}
          {trend && <span aria-hidden="true">{TREND_GLYPH[trend]}</span>}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="overview-tile"
      data-entity={entityKey}
      data-health={health}
      data-stale={stale ? 'true' : undefined}
      onClick={() => onSelect?.(entityKey)}
      aria-label={`${entityLabel} — ${health}. ${heroLabel ?? ''}: ${heroValue ?? ''}`}
      className="l1-process-card w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
      style={{
        opacity: stale ? 0.35 : 1,
        filter: stale ? 'grayscale(0.9)' : undefined,
      }}
    >
      {/* Identity row: title + health chip + trend glyph */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-tv-title font-bold break-words">{entityLabel}</h2>
          {subtitle && <p className="text-tv-sub text-ink-secondary">{subtitle}</p>}
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
          {trend && (
            <span className="font-mono text-tv-sub text-ink-primary" aria-hidden="true">
              {TREND_GLYPH[trend]}
            </span>
          )}
        </div>
      </div>

      {/* Hero row: the instant "is it working?" answer */}
      {heroLabel !== undefined && heroValue !== undefined && (
        <div className="flex items-baseline gap-3 mt-6">
          <span
            className="text-tv-hero font-mono font-bold"
            style={{ color: statusFg(health) }}
          >
            {heroValue}
          </span>
          <span className="text-tv-sub text-ink-secondary">
            {heroUnit ? `${heroLabel} (${heroUnit})` : heroLabel}
          </span>
        </div>
      )}
    </button>
  );
};
