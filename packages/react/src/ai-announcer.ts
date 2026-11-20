/* The shared announcer for AI output (enterprise-UX study, "Shared AI announcer"; Bailey,
 * Smashing, Nov 2026). Streaming text is never put in a live region token by token: a screen
 * reader would judder through every partial word. Instead, through the page's one polite region
 * (`announcePolite`, the kit's `[data-uix-announcer]`):
 * - the status text once, when a generation starts ("Summarising work notes");
 * - while ANY generation runs, one shared heartbeat about every 5 s: "Loading", or the status
 *   text when it changed since it was last said;
 * - the whole message once, when it is complete.
 * One heartbeat for the page, however many cards are generating: two cards do not talk over each
 * other. Messages for the same region that arrive in the same moment (two cards starting or
 * finishing together) are said together, in order: `announcePolite` alone would let the later one
 * replace the earlier before the region was filled. */

import { announcePolite, ensureAnnouncer } from './announce.js';

/** How often the heartbeat speaks while something is generating (Bailey's measured sweet spot). */
export const AI_HEARTBEAT_MS = 5000;

interface Generation {
  status: string;
  /** The status text that was last said for this generation. */
  said: string;
  loading: string;
  from: Element | null;
}

const active = new Map<symbol, Generation>();
let timer: ReturnType<typeof setInterval> | null = null;

/** Messages waiting for their region, per region host (the page, or a dialog). */
const pending = new Map<Element | null, string[]>();
let flushing = false;

const regionKey = (from: Element | null) => from?.closest('dialog') ?? null;

/** Queue `text` for its region; everything queued in this task (one React commit) is said once, joined. */
function say(text: string, from: Element | null) {
  const key = regionKey(from);
  const list = pending.get(key) ?? [];
  if (!list.includes(text)) list.push(text);
  pending.set(key, list);
  if (flushing) return;
  flushing = true;
  queueMicrotask(() => {
    flushing = false;
    const batch = [...pending];
    pending.clear();
    for (const [host, texts] of batch) announcePolite(texts.join(' '), host);
  });
}

function beat() {
  // the most recently started generation speaks for all of them
  const last = [...active.values()].pop();
  if (!last) return;
  if (last.status && last.status !== last.said) {
    last.said = last.status;
    say(last.status, last.from);
  } else {
    say(last.loading, last.from);
  }
}

function sync() {
  if (active.size && !timer) timer = setInterval(beat, AI_HEARTBEAT_MS);
  if (!active.size && timer) { clearInterval(timer); timer = null; }
}

/** A running generation's handle, as `startAiGeneration` returns it. */
export interface AiGeneration {
  /** The status text changed ("Reading 4 work notes"); the next heartbeat says it. */
  status: (text: string) => void;
  /** It finished: stop its heartbeat and, when `message` is given, say it once. */
  end: (message?: string) => void;
}

export interface AiGenerationOptions {
  /** Said at once, and again by the heartbeat when it changes. */
  status?: string;
  /** What the heartbeat says when the status has not changed. Default "Loading". */
  loading?: string;
  /** An element inside the generating surface, so a generation inside a dialog speaks there. */
  from?: Element | null;
  /** `final`: say nothing until the end (secondary chatter muted). Default `all`. */
  announce?: 'all' | 'final';
}

/**
 * Start announcing a generation. The kit's `AiOutputCard` calls it; call it yourself for a
 * streaming surface the kit does not draw. A no-op on the server.
 */
export function startAiGeneration(options: AiGenerationOptions = {}): AiGeneration {
  if (typeof document === 'undefined') return { status: () => {}, end: () => {} };
  const key = Symbol('uix-ai-generation');
  const from = options.from ?? null;
  ensureAnnouncer(from);
  const muted = options.announce === 'final';
  const status = options.status?.trim() ?? '';
  if (!muted) {
    active.set(key, { status, said: status, loading: options.loading ?? 'Loading', from });
    if (status) say(status, from);
    sync();
  }
  let ended = false;
  return {
    status(text) {
      const g = active.get(key);
      if (g) g.status = text.trim();
    },
    end(message) {
      if (ended) return;
      ended = true;
      active.delete(key);
      sync();
      if (message && message.trim()) say(message.trim(), from);
    },
  };
}
