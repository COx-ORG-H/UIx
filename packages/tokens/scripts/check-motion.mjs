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
export function checkCss(css, file, movingKeyframes = collectMovingKeyframes([css])) {
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
    }
    // 3. ease-in
    if (isTimed(prop) && EASE_IN.test(value)) report('ease-in', d, `accelerating curve in '${prop}: ${d.value}' — exits use --uix-ease-out at a --uix-dur-exit-* duration`);
    // 4. keyframes
    if (inKeyframes && LAYOUT.has(prop)) report('layout', d, `@keyframes animates layout property '${prop}' — use transform/opacity`);

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

/** Literal times in transition/animation strings in TS/TSX source. */
export function checkTs(src, file) {
  const problems = [];
  src.split('\n').forEach((line, i) => {
    if (/(transition|animation)\w*["'`]?\s*[:=]\s*["'`][^"'`]*(?<![\w.-])\d*\.?\d+m?s\b/i.test(line) && !/motion-allow:/.test(line)) {
      problems.push(`${file}:${i + 1} [raw-time] literal time in an inline transition/animation — put motion in the stylesheet on tokens`);
    }
  });
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
  const problems = [];
  const exemptions = [];
  const totals = { decls: 0, timed: 0, loops: 0, hoverRules: 0 };
  cssFiles.forEach((f, i) => {
    const r = checkCss(sources[i], relative(REPO, f).replace(/\\/g, '/'), moving);
    problems.push(...r.problems);
    exemptions.push(...r.exemptions);
    for (const k of Object.keys(totals)) totals[k] += r.stats[k];
  });
  const tsFiles = await listFiles(join(REPO, 'packages', 'react', 'src'), /\.(ts|tsx)$/, (n) => /\.test\./.test(n));
  for (const f of tsFiles) problems.push(...checkTs(await readFile(f, 'utf8'), relative(REPO, f).replace(/\\/g, '/')));

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
