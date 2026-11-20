"use client";

import { useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { keyboardInitiated, watchInputModality } from '../motion.js';
import { prefersReducedMotion } from './useReducedMotion.js';

/* Spatial continuity between two states of an occasional surface (the smartphone-OS study,
 * 2026-11): a workspace that grows to fill the window, dashboard cards that settle where a drop
 * put them, a list row that becomes its detail. The browser's View Transitions API takes a picture
 * before the change and one after it, and morphs the named parts from the first to the second.
 *
 * Frequency budget: never on a 100×-a-day path (opening a row, the Peek, a tab). A document-level
 * transition holds the page's picture for its whole run; the kit lets the pointer through to the
 * page underneath (motion.css), but a burst of them would still read as lag. */

/** On the transition's root (the html element, or the scope element) while a kit transition runs. */
export const VIEW_TRANSITION_ATTR = 'data-uix-view-transition';
/** The `view-transition-class` every element named by the hook carries (`::view-transition-group(*.uix-morph)`). */
export const VIEW_TRANSITION_CLASS = 'uix-morph';

/** One part that morphs: a key that pairs it across the change, and its element (missing: skipped). */
export type ViewTransitionPart = readonly [key: string, element: Element | null | undefined];

export interface ViewTransitionOptions {
  /**
   * The parts that morph, read twice: before the update (the old picture) and again right after
   * it (the new one). Parts with the same key morph into each other; a key only on one side fades.
   * Return the elements that are on the page at that moment, for example the list row before and
   * the detail panel after under one key. Without it, the change cross-fades as a whole.
   */
  parts?: () => Iterable<ViewTransitionPart>;
  /**
   * Run the transition on this element only, where the browser can (an element-scoped transition,
   * Chromium 147+): the rest of the page keeps painting and stays live. Elsewhere the document
   * runs it. Every part must be inside the scope. Leave it out for a surface that leaves its box
   * (a workspace that takes the whole window).
   */
  scope?: Element | null;
  /** Another `view-transition-class` on every part, for a product's own `::view-transition-group(*.name)` rule. */
  className?: string;
}

/** What `start` returns: when the update has run, and when the morph has ended (or was skipped). */
export interface ViewTransitionResult {
  /** True when the browser animates the change; false when it ran at once (see `useViewTransition`). */
  readonly animated: boolean;
  /** Resolves once `update` has run and React has committed it. */
  readonly updated: Promise<void>;
  /** Resolves once the morph has ended, was skipped or never started. */
  readonly finished: Promise<void>;
}

export type StartViewTransition = (update: () => void, options?: ViewTransitionOptions) => ViewTransitionResult;

/** The parts of the View Transitions API the hook uses (not in TypeScript's ES2020 DOM lib). */
interface Transition {
  readonly updateCallbackDone: Promise<unknown>;
  readonly ready: Promise<unknown>;
  readonly finished: Promise<unknown>;
  skipTransition(): void;
}
type Starter = { startViewTransition?: (update: () => unknown) => Transition };

/** Is there anything to call: `document.startViewTransition` (or the scope element's own)? */
export function viewTransitionSupported(scope?: Element | null): boolean {
  if (typeof document === 'undefined') return false;
  return typeof (scope as Starter | null | undefined)?.startViewTransition === 'function'
    || typeof (document as Starter).startViewTransition === 'function';
}

const done = (): ViewTransitionResult => ({ animated: false, updated: Promise.resolve(), finished: Promise.resolve() });

/** One running transition per document or scope element: a new one on the same root ends it. */
/** `release(true)`: a newer start ends this one, so its update, if still pending, commits now, first. */
interface Running { transition: Transition; release: (supersede?: boolean) => void }
const running = new WeakMap<Element, Running>();
let seq = 0;

/**
 * Morphs an occasional surface from one state to the next with the browser's View Transitions
 * API, on the kit's glide spring (`--uix-ease-glide` over `--uix-dur-glide`, 280 ms, no overshoot).
 * Returns a stable `start(update, options)`: call it from the event handler instead of setting
 * state directly. `update` runs inside `flushSync`, so React commits it while the browser holds
 * the old picture.
 *
 * `update` simply runs at once, with no transition, when:
 * - the browser has no `startViewTransition` (Firefox before 144, older Safari);
 * - reduced motion is asked for (the OS setting, or `<html data-motion="reduce">`);
 * - the change came from the keyboard (`keyboardInitiated()`, the same rule that makes a
 *   keyboard-opened overlay instant), since a key press is the fast path;
 * - the page is hidden.
 *
 * A second `start` on the same root while one runs ends the first where it is (its update has
 * already run) and starts from the current state, so repeated clicks never queue. Only the parts
 * get a `view-transition-name`, for the length of one transition; the hook removes it after.
 * Never on a high-frequency path: opening a row or the Peek stays instant.
 */
export function useViewTransition(): StartViewTransition {
  const owned = useRef(new Set<() => void>());
  useEffect(() => {
    watchInputModality();
    const releases = owned.current;
    return () => { releases.forEach((release) => release()); releases.clear(); };
  }, []);

  return useCallback<StartViewTransition>((update, options = {}) => {
    const { parts, scope, className } = options;
    if (typeof document === 'undefined') {
      update();
      return done();
    }
    const scoped = typeof (scope as Starter | null | undefined)?.startViewTransition === 'function';
    const root = scoped ? scope! : document.documentElement;
    // a transition still running on this root ends where it is: its picture is gone, its names too.
    // Also before an instant change (a key press mid-morph), or the old pictures would cover it.
    running.get(root)?.release(true);
    if (!viewTransitionSupported(scope) || prefersReducedMotion() || keyboardInitiated() || document.visibilityState === 'hidden') {
      update();
      return done();
    }

    const id = ++seq;
    const names = new Map<string, string>();
    const named: { el: HTMLElement | SVGElement; name: string; cls: string }[] = [];
    const classes = [VIEW_TRANSITION_CLASS, className].filter(Boolean).join(' ');
    // Names the parts; false when the caller's lookup threw (the error is reported, not swallowed).
    const name = (): boolean => {
      try { nameParts(); return true; } catch (error) { reportError(error); return false; }
    };
    const nameParts = () => {
      for (const [key, el] of parts?.() ?? []) {
        if (!el || !('style' in el)) continue;
        const target = el as HTMLElement | SVGElement;
        let ident = names.get(key);
        if (!ident) { ident = `uix-vt-${id}-${names.size}`; names.set(key, ident); }
        // one element, one name: a second key for the same element would abort the transition
        if (named.some((n) => n.el === target)) continue;
        named.push({ el: target, name: target.style.getPropertyValue('view-transition-name'), cls: target.style.getPropertyValue('view-transition-class') });
        target.style.setProperty('view-transition-name', ident);
        target.style.setProperty('view-transition-class', classes);
      }
    };
    const unname = () => {
      for (const { el, name: before, cls } of named.splice(0)) {
        if (before) el.style.setProperty('view-transition-name', before); else el.style.removeProperty('view-transition-name');
        if (cls) el.style.setProperty('view-transition-class', cls); else el.style.removeProperty('view-transition-class');
      }
    };

    let live = true;
    let transition: Transition;
    let updateError: unknown;
    let ran = false;
    const release = (supersede = false) => {
      if (!live) return;
      live = false;
      // Ended by a newer start before the browser ran this update: commit it now, so the two
      // changes land in the order they were made (the newer one may be instant and run at once).
      // Not on unmount, where React forbids flushSync; the browser's callback still commits it.
      if (supersede && !ran) {
        ran = true;
        try { flushSync(update); } catch (error) { reportError(error); }
      }
      unname();
      if (running.get(root)?.transition === transition) {
        running.delete(root);
        root.removeAttribute(VIEW_TRANSITION_ATTR);
      }
      owned.current.delete(release);
      transition?.skipTransition();
    };

    root.setAttribute(VIEW_TRANSITION_ATTR, '');
    if (!name()) {
      // the lookup failed before the old picture: no morph, and nothing left marked or named
      unname();
      root.removeAttribute(VIEW_TRANSITION_ATTR);
      update();
      return done();
    }
    const run = () => {
      // already committed by a newer start (release(true))
      if (ran) return;
      ran = true;
      unname();
      try { flushSync(update); } catch (error) { updateError = error; throw error; }
      // ended before the browser got here (an unmount): commit, but name nothing. A lookup that
      // fails now would pair only some parts: end the morph instead (the update has landed).
      if (live && !name()) release();
    };
    try {
      transition = ((scoped ? root : document) as unknown as Required<Starter>).startViewTransition(run);
    } catch {
      // an engine that refuses the call: the change still has to happen, once (it may already have
      // run the callback before throwing)
      live = false;
      unname();
      root.removeAttribute(VIEW_TRANSITION_ATTR);
      if (!ran) update();
      else if (updateError !== undefined) throw updateError;
      return done();
    }
    running.set(root, { transition, release });
    owned.current.add(release);

    // A skipped transition (a duplicate name, a hidden tab, a newer one) rejects `ready`; that is
    // not an error here. An error thrown by `update` is the caller's, so it is reported, not eaten.
    transition.ready.catch(() => {});
    const updated = transition.updateCallbackDone.then(() => undefined, () => {
      if (updateError !== undefined) reportError(updateError);
    });
    const finished = transition.finished.then(() => undefined, () => undefined).finally(release);
    return { animated: true, updated, finished };
  }, []);
}

function reportError(error: unknown) {
  if (typeof globalThis.reportError === 'function') globalThis.reportError(error);
  else setTimeout(() => { throw error; });
}
