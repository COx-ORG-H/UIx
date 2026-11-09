import type { PillTone } from './components/StatusPill.js';

/**
 * The five status roles by meaning (HAR-2816, Foundations › Usage roles).
 *
 * - `neutral` — the default: facts, counts, lifecycle states and routine absences
 *   ("Inaktiv seit 92 Tagen", "Nicht anwendbar").
 * - `info` — something to notice with no pressure to act: in flight, new, selected.
 * - `success` — the one achieved outcome a person waits for ("Prüflauf bestanden").
 * - `warning` — act soon: a deadline near, a value drifting ("Support endet in 42 Tagen").
 * - `critical` — broken or breached now ("Support seit 12 Tagen überschritten"). Rare: a dot
 *   and words (`StatusDot`), at most one red surface per screen.
 *
 * Every role carries words; colour is never the only cue.
 */
export type StatusRole = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

/** The five status roles, quietest first. */
export const STATUS_ROLES: readonly StatusRole[] = ['neutral', 'info', 'success', 'warning', 'critical'];

/**
 * A `StatusPill` tone folded onto its status role, so a product that keeps the finer pill
 * vocabulary (SLA, priority, time pressure) still lands on one of the five meanings, e.g. for a
 * `StatusDot`. Anything that is not a failure, a deadline or an achieved outcome is `neutral`:
 * `muted`, `sla-ok`, `p4` and `p5` included.
 */
export function statusRoleOf(tone: PillTone | null | undefined): StatusRole {
  switch (tone) {
    case 'critical':
    case 'danger':
    case 'overdue':
    case 'sla-breached':
    case 'p1':
      return 'critical';
    case 'warning':
    case 'attention':
    case 'sla-at-risk':
    case 'p2':
    case 'p3':
      return 'warning';
    case 'info':
    case 'progress':
      return 'info';
    case 'success':
      return 'success';
    default:
      return 'neutral';
  }
}
