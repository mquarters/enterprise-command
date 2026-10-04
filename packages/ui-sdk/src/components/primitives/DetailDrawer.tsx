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
 *
 * A process-scale drawer may also carry the fleet-wide unhealthy-infrastructure
 * watchlist (DetailExtract.infraWatch), optionally partitioned by infrastructure
 * group (DetailExtract.infraGroups — one section per group, each listing its
 * unhealthy member nodes). It is displayed verbatim — membership, grouping,
 * and ordering are computed upstream (Principle 1) — and its rows are drill
 * affordances into the listed element's own drawer.
 */

import React, { ReactNode } from 'react';
import { DetailExtract, HealthState, InfraGroupExcerpt, InfraWatchEntry } from '../../types';
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
  /** Fleet-wide unhealthy-infra watchlist — precomputed; displayed verbatim. */
  infraWatch?: InfraWatchEntry[];
  /** Group partition of the watchlist — precomputed; displayed verbatim.
   *  Present only at Infrastructure scale; takes display precedence. */
  infraGroups?: InfraGroupExcerpt[];
  /** Drill affordance: open the listed element's own drawer (Shell wires it). */
  onDrillInfra?: (entry: InfraWatchEntry) => void;
  /** Drill affordance: open a group's own drawer (Shell wires it). */
  onDrillGroup?: (group: InfraGroupExcerpt) => void;
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
  infraWatch,
  infraGroups,
  onDrillInfra,
  onDrillGroup,
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

      {/* Fleet-wide unhealthy-infra watch — membership + statuses computed
          upstream; displayed verbatim (Principle 1). When grouped, one
          section per infrastructure group: group chip + one row per
          unhealthy member node. Rows drill into the entity's own drawer;
          colors ride the status tokens. */}
      {infraGroups && infraGroups.length > 0 ? (
        <section aria-label="Unhealthy infrastructure (all types)" data-testid="infra-watch">
          <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-2">
            Infrastructure health — all types ({infraWatch?.length ?? 0} unhealthy)
          </h3>
          <div className="flex flex-col gap-3">
            {infraGroups.map((group) => (
              <div key={group.groupId} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  data-testid="infra-watch-group"
                  data-status={group.groupHealth}
                  onClick={() => onDrillGroup?.(group)}
                  aria-label={`${group.groupLabel} — ${group.groupHealth}. Drill into ${group.groupLabel}`}
                  className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded px-2 py-1 text-left font-mono text-console focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
                  style={{
                    color: statusFg(group.groupHealth),
                    backgroundColor: statusBg(group.groupHealth),
                    border: `1px solid ${statusBorder(group.groupHealth)}`,
                  }}
                >
                  <span className="min-w-0 truncate">{group.groupLabel}</span>
                  <span aria-hidden="true">▸</span>
                </button>
                <ul className="ml-3 flex flex-col gap-1.5 font-mono text-console">
                  {group.members.length === 0 ? (
                    <li className="px-2 py-1 rounded text-ink-secondary">All member nodes healthy.</li>
                  ) : (
                    group.members.map((entry) => (
                      <li key={`${entry.processId}:${entry.entityId}`}>
                        <button
                          type="button"
                          data-testid="infra-watch-row"
                          data-status={entry.health}
                          onClick={() => onDrillInfra?.(entry)}
                          aria-label={`${entry.entityId} — ${entry.health}. Drill into ${entry.entityKind}`}
                          className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded border-l-2 pl-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
                          style={{ borderLeftColor: statusBorder(entry.health) }}
                        >
                          <span className="min-w-0 truncate text-ink-primary">
                            {entry.entityId} · {entry.entityKind}
                          </span>
                          {entry.hero.heroMetricValue !== undefined && (
                            <span
                              className="shrink-0"
                              style={{ color: statusFg(entry.health) }}
                            >
                              {entry.hero.heroMetricLabel}: {entry.hero.heroMetricValue}
                              {entry.hero.heroMetricUnit ? ` ${entry.hero.heroMetricUnit}` : ''}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : (
        infraWatch &&
        infraWatch.length > 0 && (
          <section aria-label="Unhealthy infrastructure (all types)" data-testid="infra-watch">
            <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-2">
              Infrastructure health — all types ({infraWatch.length} unhealthy)
            </h3>
            <ul className="flex flex-col gap-1.5 font-mono text-console">
              {infraWatch.map((entry) => (
                <li key={`${entry.processId}:${entry.entityId}`}>
                  <button
                    type="button"
                    data-testid="infra-watch-row"
                    data-status={entry.health}
                    onClick={() => onDrillInfra?.(entry)}
                    aria-label={`${entry.entityId} — ${entry.health}. Drill into ${entry.entityKind}`}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 rounded border-l-2 pl-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-secondary"
                    style={{ borderLeftColor: statusBorder(entry.health) }}
                  >
                    <span className="min-w-0 truncate text-ink-primary">
                      {entry.entityId} · {entry.entityKind}
                    </span>
                    {entry.hero.heroMetricValue !== undefined && (
                      <span
                        className="shrink-0"
                        style={{ color: statusFg(entry.health) }}
                      >
                        {entry.hero.heroMetricLabel}: {entry.hero.heroMetricValue}
                        {entry.hero.heroMetricUnit ? ` ${entry.hero.heroMetricUnit}` : ''}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      )}

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

      <footer className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-border-subtle bg-surface-overlay pt-4">
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
