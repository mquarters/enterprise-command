/**
 * Smart Link Context Injector — moved out of the retired TriageDrawer file.
 * -------------------------------------------------------------------------
 * The SmartLauncher list is composed by the Shell and passed into
 * DetailDrawer's optional `launcherSlot`; the deep-link URLs themselves are
 * DATA (SmartLauncherContext entries computed upstream), never component
 * logic. This file only renders that data.
 */

import React from 'react';
import { ProcessStatePayload, SmartLauncherContext } from '../types';

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
    if (payload.detail.primaryFailureKey) {
      url.searchParams.set('failure_key', payload.detail.primaryFailureKey);
    }
    Object.entries(launcher.parameters ?? {}).forEach(([key, value]) =>
      url.searchParams.set(key, String(value))
    );
    return url.toString();
  } catch {
    return launcher.url; // Malformed URL → pass through unmodified
  }
}

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
