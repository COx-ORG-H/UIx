"use client";

import { Children, cloneElement, createElement, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode, TransitionEvent } from 'react';
import { cx } from '../cx.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** If an exit animation never reports its end (no CSS, a hidden panel), drop the item anyway. */
const EXIT_FALLBACK_MS = 1000;

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

type Key = string | number;
type Box = { x: number; y: number };

export interface MotionListProps<T> extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The items in the order to show them. */
  items: readonly T[];
  /** A stable key per item. */
  getKey: (item: T) => Key;
  /**
   * One element per item: an `<li>` for `ul`/`ol`, a `Tr` for `tbody`. It must pass unknown
   * props through to its DOM element (the list sets `data-uix-key` and, while an item leaves,
   * `data-uix-exiting` and `aria-hidden`; `inert` is set on the element directly).
   */
  renderItem: (item: T, state: { exiting: boolean }) => ReactElement;
  /** The list element (default `ul`). */
  as?: 'ul' | 'ol' | 'div' | 'tbody';
}

interface Entry<T> { key: Key; item: T; exiting: boolean }
interface ListState<T> { items: readonly T[]; entries: Entry<T>[]; exiting: Map<Key, T> }

/**
 * A list whose items arrive, leave and move visibly (HAR-2586, motion standard §2.5):
 *
 * - A new item fades in and rises 8 px into place; never on the first render.
 * - A removed item stays for a moment, fades out, and only then leaves; the items after it
 *   glide up into the gap instead of jumping.
 * - A reordered item glides from its old place to its new one (FLIP: transform only).
 * - Focus stays put: on an item that moved, and on the next item when the focused one leaves.
 *   Focus outside the list is never pulled in.
 *
 * Reduced motion keeps the fades and drops every glide and rise. For a list that re-sorts
 * itself (live data), hold the order while the person is pointing at it: `useDeferredReorder`.
 */
export function MotionList<T>({ items, getKey, renderItem, as = 'ul', className, ...props }: MotionListProps<T>) {
  const containerRef = useRef<HTMLElement>(null);
  // Leaving items, derived while rendering (not in an effect): the removed item stays in place
  // in the same commit that drops it from `items`, so nothing beside it jumps and jumps back.
  // A new array with the same items in the same order changes nothing.
  const [state, setState] = useState<ListState<T>>(() => ({
    items, entries: items.map((item) => ({ key: getKey(item), item, exiting: false })), exiting: new Map(),
  }));
  let { entries } = state;
  if (state.items !== items && !sameItems(state.items, items)) {
    const now = new Set(items.map(getKey));
    const exitingNow = new Map(state.exiting);
    for (const e of state.entries) if (!e.exiting && !now.has(e.key)) exitingNow.set(e.key, e.item);
    for (const key of now) exitingNow.delete(key);
    entries = merge(items, getKey, state.entries, exitingNow);
    setState({ items, entries, exiting: exitingNow });
  }
  const previous = useRef<Entry<T>[] | null>(null);
  const drop = (keys: Key[]) => setState((current) => {
    const gone = keys.filter((key) => current.exiting.has(key));
    if (!gone.length) return current;
    const exitingNow = new Map(current.exiting);
    for (const key of gone) exitingNow.delete(key);
    const goneSet = new Set(gone);
    return { ...current, exiting: exitingNow, entries: current.entries.filter((e) => !(e.exiting && goneSet.has(e.key))) };
  });

  // Before React moves anything (in render, while the DOM still shows the previous list): where
  // every item was, and which item held focus.
  const boxes = useRef<Map<string, Box>>(new Map());
  const focusedKey = useRef<string | null>(null);
  const measuredFor = useRef<unknown>(null);
  if (measuredFor.current !== entries && containerRef.current) {
    measuredFor.current = entries;
    boxes.current = measure(containerRef.current);
    // the list's own child that holds focus (a nested list's items are not ours)
    let holder: Element | null = typeof document !== 'undefined' ? document.activeElement : null;
    while (holder && holder.parentElement !== containerRef.current) holder = holder.parentElement;
    focusedKey.current = holder?.getAttribute('data-uix-key') ?? null;
  }

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const before = previous.current;
    previous.current = entries;
    if (!container) return;
    const byKey = new Map(entries.map((e) => [String(e.key), e]));
    const elements = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-uix-key]'));

    // Leaving items: out of the tab order (set directly: React 18 drops a boolean `inert` prop).
    for (const el of elements) if (byKey.get(el.getAttribute('data-uix-key') as string)?.exiting) el.setAttribute('inert', '');

    // Focus: only if it was inside the list before this commit. On an item that is leaving, it
    // moves to the next item still there (else the previous one); on a moved item, it stays.
    const had = focusedKey.current;
    focusedKey.current = null;
    const active = document.activeElement;
    const lost = active === document.body || active === null || !active.isConnected || !!active.closest('[data-uix-exiting], [inert]');
    if (had !== null && lost) {
      const index = elements.findIndex((el) => el.getAttribute('data-uix-key') === had);
      const stays = (el: HTMLElement | undefined) => el && !el.hasAttribute('data-uix-exiting');
      const own = stays(elements[index]) ? elements[index] : undefined;
      const target = own
        ?? elements.slice(index + 1).find(stays)
        ?? elements.slice(0, Math.max(index, 0)).reverse().find(stays);
      const focusable = target?.matches(FOCUSABLE) ? target : target?.querySelector<HTMLElement>(FOCUSABLE);
      focusable?.focus({ preventScroll: true });
    }
    if (!before) return; // first render: nothing enters, nothing moves

    const reduced = prefersReducedMotion();
    const was = new Set(before.map((e) => String(e.key)));
    // FLIP in three passes, so the browser lays out once, not once per row: read every new
    // place, write every offset, then start every glide.
    const moves: { el: HTMLElement; dx: number; dy: number }[] = [];
    if (!reduced) {
      // a glide still running is cut off here; its current place was measured in render
      for (const el of elements) el.removeAttribute('data-uix-moving');
      const origin = container.getBoundingClientRect();
      for (const el of elements) {
        const key = el.getAttribute('data-uix-key') as string;
        const entry = byKey.get(key);
        if (!entry || entry.exiting || !was.has(key)) continue;
        const from = boxes.current.get(key);
        if (!from) continue;
        const r = el.getBoundingClientRect();
        const dx = from.x - (r.left - origin.left);
        const dy = from.y - (r.top - origin.top);
        if (dx || dy) moves.push({ el, dx, dy });
      }
      for (const { el, dx, dy } of moves) el.style.transform = `translate(${dx}px, ${dy}px)`;
      if (moves.length) void container.offsetWidth;
      for (const { el } of moves) { el.setAttribute('data-uix-moving', ''); el.style.transform = ''; }
    }
    for (const el of elements) {
      const key = el.getAttribute('data-uix-key') as string;
      if (!was.has(key) && !byKey.get(key)?.exiting) replay(el, 'data-uix-entering');
    }
  }, [entries]);

  // Leaving items go when their exit animation ends, or at their own deadline: each item gets
  // one second from the moment it started leaving, however many leave after it.
  const deadlines = useRef<Map<Key, number>>(new Map());
  const exitingKeys = entries.filter((e) => e.exiting).map((e) => e.key);
  const exitingSignature = exitingKeys.join('\n');
  useEffect(() => {
    const container = containerRef.current;
    const now = Date.now();
    for (const key of Array.from(deadlines.current.keys())) if (!exitingKeys.includes(key)) deadlines.current.delete(key);
    for (const key of exitingKeys) if (!deadlines.current.has(key)) deadlines.current.set(key, now + EXIT_FALLBACK_MS);
    if (!container || !exitingKeys.length) return undefined;
    const onEnd = (event: AnimationEvent) => {
      const el = event.target as HTMLElement;
      if (!el.hasAttribute('data-uix-exiting') || el.parentElement !== container) return;
      const key = exitingKeys.find((k) => String(k) === el.getAttribute('data-uix-key'));
      if (key !== undefined) drop([key]);
    };
    container.addEventListener('animationend', onEnd);
    const next = Math.min(...deadlines.current.values());
    const timer = setTimeout(() => {
      const due = Date.now();
      drop([...deadlines.current].filter(([, at]) => at <= due).map(([key]) => key));
    }, Math.max(0, next - now));
    return () => {
      container.removeEventListener('animationend', onEnd);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitingSignature]);

  const children: ReactNode[] = entries.map(({ key, item, exiting: leaving }) => {
    const element = renderItem(item, { exiting: leaving });
    if (!isValidElement(element)) return element;
    const extra: Record<string, unknown> = { key, 'data-uix-key': String(key) };
    if (leaving) Object.assign(extra, { 'data-uix-exiting': '', 'aria-hidden': true });
    return cloneElement(element as ReactElement<Record<string, unknown>>, extra);
  });

  // The transitionend of a glide clears its marker, so a later style change does not animate.
  const onTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    const el = event.target as HTMLElement;
    if (event.propertyName === 'transform' && el.parentElement === containerRef.current) el.removeAttribute('data-uix-moving');
  };

  return createElement(as, { ...props, ref: containerRef, className: cx('uix-motion-list', className), onTransitionEnd }, Children.toArray(children));
}

function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * The new order, with each leaving item kept just after the item it followed before (a leaving
 * item placed earlier counts as a neighbour, so a run of leaving items keeps its order).
 */
function merge<T>(items: readonly T[], getKey: (item: T) => Key, before: Entry<T>[], exiting: Map<Key, T>): Entry<T>[] {
  const list: Entry<T>[] = items.map((item) => ({ key: getKey(item), item, exiting: false }));
  before.forEach((e, i) => {
    if (!exiting.has(e.key)) return;
    let at = -1;
    for (let j = i - 1; j >= 0 && at < 0; j -= 1) {
      const k = before[j].key;
      at = list.findIndex((x) => x.key === k);
    }
    list.splice(at + 1, 0, { key: e.key, item: exiting.get(e.key) as T, exiting: true });
  });
  return list;
}

function measure(container: HTMLElement): Map<string, Box> {
  const map = new Map<string, Box>();
  const origin = container.getBoundingClientRect();
  for (const el of Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-uix-key]'))) {
    if (el.hasAttribute('data-uix-exiting')) continue;
    const r = el.getBoundingClientRect();
    map.set(el.getAttribute('data-uix-key') as string, { x: r.left - origin.left, y: r.top - origin.top });
  }
  return map;
}

function replay(el: HTMLElement, attribute: string) {
  if (el.hasAttribute(attribute)) {
    el.removeAttribute(attribute);
    void el.offsetWidth;
  }
  el.setAttribute(attribute, '');
  const done = (event: AnimationEvent) => {
    if (event.target !== el) return;
    el.removeAttribute(attribute);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}
