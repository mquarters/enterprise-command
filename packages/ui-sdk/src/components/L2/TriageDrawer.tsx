/**
 * Tier L2 View Container: `L2TriageDrawerContainer` (TriageDrawer)
 * -------------------------------------------------------------------------
 * Slide-out triage drawer overlaying the wall grid. Opens on L1 tile click.
 *
 * Contains the three L2 micro-primitives (exported individually for reuse):
 *  - L2NarrativeBanner   → plain-English incident summary
 *  - L2BlastRadiusBadge  → quantified impact (count + unit)
 *  - SmartLauncherGroup  → deep links into third-party observability tools
 *
 * The Smart Link Context Injector appends time-window bounds (`from`/`to`)
 * and filtered tags (`process_id`, `failure_key`, launcher parameters) to
 * every generated deep link.
 */

import React, { useEffect } from 'react';
import { HealthState, ProcessStatePayload, SmartLauncherContext } from '../../types';

// ============================================================================
// Smart Link Context Injector
// ============================================================================

const TIME_WINDOW_MS = 30 * 60 * 1000; // ±30 min working window

/** Injects time bounds + filtered tags into an external tool URL. */
export function buildLauncherUrl(
  launcher: SmartLauncherContext,
  payload: ProcessStatePayload
): string {
  try {
    const url = new URL(launcher.url);
    const to = new Date(payload.header.updatedAt);
    if (!Number.isNaN(to.getTime())) {
      url.searchParams.set('from', new Date(to.getTime() - TIME_WINDOW_MS).toISOString());
      url.searchParams.set('to', to.toISOString());
    }
    url.searchParams.set('process_id', payload.header.processId);
    if (payload.l2Detail.primaryFailureKey) {
      url.searchParams.set('failure_key', payload.l2Detail.primaryFailureKey);
    }
    Object.entries(launcher.parameters ?? {}).forEach(([key, value]) =>
      url.searchParams.set(key, String(value))
    );
    return url.toString();
  } catch {
    return launcher.url; // Malformed URL → pass through unmodified
  }
}

// ============================================================================
// L2 Micro-Components (contained primitives)
// ============================================================================

const statusFg = (h: HealthState) => `var(--status-${h.toLowerCase()}-fg)`;
const statusBg = (h: HealthState) => `var(--status-${h.toLowerCase()}-bg)`;
const statusBorder = (h: HealthState) => `var(--status-${h.toLowerCase()}-border)`;

/** Plain-English incident summary + upstream failure classification key. */
export const L2NarrativeBanner: React.FC<{
  health: HealthState;
  narrative: string;
  failureKey?: string | null;
}> = ({ health, narrative, failureKey }) => (
  <div className="l2-narrative-banner" data-health={health}>
    <p>{narrative}</p>
    {failureKey && (
      <p className="font-mono text-console mt-2" style={{ color: statusFg(health) }}>
        FAILURE KEY: {failureKey}
      </p>
    )}
  </div>
);

/** Quantified blast radius: how many units are impacted. */
export const L2BlastRadiusBadge: React.FC<{
  health: HealthState;
  impactedCount: number;
  impactedUnit: string;
}> = ({ health, impactedCount, impactedUnit }) => (
  <div
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
      {impactedCount.toLocaleString()}
    </span>
    <span className="text-desk-body text-ink-primary">{impactedUnit} impacted</span>
  </div>
);

/** Deep-link launcher group for external observability tools. */
export const SmartLauncherGroup: React.FC<{
  launchers: SmartLauncherContext[];
  payload: ProcessStatePayload;
}> = ({ launchers, payload }) => (
  <div className="flex flex-wrap gap-2">
    {launchers.map((launcher) => (
      <a
        key={launcher.id}
        className="smart-launcher-button"
        href={buildLauncherUrl(launcher, payload)}
        target="_blank"
        rel="noreferrer"
      >
        ↗ {launcher.label} <span className="opacity-60">[{launcher.targetTool}]</span>
      </a>
    ))}
  </div>
);

// ============================================================================
// L2 View Container
// ============================================================================

export interface TriageDrawerProps {
  payload: ProcessStatePayload;
  onClose: () => void;
  onLaunchWorkbench: (processId: string) => void;
}

export const TriageDrawer: React.FC<TriageDrawerProps> = ({
  payload,
  onClose,
  onLaunchWorkbench,
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { header, l2Detail } = payload;
  const health = header.healthState;

  return (
    <>
      {/* Backdrop — click to dismiss */}
      <div
        className="fixed inset-0 bg-scrim"
        style={{ zIndex: 900 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="l2-triage-drawer-container"
        role="dialog"
        aria-modal="true"
        aria-label={`Triage drawer for ${header.title}`}
      >
        {/* Drawer header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-desk-title font-bold text-ink-primary">{header.title}</h2>
            <p className="text-console text-ink-secondary">
              {header.ownerTeam} · {header.processId}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-1 rounded font-mono font-bold text-console"
              style={{
                color: statusFg(health),
                backgroundColor: statusBg(health),
                border: `1px solid ${statusBorder(health)}`,
              }}
            >
              {health}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close triage drawer"
              className="smart-launcher-button"
              style={{ padding: '0.25rem 0.625rem' }}
            >
              ✕
            </button>
          </div>
        </header>

        <L2NarrativeBanner
          health={health}
          narrative={l2Detail.narrativeSummary}
          failureKey={l2Detail.primaryFailureKey}
        />

        <L2BlastRadiusBadge
          health={health}
          impactedCount={l2Detail.impactedCount}
          impactedUnit={l2Detail.impactedUnit}
        />

        {/* Deep links */}
        {payload.smartLaunchers && payload.smartLaunchers.length > 0 && (
          <section>
            <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-2">
              Deep Links
            </h3>
            <SmartLauncherGroup launchers={payload.smartLaunchers} payload={payload} />
          </section>
        )}

        {/* Footer: L3 escalation path */}
        <footer className="mt-auto pt-4 border-t border-border-subtle flex flex-col gap-3">
          <button
            type="button"
            className="smart-launcher-button justify-center"
            onClick={() => onLaunchWorkbench(header.processId)}
          >
            🔬 Launch SRE Workbench (L3)
          </button>
          <p className="text-console text-ink-muted text-center">
            Esc to close · Data updated{' '}
            {new Date(header.updatedAt).toLocaleTimeString()}
          </p>
        </footer>
      </aside>
    </>
  );
};
