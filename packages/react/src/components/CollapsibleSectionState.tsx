"use client";

import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { cx } from '../cx.js';
import type { CollapsibleSectionProps } from './CollapsibleSection.js';

const STORAGE_PREFIX = 'uix:collapsible:';

const readStored = (key: string): boolean | undefined => {
  try {
    const value = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    return value === '1' ? true : value === '0' ? false : undefined;
  } catch { return undefined; }
};
const writeStored = (key: string, open: boolean) => {
  try { window.sessionStorage.setItem(STORAGE_PREFIX + key, open ? '1' : '0'); } catch { /* storage blocked */ }
};

/**
 * The stateful half of `CollapsibleSection` (HAR-1352): lazy bodies, a remembered open
 * state and `openRequest`. Internal — `CollapsibleSection` delegates here only when one
 * of those props is set, so the plain section stays server-renderable and JS-free.
 */
export function CollapsibleSectionState({ title, summary, children, className, lazy, persistKey, openRequest, open, onToggle, ...props }: CollapsibleSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(open ?? false);
  const [hasOpened, setHasOpened] = useState(open ?? false);
  const lastRequest = useRef(openRequest);

  // The remembered state is read after mount so the server HTML and the first client
  // render agree (no hydration mismatch); the section then snaps to the stored state.
  useEffect(() => {
    if (!persistKey) return;
    const stored = readStored(persistKey);
    if (stored !== undefined) { setIsOpen(stored); if (stored) setHasOpened(true); }
  }, [persistKey]);

  // `open` from the parent still wins when it changes.
  useEffect(() => {
    if (open === undefined) return;
    setIsOpen(open);
    if (open) setHasOpened(true);
  }, [open]);

  useEffect(() => {
    if (openRequest === undefined || openRequest === lastRequest.current) return;
    lastRequest.current = openRequest;
    setIsOpen(true);
    setHasOpened(true);
    if (persistKey) writeStored(persistKey, true);
    requestAnimationFrame(() => ref.current?.scrollIntoView?.({ block: 'nearest' }));
  }, [openRequest, persistKey]);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const next = event.currentTarget.open;
    setIsOpen(next);
    if (next) setHasOpened(true);
    if (persistKey) writeStored(persistKey, next);
    onToggle?.(event);
  };

  const mountBody = !lazy || (lazy === 'keep' ? hasOpened : isOpen);

  return (
    <details ref={ref} className={cx('uix-collapsible', className)} {...props} open={isOpen} onToggle={handleToggle}>
      <summary className="uix-collapsible__summary">
        <span><span className="uix-collapsible__title">{title}</span>{summary != null && <span className="uix-collapsible__meta">{summary}</span>}</span>
        <span className="uix-collapsible__chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="uix-collapsible__body">{mountBody ? children : null}</div>
    </details>
  );
}
