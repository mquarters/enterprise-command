/**
 * DetailDrawer — scale-agnostic detail primitive.
 * -------------------------------------------------------------------------
 * Renders ANY entity's DetailExtract at ANY scale inside a DrawerShell:
 * process-scale (level="process") or sub-entity-scale (level="entity").
 * It only DISPLAYS precomputed readings — narrative, blast radius, and
 * per-metric statuses arrive computed upstream (Principle 1).
 *
 * When an entity's chain continues (its EnrichedEntity carries its own deep
 * payload), the Shell passes hasDeepView + onOpenDeep and the drawer offers
 * the "go deeper" hop — so chains continue as DATA, never as code branches.
 */

import React, { ReactNode } from 'react';
import { DetailExtract, HealthState } from '../../types';
import { DrawerShell } from './DrawerShell';

const statusFg = (h: HealthState) => `var(--status-${h.toLowerCase()}-fg)`;
const statusBg = (h: HealthState) => `var(--status-${h.toLowerCase()}-bg)`;
const statusBorder = (h: HealthState) => `var(--status-${h.toLowerCase()}-border)`;

export interface DetailDrawerProps {
  /** Which scale the drawer opens at — drives z-layer + width only. */
  level: 'process' | 'entity';
  entityLabel: string;
  /** Display hint (entityKind / owner team). Never branched on. */
  kindHint?: string;
  /** Precomputed upstream — displayed verbatim. */
  extract: DetailExtract;
  /** Precomputed upstream — displayed, never derived (Principle 1). */
  health: HealthState;
  /** True when this entity's chain continues (custom deep payload exists). */
  hasDeepView?: boolean;
  /** Drill affordance: mount this entity's own deep view. */
  onOpenDeep?: () => void;
  /** Optional slot for deep-link launchers, composed by the Shell. */
  launcherSlot?: ReactNode;
  /** One hop up the context path (also fired by Esc and the ✕ button). */
  onBack: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  level,
  entityLabel,
  kindHint,
  extract,
  health,
  hasDeepView,
  onOpenDeep,
  launcherSlot,
  onBack,
}) => {
  return (
    <DrawerShell
      level={level}
      title={entityLabel}
      subtitle={kindHint}
      health={health}
      onClose={onBack}
    >
      {/* Narrative + upstream failure classification */}
      <section className="detail-narrative" data-health={health} aria-label="Incident narrative">
        <p>{extract.narrativeSummary}</p>
        {extract.primaryFailureKey && (
          <p className="mt-2 font-mono text-console" style={{ color: statusFg(health) }}>
            FAILURE KEY: {extract.primaryFailureKey}
          </p>
        )}
      </section>

      {/* Blast radius: quantified impact at THIS entity's scale */}
      <section
        aria-label="Blast radius"
        className="flex items-center gap-3 px-3 py-2 rounded-lg"
        style={{
          backgroundColor: statusBg(health),
          border: `1px solid ${statusBorder(health)}`,
        }}
      >
        <span
          className="font-mono font-bold text-desk-title"
          style={{ color: statusFg(health) }}
        >
          {extract.impactedCount.toLocaleString()}
        </span>
        <span className="text-desk-body text-ink-primary">{extract.impactedUnit} impacted</span>
      </section>

      {/* Entity-scoped readings — statuses computed upstream, mapped to tokens */}
      {extract.metrics && extract.metrics.length > 0 && (
        <section aria-label="Entity readings">
          <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-2">
            Entity Readings
          </h3>
          <dl className="flex flex-col gap-1.5 font-mono text-console">
            {extract.metrics.map((reading) => (
              <div key={reading.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-secondary">{reading.label}</dt>
                <dd style={{ color: statusFg(reading.status ?? 'HEALTHY') }}>
                  {reading.value}
                  {reading.unit ? ` ${reading.unit}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Deep links slot (SmartLauncherGroup rendered by the Shell) */}
      {launcherSlot && (
        <section>
          <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-2">
            Deep Links
          </h3>
          {launcherSlot}
        </section>
      )}

      <footer className="mt-auto pt-4 border-t border-border-subtle flex flex-col gap-3">
        {hasDeepView && onOpenDeep && (
          <button
            type="button"
            className="smart-launcher-button justify-center"
            onClick={onOpenDeep}
          >
            ⌕ Inspect internals
          </button>
        )}
        <p className="text-console text-ink-muted text-center">
          Esc to close ·{' '}
          {extract.incidentStartedAt
            ? `Since ${new Date(extract.incidentStartedAt).toLocaleTimeString()}`
            : 'No active incident'}
        </p>
      </footer>
    </DrawerShell>
  );
};
