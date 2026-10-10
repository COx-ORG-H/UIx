/* Colour rules of the scheduling calendar (HAR-1506 U2 AC10 / R19 AC2), checked on the source
 * stylesheet:
 *   - every colour goes through the map block at the top (one rule of `--calendar-*` names);
 *     no other rule names a `--uix-*` colour or writes a colour literal;
 *   - a hue is mapped to one dimension only, and that dimension is the band;
 *   - a window never reads a band colour or a status hue;
 *   - only `data-band="high"` is filled; `medium` is a non-fill cue; `low` and `none` have no rule.
 *   - on paper (HAR-1541) the map is written again inside `@media print`, from the print
 *     tokens only, and names every colour the screen map names: no theme colour reaches paper.
 * The checker is run against known-bad CSS first, so a check that matches nothing cannot pass.
 * Run: npm run test:tokens */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../styles/components/scheduling-calendar.css'), 'utf8');

const DIMENSIONS = ['band', 'status', 'window', 'marker', 'chrome'];
/** Status hues: the tokens a product reads as good / warning / bad / informational, and the brand. */
const HUE = /^--uix-(?:print-)?(danger|warning|success|info|accent|brand|link|ring)\b/;
/** `--uix-*` names that are not colours: spacing, radii, the type scale and the component's own runtime knobs. */
const NOT_A_COLOUR = /^--uix-(space-\d+|radius-[a-z]+|text-meta|scheduling-calendar-[a-z-]+)$/;
/** Which selectors may read a dimension's colours. */
const READERS = {
  band: /\[data-band=/,
  status: /__entry|__swatch|__legend|__status/,
  window: /__window|\[data-pattern/,
  marker: /__marker|__legend/,
  chrome: /./,
};

/** Flat list of `{ selector, body, at }` for every style rule, at any nesting depth; `at` is the at-rules around it. */
function rules(css) {
  const out = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const walk = (from, to, at = '') => {
    let cursor = from;
    while (cursor < to) {
      const open = text.indexOf('{', cursor);
      if (open === -1 || open >= to) return;
      let depth = 1;
      let close = open + 1;
      while (depth > 0 && close < to) { if (text[close] === '{') depth++; else if (text[close] === '}') depth--; close++; }
      const selector = text.slice(cursor, open).trim();
      if (selector.startsWith('@')) walk(open + 1, close - 1, `${at} ${selector}`.trim());
      else out.push({ selector, body: text.slice(open + 1, close - 1), at });
      cursor = close;
    }
  };
  walk(0, text.length);
  return out;
}
const declarations = (body) => body.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
  const colon = part.indexOf(':');
  return { prop: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() };
});

/** The members of a selector list: split on commas outside parentheses, so `:is(a,b)[x]` stays whole. */
function selectorList(selector) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of selector) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; } else current += char;
  }
  return [...parts, current.trim()];
}

function findings(css) {
  const found = [];
  const all = rules(css);
  const map = all[0];
  const mapped = new Map(); // --calendar-x -> { dimension, token }
  for (const { prop, value } of declarations(map.body)) {
    if (!prop.startsWith('--calendar-')) continue;
    const token = value.match(/^var\((--uix-[a-z0-9-]+)\)$/)?.[1];
    if (!token || NOT_A_COLOUR.test(token)) continue; // geometry
    const dimension = prop.slice('--calendar-'.length).split('-')[0];
    if (!DIMENSIONS.includes(dimension)) found.push(`${prop}: not one of the dimensions ${DIMENSIONS.join(', ')}`);
    mapped.set(prop, { dimension, token });
  }
  // A hue serves one dimension, and that dimension is the band.
  const hueDimensions = new Map();
  for (const [name, { dimension, token }] of mapped) {
    if (!HUE.test(token)) continue;
    if (dimension !== 'band') found.push(`${name}: ${token} is a hue on the ${dimension} dimension (only the band takes a hue)`);
    const hue = token.match(HUE)[1];
    hueDimensions.set(hue, new Set([...(hueDimensions.get(hue) ?? []), dimension]));
  }
  for (const [hue, dimensions] of hueDimensions) if (dimensions.size > 1) found.push(`hue ${hue} is mapped to ${[...dimensions].join(' and ')}`);

  // On paper the map is written a second time, from the print tokens alone.
  const isPrintMap = (rule) => /@media print\b/.test(rule.at) && rule.selector === map.selector;
  for (const rule of all.slice(1).filter(isPrintMap)) {
    const named = new Set();
    for (const { prop, value } of declarations(rule.body)) {
      const token = value.match(/^var\((--uix-[a-z0-9-]+)\)$/)?.[1];
      if (!prop.startsWith('--calendar-') || !token) { found.push(`print map: ${prop} is not a colour name of the map`); continue; }
      if (!/^--uix-print-/.test(token)) found.push(`print map: ${prop} reads ${token}, which is not a print token`);
      const screen = mapped.get(prop);
      if (!screen) { found.push(`print map: ${prop} is not in the screen map`); continue; }
      if (HUE.test(token) && screen.dimension !== 'band') found.push(`print map: ${prop}: ${token} is a hue on the ${screen.dimension} dimension`);
      named.add(prop);
    }
    for (const name of mapped.keys()) if (!named.has(name)) found.push(`print map: ${name} keeps its screen colour on paper`);
  }
  for (const { selector, body } of all.slice(1).filter((rule) => !isPrintMap(rule))) {
    for (const [, token] of body.matchAll(/var\((--uix-[a-z0-9-]+)/g)) {
      if (!NOT_A_COLOUR.test(token)) found.push(`${selector}: reads ${token} directly, not through the map`);
    }
    if (/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/i.test(body)) found.push(`${selector}: a colour literal`);
    for (const [, name] of body.matchAll(/var\((--calendar-[a-z0-9-]+)/g)) {
      const entry = mapped.get(name);
      if (!entry) continue; // geometry
      if (!READERS[entry.dimension].test(selector)) found.push(`${selector}: reads ${name}, a ${entry.dimension} colour`);
      if (entry.dimension === 'band' && /__window|\[data-pattern/.test(selector)) found.push(`${selector}: a window reads the band colour ${name}`);
      // A band rule may also be a status or an emphasis rule (`[data-band="high"][data-dim]`); alone it reads band colours only.
      if (entry.dimension !== 'band' && /\[data-band=/.test(selector) && !/\[data-(status|dim|highlight)/.test(selector)) found.push(`${selector}: a band rule reads ${name}, a ${entry.dimension} colour`);
    }
    if (/\[data-band=/.test(selector)) {
      const fills = declarations(body).filter(({ prop }) => prop === 'background' || prop === 'background-color' || prop === 'background-image');
      if (fills.length > 0 && !selectorList(selector).every((part) => /\[data-band="high"\]/.test(part))) found.push(`${selector}: a fill on a band other than high`);
      if (/\[data-band="(?:low|none)"\]/.test(selector)) found.push(`${selector}: low and none are untinted and take no rule`);
    }
  }
  return found;
}

test('the checker finds each kind of violation in known-bad CSS (calibration)', () => {
  const bad = `
    .uix-scheduling-calendar { --calendar-band-high-fill: var(--uix-danger); --calendar-window-edge: var(--uix-danger-border); --calendar-status-live: var(--uix-success); --calendar-chrome-line: var(--uix-border); --calendar-pad: var(--uix-space-1); }
    .uix-scheduling-calendar__window { background: var(--calendar-band-high-fill); border-color: var(--uix-warning); color: #fff; }
    .uix-scheduling-calendar__entry[data-band="medium"] { background: var(--calendar-band-high-fill); }
    .uix-scheduling-calendar__entry[data-band="low"] { border-style: solid; }
    .uix-scheduling-calendar__entry[data-status="live"] { color: var(--calendar-status-live); }
    @media (min-width: 40rem) { .uix-scheduling-calendar__day { border-color: var(--calendar-window-edge); } }
  `;
  const found = findings(bad).join('\n');
  for (const expected of [
    /--calendar-window-edge: --uix-danger-border is a hue on the window dimension/,
    /--calendar-status-live: --uix-success is a hue on the status dimension/,
    /hue danger is mapped to band and window/,
    /__window: reads --uix-warning directly/,
    /__window: a colour literal/,
    /__window: a window reads the band colour --calendar-band-high-fill/,
    /\[data-band="medium"\]: a fill on a band other than high/,
    /\[data-band="low"\]: low and none are untinted/,
    /__day: reads --calendar-window-edge, a window colour/,
  ]) assert.match(found, expected);
  assert.deepEqual(findings(`.uix-scheduling-calendar { --calendar-band-high-fill: var(--uix-danger); } .uix-scheduling-calendar__entry[data-band="high"] { background: var(--calendar-band-high-fill); padding: var(--uix-space-1); }`), []);
});

test('R19 AC2: every calendar colour goes through the map, hue belongs to the band alone, and windows are neutral', () => {
  assert.deepEqual(findings(source), []);
});

test('HAR-1541: on paper the map is written again from the print tokens, for every colour of the screen map', () => {
  const printMaps = rules(source).filter((rule) => /@media print\b/.test(rule.at) && rule.selector === '.uix-scheduling-calendar');
  assert.equal(printMaps.length, 1, 'one print map');
  // Calibration: a print map that reads a theme colour, leaves one out, or puts the hue on a window is found.
  const screen = '.uix-scheduling-calendar { --calendar-chrome-text: var(--uix-text); --calendar-window-edge: var(--uix-neutral-border); --calendar-band-high-fill: var(--uix-danger); }';
  const bad = findings(`${screen} @media print { .uix-scheduling-calendar { --calendar-chrome-text: var(--uix-text); --calendar-window-edge: var(--uix-print-danger); } }`);
  assert.ok(bad.some((line) => /--calendar-chrome-text reads --uix-text, which is not a print token/.test(line)), bad.join('\n'));
  assert.ok(bad.some((line) => /--calendar-window-edge: --uix-print-danger is a hue on the window dimension/.test(line)), bad.join('\n'));
  assert.ok(bad.some((line) => /--calendar-band-high-fill keeps its screen colour on paper/.test(line)), bad.join('\n'));
  assert.deepEqual(findings(`${screen} @media print { .uix-scheduling-calendar { --calendar-chrome-text: var(--uix-print-ink); --calendar-window-edge: var(--uix-print-ink-quiet); --calendar-band-high-fill: var(--uix-print-danger); } }`), []);
});

test('HAR-1541: on paper nothing is told by a fill or a pattern alone, and nothing scrolls', () => {
  const print = rules(source).filter((rule) => /@media print\b/.test(rule.at));
  const rule = (pattern) => print.filter(({ selector }) => pattern.test(selector));
  const high = rule(/\[data-band="high"\]$/)[0];
  assert.ok(high, 'a print rule for the high band');
  // The high band is the heaviest edge. Its surface is a name of the map, the paper's on paper,
  // so the item covers what is behind it and the print rule writes no fill of its own.
  assert.match(high.body, /border-width:3px/);
  assert.match(high.body, /border-color:var\(--calendar-band-high-fill\)/);
  assert.doesNotMatch(high.body, /background/, 'the print rule for the high band writes no fill');
  const printMap = Object.fromEntries(declarations(print.find(({ selector }) => selector === '.uix-scheduling-calendar').body).map(({ prop, value }) => [prop, value]));
  assert.equal(printMap['--calendar-band-high-surface'], 'var(--uix-print-paper)', 'the high band is not a fill on paper');
  assert.equal(printMap['--calendar-band-high-fill'], 'var(--uix-print-danger)');
  const screenHigh = rules(source).find(({ at, selector }) => !/@media print\b/.test(at ?? '') && /\[data-band="high"\]$/.test(selector));
  assert.match(screenHigh.body, /background:var\(--calendar-band-high-surface\)/, 'the fill of the high band is read through the name the print map rewrites');
  // Each window pattern has an edge style of its own; `solid` keeps the plain edge.
  const edges = ['diagonal', 'cross', 'dotted'].map((pattern) => rule(new RegExp(`\\[data-pattern="${pattern}"\\]`))[0]?.body.match(/border-style:([a-z]+)/)?.[1]);
  assert.deepEqual(edges, ['dashed', 'double', 'dotted']);
  for (const scroller of ['__grid', '__timegrid', '__agenda--virtual']) {
    assert.ok(print.some(({ selector, body }) => selectorList(selector).some((part) => part.endsWith(scroller)) && /overflow:visible/.test(body)), `${scroller} does not scroll on paper`);
  }
  // No print rule but the map names a token colour, and none writes a literal (the general check covers both).
  assert.deepEqual(findings(source), []);
});

test('the map block is the first rule and names every dimension', () => {
  const [map] = rules(source);
  assert.equal(map.selector, '.uix-scheduling-calendar');
  const names = declarations(map.body).map(({ prop }) => prop).filter((prop) => prop.startsWith('--calendar-'));
  for (const dimension of DIMENSIONS) assert.ok(names.some((name) => name.startsWith(`--calendar-${dimension}-`)), `no --calendar-${dimension}-* name`);
});

test('U3 AC19: no window, segment, ghost or now-line rule of the time grid reads a band colour', () => {
  const mapped = new Map(declarations(rules(source)[0].body).filter(({ prop }) => prop.startsWith('--calendar-band-')).map(({ prop }) => [prop, true]));
  assert.ok(mapped.size >= 2, 'the map names band colours');
  const timeGrid = rules(source).filter(({ selector }) => /__tg-|__window|\[data-part=|\[data-pattern/.test(selector));
  assert.ok(timeGrid.length >= 20, `only ${timeGrid.length} time-grid rules found`);
  for (const name of ['tg-ghost', 'tg-now', 'tg-shade', 'tg-item', 'tg-span', 'tg-column', 'tg-hour']) assert.ok(timeGrid.some(({ selector }) => selector.includes(`__${name}`)), `no rule for ${name}`);
  const offenders = timeGrid.filter(({ body }) => [...body.matchAll(/var\((--calendar-band-[a-z0-9-]+)/g)].length > 0).map(({ selector }) => selector);
  assert.deepEqual(offenders, []);
  // The now-line and the ghost are neutral: their names map to no hue.
  const chrome = Object.fromEntries(declarations(rules(source)[0].body).map(({ prop, value }) => [prop, value]));
  for (const name of ['--calendar-chrome-now', '--calendar-chrome-ghost', '--calendar-chrome-ghost-surface']) assert.doesNotMatch(chrome[name], /--uix-(danger|warning|success|info|accent|brand|link|ring)/, name);
});

test('U6 AC6: emphasis changes weight and quietness, never a hue', () => {
  const emphasis = rules(source).filter(({ selector }) => /\[data-(highlight|dim)\]/.test(selector));
  assert.ok(emphasis.length >= 8, `only ${emphasis.length} emphasis rules found`);
  const map = Object.fromEntries(declarations(rules(source)[0].body).map(({ prop, value }) => [prop, value]));
  for (const { selector, body } of emphasis) {
    for (const [, name] of body.matchAll(/var\((--calendar-[a-z0-9-]+)/g)) {
      const hue = /--uix-(danger|warning|success|info|accent|brand|link|ring)/.test(map[name] ?? '');
      // The only hue an emphasis rule may read is the band's own, on an item that already has that band.
      if (hue) assert.match(selector, /\[data-band="high"\]/, `${selector} reads ${name}`);
    }
  }
  // A dimmed item on the filled band gives the fill up: it is never a second, paler fill colour.
  const dimHigh = emphasis.find(({ selector }) => /\[data-band="high"\]\[data-dim\]/.test(selector));
  assert.ok(dimHigh, 'a rule for a dimmed high-band item');
  assert.match(dimHigh.body, /background:var\(--calendar-chrome-surface\)/);
});

test('only data-band="high" takes a fill; medium is a non-fill cue', () => {
  const band = rules(source).filter(({ selector }) => /\[data-band=/.test(selector));
  const fill = band.filter(({ body }) => declarations(body).some(({ prop }) => prop === 'background' || prop === 'background-color'));
  assert.ok(fill.length >= 1, 'high is filled');
  for (const { selector } of fill) assert.match(selector, /\[data-band="high"\]/);
  const medium = band.filter(({ selector }) => /\[data-band="medium"\]/.test(selector));
  assert.ok(medium.length >= 1, 'medium has a cue');
  for (const { body } of medium) assert.deepEqual(declarations(body).map(({ prop }) => prop).filter((prop) => !prop.startsWith('border')), [], 'the medium cue is a border style only');
});
