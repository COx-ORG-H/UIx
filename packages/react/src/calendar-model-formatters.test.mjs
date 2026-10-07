/* R17 AC4: a 2,100-entry fixture constructs at most 4 Intl.DateTimeFormat instances.
 * The spy goes on globalThis.Intl.DateTimeFormat BEFORE the model loads, so a formatter
 * built at import time counts too. node --test runs each file in its own process, so this
 * import is the module's first. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';

const Original = Intl.DateTimeFormat;
let constructed = 0;
globalThis.Intl.DateTimeFormat = new Proxy(Original, {
  construct(target, args, newTarget) { constructed++; return Reflect.construct(target, args, newTarget === globalThis.Intl.DateTimeFormat ? target : newTarget); },
  apply(target, self, args) { constructed++; return Reflect.apply(target, self, args); },
});

const model = await import('./calendar-model.ts');

test('R17 AC4: a 2,100-entry fixture constructs ≤ 4 Intl.DateTimeFormat instances', () => {
  const timeZone = 'Europe/Berlin';
  const base = Date.parse('2026-10-01T00:00:00Z');
  const entries = Array.from({ length: 2100 }, (_, i) => {
    const start = base + ((i * 7919) % (31 * 96)) * 15 * 60_000;
    return { id: `e${i}`, start: new Date(start).toISOString(), end: new Date(start + (1 + (i % 40)) * 15 * 60_000).toISOString() };
  });
  const before = constructed;
  const time = model.cachedDateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' });
  const days = new Set();
  for (const entry of entries) {
    days.add(model.zonedDateKey(entry.start, timeZone));
    const span = model.zonedDaySpan(entry.start, entry.end, timeZone);
    for (const day of model.enumerateDateKeys(span).dates) days.add(day);
    model.addZonedDays(entry.start, 1, timeZone);
    model.cachedDateTimeFormat('en-GB', { minute: '2-digit', hour: '2-digit', timeZone }).format(new Date(entry.start));
    time.format(new Date(entry.end));
  }
  for (const day of days) {
    model.zonedDayBounds(day, timeZone);
    for (const slot of model.zonedHourSlots(day, timeZone)) time.format(slot.instant);
  }
  model.packLanes(entries, 4);
  const count = constructed - before;
  assert.ok(days.size >= 31, `fixture covers the month (${days.size} days)`);
  assert.ok(count <= 4, `constructed ${count} Intl.DateTimeFormat instances`);
});

test('the spy counts constructions (calibration)', () => {
  const before = constructed;
  new Intl.DateTimeFormat('en-GB');
  Intl.DateTimeFormat('en-GB');
  assert.equal(constructed - before, 2);
  assert.ok(model.cachedDateTimeFormat('en-GB', {}) instanceof Original);
});
