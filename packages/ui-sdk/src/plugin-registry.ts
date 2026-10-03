import { ProcessPluginManifest, L3DomainPayload, PluginRegistry } from './types';

class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, ProcessPluginManifest>();

  register<T extends L3DomainPayload>(manifest: ProcessPluginManifest<T>): void {
    if (this.plugins.has(manifest.processId)) {
      console.warn(`[UI-SDK] Plugin for ${manifest.processId} is already registered. Overwriting.`);
    }
    this.plugins.set(manifest.processId, manifest as unknown as ProcessPluginManifest);
  }

  get(processId: string): ProcessPluginManifest | undefined {
    return this.plugins.get(processId);
  }

  getAll(): ProcessPluginManifest[] {
    return Array.from(this.plugins.values());
  }

  has(processId: string): boolean {
    return this.plugins.has(processId);
  }
}

export const pluginRegistry: PluginRegistry = new DefaultPluginRegistry();

export function defineProcessPlugin<T extends L3DomainPayload>(
  manifest: ProcessPluginManifest<T>
): ProcessPluginManifest<T> {
  return manifest;
}