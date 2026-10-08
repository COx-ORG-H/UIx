/* Colour rules of the scheduling timeline (HAR-1521 U5 AC10 / R19 AC2, FG-REC-7), checked on the
 * source stylesheet, EVERY rule of it:
 *   - every colour goes through the map block at the top (one rule of `--timeline-*` names);
 *     no other rule names a `--uix-*` colour or writes a colour literal;
 *   - a hue is mapped to one dimension only, and that dimension is the band;
 *   - only `data-band="high"` is filled; `medium` is a non-fill cue; `low` and `none` have no rule;
 *   - no rule tints by the deprecated `data-state` or `data-kind` (no state tint, no window hue);
 *   - the now-line and its label are neutral (2.33 painted them with the danger hue).
 * The checker is run against known-bad CSS first (the 2.33 rules among it), so a check that
 * matches nothing cannot pass. Same checker as scheduling-calendar-colours.test.mjs.
 * Run: npm run test:tokens */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../styles/components/scheduling-timeline.css'), 'utf8');

const DIMENSIONS = ['band', 'status', 'window', 'marker', 'chrome'];
/** Status hues: the tokens a product reads as good / warning / bad / informational, and the brand. */
const HUE = /^--uix-(danger|warning|success|info|accent|brand|link|ring)\b/;
/** `--uix-*` names that are not colours: spacing, radii, type, stacking, elevation and the component's own runtime knobs. */
const NOT_A_COLOUR = /^--uix-(space-\d+|radius-[a-z]+|text-meta|text-eyebrow|tracking-eyebrow|z-[a-z]+|shadow-[a-z]+|timeline-[a-z-]+)$/;
/** Which selectors may read a dimension's colours. */
const READERS = {
  band: /\[data-band=/,
  status: /__item|__ghost/,
  window: /__overlay|\[data-pattern/,
  marker: /__marker|__item-marker/,
  chrome: /./,
};

/** Flat list of `{ selector, body }` for every style rule, at any nesting depth. */
function rules(css) {
  const out = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const walk = (from, to) => {
    let cursor = from;
    while (cursor < to) {
      const open = text.indexOf('{', cursor);
      if (open === -1 || open >= to) return;
      let depth = 1;
      let close = open + 1;
      while (depth > 0 && close < to) { if (text[close] === '{') depth++; else if (text[close] === '}') depth--; close++; }
      const selector = text.slice(cursor, open).trim();
      if (selector.startsWith('@')) walk(open + 1, close - 1);
      else out.push({ selector, body: text.slice(open + 1, close - 1) });
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
  const mapped = new Map(); // --timeline-x -> { dimension, token }
  for (const { prop, value } of declarations(map.body)) {
    if (!prop.startsWith('--timeline-')) continue;
    const token = value.match(/^var\((--uix-[a-z0-9-]+)\)$/)?.[1];
    if (!token || NOT_A_COLOUR.test(token)) continue; // geometry
    const dimension = prop.slice('--timeline-'.length).split('-')[0];
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

  for (const { selector, body } of all.slice(1)) {
    for (const [, token] of body.matchAll(/var\((--uix-[a-z0-9-]+)/g)) {
      if (!NOT_A_COLOUR.test(token)) found.push(`${selector}: reads ${token} directly, not through the map`);
    }
    if (/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\(/i.test(body)) found.push(`${selector}: a colour literal`);
    for (const [, name] of body.matchAll(/var\((--timeline-[a-z0-9-]+)/g)) {
      const entry = mapped.get(name);
      if (!entry) continue; // geometry
      if (!READERS[entry.dimension].test(selector)) found.push(`${selector}: reads ${name}, a ${entry.dimension} colour`);
      if (entry.dimension === 'band' && /__overlay|\[data-pattern/.test(selector)) found.push(`${selector}: a window reads the band colour ${name}`);
      if (entry.dimension === 'band' && /__now|__marker|__ghost|__tick|__gridline/.test(selector)) found.push(`${selector}: reads the band colour ${name}`);
      if (entry.dimension !== 'band' && /\[data-band=/.test(selector) && !/\[data-status=/.test(selector)) found.push(`${selector}: a band rule reads ${name}, a ${entry.dimension} colour`);
    }
    if (/\[data-band=/.test(selector)) {
      const fills = declarations(body).filter(({ prop }) => prop === 'background' || prop === 'background-color' || prop === 'background-image');
      if (fills.length > 0 && !selectorList(selector).every((part) => /\[data-band="high"\]/.test(part))) found.push(`${selector}: a fill on a band other than high`);
      if (/\[data-band="(?:low|none)"\]/.test(selector)) found.push(`${selector}: low and none are untinted and take no rule`);
    }
    // The deprecated channels take no paint at all: a rule on them could only be a state tint or a window hue.
    if (/\[data-state[=\]]/.test(selector)) found.push(`${selector}: a rule on the deprecated data-state (no state tint)`);
    if (/\[data-kind[=\]]/.test(selector)) found.push(`${selector}: a rule on the deprecated data-kind (a window is told apart by pattern and label)`);
  }
  return found;
}

test('the checker finds each kind of violation in known-bad CSS, the 2.33 rules included (calibration)', () => {
  const bad = `
    .uix-scheduling-timeline { --timeline-band-high-fill: var(--uix-danger); --timeline-window-edge: var(--uix-danger-border); --timeline-status-live: var(--uix-success); --timeline-chrome-now: var(--uix-danger); --timeline-chrome-line: var(--uix-border); --timeline-pad: var(--uix-space-1); }
    .uix-scheduling-timeline__overlay { background: var(--timeline-band-high-fill); border-color: var(--uix-warning); color: #fff; }
    .uix-scheduling-timeline__item[data-band="medium"] { background: var(--timeline-band-high-fill); }
    .uix-scheduling-timeline__item[data-band="low"] { border-style: solid; }
    .uix-scheduling-timeline__now { background: var(--uix-danger); }
    .uix-scheduling-timeline__now-label { background: var(--timeline-band-high-fill); color: var(--uix-danger-fg); }
    .uix-scheduling-timeline__marker { border-left: 2px dashed var(--uix-warning); }
    .uix-scheduling-timeline__overlay[data-kind="freeze"], .uix-scheduling-timeline__overlay[data-kind="blackout"] { background: var(--uix-danger-bg); }
    .uix-scheduling-timeline__item[data-state="in-progress"] { border-color: var(--uix-success); }
    .uix-scheduling-timeline__item[data-conflict] { background-image: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, currentColor 20%, transparent) 6px 9px); }
    @media (min-width: 40rem) { .uix-scheduling-timeline__row { border-color: var(--timeline-window-edge); } }
  `;
  const found = findings(bad).join('\n');
  for (const expected of [
    /--timeline-window-edge: --uix-danger-border is a hue on the window dimension/,
    /--timeline-status-live: --uix-success is a hue on the status dimension/,
    /--timeline-chrome-now: --uix-danger is a hue on the chrome dimension/,
    /hue danger is mapped to band and window and chrome/,
    /__overlay: reads --uix-warning directly/,
    /__overlay: a colour literal/,
    /__overlay: a window reads the band colour --timeline-band-high-fill/,
    /\[data-band="medium"\]: a fill on a band other than high/,
    /\[data-band="low"\]: low and none are untinted/,
    /__now: reads --uix-danger directly/,
    /__now-label: reads --uix-danger-fg directly/,
    /__now-label: reads the band colour --timeline-band-high-fill/,
    /__marker: reads --uix-warning directly/,
    /\[data-kind="blackout"\]: reads --uix-danger-bg directly/,
    /\[data-kind="blackout"\]: a rule on the deprecated data-kind/,
    /\[data-state="in-progress"\]: a rule on the deprecated data-state/,
    /\[data-conflict\]: a colour literal/,
    /__row: reads --timeline-window-edge, a window colour/,
  ]) assert.match(found, expected);
  assert.deepEqual(findings(`.uix-scheduling-timeline { --timeline-band-high-fill: var(--uix-danger); --timeline-chrome-now: var(--uix-text); } .uix-scheduling-timeline__item[data-band="high"] { background: var(--timeline-band-high-fill); padding: var(--uix-space-1); z-index: var(--uix-z-raised); } .uix-scheduling-timeline__now { background: var(--timeline-chrome-now); }`), []);
});

test('AC10 (R19 AC2): every rule of scheduling-timeline.css paints through the map; hue belongs to the band alone', () => {
  assert.deepEqual(findings(source), []);
});

test('AC10: the check reads every rule of the file, the now-line and its label among them', () => {
  const all = rules(source);
  // Every class the stylesheet styles is in a rule the checker walked: nothing sits where the walker cannot see it.
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const written = new Set([...stripped.matchAll(/\.(uix-scheduling-timeline[\w-]*)/g)].map((m) => m[1]));
  const walked = new Set(all.flatMap(({ selector }) => [...selector.matchAll(/\.(uix-scheduling-timeline[\w-]*)/g)].map((m) => m[1])));
  assert.deepEqual([...written].filter((name) => !walked.has(name)), []);
  assert.ok(all.length >= 60, `only ${all.length} rules found`);
  assert.equal(all.filter(({ body }) => body.includes('{')).length, 0, 'no rule body still holds a nested block');
  const braces = (stripped.match(/\{/g) ?? []).length;
  const atRules = (stripped.match(/@[a-z-]+[^{;]*\{/g) ?? []).length;
  assert.equal(all.length, braces - atRules, 'one walked rule per block that is not an at-rule');

  const now = all.filter(({ selector }) => /__now(?![\w-])/.test(selector));
  const nowLabel = all.filter(({ selector }) => /__now-label/.test(selector));
  assert.ok(now.length >= 1, 'a rule for the now-line');
  assert.ok(nowLabel.length >= 1, 'a rule for its label');
  const map = Object.fromEntries(declarations(all[0].body).map(({ prop, value }) => [prop, value]));
  for (const { selector, body } of [...now, ...nowLabel]) {
    const names = [...body.matchAll(/var\((--timeline-[a-z0-9-]+)/g)].map((m) => m[1]).filter((name) => /var\(--uix-/.test(map[name] ?? '') && !NOT_A_COLOUR.test(map[name].match(/--uix-[a-z0-9-]+/)[0]));
    assert.ok(names.length >= 1, `${selector} paints with a mapped colour`);
    for (const name of names) {
      assert.match(name, /^--timeline-chrome-now/, `${selector} reads ${name}`);
      assert.doesNotMatch(map[name], /--uix-(danger|warning|success|info|accent|brand|link|ring)/, `${name} is neutral`);
    }
  }
});

test('the map block is the first rule and names every dimension; only band names map to a hue', () => {
  const [map] = rules(source);
  assert.equal(map.selector, '.uix-scheduling-timeline');
  const entries = declarations(map.body).filter(({ prop }) => prop.startsWith('--timeline-'));
  for (const dimension of DIMENSIONS) assert.ok(entries.some(({ prop }) => prop.startsWith(`--timeline-${dimension}-`)), `no --timeline-${dimension}-* name`);
  const hued = entries.filter(({ value }) => HUE.test(value.match(/--uix-[a-z0-9-]+/)?.[0] ?? '')).map(({ prop }) => prop);
  assert.ok(hued.length >= 1, 'the high band has a hue');
  for (const name of hued) assert.match(name, /^--timeline-band-high-/);
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

test('windows are neutral and patterned: every window rule reads only window or chrome names', () => {
  const [map, ...rest] = rules(source);
  const dimensionOf = (name) => declarations(map.body).some(({ prop }) => prop === name) ? name.slice('--timeline-'.length).split('-')[0] : null;
  const windows = rest.filter(({ selector }) => /__overlay|\[data-pattern/.test(selector));
  assert.ok(windows.length >= 5, `only ${windows.length} window rules`);
  for (const pattern of ['diagonal', 'cross', 'dotted']) assert.ok(windows.some(({ selector }) => selector.includes(`[data-pattern="${pattern}"]`)), `no rule for the ${pattern} pattern`);
  for (const { selector, body } of windows) {
    for (const [, name] of body.matchAll(/var\((--timeline-(?:band|status|window|marker|chrome)-[a-z0-9-]+)/g)) {
      assert.match(dimensionOf(name) ?? '', /^(window|chrome)$/, `${selector} reads ${name}`);
    }
  }
});
