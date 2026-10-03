/**
 * ArchetypeCanvas — scale-agnostic deep-view mount.
 * -------------------------------------------------------------------------
 * Mounts ANY entity's deep payload, at any depth. The painting component is
 * found by ID LOOKUP, never by an archetype-name conditional:
 *   sub-entity custom canvas (SubEntityManifest.deepView, via subEntityId)
 *     → the process's registered DeepComponent (shared layout)
 *     → a VISIBLE "no canvas registered" fallback — never a silent blank.
 * (This closes the old unguarded-lookup hole where an unknown layout key
 * rendered an empty workbench with no signal at all.)
 *
 * The mounted canvas receives BaseArchetypeProps — {processId, data, health,
 * onSelectEntity?, onExecuteMitigation?} — exactly as before; only WHERE
 * the component came from changed (registry lookup, not tier assumption).
 */

import React from 'react';
import {
  ArchetypePayload,
  BaseArchetypeProps,
  HealthState,
  PluginRegistry,
} from '../../types';

export interface ArchetypeCanvasProps {
  processId: string;
  /** The entity whose payload is mounted; omit for process-scale views. */
  entityId?: string;
  /** Label for the fallback message (display only). */
  entityLabel?: string;
  /** The deep payload of whichever entity is being viewed. */
  data: ArchetypePayload;
  /** Precomputed upstream — displayed, never derived (Principle 1). */
  health: HealthState;
  /** The registry answers "what paints this target". */
  registry: PluginRegistry;
  /** Drill affordance for sub-entity targets inside the mounted layout. */
  onSelectEntity?: (entityId: string) => void;
  onExecuteMitigation?: (actionKey: string, payload?: unknown) => Promise<void>;
}

export const ArchetypeCanvas: React.FC<ArchetypeCanvasProps> = ({
  processId,
  entityId,
  entityLabel,
  data,
  health,
  registry,
  onSelectEntity,
  onExecuteMitigation,
}) => {
  const subManifest = entityId ? registry.getSubEntity(processId, entityId) : undefined;
  const Canvas: React.ComponentType<BaseArchetypeProps> | undefined =
    subManifest?.deepView ?? registry.get(processId)?.DeepComponent;

  if (!Canvas) {
    return (
      <div
        data-testid="archetype-canvas-fallback"
        data-health="UNKNOWN"
        role="alert"
        className="rounded-lg border border-border-subtle bg-surface-card p-4 text-desk-body text-ink-secondary"
      >
        No canvas registered for{' '}
        <span className="font-mono text-console">{entityLabel ?? data.archetype}</span> —
        register a SubEntityManifest with a deepView, or extend the default layout map.
      </div>
    );
  }

  return (
    <div data-testid="archetype-canvas" data-archetype={data.archetype} data-entity={entityId}>
      <Canvas
        processId={processId}
        data={data}
        health={health}
        onSelectEntity={onSelectEntity}
        onExecuteMitigation={onExecuteMitigation}
      />
    </div>
  );
};
