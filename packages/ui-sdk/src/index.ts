// Re-export all type contracts
export * from './types';

// Re-export plugin registration utilities
export { pluginRegistry, defineProcessPlugin } from './plugin-registry';

// Scale-agnostic viewing primitives (viewing MODES, not data tiers)
export { DrawerShell } from './components/primitives/DrawerShell';
export type { DrawerShellProps } from './components/primitives/DrawerShell';
export { OverviewTile } from './components/primitives/OverviewTile';
export type { OverviewTileProps } from './components/primitives/OverviewTile';
export { DetailDrawer } from './components/primitives/DetailDrawer';
export type { DetailDrawerProps } from './components/primitives/DetailDrawer';
export { ArchetypeCanvas } from './components/primitives/ArchetypeCanvas';
export type { ArchetypeCanvasProps } from './components/primitives/ArchetypeCanvas';

// Deep-link launcher slot (composed by the Shell into DetailDrawer's slot)
export { SmartLauncherGroup, buildLauncherUrl } from './components/SmartLaunchers';

// Archetype canvas layouts (display layer for deep payloads, any scale)
export { FlowArchetype } from './components/archetypes/FlowArchetype';
export { StatArchetype } from './components/archetypes/StatArchetype';
export { TopologyArchetype } from './components/archetypes/TopologyArchetype';
export { RuleGateArchetype } from './components/archetypes/RuleGateArchetype';
export { HeatmapArchetype } from './components/archetypes/HeatmapArchetype';

// Mock data engine (test-run transport stand-in)
export {
  mockProcessStates,
  mockFlowState,
  nextMockState,
  createMockStateStream,
} from './mocks/processStateMocks';
export type { MockStateStream, MockStateStreamOptions } from './mocks/processStateMocks';
export { seedMockPlugins } from './mocks/pluginSeeds';
