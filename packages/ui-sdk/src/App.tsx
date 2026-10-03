/**
 * Core Platform UI Shell — Mock Data Test Run
 * -------------------------------------------------------------------------
 * Hosts the Plugin Registry, the mock WebSocket feed, and the Automated View
 * Controller:
 *   L1 — auto-renders the wall grid by iterating the plugin registry
 *   L2 — tile click opens the Triage Drawer overlay
 *   L3 — "Launch SRE Workbench" mounts the registered archetype component
 *
 * All telemetry comes from the mock state generator (no backend in this
 * test run). The Shell only DISPLAYS healthState; it never computes it.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  BaseArchetypeProps,
  L3DomainPayload,
  ProcessStatePayload,
  ProcessPluginManifest,
} from './types';
import { pluginRegistry, defineProcessPlugin } from './plugin-registry';
import { ProcessTile } from './components/L1/ProcessTile';
import { TriageDrawer } from './components/L2/TriageDrawer';
import { FlowArchetype } from './components/archetypes/FlowArchetype';
import { StatArchetype } from './components/archetypes/StatArchetype';
import { TopologyArchetype } from './components/archetypes/TopologyArchetype';
import { RuleGateArchetype } from './components/archetypes/RuleGateArchetype';
import {
  mockProcessStates,
  createMockStateStream,
  MockStateStream,
} from './mocks/processStateMocks';

// ============================================================================
// Plugin Registry Seeding (mock "feature team" registrations)
// ============================================================================

const ARCHETYPE_COMPONENTS = {
  FLOW: FlowArchetype,
  STATISTICAL: StatArchetype,
  TOPOLOGY: TopologyArchetype,
  RULE_GATE: RuleGateArchetype,
} as const;

/** Registers one mock Process Plugin per seeded process state. */
function seedMockPlugins(): void {
  if (pluginRegistry.getAll().length > 0) return;

  for (const state of mockProcessStates) {
    const archetype = state.l3Payload.archetype;
    const manifest: ProcessPluginManifest = {
      processId: state.header.processId,
      title: state.header.title,
      ownerTeam: state.header.ownerTeam,
      description: state.l2Detail.narrativeSummary,
      archetype,
      // The registry stores manifests under the widened union props type;
      // each concrete component narrows `data` again at mount time.
      L3Component: ARCHETYPE_COMPONENTS[archetype] as React.ComponentType<
        BaseArchetypeProps<L3DomainPayload>
      >,
    };
    pluginRegistry.register(defineProcessPlugin(manifest));
  }
}

seedMockPlugins(); // Shell boot: every mock plugin registers before first render

// ============================================================================
// Shell State
// ============================================================================

type ShellView =
  | { mode: 'L1' }
  | { mode: 'L2'; processId: string }
  | { mode: 'L3'; processId: string };

const TICK_INTERVAL_MS = 2500;

function Shell() {
  const [states, setStates] = useState<Record<string, ProcessStatePayload>>(() =>
    Object.fromEntries(mockProcessStates.map((s) => [s.header.processId, s]))
  );
  const [view, setView] = useState<ShellView>({ mode: 'L1' });
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
  // Tier L3 — dedicated full-page workbench
  // ------------------------------------------------------------------
  if (view.mode === 'L3') {
    const state = states[view.processId];
    const manifest = pluginRegistry.get(view.processId);
    if (state && manifest) {
      const L3Component = manifest.L3Component;
      return (
        <div className="min-h-screen bg-surface-base text-ink-primary p-8 font-sans">
          <button
            type="button"
            className="smart-launcher-button mb-6"
            onClick={() => setView({ mode: 'L1' })}
          >
            ← Back to Wall Display
          </button>

          <header className="mb-6 border-b border-border-subtle pb-4">
            <h1 className="text-desk-title font-bold">{state.header.title} — SRE Workbench</h1>
            <p className="text-console text-ink-secondary mt-1">
              {state.header.ownerTeam} · ARCHETYPE: {state.l3Payload.archetype} · HEALTH:{' '}
              {state.header.healthState} · UPDATED:{' '}
              {new Date(state.header.updatedAt).toLocaleTimeString()}
            </p>
          </header>

          <main className="max-w-6xl">
            <L3Component
              processId={state.header.processId}
              data={state.l3Payload}
              health={state.header.healthState}
              onExecuteMitigation={async (actionKey, payload) => {
                console.info('[Shell] Mitigation dispatched', actionKey, payload);
                window.alert(`Mitigation dispatched: ${actionKey}`);
              }}
            />
          </main>
        </div>
      );
    }
  }

  // ------------------------------------------------------------------
  // Tier L1 — wall display grid (auto-rendered from the Plugin Registry)
  // ------------------------------------------------------------------
  const selectedState = view.mode === 'L2' ? states[view.processId] : undefined;

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary p-8 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-desk-title font-bold">VANTAGE // Command Center</h1>
          <p className="text-console text-ink-secondary mt-1">
            L1 Wall Display · {pluginRegistry.getAll().length} registered processes ·
            mock telemetry feed
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

      <main className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pluginRegistry.getAll().map((manifest) => {
          const state = states[manifest.processId];
          if (!state) return null;
          return (
            <ProcessTile
              key={manifest.processId}
              processId={manifest.processId}
              title={state.header.title}
              ownerTeam={state.header.ownerTeam}
              health={state.header.healthState}
              summary={state.l1Summary}
              stale={isStale(state)}
              onSelect={(processId) => setView({ mode: 'L2', processId })}
            />
          );
        })}
      </main>

      {/* Tier L2 — triage drawer overlay (opens on tile click) */}
      {view.mode === 'L2' && selectedState && (
        <TriageDrawer
          key={selectedState.header.processId}
          payload={selectedState}
          onClose={() => setView({ mode: 'L1' })}
          onLaunchWorkbench={(processId) => setView({ mode: 'L3', processId })}
        />
      )}
    </div>
  );
}

export default Shell;
