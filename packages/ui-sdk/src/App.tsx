/**
 * Core Platform UI Shell — recursive, scale-agnostic viewing model
 * -------------------------------------------------------------------------
 * Hosts the Plugin Registry, the mock WebSocket feed, and the Automated View
 * Controller. Shell state is a CONTEXT PATH (not a fixed tier union): an
 * ordered trail of viewing frames, each naming one viewing TARGET (a process
 * or one entity inside its envelope) and one viewing MODE ('detail' drawer or
 * 'deep' canvas). "Back one scale" pops the last frame; crumb clicks truncate
 * the trail; drills push a new frame. Chains terminate as DATA — an entity
 * with no `deep` payload simply ends its chain at the detail view, and the
 * runtime DEPTH_CAP guard refuses any push that would exceed depth 3.
 *
 * Principle 1: the Shell only DISPLAYS precomputed healthState, blast radius
 * and narratives (all computed upstream by the mock generator). It never
 * computes them, never branches on an archetype name, and never assumes a
 * layout is bound to a scale. Deep views mount through pluginRegistry
 * lookups (subEntityId manifest first, process DeepComponent fallback,
 * visible canvas fallback last). Canvas nodes that MIRROR a drillable entity
 * (payload nodes carrying a seeded entityId link) are themselves the live
 * drill affordance for that entity: the workbench chip strip lists only
 * children with no canvas instance, so every entity keeps exactly ONE
 * clickable instance per page — never zero, never two.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArchetypePayload,
  DEPTH_CAP,
  DetailExtract,
  EnrichedEntity,
  HealthState,
  InfraWatchEntry,
  ProcessStatePayload,
} from './types';
import { pluginRegistry } from './plugin-registry';
import { ArchetypeCanvas } from './components/primitives/ArchetypeCanvas';
import { DetailDrawer } from './components/primitives/DetailDrawer';
import { OverviewTile } from './components/primitives/OverviewTile';
import { SmartLauncherGroup } from './components/SmartLaunchers';
import {
  mockProcessStates,
  createMockStateStream,
  MockStateStream,
} from './mocks/processStateMocks';
import { seedMockPlugins } from './mocks/pluginSeeds';

// ============================================================================
// Context-Path Model
// ============================================================================

/** One viewing target: a process, or one entity inside its envelope. */
type ViewTarget = { processId: string; entityId?: string };

/** Viewing MODE (not a data tier): detail drawer or deep canvas. */
type ViewMode = 'detail' | 'deep';

/** One step on the context path: WHERE to look and in WHICH mode. */
type ContextFrame = { target: ViewTarget; mode: ViewMode };

/** Everything a frame needs to paint — resolved by lookup, never derived. */
type FocusedView = {
  label: string;
  kindHint: string;
  health: HealthState;
  extract: DetailExtract;
  deep?: ArchetypePayload;
  /** Fleet-wide unhealthy-infra watch — precomputed; display-only (P1). */
  watch?: InfraWatchEntry[];
};

const TICK_INTERVAL_MS = 2500;

const lastFrame = (trail: ContextFrame[]): ContextFrame | undefined =>
  trail[trail.length - 1];

const oneHopUp = (trail: ContextFrame[]): ContextFrame[] => trail.slice(0, -1);

const hopToCrumb = (trail: ContextFrame[], index: number): ContextFrame[] =>
  trail.slice(0, index + 1);

const frameKey = (frame: ContextFrame): string =>
  `${frame.target.processId}:${frame.target.entityId ?? ''}:${frame.mode}`;

/** Resolve a frame's target through the envelope (display-only lookups). */
function focusFrame(
  frame: ContextFrame,
  states: Record<string, ProcessStatePayload>
): FocusedView | undefined {
  const state = states[frame.target.processId];
  if (!state) return undefined;
  if (!frame.target.entityId) {
    return {
      label: state.header.title,
      kindHint: `${state.header.ownerTeam} · ${state.header.processId}`,
      health: state.header.healthState,
      extract: state.detail,
      deep: state.deep,
      watch: state.detail.infraWatch,
    };
  }
  const entity = state.entities?.[frame.target.entityId];
  if (!entity) return undefined;
  return {
    label: entity.label,
    kindHint: `${entity.entityKind} · ${entity.entityId}`,
    health: entity.healthState,
    extract: entity.detail,
    deep: entity.deep,
  };
}

/** Sub-entities directly under a frame's target (data-driven drill hints). */
function childrenOf(
  frame: ContextFrame,
  states: Record<string, ProcessStatePayload>
): EnrichedEntity[] {
  const state = states[frame.target.processId];
  if (!state?.entities) return [];
  const parentKey = frame.target.entityId ?? frame.target.processId;
  return Object.values(state.entities).filter((entity) => entity.parentId === parentKey);
}

// ============================================================================
// Shell
// ============================================================================

seedMockPlugins(); // Shell boot: every mock plugin registers before first render

function Shell() {
  const [states, setStates] = useState<Record<string, ProcessStatePayload>>(() =>
    Object.fromEntries(mockProcessStates.map((s) => [s.header.processId, s]))
  );
  const [trail, setTrail] = useState<ContextFrame[]>([]);
  const [streamLive, setStreamLive] = useState(true);
  const [lastTickAt, setLastTickAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const streamRef = useRef<MockStateStream | null>(null);

  // Wall clock ticker — repaints staleness indicators between feed ticks.
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  // Mock WebSocket feed. Pausing models a network disconnection: heartbeat
  // gaps grow until each process's staleHeartbeatThresholdSeconds is crossed.
  useEffect(() => {
    const stream = createMockStateStream(mockProcessStates, {
      intervalMs: TICK_INTERVAL_MS,
      onTick: (ticked) => {
        setStates(Object.fromEntries(ticked.map((s) => [s.header.processId, s])));
        setLastTickAt(Date.now());
      },
    });
    streamRef.current = stream;
    if (streamLive) stream.start();
    return () => {
      stream.stop();
      streamRef.current = null;
    };
  }, [streamLive]);

  const toggleFeed = () => {
    const stream = streamRef.current;
    if (!stream) return;
    if (stream.isRunning()) {
      stream.stop();
      setStreamLive(false);
    } else {
      stream.start();
      setStreamLive(true);
    }
  };

  /**
   * Staleness = heartbeat-gap detection (a data-freshness concern, not a
   * health verdict — healthState itself stays computed upstream).
   */
  const isStale = (state: ProcessStatePayload): boolean => {
    const thresholdMs = (state.header.staleHeartbeatThresholdSeconds ?? 10) * 1000;
    return now - lastTickAt > thresholdMs;
  };

  const feedFresh = now - lastTickAt <= 10_000;

  // ------------------------------------------------------------------
  // Context-path navigation (all generic: no archetype-specific branching)
  // ------------------------------------------------------------------

  const openProcess = (processId: string) =>
    setTrail([{ target: { processId }, mode: 'detail' }]);

  /** Same target, deeper mode: drawer → canvas for that target's payload. */
  const goDeeper = () =>
    setTrail((trail) =>
      trail.map((frame, index) =>
        index === trail.length - 1 ? { ...frame, mode: 'deep' } : frame
      )
    );

  /**
   * One hop DOWN the chain. Generic guards, no data derivation:
   * - an affordance without entity data behind it does nothing;
   * - a push at (or beyond) DEPTH_CAP is refused — the chain terminates.
   */
  const drillInto = (target: ViewTarget) => {
    if (trail.length >= DEPTH_CAP) {
      console.info(`[Shell] Depth cap (${DEPTH_CAP}) reached — deeper drill refused.`);
      return;
    }
    const state = states[target.processId];
    const entity = target.entityId ? state?.entities?.[target.entityId] : undefined;
    if (!state || !entity) return; // no data behind this affordance → no view
    if (entity.depth > DEPTH_CAP) {
      console.info(`[Shell] "${entity.entityId}" sits at depth ${entity.depth} — beyond the cap.`);
      return;
    }
    setTrail((trail) => [...trail, { target: target, mode: 'detail' }]);
  };

  /** One hop UP: close this frame, land on the previous target + mode. */
  const goBack = () => setTrail(oneHopUp);

  const goToCrumb = (index: number) => setTrail((trail) => hopToCrumb(trail, index));

  const top = lastFrame(trail);
  const current = top ? focusFrame(top, states) : undefined;
  const parent = trail.length > 1 ? trail[trail.length - 2] : undefined;
  const parentView = parent ? focusFrame(parent, states) : undefined;
  const inDetailMode = Boolean(top && top.mode === 'detail' && current);
  const inDeepMode = Boolean(top && top.mode === 'deep' && current?.deep);

  // ------------------------------------------------------------------
  // Reused regions
  // ------------------------------------------------------------------

  const grid = (
    <main className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="wall-grid">
      {pluginRegistry.getAll().map((manifest) => {
        const state = states[manifest.processId];
        if (!state) return null;
        return (
          <OverviewTile
            key={manifest.processId}
            density="wall"
            entityKey={manifest.processId}
            entityLabel={state.header.title}
            subtitle={state.header.ownerTeam}
            health={state.header.healthState}
            heroLabel={state.overview.heroMetricLabel}
            heroValue={state.overview.heroMetricValue}
            heroUnit={state.overview.heroMetricUnit}
            trend={state.overview.trend}
            stale={isStale(state)}
            onSelect={openProcess}
          />
        );
      })}
    </main>
  );

  const topChildren = top ? childrenOf(top, states) : [];

  /**
   * Children already mirrored by a linked canvas node (generic keyed
   * lookup — no archetype names). Mirrored members keep exactly one live
   * affordance: the canvas node itself, so the chip strip yields to it.
   * Unmirrored children (rule gates, heat rows, observations…) stay
   * chip-drillable — no entity ever loses its only drill path.
   */
  const deepPayload = current?.deep;
  const mirroredIds = new Set<string>(
    deepPayload && 'nodes' in deepPayload
      ? [...deepPayload.nodes]
          .map((node) => node.entityId)
          .filter((id): id is string => id !== undefined)
      : []
  );
  const drillChildren = topChildren.filter((child) => !mirroredIds.has(child.entityId));

  const childDrills = (
    <section aria-label="Drill into sub-entities" data-testid="child-drills" className="mt-8">
      <h3 className="text-console text-ink-secondary uppercase tracking-wider mb-3">
        Sub-entity chains (depth {Math.min((top?.target.entityId ? 3 : 2), DEPTH_CAP)} ≤ cap {DEPTH_CAP})
      </h3>
      <div className="flex flex-wrap gap-3">
        {drillChildren.map((child) => (
          <OverviewTile
            key={child.entityId}
            density="desk"
            entityKey={child.entityId}
            entityLabel={child.label}
            subtitle={child.entityKind}
            health={child.healthState}
            heroLabel={child.detail.metrics?.[0]?.label}
            heroValue={child.detail.metrics?.[0]?.value}
            heroUnit={child.detail.metrics?.[0]?.unit}
            onSelect={(entityId) => top && drillInto({ processId: top.target.processId, entityId })}
          />
        ))}
      </div>
    </section>
  );

  // ------------------------------------------------------------------
  // Deep mode — full-page canvas for whichever entity is being viewed
  // ------------------------------------------------------------------

  if (top && inDeepMode && current) {
    return (
      <div className="min-h-screen bg-surface-base text-ink-primary p-8 font-sans" data-testid="workbench-page">
        <nav aria-label="Context path" className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            className="smart-launcher-button"
            data-testid="back-one-scale"
            onClick={goBack}
          >
            ← Back one scale
          </button>
          {trail.map((frame, index) => {
            const label = focusFrame(frame, states)?.label ?? frame.target.entityId ?? frame.target.processId;
            return index === trail.length - 1 ? (
              <span key={frameKey(frame)} className="text-console text-ink-secondary">
                {index > 0 && <span className="mr-3 text-ink-muted">›</span>}
                {label}
              </span>
            ) : (
              <button
                key={frameKey(frame)}
                type="button"
                className="smart-launcher-button"
                onClick={() => goToCrumb(index)}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <header className="mb-6 border-b border-border-subtle pb-4">
          <h1 className="text-desk-title font-bold">{current.label} — SRE Workbench</h1>
          <p className="text-console text-ink-secondary mt-1">
            {current.kindHint} · HEALTH: {current.health} · UPDATED:{' '}
            {new Date(states[top.target.processId].header.updatedAt).toLocaleTimeString()}
          </p>
        </header>

        <main className="max-w-6xl">
          <ArchetypeCanvas
            processId={top.target.processId}
            entityId={top.target.entityId}
            entityLabel={current.label}
            data={current.deep!}
            health={current.health}
            registry={pluginRegistry}
            onSelectEntity={(entityId) =>
              top && drillInto({ processId: top.target.processId, entityId })
            }
            onExecuteMitigation={async (actionKey, payload) => {
              console.info('[Shell] Mitigation dispatched', actionKey, payload);
              window.alert(`Mitigation dispatched: ${actionKey}`);
            }}
          />
          {drillChildren.length > 0 && childDrills}
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Detail mode (and the default wall view) — grid backdrop + drawer
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary p-8 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-desk-title font-bold">VANTAGE // Command Center</h1>
          <p className="text-console text-ink-secondary mt-1">
            {pluginRegistry.getAll().length} registered processes · mock telemetry feed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-console font-mono"
            style={{
              color: feedFresh && streamLive
                ? 'var(--status-healthy-fg)'
                : 'var(--status-unknown-fg)',
            }}
          >
            ● {streamLive ? (feedFresh ? 'FEED LIVE' : 'FEED STALE') : 'FEED PAUSED'}
          </span>
          <button type="button" className="smart-launcher-button" onClick={toggleFeed}>
            {streamLive ? '⏸ PAUSE FEED' : '▶ RESUME FEED'}
          </button>
        </div>
      </header>

      {!top && grid}

      {inDetailMode && top && current && (
        <>
          {/* Backdrop behind the drawer — same page shape at every scale */}
          {trail.length === 1 ? (
            grid
          ) : (
            parent &&
            parentView?.deep && (
              <main
                className="max-w-6xl pointer-events-none select-none opacity-40"
                aria-hidden="true"
              >
                <ArchetypeCanvas
                  processId={parent.target.processId}
                  entityId={parent.target.entityId}
                  entityLabel={parentView.label}
                  data={parentView.deep}
                  health={parentView.health}
                  registry={pluginRegistry}
                />
              </main>
            )
          )}

          <DetailDrawer
            key={frameKey(top)}
            level={top.target.entityId ? 'entity' : 'process'}
            entityLabel={current.label}
            kindHint={current.kindHint}
            extract={current.extract}
            health={current.health}
            infraWatch={trail.length === 1 ? current.watch : undefined}
            onDrillInfra={
              trail.length === 1
                ? (entry) => drillInto({ processId: entry.processId, entityId: entry.entityId })
                : undefined
            }
            hasDeepView={Boolean(current.deep)}
            onOpenDeep={goDeeper}
            onBack={goBack}
            launcherSlot={
              !top.target.entityId && states[top.target.processId].smartLaunchers?.length
                ? <SmartLauncherGroup
                    launchers={states[top.target.processId].smartLaunchers!}
                    payload={states[top.target.processId]}
                  />
                : undefined
            }
          />
        </>
      )}
    </div>
  );
}

export default Shell;
