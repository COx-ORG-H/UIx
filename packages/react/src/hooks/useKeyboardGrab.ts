"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { KeyboardEvent, FocusEvent } from 'react';
import { announcePolite } from '../announce.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';

export type KeyboardGrabDirection = 'up' | 'down' | 'left' | 'right';

/** The words `useKeyboardGrab` says. `{label}` is the item's name. */
export interface KeyboardGrabLabels {
  grabbed: string;
  dropped: string;
  cancelled: string;
}

export const DEFAULT_KEYBOARD_GRAB_LABELS: KeyboardGrabLabels = {
  grabbed: '{label} picked up. Use the arrow keys to move it, Space to drop it, Escape to cancel.',
  dropped: '{label} dropped.',
  cancelled: 'Move cancelled. {label} is back where it was.',
};

export interface UseKeyboardGrabOptions {
  /**
   * The item's stable id. The picked-up state follows the id, so an item that a move puts in
   * another list (a kanban card going to the next column) is still picked up, and focused, when
   * it mounts there.
   */
  id: string;
  /** The item's name in what is said. */
  label: string;
  /** Move the picked-up item one step; return what to say (e.g. "Position 3 of 8"), or nothing. */
  onMove: (direction: KeyboardGrabDirection) => string | void;
  /** The item was put down where it is now. */
  onDrop?: () => void;
  /** Escape, or focus leaving the item: put it back where it was picked up. */
  onCancel?: () => void;
  /** Overrides `UixLabelsProvider` `keyboardGrab`, then English. */
  labels?: Partial<KeyboardGrabLabels>;
}

export interface UseKeyboardGrabResult {
  grabbed: boolean;
  /** Spread on the focusable item: its ref, the key handling, and `data-uix-drag="grabbed"` while it is picked up. */
  itemProps: {
    ref: (el: HTMLElement | null) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
    'data-uix-drag'?: 'grabbed';
  };
}

// One item at a time is picked up, page-wide: a store keyed by id survives the item remounting.
let grabbedId: string | null = null;
let refocusId: string | null = null;
const listeners = new Set<() => void>();
const setGrabbedId = (id: string | null) => { grabbedId = id; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const DIRECTIONS: Record<string, KeyboardGrabDirection | undefined> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/**
 * The keyboard path for anything a person drags (HAR-2590, WCAG 2.1.1 and 2.5.7): Space or Enter on
 * the focused item picks it up (a dashed ring, `data-uix-drag="grabbed"`), the arrow keys move it
 * one step at a time, Space or Enter puts it down, Escape or focus leaving puts it back. Each step
 * is said through the polite live region. Moves from the keyboard are instant: no glide (§2.2).
 * A held key does not toggle; keys on a control inside the item are left to it.
 *
 * The kit's own lists already have a keyboard path (SortableList's Move up / Move down and
 * Alt+arrows, KanbanCard `onMove`, DashboardCanvas handles); this is for a draggable thing a
 * product builds itself.
 */
export function useKeyboardGrab({ id, label, onMove, onDrop, onCancel, labels }: UseKeyboardGrabOptions): UseKeyboardGrabResult {
  const grabbed = useSyncExternalStore(subscribe, () => grabbedId === id, () => false);
  const words = { ...DEFAULT_KEYBOARD_GRAB_LABELS, ...useUixLabels().keyboardGrab, ...labels };
  const live = useRef({ onMove, onDrop, onCancel, words, label, id });
  live.current = { onMove, onDrop, onCancel, words, label, id };
  const element = useRef<HTMLElement | null>(null);
  const say = (template: string) => announcePolite(fillLabel(template, { label: live.current.label }), element.current);

  const cancel = useCallback(() => {
    if (grabbedId !== live.current.id) return;
    setGrabbedId(null);
    live.current.onCancel?.();
    announcePolite(fillLabel(live.current.words.cancelled, { label: live.current.label }), element.current);
  }, []);

  // Escape while picked up is ours, page-wide and first (window, capture), so a popover or dialog
  // around the list does not close on the same key.
  useEffect(() => {
    if (!grabbed) return undefined;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [grabbed, cancel]);

  const ref = useCallback((el: HTMLElement | null) => {
    element.current = el;
    // remounted by a move (another list): focus comes back to it
    if (el && refocusId === live.current.id) {
      refocusId = null;
      el.focus({ preventScroll: false });
    }
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // only on the item itself: a button or field inside keeps its own keys
    if (event.target !== event.currentTarget || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return; // a held key does not pick up and put down again and again
      if (grabbed) {
        setGrabbedId(null);
        say(live.current.words.dropped);
        live.current.onDrop?.();
      } else {
        setGrabbedId(live.current.id);
        say(live.current.words.grabbed);
      }
      return;
    }
    if (!grabbed) return;
    const direction = DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    refocusId = live.current.id;
    const said = live.current.onMove(direction);
    if (said) announcePolite(said, element.current);
    // not remounted (a move inside the same list): nothing to refocus
    queueMicrotask(() => { if (refocusId === live.current.id && element.current?.isConnected) refocusId = null; });
  };

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!grabbed) return;
    const to = event.relatedTarget as Node | null;
    // into a control inside the item, or the item being moved to another list: still picked up
    if (to && event.currentTarget.contains(to)) return;
    if (refocusId === live.current.id) return;
    cancel();
  };

  return {
    grabbed,
    itemProps: { ref, onKeyDown, onBlur, ...(grabbed ? { 'data-uix-drag': 'grabbed' as const } : {}) },
  };
}

/**
 * Let a dropped item land (HAR-2590): `data-uix-settle` for one short ease-out from the lifted
 * scale to rest. Call it on the item's element once it is in its new place (after the commit
 * that moved it). Under reduced motion there is no landing and nothing is left behind.
 */
export function settleDrop(el: HTMLElement | null | undefined): void {
  if (!el) return;
  if (el.hasAttribute('data-uix-settle')) {
    el.removeAttribute('data-uix-settle');
    void el.offsetWidth;
  }
  el.setAttribute('data-uix-settle', '');
  // reduced motion (`animation: none`), or no stylesheet: no landing, so no end will come
  if (typeof getComputedStyle === 'function' && getComputedStyle(el).animationName === 'none') {
    el.removeAttribute('data-uix-settle');
    return;
  }
  const done = (event: AnimationEvent) => {
    if (event.target !== el) return;
    el.removeAttribute('data-uix-settle');
    el.removeEventListener('animationend', done);
    el.removeEventListener('animationcancel', done);
  };
  el.addEventListener('animationend', done);
  el.addEventListener('animationcancel', done);
}
