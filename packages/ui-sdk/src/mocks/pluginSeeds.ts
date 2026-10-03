/**
 * Mock plugin seeding — test-run stand-in for real feature-team bundles.
 * -------------------------------------------------------------------------
 * In production each Feature Team's bundle self-registers at app boot. In
 * this test run the mock backend seeds an equivalent set of manifests from
 * the seeded mock states.
 *
 * The layout map below is DATA (layout kind → painting component), looked up
 * per entity — never an archetype-name `if` inside the Shell (Principle 1 /
 * single source of truth). Sub-entity manifests are AUTO-DERIVED from each
 * EnrichedEntity's own `deep` payload, so custom sub-entity canvases are
 * addressed by subEntityId in the registry, exactly like process plugins.
 */

import { ComponentType } from 'react';
import {
  ArchetypePayload,
  BaseArchetypeProps,
  ProcessPluginManifest,
  SubEntityManifest,
} from '../types';
import { pluginRegistry, defineProcessPlugin } from '../plugin-registry';
import { FlowArchetype } from '../components/archetypes/FlowArchetype';
import { StatArchetype } from '../components/archetypes/StatArchetype';
import { TopologyArchetype } from '../components/archetypes/TopologyArchetype';
import { RuleGateArchetype } from '../components/archetypes/RuleGateArchetype';
import { HeatmapArchetype } from '../components/archetypes/HeatmapArchetype';
import { mockProcessStates } from './processStateMocks';

const ARCHETYPE_COMPONENTS = {
  FLOW: FlowArchetype,
  STATISTICAL: StatArchetype,
  TOPOLOGY: TopologyArchetype,
  RULE_GATE: RuleGateArchetype,
  HEATMAP: HeatmapArchetype,
} as const;

const canvasFor = (payload: ArchetypePayload | undefined) =>
  payload && payload.archetype in ARCHETYPE_COMPONENTS
    ? (ARCHETYPE_COMPONENTS[payload.archetype] as unknown as ComponentType<
        BaseArchetypeProps<ArchetypePayload>
      >)
    : undefined;

/** Registers one mock Process Plugin per seeded process state. */
export function seedMockPlugins(): void {
  if (pluginRegistry.getAll().length > 0) return;

  for (const state of mockProcessStates) {
    // Sub-entity presentation knowledge, derived from the entity chain —
    // keyed by subEntityId, only where a custom deep payload exists.
    const subEntities: Record<string, SubEntityManifest> = {};
    for (const [entityId, entity] of Object.entries(state.entities ?? {})) {
      const deepView = canvasFor(entity.deep);
      if (deepView) subEntities[entityId] = { deepView };
    }

    const DeepComponent = canvasFor(state.deep);
    if (!state.deep || !DeepComponent) continue; // unregistered layout → visible canvas fallback

    const manifest: ProcessPluginManifest = {
      processId: state.header.processId,
      title: state.header.title,
      ownerTeam: state.header.ownerTeam,
      description: state.detail.narrativeSummary,
      archetype: state.deep.archetype,
      // The registry stores manifests under the widened union props type;
      // each concrete component narrows `data` again at mount time.
      DeepComponent,
      subEntities,
    };
    pluginRegistry.register(defineProcessPlugin(manifest));
  }
}
