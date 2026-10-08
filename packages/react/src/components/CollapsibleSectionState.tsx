"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { CollapsibleSummary, collapsibleBodyProps, collapsibleClass } from './CollapsibleParts.js';
import type { CollapsibleSectionProps } from './CollapsibleSection.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const STORAGE_PREFIX = 'uix:collapsible:';

type PersistStorage = NonNullable<CollapsibleSectionProps['persistStorage']>;
const storageOf = (kind: PersistStorage): Storage => (kind === 'local' ? window.localStorage : window.sessionStorage);

const readStored = (kind: PersistStorage, key: string): boolean | undefined => {
  try {
    const value = storageOf(kind).getItem(STORAGE_PREFIX + key);
    return value === '1' ? true : value === '0' ? false : undefined;
  } catch { return undefined; }
};
const writeStored = (kind: PersistStorage, key: string, open: boolean) => {
  try { storageOf(kind).setItem(STORAGE_PREFIX + key, open ? '1' : '0'); } catch { /* storage blocked */ }
};

/**
 * The stateful half of `CollapsibleSection` (HAR-1352): lazy bodies, a remembered open
 * state and `openRequest`. Internal — `CollapsibleSection` delegates here only when one
 * of those props is set, so the plain section stays server-renderable and JS-free.
 */
export function CollapsibleSectionState({
  title, summary, children, className, lazy, persistKey, persistStorage = 'session', openRequest, open, defaultOpen,
  compact, headingLevel, onToggle, ...props
}: CollapsibleSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const initial = open ?? defaultOpen ?? false;
  const [isOpen, setIsOpen] = useState(initial);
  const [hasOpened, setHasOpened] = useState(initial);
  const lastOpen = useRef(open);
  // `undefined` and `0` are "no request yet"; any other value at mount is a request (HAR-1628).
  const lastRequest = useRef(openRequest ? undefined : openRequest);

  // The remembered state is read after mount so the server HTML and the first client
  // render agree (no hydration mismatch); the section then snaps to the stored state.
  useEffect(() => {
    if (!persistKey) return;
    const stored = readStored(persistStorage, persistKey);
    if (stored !== undefined) { setIsOpen(stored); if (stored) setHasOpened(true); }
  }, [persistKey, persistStorage]);

  // `open` from the parent wins when it CHANGES. At mount it is only the starting state, so it
  // no longer overrides what was remembered (HAR-1628).
  useEffect(() => {
    if (open === lastOpen.current) return;
    lastOpen.current = open;
    if (open === undefined) return;
    setIsOpen(open);
    if (open) setHasOpened(true);
  }, [open]);

  useEffect(() => {
    if (openRequest === undefined || openRequest === lastRequest.current) return;
    lastRequest.current = openRequest;
    setIsOpen(true);
    setHasOpened(true);
    if (persistKey) writeStored(persistStorage, persistKey, true);
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView?.({ block: 'nearest' });
      summaryRef.current?.focus({ preventScroll: true });
    });
  }, [openRequest, persistKey, persistStorage]);

  // What this component last put in the DOM. A browser fires `toggle` for every change of the
  // `open` attribute, including the ones React makes: for a section that mounts open, and again
  // when the remembered state closes it. Those echoes are not the person's choice, and storing
  // one would overwrite what was remembered (found in Chromium, HAR-1628).
  const renderedOpen = useRef(isOpen);
  useIsomorphicLayoutEffect(() => { renderedOpen.current = isOpen; }, [isOpen]);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const next = event.currentTarget.open;
    if (next !== renderedOpen.current) {
      renderedOpen.current = next;
      setIsOpen(next);
      if (next) setHasOpened(true);
      if (persistKey) writeStored(persistStorage, persistKey, next);
    }
    onToggle?.(event);
  };

  const mountBody = !lazy || (lazy === 'keep' ? hasOpened : isOpen);

  return (
    <details ref={ref} className={collapsibleClass(compact, className)} {...props} open={isOpen} onToggle={handleToggle}>
      <CollapsibleSummary title={title} summary={summary} headingLevel={headingLevel} titleId={titleId} summaryRef={summaryRef} />
      <div className="uix-collapsible__body" {...collapsibleBodyProps(headingLevel, titleId)}>{mountBody ? children : null}</div>
    </details>
  );
}
