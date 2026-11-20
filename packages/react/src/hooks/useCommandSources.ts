"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandPaletteItem, CommandPaletteSource } from '../command-palette-model.js';

/** @internal What one source shows for the current query, worked out during render. */
export interface CommandSourceView {
  source: CommandPaletteSource;
  /** The rows to show: the answer for this query, or the last answer kept while the next loads. */
  items: readonly CommandPaletteItem[];
  /** A search for this query is pending (debouncing or in flight); `items` are then stale. */
  loading: boolean;
  /** The search for this query failed. */
  failed: boolean;
}

interface SourceState {
  /** The query the answer (or the failure) is for. */
  query: string;
  status: 'loading' | 'done' | 'error';
  items: readonly CommandPaletteItem[];
}

const DEFAULT_DEBOUNCE = 200;
const minLength = (source: CommandPaletteSource) => Math.max(0, source.minQueryLength ?? 1);
const isAbort = (error: unknown) => (error as { name?: string } | null)?.name === 'AbortError';

/**
 * @internal The palette's server searches (roadmap #9). Each source of the current page asks
 * `load(query, signal)` after its debounce; a newer keystroke, a page change or closing aborts the
 * search in flight, and its late answer is dropped. The last answer stays on screen (stale) until
 * the next arrives, so the list never empties between keystrokes. Whether a source is loading is
 * derived from the query during render, so the keystroke's own render is already busy (LESSONS
 * 2026-10-23, delayed pending and stale answers).
 */
export function useCommandSources(sources: readonly CommandPaletteSource[] | undefined, query: string, scope: string, active: boolean): {
  views: CommandSourceView[];
  retry: (id: string) => void;
} {
  const trimmed = query.trim();
  const latest = useRef(sources);
  latest.current = sources;
  const queryRef = useRef(trimmed);
  queryRef.current = trimmed;
  /** Answers by source id, for `scope` only: another page starts with none. */
  const [state, setState] = useState<{ scope: string; byId: Record<string, SourceState> }>({ scope, byId: {} });
  /** The searches of the current effect run: a timer or an in-flight request per source. */
  const runs = useRef(new Map<string, { timer?: ReturnType<typeof setTimeout>; controller?: AbortController }>());
  const ids = (sources ?? []).map((s) => `${s.id}\u0001${minLength(s)}`).join('\u0002');

  const settle = useCallback((id: string, q: string, at: string, next: Omit<SourceState, 'query'>) => {
    setState((prev) => (prev.scope !== at ? prev : { scope: at, byId: { ...prev.byId, [id]: { query: q, ...next } } }));
  }, []);

  const start = useCallback((source: CommandPaletteSource, q: string, at: string, delay: number) => {
    const run: { timer?: ReturnType<typeof setTimeout>; controller?: AbortController } = {};
    const ask = () => {
      run.timer = undefined;
      const controller = new AbortController();
      run.controller = controller;
      let pending: Promise<readonly CommandPaletteItem[]>;
      try { pending = Promise.resolve(source.load(q, controller.signal)); } catch (error) { pending = Promise.reject(error); }
      // A settled search leaves the runs, so a later cleanup never aborts a signal whose work is done.
      const done = () => { if (runs.current.get(source.id) === run) runs.current.delete(source.id); };
      pending.then(
        (items) => {
          if (controller.signal.aborted) return;
          done();
          settle(source.id, q, at, { status: 'done', items: Array.isArray(items) ? items : [] });
        },
        (error: unknown) => {
          if (controller.signal.aborted || isAbort(error)) return;
          done();
          // the error row replaces the rows of the earlier query; Retry starts from nothing
          settle(source.id, q, at, { status: 'error', items: [] });
        },
      );
    };
    if (delay > 0) run.timer = setTimeout(ask, delay);
    else ask();
    return run;
  }, [settle]);

  const stop = useCallback((id?: string) => {
    for (const [key, run] of runs.current) {
      if (id !== undefined && key !== id) continue;
      if (run.timer !== undefined) clearTimeout(run.timer);
      run.controller?.abort();
      runs.current.delete(key);
    }
  }, []);

  useEffect(() => {
    // Closed, or a source the query is too short for: forget its rows, so they never come back stale later.
    const idle = new Set((latest.current ?? []).filter((source) => !active || trimmed.length < minLength(source)).map((source) => source.id));
    setState((prev) => {
      if (prev.scope !== scope) return { scope, byId: {} };
      if (!Object.keys(prev.byId).some((id) => idle.has(id))) return prev;
      const byId = { ...prev.byId };
      for (const id of idle) delete byId[id];
      return { scope, byId };
    });
    if (!active) return undefined;
    for (const source of latest.current ?? []) {
      if (trimmed.length < minLength(source)) continue;
      runs.current.set(source.id, start(source, trimmed, scope, Math.max(0, source.debounce ?? DEFAULT_DEBOUNCE)));
    }
    return () => stop();
  }, [active, trimmed, scope, ids, start, stop]);

  const retry = useCallback((id: string) => {
    const source = (latest.current ?? []).find((s) => s.id === id);
    if (!source) return;
    stop(id);
    const q = queryRef.current;
    setState((prev) => (prev.scope !== scope ? prev : {
      scope, byId: { ...prev.byId, [id]: { query: q, status: 'loading', items: prev.byId[id]?.items ?? [] } },
    }));
    runs.current.set(id, start(source, q, scope, 0));
  }, [scope, start, stop]);

  const byId = state.scope === scope ? state.byId : {};
  const views: CommandSourceView[] = [];
  for (const source of sources ?? []) {
    if (!active || trimmed.length < minLength(source)) continue;
    const entry = byId[source.id];
    const fresh = entry?.query === trimmed;
    const loading = !fresh || entry.status === 'loading';
    views.push({ source, items: entry?.items ?? [], loading, failed: fresh && entry.status === 'error' });
  }
  return { views, retry };
}
