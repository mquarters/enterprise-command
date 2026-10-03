/**
 * DrawerShell — scale-agnostic drawer frame primitive.
 * -------------------------------------------------------------------------
 * One frame for EVERY drawer in the Shell (process-scale or sub-entity-scale).
 * Owns exactly ONE Esc key handler and ONE focus manager:
 *  - the Shell keeps at most one drawer mounted, so no stacked keydown
 *    listeners exist any more (the old stack closed both drawers per Esc);
 *  - Tab focus cycles inside the panel and focus returns to the opener on
 *    close.
 * Z-layer and width come from geometry tokens (see tokens/variables.css):
 * --z-drawer/--drawer-width-process for `level="process"`,
 * --z-detail-drawer/--drawer-width-entity for `level="entity"`.
 */

import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { HealthState } from '../../types';

const statusFg = (h: HealthState) => `var(--status-${h.toLowerCase()}-fg)`;
const statusBg = (h: HealthState) => `var(--status-${h.toLowerCase()}-bg)`;
const statusBorder = (h: HealthState) => `var(--status-${h.toLowerCase()}-border)`;

export interface DrawerShellProps {
  /** Which scale the drawer opens at — drives z-layer + width only. */
  level: 'process' | 'entity';
  title: string;
  subtitle?: string;
  /** Precomputed upstream — displayed, never derived here (Principle 1). */
  health: HealthState;
  onClose: () => void;
  children: ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({
  level,
  title,
  subtitle,
  health,
  onClose,
  children,
}) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // The Shell mounts exactly one DrawerShell at a time, so this single
  // window listener is the only Esc handler alive — one key press, one hop.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // One focus manager: pull focus into the panel on mount, hand it back to
  // whatever opened the drawer on unmount.
  useLayoutEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => restoreFocusRef.current?.focus();
  }, []);

  // Tab focus stays inside the drawer while it is open.
  const cycleFocus = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (event.key !== 'Tab' || !panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 flex justify-end ${level === 'process' ? 'z-drawer' : 'z-detail'}`}
      onClick={onClose}
    >
      {/* Scrim — click to dismiss */}
      <div className="flex-1 bg-scrim" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail drawer for ${title}`}
        onKeyDown={cycleFocus}
        onClick={(event) => event.stopPropagation()}
        className={`relative flex h-full max-w-[90vw] flex-col gap-5 overflow-y-auto border-l-2 border-border-strong bg-surface-overlay p-6 shadow-drawer ${
          level === 'process' ? 'w-drawer-process' : 'w-drawer-entity'
        }`}
      >
        {/* Drawer header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-desk-title font-bold text-ink-primary">{title}</h2>
            {subtitle && <p className="text-console text-ink-secondary">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="rounded px-2 py-1 font-mono text-console font-bold"
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
              aria-label="Close drawer"
              className="smart-launcher-button"
              style={{ padding: '0.25rem 0.625rem' }}
            >
              ✕
            </button>
          </div>
        </header>
        {children}
      </aside>
    </div>
  );
};
