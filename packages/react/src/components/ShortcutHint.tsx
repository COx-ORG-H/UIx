"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import { KbdCombo, ariaKeyShortcuts, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

const isShown = (el: HTMLElement | null) => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};
const focusVisible = (el: Element) => {
  try { return el.matches(':focus-visible'); } catch { return true; }
};
/** React events from the portal reach the button's handlers through the component tree: stop them there. */
const stop = (event: SyntheticEvent) => event.stopPropagation();

export interface ShortcutHintProps {
  keys: KeyShortcut;
  /** Text before the keys, e.g. an icon button's name. */
  label?: string;
  /** Set the button's `aria-keyshortcuts`. `false` when the button already has its own (a prop, or a Tooltip's). */
  ownsAria: boolean;
}

/**
 * The hover / keyboard-focus hint of a `Button` with `shortcut` (HAR-2031). In the button it
 * leaves only an empty, hidden marker, so the button's text, name, layout and selectors are
 * unchanged (no wrapper, no sibling). The bubble itself is portalled after mount into the
 * nearest `<dialog>` (outside one a modal dialog makes everything inert) or `<body>`, as a
 * top-layer popover, `aria-hidden`: assistive technology gets the key from the button's
 * `aria-keyshortcuts`, which this sets for the viewer's platform (Mod is Meta on Apple, Control
 * elsewhere) unless the button already has its own.
 *
 * It opens on hover and on keyboard focus (`:focus-visible`), so focus a menu or dialog sends back
 * after a mouse choice does not open it. It closes on leave, blur, Escape and when the button is
 * disabled, and stays while the pointer is on it (WCAG 1.4.13). Inside a `Tooltip` it steps aside:
 * the Tooltip shows the keys in its own bubble.
 *
 * It is its own client component so that `Button`, which has no hooks, still renders on a server.
 */
export function ShortcutHint({ keys, label, ownsAria }: ShortcutHintProps) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const platform = useKbdPlatform();
  const shortcuts = ariaKeyShortcuts(keys, platform);

  useAnchoredPosition(anchorRef, bubbleRef, { open, placement: 'top', offset: 6 });

  // The attribute is ours only when the button has none: put back what was there on cleanup.
  useIsomorphicLayoutEffect(() => {
    const button = markerRef.current?.parentElement;
    if (!button || !ownsAria) return undefined;
    const before = button.getAttribute('aria-keyshortcuts');
    button.setAttribute('aria-keyshortcuts', shortcuts);
    return () => {
      if (button.getAttribute('aria-keyshortcuts') !== shortcuts) return;
      if (before == null) button.removeAttribute('aria-keyshortcuts');
      else button.setAttribute('aria-keyshortcuts', before);
    };
  }, [shortcuts, ownsAria]);

  // Where the bubble goes, once the button is in the document.
  useIsomorphicLayoutEffect(() => {
    const button = markerRef.current?.parentElement ?? null;
    anchorRef.current = button;
    if (!button || button.parentElement?.closest('.uix-tooltip')) { setHost(null); return; }
    setHost(button.closest('dialog') ?? button.ownerDocument.body);
  }, []);

  useEffect(() => {
    const button = anchorRef.current;
    const bubble = bubbleRef.current;
    if (!host || !button || !bubble) return undefined;
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
    // A short grace period so the pointer can cross into the bubble (1.4.13 hoverable). A button
    // the keyboard is on keeps its hint.
    const hideSoon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (button.ownerDocument.activeElement === button && focusVisible(button)) return;
        hide();
      }, 100);
    };
    const onFocus = () => { if (focusVisible(button)) show(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    // A focused button that becomes disabled fires no blur.
    const watch = new MutationObserver(() => {
      if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') hide();
    });
    watch.observe(button, { attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
    button.addEventListener('mouseenter', show);
    button.addEventListener('mouseleave', hideSoon);
    button.addEventListener('focus', onFocus);
    button.addEventListener('blur', hide);
    bubble.addEventListener('mouseenter', show);
    bubble.addEventListener('mouseleave', hideSoon);
    button.ownerDocument.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      watch.disconnect();
      button.removeEventListener('mouseenter', show);
      button.removeEventListener('mouseleave', hideSoon);
      button.removeEventListener('focus', onFocus);
      button.removeEventListener('blur', hide);
      bubble.removeEventListener('mouseenter', show);
      bubble.removeEventListener('mouseleave', hideSoon);
      button.ownerDocument.removeEventListener('keydown', onKey);
      if (isShown(bubble)) { try { bubble.hidePopover(); } catch { /* noop */ } }
    };
  }, [host]);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const bubbleAttr = { popover: 'manual' } as Record<string, string>;
  return (
    <>
      <span ref={markerRef} hidden data-uix-shortcut-hint="" />
      {host && createPortal(
        <span
          ref={bubbleRef}
          className="uix-tooltip__bubble uix-tooltip__bubble--hint"
          aria-hidden="true"
          {...bubbleAttr}
          onClick={stop}
          onDoubleClick={stop}
          onContextMenu={stop}
          onPointerDown={stop}
          onPointerUp={stop}
          onMouseDown={stop}
          onMouseUp={stop}
        >
          {label && <span>{label}</span>}
          <span className="uix-tooltip__shortcut"><KbdCombo keys={[...keys]} platform={platform} /></span>
        </span>,
        host,
      )}
    </>
  );
}
