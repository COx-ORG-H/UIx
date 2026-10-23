/* Live harness for the resource day of SchedulingCalendar (HAR-983; MEDx S10/S13/S48), bundled by
 * build.mjs from source for tests/a11y/scheduling-resource-day.spec.mjs.
 *   ?columns=N   practitioners (default 5; the spec uses 1, 5 and 15)
 *   ?layout=…    auto (default) | columns | list
 *   ?state=…     ready (default) | loading (first load, nothing yet) | refetch (loading over data) | empty (no spans)
 * Spans are composed the way the MEDx server composes them: free / booked / off stretches, and
 * gaps where a practitioner has no schedule. window.__slots records every onSelectSlot. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SchedulingCalendar } from '../../packages/react/src/index.js';
import type { SchedulingResource, SchedulingResourceSpan, SchedulingSlotSelection } from '../../packages/react/src/index.js';

declare global { interface Window { __slots: SchedulingSlotSelection[] } }
window.__slots = [];

const params = new URLSearchParams(location.search);
const count = Number(params.get('columns') ?? 5);
const layout = (params.get('layout') ?? 'auto') as 'auto' | 'columns' | 'list';
const state = params.get('state') ?? 'ready';
const ZONE = 'Europe/Sarajevo';
const DATE = '2026-10-22';
const at = (time: string) => new Date(`${DATE}T${time}:00+02:00`).toISOString();

const NAMES = ['dr. Amra Hadžić', 'dr. Edin Kovačević', 'dr. Selma Đurđević', 'dr. Nermina Mehmedbašić-Hadžiahmetović', 'dr. Haris Begić'];
const resources: SchedulingResource[] = Array.from({ length: count }, (_, i) => ({
  id: `p${i}`,
  label: NAMES[i % NAMES.length]! + (i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : ''),
  description: i % 2 ? 'Opća praksa' : 'Pedijatrija',
}));

/** One practitioner's day: works 08:00–16:00 with lunch off; some bookings; the third one starts at 10:00 (no schedule before). */
function day(resource: SchedulingResource, index: number): SchedulingResourceSpan[] {
  const start = index % 3 === 2 ? '10:00' : '08:00';
  const spans: SchedulingResourceSpan[] = [
    { id: `${resource.id}-free-am`, resourceId: resource.id, start: at(start), end: at('12:00'), kind: 'free' },
    { id: `${resource.id}-lunch`, resourceId: resource.id, start: at('12:00'), end: at('12:30'), kind: 'off', label: 'Pauza' },
    { id: `${resource.id}-free-pm`, resourceId: resource.id, start: at('12:30'), end: at('16:00'), kind: 'free' },
  ];
  // bookings cut out of the free time, as the server returns them: the free spans are split around them
  const booked = [['09:00', '09:30', 'Lejla M.'], ['13:15', '14:00', 'Kenan S. — kontrola nakon operacije']].filter(([from]) => from! >= start);
  const result: SchedulingResourceSpan[] = [];
  for (const span of spans) {
    if (span.kind !== 'free') { result.push(span); continue; }
    let cursor = span.start;
    for (const [from, to, label] of booked) {
      const b = { start: at(from!), end: at(to!) };
      if (b.start >= span.end || b.end <= cursor) continue;
      if (b.start > cursor) result.push({ ...span, id: `${span.id}-${cursor}`, start: cursor, end: b.start });
      result.push({ id: `${resource.id}-${from}`, resourceId: resource.id, start: b.start, end: b.end, kind: 'booked', label });
      cursor = b.end;
    }
    if (cursor < span.end) result.push({ ...span, id: `${span.id}-${cursor}`, start: cursor });
  }
  return result;
}

function Harness() {
  const [selected, setSelected] = useState<{ resourceId: string; start: string } | undefined>(undefined);
  const spans = state === 'empty' || state === 'loading' ? [] : resources.flatMap(day);
  return (
    <>
      <h1>Dnevni raspored</h1>
      <div id="calendar">
        <SchedulingCalendar
          entries={[]} anchorDate={DATE} timeZone={ZONE} view="day" showHeader={false}
          resources={resources} resourceSpans={spans} slotMinutes={15} dayStart="07:30" dayEnd="17:00"
          resourceLayout={layout} loading={state === 'loading' || state === 'refetch'}
          selectedSlot={selected}
          onSelectSlot={(slot) => { window.__slots.push(slot); setSelected({ resourceId: slot.resourceId, start: slot.start }); }}
          emptyNote={state === 'empty' ? 'Za ovaj dan nema rasporeda.' : undefined}
          legend={[]}
          labels={{
            resourceGrid: 'Raspored po ljekarima za {date}',
            availability: { free: 'Slobodno', booked: 'Zauzeto', off: 'Odsutan' },
            noSchedule: 'Nema rasporeda',
            slotName: '{resource}, {start} – {end}, {kind}, {label}',
            resourceHint: 'Strelice pomjeraju između termina i ljekara. Enter bira.',
            loading: 'Učitavanje rasporeda…',
          }}
          locale="bs"
        />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
