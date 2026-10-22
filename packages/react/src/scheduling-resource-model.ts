/* The resource day of SchedulingCalendar (HAR-983; MEDx S10/S13/S48): one column per resource
 * (a practitioner), on a slot axis of real instants in the tenant's zone. Pure and DOM-free.
 *
 * Truthful by construction: a span is drawn only where the consumer sent one. A time with no
 * span is "no schedule", never "free"; nothing here infers a kind from missing data. */
import { packLanes, zonedDayBounds, zonedTimeOfDay } from './calendar-model.js';

/** What a span of a resource's day is: open to book, booked, or not working. */
export type SchedulingAvailabilityKind = 'free' | 'booked' | 'off';

/** One column of the resource day, e.g. a practitioner. */
export interface SchedulingResource {
  id: string;
  /** The column heading and the start of every slot's accessible name. */
  label: string;
  /** A second line under the heading, e.g. the speciality or the room. */
  description?: string;
}

/** A stretch of one resource's day, as the server composed it. */
export interface SchedulingResourceSpan {
  id: string;
  resourceId: string;
  /** ISO 8601 instants, half-open `[start, end)`. */
  start: string;
  end: string;
  kind: SchedulingAvailabilityKind;
  /** Shown on the span, e.g. the patient's name on a booking or "Lunch" on time off. */
  label?: string;
  /** The complete accessible name, in the consumer's words. Replaces the built one. */
  accessibleName?: string;
}

/** One row of the slot axis. */
export interface ResourceDaySlot {
  /** Epoch milliseconds of the slot's start and end. */
  start: number;
  end: number;
  /** The local time it starts, `HH:MM`, in the display zone. */
  label: string;
}

export interface ResourceDaySlotOptions {
  /** The first local time shown, `HH:MM`. Default `'07:00'`. */
  dayStart?: string;
  /** The local time the axis ends, `HH:MM` (exclusive). Default `'19:00'`. */
  dayEnd?: string;
  /** Minutes per slot. Default 15. */
  slotMinutes?: number;
}

/** One drawn piece of a column: a bookable slot of a free span, a booking, or time off. */
export interface ResourceDayItem {
  key: string;
  span: SchedulingResourceSpan;
  kind: SchedulingAvailabilityKind;
  /** Epoch milliseconds of what this piece covers (a free span is cut at slot edges). */
  start: number;
  end: number;
  /** Slots from the top of the axis to the piece's start (fractional). */
  offset: number;
  /** Slots the piece is long (fractional). */
  length: number;
  lane: number;
  lanes: number;
  /** The span starts before or ends after the axis. */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

const MINUTE = 60_000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * The slot axis of `date` in `timeZone`: one slot per `slotMinutes` of real time from the first
 * local time at or after `dayStart` to the last before `dayEnd`. On a clock-change day the axis
 * is as long as the day really is (a skipped hour has no slots; a repeated hour has two sets).
 */
export function resourceDaySlots(date: string, timeZone: string, options: ResourceDaySlotOptions = {}): ResourceDaySlot[] {
  const dayStart = options.dayStart && TIME.test(options.dayStart) ? options.dayStart : '07:00';
  const dayEnd = options.dayEnd && TIME.test(options.dayEnd) ? options.dayEnd : '19:00';
  const minutes = Number.isFinite(options.slotMinutes) && options.slotMinutes! >= 5 ? Math.floor(options.slotMinutes!) : 15;
  const step = minutes * MINUTE;
  const bounds = zonedDayBounds(date, timeZone);
  const all: ResourceDaySlot[] = [];
  for (let at = bounds.start.getTime(); at < bounds.end.getTime(); at += step) {
    all.push({ start: at, end: Math.min(at + step, bounds.end.getTime()), label: zonedTimeOfDay(at, timeZone) });
  }
  const first = all.findIndex((slot) => slot.label >= dayStart);
  let last = -1;
  all.forEach((slot, index) => { if (slot.label < dayEnd) last = index; });
  if (first === -1 || last < first) return [];
  // The run between the first and the last slot in range, so a repeated hour leaves no hole.
  return all.slice(first, last + 1);
}

/**
 * Where the spans of one resource go on the slot axis. Free spans are cut at slot edges, so each
 * bookable slot is its own piece; bookings and time off stay whole. Pieces outside the axis are
 * dropped, pieces across its edges are clipped. Overlapping pieces (a double booking) get lanes.
 */
export function layoutResourceColumn(spans: readonly SchedulingResourceSpan[], slots: readonly ResourceDaySlot[]): ResourceDayItem[] {
  if (slots.length === 0) return [];
  const axisStart = slots[0]!.start;
  const axisEnd = slots[slots.length - 1]!.end;
  const slotMs = slots[0]!.end - slots[0]!.start;
  const pieces: Array<Omit<ResourceDayItem, 'lane' | 'lanes' | 'offset' | 'length'>> = [];
  const seen = new Set<string>();
  for (const span of spans) {
    if (seen.has(span.id)) continue;
    seen.add(span.id);
    const start = new Date(span.start).getTime();
    const end = new Date(span.end).getTime();
    if (!(end > start) || end <= axisStart || start >= axisEnd) continue;
    const from = Math.max(start, axisStart);
    const to = Math.min(end, axisEnd);
    const edges = { continuesBefore: start < axisStart, continuesAfter: end > axisEnd };
    if (span.kind === 'free') {
      for (const slot of slots) {
        const a = Math.max(from, slot.start);
        const b = Math.min(to, slot.end);
        if (b > a) pieces.push({ key: `${span.id}@${a}`, span, kind: 'free', start: a, end: b, ...edges });
      }
    } else pieces.push({ key: span.id, span, kind: span.kind, start: from, end: to, ...edges });
  }
  const packed = packLanes(pieces.map((piece) => ({ id: piece.key, start: piece.start, end: piece.end })), Infinity);
  return pieces
    .map((piece) => {
      const placement = packed.lanes[piece.key]!;
      return {
        ...piece,
        offset: (piece.start - axisStart) / slotMs,
        length: (piece.end - piece.start) / slotMs,
        lane: placement.lane ?? 0,
        lanes: packed.clusters[placement.cluster]!.laneCount || 1,
      };
    })
    .sort((a, b) => a.start - b.start || a.lane - b.lane);
}

/** The stretches of the axis no span covers: shown as "no schedule", never as free. */
export function resourceDayGaps(items: readonly ResourceDayItem[], slots: readonly ResourceDaySlot[]): Array<{ start: number; end: number }> {
  if (slots.length === 0) return [];
  const gaps: Array<{ start: number; end: number }> = [];
  let at = slots[0]!.start;
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    if (item.start > at) gaps.push({ start: at, end: item.start });
    at = Math.max(at, item.end);
  }
  const axisEnd = slots[slots.length - 1]!.end;
  if (at < axisEnd) gaps.push({ start: at, end: axisEnd });
  return gaps;
}
