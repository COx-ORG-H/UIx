/* Motion gate (motion rollout WP1, HAR-2578). Runs in `npm run test:contract`.
 *
 * The motion contract (docs → Foundations → Motion; TENSOR plan 2026-10-22 §2.4) as checks,
 * so a stylesheet cannot ship motion that breaks it (Law 1). Each rule fails the build:
 *
 *   1. raw-time        a literal duration or delay (`.6s`, `200ms`) outside the token source.
 *                      Use --uix-dur-* / --uix-dur-exit-* / --uix-delay-* / --uix-loop-*. `0s` is allowed.
 *   2. transition-all  `transition: all` / `transition-property: all`.
 *   3. ease-in         an accelerating curve (`ease-in`, `var(--uix-ease-in)`) in a transition or
 *                      animation. Exits use --uix-ease-out at an exit duration; ease-in-out is fine.
 *   4. layout          a layout property (width, height, inset/top/left…, margin, padding,
 *                      grid-template-*, box-shadow) in a transition list or a @keyframes block.
 *                      Animate transform/opacity instead.
 *   5. loop-no-reduced an infinite animation whose selector has no rule inside
 *                      `@media (prefers-reduced-motion: reduce)` in the same file.
 *   6. moving-no-reduced an animation whose @keyframes move (transform/translate/scale/rotate)
 *                      with no reduced-motion rule for its selector in the same file.
 *   7. hover-ungated   a `:hover` rule that moves (transform/translate/scale/rotate) or reveals
 *                      (opacity/visibility/display) outside `@media (hover: hover) and (pointer: fine)`.
 *                      Split the selector: keep :focus-visible/:focus-within outside, :hover inside.
 *   8. loop-not-loading an infinite animation on anything but an indeterminate loading indicator
 *                      (Rules for apps: no pulsing, looping or marching on data or status). The
 *                      loaders are LOOP_ALLOW below, by file and selector; motion-allow does not
 *                      exempt this rule. A new loader is a new LOOP_ALLOW line, reviewed as such.
 *   9. filter-motion   `filter` / `backdrop-filter` in a transition list or a @keyframes block (Linux
 *                      WebKit's renderer crashes on it). A blur that clears runs per frame in script
 *                      (motion.ts blurIn).
 *  10. overshoot-effect an overshooting curve (OVERSHOOT_TOKENS below — the springs and curves that
 *                      pass 1 — or a literal cubic-bezier()/linear() that leaves 0..1) on anything but
 *                      geometry: transform, translate, scale, rotate, clip-path. Opacity and colour
 *                      (color, background-color, border-color, fill, stroke…) clamp at their range, so
 *                      an overshoot there sticks or flickers (Material 3 Expressive: spatial springs may
 *                      bounce, effects springs never do). Split the transition: the geometry keeps the
 *                      spring, the fade or colour takes --uix-ease-out / --uix-ease-glide. Judged on
 *                      each rule's own lists (declarations folded in order, !important kept); an
 *                      overshooting timing longhand must name its properties or animation in the
 *                      same rule, and is also paired with every longhand list another rule in the
 *                      file sets for the same element (any state, media query or specificity: the
 *                      gate does not replay the cascade, so it checks every list that could meet
 *                      the curve). Animations by the properties their @keyframes set, custom-property
 *                      aliases across every scanned file, and in the React source inline transition
 *                      and animation strings and tokenEase() of such a token (script-driven easing
 *                      runs effects: blurIn's radius).
 *
 * Escape hatch: a comment `motion-allow: <reason>` directly before a declaration exempts that
 * declaration; the reason is printed on every run so it stays visible. Use it rarely.
 *
 * TS/TSX: a style string or object in packages/react/src that sets a transition/animation with a
 * literal time fails rule 1 as well (motion belongs in the stylesheets, on tokens).
 *
 * Run: npm run test:contract     Library: import { checkCss } from './check-motion.mjs'
 */
import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TIME = /(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g;
const EASE_IN = /\bease-in\b(?!-out)/;
const MOVE_PROPS = new Set(['transform', 'translate', 'scale', 'rotate']);
const REVEAL_PROPS = new Set(['opacity', 'visibility', 'display']);
const LAYOUT = new Set([
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'inline-size', 'block-size',
  'min-inline-size', 'max-inline-size', 'min-block-size', 'max-block-size',
  'top', 'right', 'bottom', 'left', 'inset', 'inset-inline', 'inset-block',
  'inset-inline-start', 'inset-inline-end', 'inset-block-start', 'inset-block-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block',
  'margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block',
  'padding-inline-start', 'padding-inline-end', 'padding-block-start', 'padding-block-end',
  'grid-template', 'grid-template-columns', 'grid-template-rows', 'box-shadow',
]);

/**
 * The only things that may loop forever: indeterminate loading indicators (and the editor's text
 * caret). Each entry is a stylesheet and the selector of its looping state; every selector of a
 * looping rule must match one entry of its own file. Keep it short.
 */
export const LOOP_ALLOW = [
  { file: 'spinner.css', selector: /\.uix-spinner\b/, what: 'Spinner', why: 'work of unknown length is under way' },
  { file: 'states.css', selector: /\.uix-skeleton\b/, what: 'Skeleton', why: 'a first load is under way' },
  { file: 'progress.css', selector: /\.uix-progress--indeterminate\b/, what: 'indeterminate Progress', why: 'a task with no measurable end is under way' },
  { file: 'busy-region.css', selector: /\.uix-busy-bar\[data-shown\]/, what: 'BusyRegion bar', why: 'a list is being fetched again' },
  { file: 'button.css', selector: /\.uix-btn(\[data-loading\]|:has\(> \[data-uix-btn-busy\]\))/, what: 'Button loading', why: 'the action the button started is running' },
  { file: 'save-status.css', selector: /\.uix-save-status\[data-state="saving"\]/, what: 'SaveStatus saving', why: 'a save is in flight' },
  { file: 'flow.css', selector: /\.uix-node--running\b/, what: 'a running Flow step', why: 'the step is executing now' },
  { file: 'rich-text.css', selector: /\.ProseMirror-gapcursor\b/, what: 'the text caret', why: 'it marks where typing goes, as every caret blinks' },
];

/** A literal curve that leaves 0..1 on its output axis: a cubic-bezier() whose y1 or y2 does, or a linear() with a point that does. */
export function curveOvershoots(curve) {
  const cb = /^cubic-bezier\(([^)]*)\)$/i.exec(curve.trim());
  if (cb) {
    const [, y1, , y2] = cb[1].split(',').map(Number);
    return [y1, y2].some((y) => y < 0 || y > 1);
  }
  const lin = /^linear\(([^)]*)\)$/i.exec(curve.trim());
  if (lin) return lin[1].split(',').map((stop) => Number(stop.trim().split(/\s+/)[0])).some((y) => y < 0 || y > 1);
  return false;
}

/**
 * Rule 10's token list, read from the token source so it cannot drift: every --uix-ease-* whose
 * curve passes 1 (today pop, tooltip, bounce, drawer and the legacy spring; glide stops at 1).
 */
export function overshootingTokens(effectJson) {
  return Object.entries(effectJson)
    .filter(([name, t]) => name.startsWith('ease-') && typeof t?.$value === 'string' && curveOvershoots(t.$value))
    .map(([name]) => `--uix-${name}`);
}
export const OVERSHOOT_TOKENS = overshootingTokens(
  JSON.parse(readFileSync(new URL('../tokens/base/effect.json', import.meta.url), 'utf8')),
);
/** What an overshooting curve may move: geometry (Material's spatial springs; clip-path is a shape). */
export const SPATIAL_PROPS = new Set(['transform', 'translate', 'scale', 'rotate', 'clip-path']);

const isToken = (name) => OVERSHOOT_TOKENS.includes(name);

/** The overshooting curve in a value (a var() that `isVar` says overshoots, or a literal), or null. */
function overshootIn(value, isVar = isToken) {
  for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) if (isVar(m[1])) return m[1];
  for (const m of value.matchAll(/(cubic-bezier|linear)\([^)]*\)/gi)) if (curveOvershoots(m[0])) return m[0];
  return null;
}

/**
 * Custom properties that hold an overshooting curve in any of `sources` (--x-ease: var(--uix-ease-pop),
 * and aliases of aliases). Across files, since a custom property inherits: one stylesheet can define
 * it and another use it. A name counts if any of its definitions overshoots (the gate cannot know
 * which one an element sees); a rule that redefines it itself is judged by its own value instead.
 */
export function collectOvershootAliases(sources) {
  const defs = [];
  for (const css of sources) postcss.parse(css).walkDecls(/^--/, (d) => { defs.push([d.prop, stripStrings(d.value)]); });
  const aliases = new Set();
  for (let grew = true; grew;) {
    grew = false;
    for (const [prop, value] of defs) {
      if (!aliases.has(prop) && overshootIn(value, (n) => isToken(n) || aliases.has(n))) { aliases.add(prop); grew = true; }
    }
  }
  return aliases;
}

/** What rule 10 needs to know about every scanned stylesheet at once. */
export function collectMotionContext(sources) {
  return { keyframeProps: collectKeyframeProps(sources), aliases: collectOvershootAliases(sources) };
}

/** A CSS-wide keyword that leaves a custom property at its inherited value. */
const INHERITS = /^(inherit|unset|revert|revert-layer)$/i;

/**
 * The overshooting curve in a value as `rule` sees it: its own custom properties first (the last
 * one wins, an !important one over a normal one), then the shared aliases. A local `inherit`,
 * `unset` or `revert` keeps the inherited value, so the shared aliases decide for it.
 */
function curveCheck(rule, aliases) {
  const local = new Map();
  const important = new Set();
  rule.each((n) => {
    if (n.type !== 'decl' || !n.prop.startsWith('--') || (important.has(n.prop) && !n.important)) return;
    if (n.important) important.add(n.prop);
    const value = stripStrings(n.value).trim();
    if (INHERITS.test(value)) local.delete(n.prop); else local.set(n.prop, value);
  });
  const seen = new Set();
  const isVar = (name) => {
    if (isToken(name)) return true;
    if (!local.has(name)) return aliases.has(name);
    if (seen.has(name)) return false;
    seen.add(name);
    const hit = Boolean(overshootIn(local.get(name), isVar));
    seen.delete(name);
    return hit;
  };
  return (value) => overshootIn(value, isVar);
}

const stripStrings = (v) => v.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""');
const isTimed = (prop) => /^(transition|animation)(-|$)/.test(prop);
const ancestors = (node) => { const out = []; for (let p = node.parent; p; p = p.parent) out.push(p); return out; };
const inMedia = (node, re) => ancestors(node).some((a) => a.type === 'atrule' && a.name === 'media' && re.test(a.params));
const REDUCED = /prefers-reduced-motion\s*:\s*reduce/;
const NO_PREF = /prefers-reduced-motion\s*:\s*no-preference/;
const HOVER_GATE = /hover\s*:\s*hover/;
const splitSelectors = (sel) => postcss.list.comma(sel).map((s) => s.replace(/\s+/g, ' ').trim());
const allowed = (decl) => {
  const prev = decl.prev();
  return prev?.type === 'comment' && /motion-allow:\s*\S/.test(prev.text) ? prev.text.replace(/.*motion-allow:\s*/s, '') : null;
};

/** Transition property names in a `transition` shorthand or `transition-property` value. */
function transitionProps(prop, value) {
  const items = postcss.list.comma(value);
  if (prop === 'transition-property') return items.map((s) => s.trim().toLowerCase());
  return items.map((item) => postcss.list.space(item).find((t) => !/^[\d.]/.test(t) && !/^(var|cubic-bezier|steps|linear)\(/.test(t)
    && !/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|allow-discrete|normal)$/.test(t)) ?? 'all')
    .map((s) => s.toLowerCase());
}

/**
 * Check one stylesheet. `movingKeyframes` is the set of @keyframes names (across every scanned
 * file) that move; pass the result of `collectMovingKeyframes` over all files.
 */
export function checkCss(css, file, movingKeyframes = collectMovingKeyframes([css]), loopAllow = LOOP_ALLOW, context = collectMotionContext([css])) {
  const root = postcss.parse(css);
  const problems = [];
  const exemptions = [];
  const stats = { decls: 0, timed: 0, loops: 0, hoverRules: 0 };
  const report = (rule, node, msg) => {
    const why = node.type === 'decl' ? allowed(node) : null;
    if (why) exemptions.push(`${file}:${node.source.start.line} ${rule} — ${why}`);
    else problems.push(`${file}:${node.source.start.line} [${rule}] ${msg}`);
  };

  // Selectors that carry a reduced-motion rule in this file.
  const reducedSelectors = new Set();
  root.walkRules((r) => { if (inMedia(r, REDUCED)) splitSelectors(r.selector).forEach((s) => reducedSelectors.add(s)); });
  const hasReducedBranch = (rule) => splitSelectors(rule.selector).every((s) => reducedSelectors.has(s));

  root.walkDecls((d) => {
    stats.decls++;
    const prop = d.prop.toLowerCase();
    const value = stripStrings(d.value);
    const inKeyframes = ancestors(d).some((a) => a.type === 'atrule' && /keyframes$/.test(a.name));

    // 1. raw time (custom properties included: a local --x-dur: 200ms is still a raw time)
    for (const m of value.matchAll(TIME)) {
      if (Number(m[1]) !== 0) { report('raw-time', d, `literal time '${m[0]}' in '${prop}: ${d.value}' — use a --uix-dur/delay/loop token`); break; }
    }
    if (!isTimed(prop) && !inKeyframes) return;
    if (isTimed(prop)) stats.timed++;

    // 2 + 4. transition lists
    if (prop === 'transition' || prop === 'transition-property') {
      const names = transitionProps(prop, value);
      if (names.includes('all')) report('transition-all', d, `'${prop}: ${d.value}' — list the properties`);
      const layout = names.filter((n) => LAYOUT.has(n));
      if (layout.length) report('layout', d, `transition animates layout (${layout.join(', ')}) — use transform/opacity`);
      // 9. Linux WebKit's renderer crashes on a CSS-animated filter (2.60, measured): a blur that
      //    clears runs per frame in script (motion.ts blurIn); a constant backdrop blur is fine
      const filters = names.filter((n) => n === 'filter' || n === 'backdrop-filter' || n === '-webkit-backdrop-filter');
      if (filters.length) report('filter-motion', d, `transition animates ${filters.join(', ')} — Linux WebKit crashes on it; drive a blur per frame with blurIn (motion.ts)`);
    }
    // 3. ease-in
    if (isTimed(prop) && EASE_IN.test(value)) report('ease-in', d, `accelerating curve in '${prop}: ${d.value}' — exits use --uix-ease-out at a --uix-dur-exit-* duration`);
    // 4. keyframes
    if (inKeyframes && LAYOUT.has(prop)) report('layout', d, `@keyframes animates layout property '${prop}' — use transform/opacity`);
    if (inKeyframes && /^(-webkit-)?(backdrop-)?filter$/.test(prop)) report('filter-motion', d, `@keyframes animates '${prop}' — Linux WebKit's renderer crashes on it; drive a blur per frame with blurIn (motion.ts)`);

    // 8. only a loader loops (its reduced-motion pulse included)
    if ((prop === 'animation' || prop === 'animation-iteration-count') && d.parent.type === 'rule' && /\binfinite\b/.test(value)) {
      const base = file.split('/').pop();
      const own = loopAllow.filter((a) => a.file === base || a.file === '*');
      const stray = splitSelectors(d.parent.selector).filter((sel) => !own.some((a) => a.selector.test(sel)));
      if (stray.length) {
        problems.push(`${file}:${d.source.start.line} [loop-not-loading] '${stray.join(', ')}' loops forever, and only an indeterminate loading indicator may (${loopAllow.map((a) => a.what).join(', ')}): play it once, or show the state in text`);
      }
    }

    // 5 + 6. loops and moving animations need a reduced-motion branch
    if ((prop === 'animation' || prop === 'animation-name' || prop === 'animation-iteration-count') && d.parent.type === 'rule') {
      if (inMedia(d, REDUCED) || inMedia(d, NO_PREF)) return;
      const loops = /\binfinite\b/.test(value);
      const names = prop === 'animation-iteration-count' ? [] : postcss.list.comma(value).flatMap((v) => postcss.list.space(v));
      const moving = names.find((n) => movingKeyframes.has(n));
      if (loops) stats.loops++;
      if ((loops || moving) && !hasReducedBranch(d.parent)) {
        report(loops ? 'loop-no-reduced' : 'moving-no-reduced', d,
          `'${d.parent.selector.replace(/\s+/g, ' ')}' ${loops ? 'loops forever' : `moves (@keyframes ${moving})`} with no @media (prefers-reduced-motion: reduce) rule for that selector`);
      }
    }
  });

  // 10. an overshooting curve moves geometry only — judged on each rule's own lists (declarations
  //     folded in order) and on every longhand list another rule sets for the same element
  const groups = longhandLists(root, context.keyframeProps);
  root.walkRules((r) => {
    for (const [node, msg] of overshootEffects(r, groups, context)) {
      report('overshoot-effect', node, `${msg} — an overshooting curve may move only ${[...SPATIAL_PROPS].join(', ')}; opacity and colour clamp at their range, so split the transition and give them --uix-ease-out or --uix-ease-glide`);
    }
  });

  // 7. hover-only movement or reveal
  root.walkRules((r) => {
    if (!/:hover\b/.test(r.selector)) return;
    stats.hoverRules++;
    if (inMedia(r, HOVER_GATE)) return;
    r.each((d) => {
      if (d.type !== 'decl') return;
      const p = d.prop.toLowerCase();
      if (MOVE_PROPS.has(p) || REVEAL_PROPS.has(p)) {
        report('hover-ungated', d, `'${r.selector.replace(/\s+/g, ' ')} { ${p} }' moves or reveals on :hover outside @media (hover: hover) and (pointer: fine)`);
      }
    });
  });

  return { problems, exemptions, stats };
}

const isKeyframes = (a) => a.type === 'atrule' && /keyframes$/.test(a.name);
const comma = (v) => postcss.list.comma(v).map((s) => s.trim());

/**
 * A rule's effective transition and animation lists, its declarations folded in source order the
 * way the cascade folds them: a shorthand resets both its property (or name) list and its timing
 * list, a longhand replaces only its own, and a normal declaration never replaces an !important
 * one. Each list remembers the declaration that set it (`<list>Decl`).
 */
function motionLists(rule, keyframeProps) {
  const s = {};
  const set = (key, value, d) => {
    if (s[`${key}Imp`] && !d.important) return;
    s[key] = value; s[`${key}Imp`] = Boolean(d.important); s[`${key}Decl`] = d;
  };
  rule.each((d) => {
    if (d.type !== 'decl') return;
    const p = d.prop.toLowerCase();
    const items = comma(stripStrings(d.value));
    if (p === 'transition') { set('tProps', items.map((i) => transitionProps('transition', i)[0]), d); set('tTimings', items, d); }
    else if (p === 'transition-property') set('tProps', items.map((i) => i.toLowerCase()), d);
    else if (p === 'transition-timing-function') set('tTimings', items, d);
    else if (p === 'animation') { set('aNames', items.map((i) => postcss.list.space(i).find((t) => keyframeProps.has(t)) ?? null), d); set('aTimings', items, d); }
    else if (p === 'animation-name') set('aNames', items, d);
    else if (p === 'animation-timing-function') set('aTimings', items, d);
  });
  return s;
}

/**
 * The element a selector styles, as rule 10 groups rules: the first simple selector of its subject
 * (the last compound; a leading :is()/:where() counts as one) plus its pseudo-element. `.a`,
 * `.a:hover`, `.a.special[open]` and `.list .a` are one element; `.a::before` and `.ab` are others.
 * Deliberately coarse: it groups every state, condition and specificity of an element together.
 */
function elementKey(selector) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) start = i + 1;
  }
  const subject = selector.slice(start);
  const pseudo = /::[\w-]+(\([^)]*\))?|:(before|after|first-line|first-letter)\b/i.exec(subject)?.[0].replace(/^:+/, '::') ?? '';
  const head = /^(:(is|where)\([^)]*\)|[.#]?[\w-]+|\*|\[[^\]]*\]|&)/i.exec(subject)?.[0] ?? subject;
  return `${head}${pseudo}`;
}

/**
 * Every longhand property list (transition-property) and name list (animation-name) in the file, by
 * element. A longhand in any rule for the element can meet a timing set in another (a state, a
 * media query, a more specific selector or !important can let it win), so rule 10 checks each one.
 */
function longhandLists(root, keyframeProps) {
  const groups = new Map();
  root.walkRules((rule) => {
    if (ancestors(rule).some(isKeyframes)) return;
    const s = motionLists(rule, keyframeProps);
    const tProps = s.tPropsDecl?.prop.toLowerCase() === 'transition-property' ? s.tProps : null;
    const aNames = s.aNamesDecl?.prop.toLowerCase() === 'animation-name' ? s.aNames : null;
    if (!tProps && !aNames) return;
    for (const key of new Set(splitSelectors(rule.selector).map(elementKey))) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ rule, tProps, aNames });
    }
  });
  return groups;
}

const later = (a, b) => (!a ? b : !b ? a : (a.source.start.offset ?? 0) >= (b.source.start.offset ?? 0) ? a : b);

/**
 * Rule 10 for one rule: [declaration, "what on which curve"] for each overshooting curve that eases
 * something that is not geometry. The gate does not replay the cascade; it holds a stricter
 * contract that needs none:
 *  - an overshooting timing longhand (transition-timing-function, animation-timing-function) names
 *    its properties or animation in the same rule; without them it fails, since what it eases is
 *    decided elsewhere;
 *  - its timings pair with that list by position, as CSS pairs them, and with every longhand list
 *    another rule sets for the same element (elementKey), whatever its state, media condition,
 *    specificity or importance, since any of them can be the one that meets the curve.
 * An animation is judged by the properties its @keyframes set; a frame's own timing by its
 * keyframes' properties.
 */
function overshootEffects(rule, groups, { keyframeProps, aliases }) {
  const out = [];
  const curveIn = curveCheck(rule, aliases);
  const effectsOf = (name) => [...(keyframeProps.get(name) ?? [])].filter((p) => !SPATIAL_PROPS.has(p));
  const frames = ancestors(rule).find(isKeyframes);
  if (frames) {
    const name = frames.params.trim();
    rule.each((d) => {
      if (d.type !== 'decl' || d.prop.toLowerCase() !== 'animation-timing-function') return;
      const curve = curveIn(stripStrings(d.value));
      if (curve && effectsOf(name).length) out.push([d, `a frame of @keyframes ${name} eases ${effectsOf(name).join(', ')} on ${curve}`]);
    });
    return out;
  }
  const s = motionLists(rule, keyframeProps);
  const selector = rule.selector.replace(/\s+/g, ' ');
  // the longhand lists other rules set for this rule's elements
  const others = (key) => [...new Set(splitSelectors(rule.selector).flatMap((sel) => (groups.get(elementKey(sel)) ?? [])
    .filter((e) => e.rule !== rule && e[key]).map((e) => e[key])))];
  // entry i of a list takes timing i, the timings repeating as CSS repeats them
  const paired = (lists, timings, keep, describe) => [...new Set(lists.flatMap((list) => list
    .map((entry, i) => [entry, curveIn(timings[i % timings.length])])
    .filter(([entry, curve]) => curve && keep(entry))
    .map(([entry, curve]) => describe(entry, curve))))];

  if (s.tTimings?.some(curveIn)) {
    if (!s.tProps) {
      out.push([s.tTimingsDecl, `an overshooting transition-timing-function in '${selector}' with no transition-property in the same rule — name the properties next to the curve`]);
    } else {
      const bad = paired([s.tProps, ...others('tProps')], s.tTimings, (p) => !SPATIAL_PROPS.has(p), (p, c) => `${p} on ${c}`);
      if (bad.length) out.push([later(s.tPropsDecl, s.tTimingsDecl), bad.join(', ')]);
    }
  }
  if (s.aTimings?.some(curveIn)) {
    if (!s.aNames) {
      out.push([s.aTimingsDecl, `an overshooting animation-timing-function in '${selector}' with no animation named in the same rule — name it next to the curve, so its @keyframes can be checked`]);
    } else {
      const bad = paired([s.aNames, ...others('aNames')], s.aTimings, (n) => n && effectsOf(n).length, (n, c) => `@keyframes ${n} animates ${effectsOf(n).join(', ')} on ${c}`);
      if (bad.length) out.push([later(s.aNamesDecl, s.aTimingsDecl), bad.join('; ')]);
    }
  }
  return out;
}

/** The properties each @keyframes sets (custom properties and per-frame timing left out). */
export function collectKeyframeProps(sources) {
  const props = new Map();
  for (const css of sources) {
    postcss.parse(css).walkAtRules(/keyframes$/, (a) => {
      const set = props.get(a.params.trim()) ?? new Set();
      a.walkDecls((d) => {
        const p = d.prop.toLowerCase();
        if (!p.startsWith('--') && !/^animation-(timing-function|composition)$/.test(p)) set.add(p);
      });
      props.set(a.params.trim(), set);
    });
  }
  return props;
}

/** Names of @keyframes whose frames move something. */
export function collectMovingKeyframes(sources) {
  const names = new Set();
  for (const css of sources) {
    postcss.parse(css).walkAtRules(/keyframes$/, (a) => {
      let moves = false;
      a.walkDecls((d) => { if (MOVE_PROPS.has(d.prop.toLowerCase()) && !/^(none|0|scale\(1\)|1)$/.test(d.value.trim())) moves = true; });
      if (moves) names.add(a.params.trim());
    });
  }
  return names;
}

/**
 * TS/TSX source: literal times in transition/animation strings (rule 1, line by line), and rule 10
 * on an inline transition or animation string (read whole, so a template literal may span lines;
 * an animation is judged by its @keyframes in `keyframeProps`) and on tokenEase() of an
 * overshooting token (script-driven easing runs effects: blurIn's radius).
 */
export function checkTs(src, file, keyframeProps = new Map()) {
  const problems = [];
  const lines = src.split('\n');
  const allowedAt = (n) => /motion-allow:/.test(lines[n - 1] ?? '') || /motion-allow:/.test(lines[n - 2] ?? '');
  lines.forEach((line, i) => {
    if (/motion-allow:/.test(line)) return;
    if (/(transition|animation)\w*["'`]?\s*[:=]\s*["'`][^"'`]*(?<![\w.-])\d*\.?\d+m?s\b/i.test(line)) {
      problems.push(`${file}:${i + 1} [raw-time] literal time in an inline transition/animation — put motion in the stylesheet on tokens`);
    }
  });
  // a formatted call may put its argument on the next line
  for (const m of src.matchAll(/\btokenEase\(\s*["'`](--[\w-]+)["'`]/g)) {
    const at = src.slice(0, m.index).split('\n').length;
    if (isToken(m[1]) && !allowedAt(at)) problems.push(`${file}:${at} [overshoot-effect] tokenEase('${m[1]}') — script-driven easing runs effects (blurIn's radius), and an effect never overshoots; geometry moves in the stylesheet. Use --uix-ease-soft/-enter/-leave`);
  }
  const effectsOf = (name) => [...(keyframeProps.get(name) ?? [])].filter((p) => !SPATIAL_PROPS.has(p));
  for (const m of src.matchAll(/\b(transition|animation)["'`]?\s*[:=]\s*(["'`])((?:\\.|(?!\2)[\s\S])*)\2/gi)) {
    const at = src.slice(0, m.index).split('\n').length;
    if (allowedAt(at)) continue;
    const items = postcss.list.comma(m[3].replace(/\s+/g, ' ').trim());
    const bad = m[1].toLowerCase() === 'transition'
      ? items.filter((item) => overshootIn(item) && !SPATIAL_PROPS.has(transitionProps('transition', item)[0]))
      : items.filter((item) => {
        const name = postcss.list.space(item).find((t) => keyframeProps.has(t));
        return overshootIn(item) && name && effectsOf(name).length;
      });
    if (bad.length) problems.push(`${file}:${at} [overshoot-effect] inline ${m[1]} '${bad.join(', ')}' — an overshooting curve may move geometry only`);
  }
  return problems;
}

async function listFiles(dir, ext, skip = () => false) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') out.push(...await listFiles(p, ext, skip)); }
    else if (ext.test(e.name) && !skip(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
  const REPO = join(PKG, '..', '..');
  // The token source (styles/tokens.css re-exports the generated contract) is where times are defined.
  const cssFiles = [
    ...await listFiles(join(PKG, 'styles'), /\.css$/, (n) => n === 'tokens.css'),
    join(PKG, 'docs', 'docs.css'),
  ];
  const sources = await Promise.all(cssFiles.map((f) => readFile(f, 'utf8')));
  const moving = collectMovingKeyframes(sources);
  const context = collectMotionContext(sources);
  if (OVERSHOOT_TOKENS.length === 0) { console.error('✗ motion gate found no overshooting --uix-ease-* token in tokens/base/effect.json — check the parser'); process.exit(1); }
  const problems = [];
  const exemptions = [];
  const totals = { decls: 0, timed: 0, loops: 0, hoverRules: 0 };
  cssFiles.forEach((f, i) => {
    const r = checkCss(sources[i], relative(REPO, f).replace(/\\/g, '/'), moving, LOOP_ALLOW, context);
    problems.push(...r.problems);
    exemptions.push(...r.exemptions);
    for (const k of Object.keys(totals)) totals[k] += r.stats[k];
  });
  const tsFiles = await listFiles(join(REPO, 'packages', 'react', 'src'), /\.(ts|tsx)$/, (n) => /\.test\./.test(n));
  for (const f of tsFiles) problems.push(...checkTs(await readFile(f, 'utf8'), relative(REPO, f).replace(/\\/g, '/'), context.keyframeProps));

  for (const e of exemptions) console.log(`ℹ motion-allow ${e}`);
  const scanned = `${cssFiles.length} stylesheets (${totals.decls} declarations, ${totals.timed} transition/animation, ${totals.loops} loops, ${totals.hoverRules} :hover rules, ${moving.size} moving @keyframes) + ${tsFiles.length} TS files`;
  if (problems.length) {
    console.error(`✗ motion FAILED — ${problems.length} problem(s) in ${scanned}:`);
    for (const p of problems) console.error(`  • ${p}`);
    process.exit(1);
  }
  if (!cssFiles.length || !totals.timed) { console.error('✗ motion gate scanned nothing — check the paths'); process.exit(1); }
  console.log(`✓ motion OK — ${scanned}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
