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

// Re-export UI View Primitives
// Tier L1 — Wall Display micro-component
export { ProcessTile } from './components/L1/ProcessTile';
export type { ProcessTileProps } from './components/L1/ProcessTile';

// Tier L2 — Triage drawer container + contained primitives
export {
  TriageDrawer,
  L2NarrativeBanner,
  L2BlastRadiusBadge,
  SmartLauncherGroup,
  buildLauncherUrl,
} from './components/L2/TriageDrawer';
export type { TriageDrawerProps } from './components/L2/TriageDrawer';

// Tier L3 — Archetype shells
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
