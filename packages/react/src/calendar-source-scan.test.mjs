/* Source scans for the calendar sources.
 * R11 AC6 (CR-SEC-10): no dangerouslySetInnerHTML and no HTML-string prop in the calendar
 * sources. R11 AC5's naming rule (part, U1 AC6): packLanes and rankOverflow carry no change
 * vocabulary. AC20 (U2, HAR-1506): no name, enum value or default label added to SchedulingCalendar
 * or its model contains change vocabulary. The scans are calibrated against a known-bad snippet so a regex that
 * matches nothing cannot pass. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packLanes, rankOverflow } from './calendar-model.ts';

const here = dirname(fileURLToPath(import.meta.url));
const CALENDAR_SOURCES = ['calendar-model.ts', 'scheduling-calendar-model.ts', 'components/SchedulingCalendar.tsx'];

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

/* AC20 (R11 AC5 for new names; E13). Every identifier and string literal in the calendar
 * component and its model, comments stripped, is split into words and checked. The only
 * hits allowed are the pre-existing exports E13 keeps (deprecated, not removed, in 2.x). */
const E13_KEPT = new Set(['blackout-violation', 'blackout', 'Blackout violation']);
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const vocabularyFindings = (code) => {
  const source = stripComments(code);
  const findings = [];
  for (const [, , literal] of source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (!E13_KEPT.has(literal) && CHANGE_WORDS.test(literal.replace(/[-_]/g, ' '))) findings.push(literal);
  }
  const code_ = source.replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
  for (const [name] of code_.matchAll(/[A-Za-z_$][\w$]*/g)) {
    // React's onXChange callback convention (onViewChange), not the domain word.
    if (/^on[A-Z]\w*Change$/.test(name)) continue;
    if (CHANGE_WORDS.test(name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '))) findings.push(name);
  }
  return findings;
};

test('AC20: the vocabulary scan finds a known-bad snippet (calibration)', () => {
  assert.deepEqual(vocabularyFindings("type T = 'freeze' | 'tentative'; const riskBand = 1; // a blackout comment"), ['freeze', 'riskBand']);
  assert.deepEqual(vocabularyFindings("type S = 'blackout-violation'; const label = 'Blackout violation'; onAnchorDateChange();"), []);
  assert.deepEqual(vocabularyFindings("const s = 'a \\'freeze\\' here';"), ["a \\'freeze\\' here"], 'escaped quotes stay inside the literal');
});

for (const file of ['components/SchedulingCalendar.tsx', 'scheduling-calendar-model.ts']) {
  test(`AC20: ${file} adds no change vocabulary (only the E13-kept enum values remain)`, () => {
    assert.deepEqual(vocabularyFindings(readFileSync(join(here, file), 'utf8')), []);
  });
}
