"use client";

import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { announcePolite } from '../announce.js';

export type GrabDirection = 'up' | 'down' | 'left' | 'right';

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
  /** The item's name in what is said. */
  label: string;
  /** Move the picked-up item one step; return what to say (e.g. "Position 3 of 8"), or nothing. */
  onMove: (direction: GrabDirection) => string | void;
  /** The item was put down where it is now. */
  onDrop?: () => void;
  /** Escape: put the item back where it was picked up. */
  onCancel?: () => void;
  labels?: Partial<KeyboardGrabLabels>;
}

export interface UseKeyboardGrabResult {
  grabbed: boolean;
  /** Spread on the focusable item: the key handling, and `data-uix-drag="grabbed"` while it is picked up. */
  itemProps: {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onBlur: () => void;
    'data-uix-drag'?: 'grabbed';
  };
}

const fill = (template: string, label: string) => template.replace('{label}', label);
const DIRECTIONS: Record<string, GrabDirection | undefined> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

/**
 * The keyboard path for anything a person drags (HAR-2590, WCAG 2.1.1 and 2.5.7): Space or Enter on
 * the focused item picks it up (a dashed ring, `data-uix-drag="grabbed"`), the arrow keys move it
 * one step at a time, Space or Enter puts it down, Escape (or leaving it) puts it back. Each step is
 * said through the polite live region. Moves from the keyboard are instant: no glide (§2.2).
 *
 * The kit's own lists already have a keyboard path (SortableList's Move up / Move down and
 * Alt+arrows, KanbanCard `onMove`, DashboardCanvas handles); this is for a draggable thing a
 * product builds itself.
 */
export function useKeyboardGrab({ label, onMove, onDrop, onCancel, labels }: UseKeyboardGrabOptions): UseKeyboardGrabResult {
  const [grabbed, setGrabbed] = useState(false);
  const words = { ...DEFAULT_KEYBOARD_GRAB_LABELS, ...labels };
  const live = useRef({ onMove, onDrop, onCancel, words, label });
  live.current = { onMove, onDrop, onCancel, words, label };

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    // only on the item itself: a button or field inside keeps its own keys
    if (event.target !== event.currentTarget || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const el = event.currentTarget;
    const { words: w, label: name } = live.current;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      // effects outside the state update: StrictMode runs updaters twice
      setGrabbed(!grabbed);
      announcePolite(fill(grabbed ? w.dropped : w.grabbed, name), el);
      if (grabbed) live.current.onDrop?.();
      return;
    }
    if (!grabbed) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setGrabbed(false);
      live.current.onCancel?.();
      announcePolite(fill(w.cancelled, name), el);
      return;
    }
    const direction = DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const said = live.current.onMove(direction);
    if (said) announcePolite(said, el);
  }, [grabbed]);

  const onBlur = useCallback(() => {
    if (!grabbed) return;
    setGrabbed(false);
    live.current.onCancel?.();
  }, [grabbed]);

  return {
    grabbed,
    itemProps: { onKeyDown, onBlur, ...(grabbed ? { 'data-uix-drag': 'grabbed' as const } : {}) },
  };
}

/**
 * Let a dropped item land (HAR-2590): `data-uix-settle` for one short ease-out from the lifted
 * scale to rest. Call it on the item's element once it is in its new place (after the commit
 * that moved it). Reduced motion: nothing.
 */
export function settleDrop(el: HTMLElement | null | undefined): void {
  if (!el) return;
  if (el.hasAttribute('data-uix-settle')) {
    el.removeAttribute('data-uix-settle');
    void el.offsetWidth;
  }
  el.setAttribute('data-uix-settle', '');
  const done = (event: AnimationEvent) => {
    if (event.target !== el) return;
    el.removeAttribute('data-uix-settle');
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}
