/* The content-free event seam for AI proposals (enterprise-UX study, Tier 1 #6; spec:
 * Docs/specs/2026-11-20-ai-proposals.md).
 *
 * Every AI primitive reports what the person did with a proposal: it was shown, accepted, dismissed,
 * edited, reverted, undone, rated, stopped or retried. Each report is a bubbling `uix-proposal`
 * DOM event, built the same way as the `uix-feedback` event (PR #297), so `document` hears all of
 * them and a product can also listen on one region. UIx emits; products adapt. There is no sink,
 * no network call and no storage in the kit.
 *
 * Content-free by construction: the detail carries enums, opaque ids and timings, never a value,
 * a sentence or a name. `proposalId` must look like a record key (`ID_PATTERN`: letters AND digits)
 * and `type` like a dotted taxonomy key (`TYPE_PATTERN`); anything else is refused, the event is
 * not sent, and a console warning names the field. The patterns catch free text that slips in by
 * accident (a value, a name, a phone number); they cannot stop a product that encodes content on
 * purpose, so keep ids opaque. */

/** The DOM event every AI primitive dispatches. It bubbles, so `document` hears every one. */
export const PROPOSAL_EVENT = 'uix-proposal';

/** What happened to the proposal. */
export type ProposalAction =
  | 'shown'
  | 'accepted'
  | 'dismissed'
  | 'edited'
  | 'reverted'
  | 'undone'
  | 'feedback'
  | 'stopped'
  | 'retried';

/** Which primitive the proposal lives in. */
export type ProposalKind = 'suggestion' | 'field' | 'proposal' | 'output';

/**
 * How much an accepted proposal changes, which decides its gate (see `consequencePolicy`).
 * `low`: category, labels, priority. `medium`: assignment, a duplicate link, an internal work note.
 * `high`: resolving or closing, changing a CI, a mass update, a customer-visible reply.
 */
export type ConsequenceBand = 'low' | 'medium' | 'high';

/** `event.detail` of a `uix-proposal` event. Ids, enums and timings only. */
export interface ProposalEventDetail {
  action: ProposalAction;
  /** The product's id for this one proposal (opaque, with letters and digits: `sugg_8f2c`, `INC-1042:category`). */
  proposalId: string;
  kind: ProposalKind;
  /** The product's key for the kind of proposal, lower-case and dotted (`incident.category`), to group rates by. */
  type?: string;
  consequence?: ConsequenceBand;
  /** With `action: 'feedback'`. */
  rating?: 'up' | 'down';
  /** Milliseconds since this proposal was first shown on this page, when it was. */
  elapsedMs?: number;
  /** For `reverted`, `undone` and `edited`: milliseconds since it was accepted, when it was. */
  sinceAcceptMs?: number;
  /** `Date.now()` when it happened. */
  at: number;
}

/** What a caller passes: the kit fills in `at` and the timings. */
export type ProposalEventInput = Omit<ProposalEventDetail, 'at' | 'elapsedMs' | 'sinceAcceptMs'>;

/**
 * What a `proposalId` may look like: 3 to 128 letters, digits and `_ . : / -`, starting with a
 * letter or digit, with at least one letter AND one digit (`INC-1042:category`, `sugg_8f2c`, a
 * UUID). No spaces or `@`, so no sentence or e-mail address passes; a lone word (a first name, a
 * suggested value such as `Network`, a user name such as `ana.smith`) has no digit, and a phone
 * number has no letter.
 */
export const ID_PATTERN = /^(?=[^]*[0-9])(?=[^]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9_.:/-]{2,127}$/;

/**
 * What a `type` may look like: a lower-case dotted key of at least two parts, each starting with
 * a letter (`incident.category`, `change.risk_level`), at most 128 characters. A capitalised value
 * (`Network`), a sentence or a lone word does not pass.
 */
export const TYPE_PATTERN = /^(?=[^]{3,128}$)[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/;

const ACTIONS: readonly ProposalAction[] = ['shown', 'accepted', 'dismissed', 'edited', 'reverted', 'undone', 'feedback', 'stopped', 'retried'];
const KINDS: readonly ProposalKind[] = ['suggestion', 'field', 'proposal', 'output'];
const BANDS: readonly ConsequenceBand[] = ['low', 'medium', 'high'];

/** Is `value` usable as a `proposalId`? */
export function isProposalId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** Is `value` usable as a proposal `type`? */
export function isProposalType(value: unknown): value is string {
  return typeof value === 'string' && TYPE_PATTERN.test(value);
}

/* When each proposal was first shown and last accepted, for the timings. Bounded: the oldest
 * entries go first, so a long-lived page does not grow without end. */
const LIMIT = 500;
const shownAt = new Map<string, number>();
const acceptedAt = new Map<string, number>();

function remember(map: Map<string, number>, key: string, value: number) {
  map.delete(key);
  map.set(key, value);
  if (map.size > LIMIT) map.delete(map.keys().next().value as string);
}

const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

function refuse(field: string): false {
  if (typeof console !== 'undefined') {
    // the field's name only: echoing the value would put the content in the console
    console.warn(`[uix] uix-proposal not sent: \`${field}\` is not allowed. proposalId must match ${String(ID_PATTERN)}, type ${String(TYPE_PATTERN)}; the rest are enums.`);
  }
  return false;
}

/** Check a detail against the allow-list; returns the name of the first bad field, or null. */
function invalidField(input: ProposalEventInput): string | null {
  if (!ACTIONS.includes(input.action)) return 'action';
  if (!isProposalId(input.proposalId)) return 'proposalId';
  if (!KINDS.includes(input.kind)) return 'kind';
  if (input.type !== undefined && !isProposalType(input.type)) return 'type';
  if (input.consequence !== undefined && !BANDS.includes(input.consequence)) return 'consequence';
  if (input.rating !== undefined && input.rating !== 'up' && input.rating !== 'down') return 'rating';
  if (input.action === 'feedback' && input.rating === undefined) return 'rating';
  return null;
}

/**
 * Report what happened to a proposal: dispatches `uix-proposal` on `target` (default `document`).
 * The kit's AI components call it themselves; call it for a surface you build (an undo toast, an
 * "Add to composer" insert). Unknown keys are dropped, and a detail with free text in an id is not
 * sent at all. Returns whether the event was dispatched. A no-op on the server.
 */
export function emitProposalEvent(input: ProposalEventInput, target?: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false;
  const bad = invalidField(input);
  if (bad) return refuse(bad);
  const t = now();
  const key = `${input.kind}\u0000${input.proposalId}`;
  if (input.action === 'shown' && !shownAt.has(key)) remember(shownAt, key, t);
  const shown = shownAt.get(key);
  const accepted = acceptedAt.get(key);
  // an allow-listed copy: nothing the caller added beyond these keys reaches a listener
  const detail: ProposalEventDetail = {
    action: input.action,
    proposalId: input.proposalId,
    kind: input.kind,
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.consequence !== undefined ? { consequence: input.consequence } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(shown !== undefined && input.action !== 'shown' ? { elapsedMs: Math.round(t - shown) } : {}),
    ...(accepted !== undefined && (input.action === 'reverted' || input.action === 'undone' || input.action === 'edited')
      ? { sinceAcceptMs: Math.round(t - accepted) } : {}),
    at: Date.now(),
  };
  if (input.action === 'accepted') remember(acceptedAt, key, t);
  const view = document.defaultView;
  const Ctor = view?.CustomEvent ?? (typeof CustomEvent === 'function' ? CustomEvent : undefined);
  if (!Ctor) return false;
  (target ?? document).dispatchEvent(new Ctor<ProposalEventDetail>(PROPOSAL_EVENT, { bubbles: true, detail: Object.freeze(detail) }));
  return true;
}

/**
 * Listen to every `uix-proposal` event below `target` (default `document`). Returns the
 * unsubscribe. Hand the detail to your analytics adapter as it is: it holds no content.
 */
export function onProposalEvent(listener: (detail: ProposalEventDetail) => void, target?: EventTarget | null): () => void {
  const host = target ?? (typeof document !== 'undefined' ? document : null);
  if (!host) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ProposalEventDetail>).detail;
    if (detail && typeof detail === 'object') listener(detail);
  };
  host.addEventListener(PROPOSAL_EVENT, handler);
  return () => host.removeEventListener(PROPOSAL_EVENT, handler);
}

/** What a consequence band allows (enterprise-UX study, "Consequence decides the gate"). */
export interface ConsequencePolicy {
  band: ConsequenceBand;
  /** The surface to propose it in: a chip for low and medium, an approval card for high. */
  surface: 'suggestion' | 'proposal';
  /** May an admin set it to apply without a click? Only `low`. Never `high`. */
  autoApply: boolean;
  /** Must the person press an explicit Approve after seeing every change? Only `high`. */
  requiresApproval: boolean;
  /** Offer an undo toast after it is applied. `medium` and `high` (where the backend can honour it). */
  undo: boolean;
}

const POLICIES: Readonly<Record<ConsequenceBand, ConsequencePolicy>> = Object.freeze({
  low: Object.freeze({ band: 'low', surface: 'suggestion', autoApply: true, requiresApproval: false, undo: false }),
  medium: Object.freeze({ band: 'medium', surface: 'suggestion', autoApply: false, requiresApproval: false, undo: true }),
  high: Object.freeze({ band: 'high', surface: 'proposal', autoApply: false, requiresApproval: true, undo: true }),
});

/**
 * The rules of a band, as data a product's autonomy settings read. A missing or unknown band
 * (including `constructor`, `__proto__` and other inherited names) fails closed: it gets the
 * `high` rules, which need an explicit approval and never auto-apply.
 */
export function consequencePolicy(band: ConsequenceBand | null | undefined): ConsequencePolicy {
  return typeof band === 'string' && (BANDS as readonly string[]).includes(band) ? POLICIES[band] : POLICIES.high;
}
