"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { tokenMs } from '../motion.js';

/* Arrival (calm kit 2.56): the first paint of a glance page. Cards fade and rise in reading order,
 * numbers count up, lines trace in and bars grow — once. The stage plays on its first mount (or,
 * with `name`, on the first mount of that name in the browser session), then rests: a refresh,
 * a re-render or new data never replays it, and the resting state is the finished page. The
 * timings are the --uix-*-arrive* tokens; arrive.css draws it and keeps reduced motion to a fade. */

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const seen = new Set<string>();
const STORAGE_PREFIX = 'uix-arrive:';

function hasArrived(name: string): boolean {
  if (seen.has(name)) return true;
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_PREFIX + name) === '1';
  } catch {
    return false;
  }
}

function markArrived(name: string): void {
  seen.add(name);
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_PREFIX + name, '1');
  } catch {
    /* storage can be blocked; the in-memory set still keeps this page load from replaying */
  }
}

export interface ArriveState {
  /** True while the stage plays its arrival; false at rest (and outside any stage). */
  playing: boolean;
}

const ArriveContext = createContext<ArriveState>({ playing: false });

/** Whether the nearest `Arrive` stage is playing its arrival. Charts read it to draw in once. */
export function useArrive(): ArriveState {
  return useContext(ArriveContext);
}

const ArriveIndexContext = createContext(0);

/** The reading-order index of the nearest `ArriveItem` (or `ChartCard arriveIndex`); 0 outside one. */
export function useArriveIndex(): number {
  return useContext(ArriveIndexContext);
}

/** Provides an item's index to what it holds (a chart that starts drawing with its card). */
export function ArriveIndexProvider({ index, children }: { index: number; children?: ReactNode }) {
  return <ArriveIndexContext.Provider value={index}>{children}</ArriveIndexContext.Provider>;
}

/** How long one stage takes, from the tokens, for the items it holds (the last index wins). */
function sequenceMs(stage: HTMLElement): number {
  let lastItem = 0;
  let lastBar = 0;
  stage.querySelectorAll<HTMLElement>('.uix-arrive__item').forEach((item) => {
    const i = Number.parseFloat(getComputedStyle(item).getPropertyValue('--uix-arrive-i'));
    if (Number.isFinite(i)) lastItem = Math.max(lastItem, i);
  });
  stage.querySelectorAll<HTMLElement>('.uix-arrive__grow').forEach((bar) => {
    const j = Number.parseFloat(getComputedStyle(bar).getPropertyValue('--uix-arrive-j'));
    if (Number.isFinite(j)) lastBar = Math.max(lastBar, j);
  });
  const t = (name: string, fallback: number) => tokenMs(name, fallback, stage);
  const start = lastItem * t('--uix-stagger-arrive', 45);
  const drawn = t('--uix-delay-arrive-trace', 150) + Math.max(
    t('--uix-dur-arrive-trace', 700),
    t('--uix-dur-arrive-grow', 500) + lastBar * t('--uix-stagger-arrive-grow', 25),
  );
  return start + Math.max(t('--uix-dur-arrive', 420), drawn, t('--uix-dur-arrive-count', 600)) + 50;
}

export interface ArriveProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Remember the arrival under this name for the browser session (sessionStorage, with an
   * in-memory fallback): the page arrives on its first visit and is simply there after a reload,
   * a tab switch or a route change back to it. Without a name it plays on every mount.
   */
  name?: string;
  /**
   * Wait for the content (default `true`): while `false` nothing moves; the first time it turns
   * `true` the arrival plays (if it has not played under `name` yet). Pass `!loading` so the
   * cards arrive with their data instead of under a skeleton.
   */
  ready?: boolean;
  /** Never play: everything is at rest from the start (a print view, a test). */
  disabled?: boolean;
  children?: ReactNode;
}

type Phase = 'wait' | 'play' | 'rest';

/**
 * The stage for a glance page's arrival. Mark each card with `ArriveItem` (or the
 * `.uix-arrive__item` class and `--uix-arrive-i`), in reading order. `Count arrive`,
 * `Sparkline`, `BarList`, `Meter` and the glance charts inside it draw in by themselves.
 */
export function Arrive({ name, ready = true, disabled = false, className, children, ...props }: ArriveProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(() => {
    if (disabled) return 'rest';
    if (typeof window !== 'undefined' && name && hasArrived(name)) return 'rest';
    return ready ? 'play' : 'wait';
  });

  // wait -> play the first time the content is ready
  useIsoLayoutEffect(() => {
    if (phase !== 'wait' || !ready) return;
    setPhase(disabled || (name && hasArrived(name)) ? 'rest' : 'play');
  }, [phase, ready, disabled, name]);

  // play -> rest once the sequence is over; the name is spent as soon as it starts
  useEffect(() => {
    if (phase !== 'play') return undefined;
    if (name) markArrived(name);
    const stage = ref.current;
    if (!stage) return undefined;
    const timer = window.setTimeout(() => setPhase('rest'), sequenceMs(stage));
    return () => window.clearTimeout(timer);
  }, [phase, name]);

  // a server render cannot know the session: the client's first answer wins before paint
  useIsoLayoutEffect(() => {
    ref.current?.setAttribute('data-uix-arrive', phase);
  }, [phase]);

  return (
    <ArriveContext.Provider value={{ playing: phase === 'play' }}>
      <div ref={ref} className={cx('uix-arrive', className)} data-uix-arrive={phase} suppressHydrationWarning {...props}>
        {children}
      </div>
    </ArriveContext.Provider>
  );
}

export interface ArriveItemProps extends HTMLAttributes<HTMLElement> {
  /** Reading-order position: item n starts n × 45 ms after the first. */
  index?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'header' | 'aside';
  children?: ReactNode;
}

/** One card (or row of cards) of an `Arrive` stage. */
export function ArriveItem({ index = 0, as: Tag = 'div', className, style, children, ...props }: ArriveItemProps) {
  return (
    <Tag className={cx('uix-arrive__item', className)} style={{ '--uix-arrive-i': index, ...style } as CSSProperties} {...props}>
      <ArriveIndexContext.Provider value={index}>{children}</ArriveIndexContext.Provider>
    </Tag>
  );
}
