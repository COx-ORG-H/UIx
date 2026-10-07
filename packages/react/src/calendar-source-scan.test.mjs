/* Source scans for the calendar sources.
 * R11 AC6 (CR-SEC-10): no dangerouslySetInnerHTML and no HTML-string prop in the calendar
 * sources. R11 AC5's naming rule (part, U1 AC6): packLanes and rankOverflow carry no change
 * vocabulary. Both scans are calibrated against a known-bad snippet so a regex that
 * matches nothing cannot pass. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packLanes, rankOverflow } from './calendar-model.ts';

const here = dirname(fileURLToPath(import.meta.url));
const CALENDAR_SOURCES = ['calendar-model.ts', 'components/SchedulingCalendar.tsx'];

/** Raw-HTML sinks and props that take an HTML string. */
const htmlFindings = (code) => [
  ...code.matchAll(/dangerouslySetInnerHTML|__html|\.innerHTML|\.outerHTML|insertAdjacentHTML/g),
  ...code.matchAll(/\b\w*html\w*\??\s*:\s*string\b/gi),
].map((m) => m[0]);

const CHANGE_WORDS = /\b(?:cab|blackout|freeze|risk|change|violation)s?\b/i;

test('R11 AC6: the HTML scan finds a known-bad snippet (calibration)', () => {
  assert.equal(htmlFindings('<div dangerouslySetInnerHTML={{ __html: x }} />').length, 2);
  assert.deepEqual(htmlFindings('interface P { titleHtml?: string }'), ['titleHtml?: string']);
  assert.deepEqual(htmlFindings('interface P { title: ReactNode; renderEntry?: (e: E) => ReactNode }'), []);
});

for (const file of CALENDAR_SOURCES) {
  test(`R11 AC6: ${file} has no dangerouslySetInnerHTML and no HTML-string prop`, () => {
    assert.deepEqual(htmlFindings(readFileSync(join(here, file), 'utf8')), []);
  });
}

test('packLanes and rankOverflow contain no change vocabulary', () => {
  assert.ok(CHANGE_WORDS.test('const blackoutLane = 1'.replace(/Lane/, ' lane')), 'calibration');
  for (const fn of [packLanes, rankOverflow]) {
    const source = fn.toString();
    assert.ok(source.length > 100, `${fn.name} source is readable`);
    assert.doesNotMatch(source, CHANGE_WORDS, fn.name);
  }
  const model = readFileSync(join(here, 'calendar-model.ts'), 'utf8');
  for (const [, name] of model.matchAll(/^export\s+(?:interface|type|function|const)\s+(\w+)/gm)) {
    assert.doesNotMatch(name.replace(/([a-z])([A-Z])/g, '$1 $2'), CHANGE_WORDS, name);
  }
});
