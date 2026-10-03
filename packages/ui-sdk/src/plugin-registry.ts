import {
  ArchetypePayload,
  PluginRegistry,
  ProcessPluginManifest,
  SubEntityManifest,
} from './types';

/**
 * Entity-registry: process manifests + per-sub-entity presentation knowledge.
 * Keyed by processId (and subEntityId within a manifest) — the Shell asks
 * this for "how do I show this target", and never branches on archetype names.
 */
class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, ProcessPluginManifest>();

  register<T extends ArchetypePayload>(manifest: ProcessPluginManifest<T>): void {
    if (this.plugins.has(manifest.processId)) {
      console.warn(`[UI-SDK] Plugin for ${manifest.processId} is already registered. Overwriting.`);
    }
    this.plugins.set(manifest.processId, manifest as unknown as ProcessPluginManifest);
  }

  get(processId: string): ProcessPluginManifest | undefined {
    return this.plugins.get(processId);
  }

  getSubEntity(processId: string, entityId: string): SubEntityManifest | undefined {
    return this.plugins.get(processId)?.subEntities?.[entityId];
  }

  getAll(): ProcessPluginManifest[] {
    return Array.from(this.plugins.values());
  }

  has(processId: string): boolean {
    return this.plugins.has(processId);
  }
}

export const pluginRegistry: PluginRegistry = new DefaultPluginRegistry();

export function defineProcessPlugin<T extends ArchetypePayload>(
  manifest: ProcessPluginManifest<T>
): ProcessPluginManifest<T> {
  return manifest;
}
