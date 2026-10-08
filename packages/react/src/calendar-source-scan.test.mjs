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
const CALENDAR_SOURCES = [
  'calendar-model.ts', 'scheduling-calendar-model.ts', 'components/SchedulingCalendar.tsx', 'components/SchedulingTimeGrid.tsx',
  // HAR-1521 (U5 AC13): the timeline and its model
  'components/SchedulingTimeline.tsx', 'scheduling-timeline-model.ts',
];

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
const vocabularyFindings = (code, kept = E13_KEPT) => {
  const source = stripComments(code);
  const findings = [];
  for (const [, , literal] of source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (!kept.has(literal) && CHANGE_WORDS.test(literal.replace(/[-_]/g, ' '))) findings.push(literal);
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

for (const file of ['components/SchedulingCalendar.tsx', 'components/SchedulingTimeGrid.tsx', 'scheduling-calendar-model.ts']) {
  test(`AC20: ${file} adds no change vocabulary (only the E13-kept enum values remain)`, () => {
    assert.deepEqual(vocabularyFindings(readFileSync(join(here, file), 'utf8')), []);
  });
}

/* U3 (HAR-1509), veto V7: the time grid takes its geometry from real instants. A fixed day
 * length (24 hours, 1,440 minutes, 86,400,000 ms) or a local-clock Date mutator in these
 * files puts every item after a clock change one hour off. U1's calendar-model.ts is not in
 * the list: its bracketing searches use a day constant on purpose and are tested there. */
const GEOMETRY_SOURCES = ['scheduling-calendar-model.ts', 'components/SchedulingTimeGrid.tsx', 'components/SchedulingCalendar.tsx'];
const fixedDayFindings = (code) => [
  ...stripComments(code).matchAll(/(?<![\w.])(?:24|1[_,]?440|86[_,]?400[_,]?000)(?![\w.])|\.set(?:Hours|Date|Minutes)\(|\.get(?:Date|Hours|Minutes)\(/g),
].map((match) => match[0]);

test('U3: the fixed-day scan finds a known-bad snippet (calibration)', () => {
  assert.deepEqual(fixedDayFindings('const rows = 24; const DAY = 86_400_000; d.setHours(0, 0, 0, 0); x.getDate(); const m = 1440; // 24 in a comment'), ['24', '86_400_000', '.setHours(', '.getDate(', '1440']);
  assert.deepEqual(fixedDayFindings('const HOUR_MS = 3_600_000; const a = 240; const b = x24; d.getUTCDay(); new Date(v).getTime();'), []);
});

for (const file of GEOMETRY_SOURCES) {
  test(`U3: ${file} has no fixed day length and no local-clock Date mutator`, () => {
    assert.deepEqual(fixedDayFindings(readFileSync(join(here, file), 'utf8')), []);
  });
}

/* U5 (HAR-1521) AC17 / R11 AC5: the same vocabulary scan over SchedulingTimeline and its model.
 * The hits allowed are the 2.32 exports E13 keeps, deprecated and not removed: the three
 * overlay kinds, the reused entry states, their default labels and the 2.32 hint sentence. No
 * name, enum value or default label added by U5 may be on this list. */
const TIMELINE_E13_KEPT = new Set([
  'freeze', 'blackout', 'blackout-violation', 'Change freeze', 'Blackout', 'Blackout violation',
  'Shift and an arrow key moves it; Alt, Shift and an arrow key changes when it ends.',
]);
const TIMELINE_SOURCES = ['components/SchedulingTimeline.tsx', 'scheduling-timeline-model.ts'];

test('AC17: the timeline vocabulary scan finds a known-bad snippet (calibration)', () => {
  assert.deepEqual(vocabularyFindings("const overlays = { freeze: 'Change freeze' }; const flagOverlaps = true; const label = 'Risk window';", TIMELINE_E13_KEPT), ['Risk window', 'freeze']);
  assert.deepEqual(vocabularyFindings("type K = 'freeze' | 'maintenance' | 'blackout'; const labels = { 'freeze': 'Change freeze' };", TIMELINE_E13_KEPT), []);
  assert.deepEqual(vocabularyFindings("const hint = 'Alt, Shift and an arrow key changes when it ends.';", TIMELINE_E13_KEPT), ['Alt, Shift and an arrow key changes when it ends.'], 'a new sentence with the word is not kept');
});

for (const file of TIMELINE_SOURCES) {
  test(`AC17 (E13): ${file} adds no change vocabulary (only the E13-kept 2.32 values remain)`, () => {
    assert.deepEqual(vocabularyFindings(readFileSync(join(here, file), 'utf8'), TIMELINE_E13_KEPT), []);
  });
}

test('AC17 (E13): no new default label of the timeline says "overlap", and the kept ones are those of 2.32', () => {
  const source = stripComments(readFileSync(join(here, 'components/SchedulingTimeline.tsx'), 'utf8'));
  const literals = [...source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2]);
  assert.ok(literals.length > 50, 'the literals were read');
  assert.deepEqual(literals.filter((literal) => /overlap/i.test(literal)), [', overlaps another entry'], 'the one 2.32 label, drawn only while flagOverlaps is on');
  for (const kept of TIMELINE_E13_KEPT) assert.ok(literals.includes(kept), `${kept} is still in the source (E13: never removed in 2.x)`);
});

/* AC17: the deprecations are visible to a consumer in the API report. */
test('AC17 (E13): the kinds, the reused entry state and their default labels are @deprecated in the API report', () => {
  const report = readFileSync(join(here, '../etc/uix-react.api.md'), 'utf8').replace(/\r\n/g, '\n');
  const deprecated = (declaration, within = report) => {
    const at = within.indexOf(declaration);
    assert.notEqual(at, -1, `${declaration} is in the report`);
    const before = within.slice(0, at).trimEnd().split('\n').pop().trim();
    return /^\/\/ (?:@public )?@deprecated(?![\w-])/.test(before);
  };
  assert.equal(deprecated('export type SchedulingEntryState ='), true, 'calibration: U2 deprecated this one');
  assert.equal(deprecated('export type SchedulingBand ='), false, 'calibration: a live type is not');
  assert.equal(deprecated('export type SchedulingTimelineOverlayKind ='), true);
  const block = (name) => { const from = report.indexOf(`export interface ${name} {`); assert.notEqual(from, -1, name); return report.slice(from, report.indexOf('\n}', from)); };
  assert.equal(deprecated('state?: SchedulingEntryState;', block('SchedulingTimelineItem')), true);
  assert.equal(deprecated('kind?: SchedulingTimelineOverlayKind;', block('SchedulingTimelineOverlay')), true);
  assert.equal(deprecated('states: Record<SchedulingEntryState, string>;', block('SchedulingTimelineLabels')), true, 'the default label "Blackout violation" lives here');
  assert.equal(deprecated('overlays: Record<SchedulingTimelineOverlayKind, string>;', block('SchedulingTimelineLabels')), true, 'the default label "Change freeze" lives here');
  // The generic replacements are there and are not deprecated.
  for (const member of ['band?: SchedulingBand;', 'status?: SchedulingStatus;', 'markers?: SchedulingMarker[];']) assert.equal(deprecated(member, block('SchedulingTimelineItem')), false, member);
  for (const member of ['pattern?: SchedulingOverlayPattern;', 'kindLabel?: string;', 'laneIds?: string[];']) assert.equal(deprecated(member, block('SchedulingTimelineOverlay')), false, member);
});

/* U5 AC14 (FG-REC-14): lanes are packed in one place, U1's packLanes. The timeline model may
 * call it and may not carry a second packing loop: no loop, row search or row bookkeeping in
 * layoutLane, and exactly one packLanes call in the file. */
const functionBody = (code, name) => {
  const start = code.indexOf(`export function ${name}`);
  if (start === -1) return null;
  const next = code.indexOf('\nexport ', start + 1);
  return code.slice(start, next === -1 ? code.length : next);
};
const packerFindings = (code) => {
  const source = stripComments(code).replace(/\r\n/g, '\n');
  const found = [];
  const calls = [...source.matchAll(/\bpackLanes\(/g)].length;
  if (calls !== 1) found.push(`${calls} packLanes calls`);
  for (const [name] of source.matchAll(/\b(?:rowEnds?|laneEnds?|occupied|freeRow|firstFit)\w*/g)) found.push(name);
  const body = functionBody(source, 'layoutLane');
  if (body === null) found.push('layoutLane not found');
  else for (const [loop] of body.matchAll(/\bfor\s*\(|\bwhile\s*\(|\bdo\s*\{|\.findIndex\(|\.forEach\(|\.reduce\(/g)) found.push(`layoutLane: ${loop}`);
  return found;
};

test('AC14: the one-packer scan finds the 2.32 packing loop (calibration)', () => {
  const old = `
import { something } from './calendar-model.js';
export function layoutLane(items, range) {
  const sorted = [...items].sort((a, b) => toMs(a.start) - toMs(b.start) || toMs(a.end) - toMs(b.end));
  const rowEnds = [];
  const placed = [];
  for (const item of sorted) {
    const pos = placeSpan(item, range);
    if (!pos) continue;
    const s = toMs(item.start);
    let row = rowEnds.findIndex((end) => end <= s);
    if (row === -1) { row = rowEnds.length; rowEnds.push(0); }
    rowEnds[row] = Math.max(toMs(item.end), s);
    placed.push({ item, ...pos, row, conflict: false });
  }
  return placed;
}
export const snapToStep = (ms, step) => Math.round(ms / step) * step;`;
  const found = packerFindings(old);
  assert.ok(found.includes('0 packLanes calls'));
  assert.ok(found.includes('rowEnds'));
  assert.ok(found.some((entry) => entry.startsWith('layoutLane: for')));
  assert.ok(found.includes('layoutLane: .findIndex('));
  assert.deepEqual(packerFindings(`export function layoutLane(items) { const packed = packLanes(items.map((item) => item), Infinity, { order: 'given' }); return items.map((item) => packed.lanes[item.id]); }\nexport const x = 1; // for (const a of b) packLanes(`), []);
  assert.deepEqual(packerFindings(`export function layoutLane(items) { return packLanes(items, Infinity); }\nexport function other(items) { return packLanes(items, 2); }`), ['2 packLanes calls']);
});

test('AC14 (FG-REC-14): scheduling-timeline-model.ts packs lanes only through packLanes', () => {
  const source = readFileSync(join(here, 'scheduling-timeline-model.ts'), 'utf8');
  assert.deepEqual(packerFindings(source), []);
  assert.match(stripComments(source), /import \{[^}]*\bpackLanes\b[^}]*\} from '\.\/calendar-model\.js'/, 'the packer is the one from calendar-model.ts');
  assert.match(functionBody(stripComments(source).replace(/\r\n/g, '\n'), 'layoutLane'), /packLanes\([\s\S]*Infinity/, 'uncapped: the timeline shows every bar');
});

/* U5: zone math only through calendar-model.ts. The timeline's new geometry has no fixed day
 * length and no local-clock Date call. One 2.32 line stays: the exported `DAY` constant that
 * the move step of the week and month axes is built from (E13: an export is never removed). */
const KEPT_DAY_CONSTANT = 'export const DAY = 24 * HOUR;';

test('U5: the timeline fixed-day scan finds a known-bad snippet, and the kept line is there exactly once (calibration)', () => {
  const model = readFileSync(join(here, 'scheduling-timeline-model.ts'), 'utf8');
  assert.equal(model.split(KEPT_DAY_CONSTANT).length - 1, 1, 'the 2.32 DAY export is there once');
  assert.deepEqual(fixedDayFindings(`${KEPT_DAY_CONSTANT}\nconst rows = hours / 24;`.replace(KEPT_DAY_CONSTANT, '')), ['24']);
});

for (const file of TIMELINE_SOURCES) {
  test(`U5: ${file} has no fixed day length and no local-clock Date call in its geometry`, () => {
    assert.deepEqual(fixedDayFindings(readFileSync(join(here, file), 'utf8').replace(KEPT_DAY_CONSTANT, '')), []);
  });
}
