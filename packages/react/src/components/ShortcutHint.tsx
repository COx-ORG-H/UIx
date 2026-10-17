"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import { KbdCombo, ariaKeyShortcuts, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const isShown = (el: HTMLElement | null) => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};

export interface ShortcutHintProps {
  keys: KeyShortcut;
  /** Text before the keys, e.g. an icon button's name. */
  label?: string;
}

/**
 * The hover / focus hint of a `Button` with `shortcut` (HAR-2031). It renders INSIDE the button,
 * as its last child, so the button gets no wrapper and no sibling: a ButtonGroup's first- and
 * last-child corners, a flex row's gaps and a full-width button keep their layout. The bubble is
 * a top-layer popover, so it takes no space either.
 *
 * From inside, it sets the button's `aria-keyshortcuts` for this platform (Mod is Meta on Apple,
 * Control elsewhere), which is how assistive technology learns the key. The bubble itself is
 * `aria-hidden`: it would otherwise join the button's name while shown. It opens on hover and
 * focus and closes on leave, blur and Escape (WCAG 1.4.13); a click on it is not a click on the
 * button.
 *
 * It is its own client component so that `Button`, which has no hooks, still renders on a server.
 */
export function ShortcutHint({ keys, label }: ShortcutHintProps) {
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const platform = useKbdPlatform();
  const shortcuts = ariaKeyShortcuts(keys, platform);

  useAnchoredPosition(anchorRef, bubbleRef, { open, placement: 'top', offset: 6 });

  // The button never carries aria-keyshortcuts from React, so this attribute is ours to keep.
  useIsomorphicLayoutEffect(() => {
    const button = bubbleRef.current?.parentElement;
    if (!button) return;
    anchorRef.current = button;
    button.setAttribute('aria-keyshortcuts', shortcuts);
  }, [shortcuts]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    const button = bubble?.parentElement;
    if (!bubble || !button) return;
    let timer: number | undefined;
    const show = () => {
      window.clearTimeout(timer);
      if (!isShown(bubble)) { try { bubble.showPopover(); } catch { /* disconnected */ } }
      setOpen(true);
    };
    const hide = () => {
      window.clearTimeout(timer);
      if (isShown(bubble)) { try { bubble.hidePopover(); } catch { /* already closed */ } }
      setOpen(false);
    };
    // A short grace period so the pointer can cross into the bubble (1.4.13 hoverable).
    const hideSoon = () => { window.clearTimeout(timer); timer = window.setTimeout(hide, 100); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    // The bubble is inside the button: its click must not activate the button.
    const onBubbleClick = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); };
    button.addEventListener('mouseenter', show);
    button.addEventListener('mouseleave', hideSoon);
    button.addEventListener('focus', show);
    button.addEventListener('blur', hide);
    bubble.addEventListener('click', onBubbleClick);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      button.removeEventListener('mouseenter', show);
      button.removeEventListener('mouseleave', hideSoon);
      button.removeEventListener('focus', show);
      button.removeEventListener('blur', hide);
      bubble.removeEventListener('click', onBubbleClick);
      document.removeEventListener('keydown', onKey);
      if (isShown(bubble)) { try { bubble.hidePopover(); } catch { /* noop */ } }
      button.removeAttribute('aria-keyshortcuts');
    };
  }, []);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const bubbleAttr = { popover: 'manual' } as Record<string, string>;
  return (
    <span ref={bubbleRef} className="uix-tooltip__bubble uix-tooltip__bubble--hint" aria-hidden="true" {...bubbleAttr}>
      {label && <span>{label}</span>}
      <span className="uix-tooltip__shortcut"><KbdCombo keys={[...keys]} platform={platform} /></span>
    </span>
  );
}
