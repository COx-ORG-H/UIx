/* uix tokens build — DTCG source (tokens/) -> CSS + Tailwind + TS.
 *
 * Run: npm run build:tokens   (or  node style-dictionary.config.mjs)
 *
 * Design notes (load-bearing — read before changing):
 *  - We DO NOT use a built-in transformGroup. Two explicit transforms run:
 *      uix/name  — name = "uix-" + token path joined by "-".  NOT name/kebab, because
 *                  kebab-case splits letter/digit boundaries ("text-h2" -> "text-h-2"),
 *                  which would break the --uix-* contract that 70+ component files depend on.
 *      uix/value — IDENTITY. Returns the authored $value untouched. This is what keeps the
 *                  runtime tokens verbatim:  --uix-accent: var(--uix-brand,#1447E6),
 *                  --uix-brand-muted: color-mix(...).  Static resolution here would silently
 *                  kill every product's brand override. Do not "optimize" this away.
 *  - Light comes from tokens/base, dark from tokens/dark (only the overridden tokens). The dark
 *    files are self-contained literals, so they build standalone — that yields the sparse dark
 *    block naturally, no diffing.
 */
import StyleDictionary from 'style-dictionary';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const out = (...p) => join(ROOT, 'build', ...p);

StyleDictionary.registerTransform({
  name: 'uix/name',
  type: 'name',
  transform: (token) => ['uix', ...token.path].join('-'),
});

StyleDictionary.registerTransform({
  name: 'uix/value',
  type: 'value',
  transitive: true,
  // identity — preserve authored CSS verbatim. DTCG keeps the value in $value (original holds
  // the pristine, pre-transform string), so read it from there, not .value.
  transform: (token) => token.original?.$value ?? token.$value ?? token.value,
});

async function tokensFor(glob) {
  // fast-glob treats "\" as an escape char — use forward slashes even on Windows.
  const source = join(ROOT, glob).replace(/\\/g, '/');
  const sd = new StyleDictionary({
    source: [source],
    platforms: { css: { transforms: ['uix/name', 'uix/value'], files: [] } },
    log: { verbosity: 'silent' },
  });
  await sd.hasInitialized;
  const dict = await sd.getPlatformTokens('css');
  return dict.allTokens; // [{ name: 'uix-bg-app', value: '#FAFAFA', type: 'color', ... }]
}

const base = await tokensFor('tokens/base/**/*.json');
const dark = await tokensFor('tokens/dark/**/*.json');

const key = (t) => t.name.replace(/^uix-/, ''); // contract name minus prefix
const val = (t) => t.$value; // DTCG: transformed value lives in $value
const isColor = (t) =>
  t.$type === 'color' || /^(#|rgb|hsl|var\(|color-mix|transparent)/i.test(val(t));

/* ---------- CSS custom properties ---------- */
const decls = (toks, indent) =>
  toks.map((t) => `${indent}--${t.name}: ${val(t)};`).join('\n');
// A token whose value reads custom properties set further down the tree (--uix-radius-inner reads
// the --uix-radius-outer / --uix-radius-inset a container sets) is declared on every element, not
// on :root: a custom property resolves where it is declared and inherits as that one result, so on
// :root it would never see a container's values.
const perElement = (t) => t.$extensions?.['uix.scope'] === 'element';
const rootBase = base.filter((t) => !perElement(t));
const elementBase = base.filter(perElement);

const css = `/* GENERATED — do not edit. Source: tokens/  •  Build: npm run build:tokens (Style Dictionary).
   The --uix-* contract: light on :root, dark on the dark selector. Names match UIx v1;
   projects override VALUES via the write-only --uix-brand / --uix-brand-fg slots, never names. */
@layer uix.tokens {
  :root {
${decls(rootBase, '    ')}
  }

  :root:where(.dark,[data-theme="dark"]) {
${decls(dark, '    ')}
  }
${elementBase.length ? `
  /* resolved on every element (zero specificity), so each reads the nearest container's inputs */
  :where(*) {
${decls(elementBase, '    ')}
  }
` : ''}}
`;

/* ---------- Tailwind v4 @theme (maps utilities onto the live --uix-* vars) ---------- */
const twLine = (ns, name, strip) =>
  `  --${ns}-${name.replace(strip, 'uix-')}: var(--${name});`;
const twColors = base.filter(isColor).map((t) => twLine('color', t.name, /^uix-/));
const twRadius = base.filter((t) => t.name.startsWith('uix-radius-') && !perElement(t)).map((t) => twLine('radius', t.name, /^uix-radius-/));
// a per-element radius must be inline: a plain @theme alias is emitted on :root, where it never sees a container's slots
const twRadiusInline = base.filter((t) => t.name.startsWith('uix-radius-') && perElement(t)).map((t) => twLine('radius', t.name, /^uix-radius-/));
const twFonts = base.filter((t) => t.name.startsWith('uix-font-')).map((t) => twLine('font', t.name, /^uix-font-/));

const tailwindTheme = `/* GENERATED — do not edit. Tailwind v4 \`@theme\`. Import AFTER @tensor_1/tokens/css so the
   --uix-* vars exist; values stay var() so brand + dark cascade through (e.g. \`bg-uix-accent\`). */
@theme {
${[...twColors, '', ...twRadius, '', ...twFonts].join('\n')}
}
${twRadiusInline.length ? `
/* resolved per element (not on :root), so rounded-uix-inner reads the nearest container's slots */
@theme inline {
${twRadiusInline.join('\n')}
}
` : ''}`;

/* ---------- Tailwind v3 preset (same principle, config form) ---------- */
const cjsMap = (toks, strip) =>
  toks.map((t) => `      "${t.name.replace(strip, 'uix-')}": "var(--${t.name})",`).join('\n');
const tailwindPreset = `/* GENERATED — do not edit. Tailwind v3 preset:
   module.exports = { presets: [require('@tensor_1/tokens/build/tailwind/preset.cjs')] } */
module.exports = {
  theme: {
    extend: {
      colors: {
${cjsMap(base.filter(isColor), /^uix-/)}
      },
      borderRadius: {
${cjsMap(base.filter((t) => t.name.startsWith('uix-radius-')), /^uix-radius-/)}
      },
      fontFamily: {
${cjsMap(base.filter((t) => t.name.startsWith('uix-font-')), /^uix-font-/)}
      },
    },
  },
};
`;

/* ---------- Typed JS/TS constants ---------- */
const fallback = (v) => {
  const m = /var\(--uix-[a-z-]+,\s*([^)]+)\)/i.exec(v); // var(--uix-brand,#1447E6) -> #1447E6
  return m ? m[1].trim() : v;
};
const pxNum = (v) => (/^-?\d*\.?\d+px$/.test(v) ? parseFloat(v) : undefined);

const obj = (entries) =>
  '{\n' + entries.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n') + '\n}';

const cssVarEntries = base.map((t) => [key(t), `var(--${t.name})`]);
// a per-element token has no one resolved value (it depends on the container), so it keeps its
// expression instead of a fallback lifted out of it
const lightEntries = base.map((t) => [key(t), perElement(t) ? val(t) : fallback(val(t))]);
const darkEntries = dark.map((t) => [key(t), fallback(val(t))]);
const numEntries = base.map((t) => [key(t), pxNum(val(t))]).filter(([, v]) => v !== undefined);

const tokensJs = `/* GENERATED — do not edit. Source: tokens/  •  Build: npm run build:tokens.
 * cssVar  — theme-aware var() strings; use in the browser / CSS-in-JS (respects brand + dark).
 * light/dark — resolved values for non-DOM use (SSR, React Native, server-rendered charts).
 *              runtime brand tokens resolve to their fallback color here.
 * num     — unitless px numbers (React Native, layout math). */
export const cssVar = ${obj(cssVarEntries)};

export const light = ${obj(lightEntries)};

export const dark = ${obj(darkEntries)};

export const num = ${obj(numEntries)};
`;

/* ---------- Spring parameters (native consumers rebuild the spring the linear() was sampled from) ---------- */
// A spring-sampled easing carries $extensions["uix.spring"]; durationMs resolves its paired duration
// token, so a platform without a spring engine can run the cubic-bezier fallback over the same time.
const springTokens = base.filter((t) => t.$extensions?.['uix.spring']);
const springEntries = springTokens.map((t) => {
  const s = t.$extensions['uix.spring'];
  const dur = base.find((d) => key(d) === s.durationToken);
  const ms = dur && /^(\d*\.?\d+)ms$/.exec(val(dur));
  if (!ms) throw new Error(`--${t.name}: uix.spring.durationToken '${s.durationToken}' is not a ms duration token`);
  return [key(t), { ...s, durationMs: Number(ms[1]) }];
});
if (!springEntries.length) throw new Error('no spring-sampled easing carries $extensions["uix.spring"]');

const tokensJsWithSpring = `${tokensJs}
/** Spring-sampled easings as springs: stiffness, damping and mass (unit mass, from rest to 1),
 *  the overshoot of the travel, the paired duration, and a cubic-bezier fallback over that time. */
export const spring = ${obj(springEntries)};
`;

const nameUnion = base.map((t) => JSON.stringify(key(t))).join(' | ');
const tokensDts = `/* GENERATED — do not edit. */
export type UixTokenName = ${nameUnion};
export declare const cssVar: Record<UixTokenName, string>;
export declare const light: Record<UixTokenName, string>;
export declare const dark: Partial<Record<UixTokenName, string>>;
export declare const num: Partial<Record<UixTokenName, number>>;
export type UixSpringName = ${springEntries.map(([k]) => JSON.stringify(k)).join(' | ')};
export interface UixSpring {
  /** As Reanimated withSpring and SwiftUI .interpolatingSpring take them; Compose's spring() takes
   *  dampingRatio = damping / (2 * sqrt(stiffness * mass)). From rest at 0 to 1. */
  stiffness: number;
  damping: number;
  mass: number;
  /** Overshoot past the target within the duration, as a fraction of the travel (0.031 = 3.1 %). */
  overshoot: number;
  durationToken: UixTokenName;
  durationMs: number;
  /** cubic-bezier(x1, y1, x2, y2) over durationMs, for a platform with no spring engine. */
  cubicBezier: readonly [number, number, number, number];
}
export declare const spring: Record<UixSpringName, UixSpring>;
`;

/* ---------- write ---------- */
await mkdir(out('css'), { recursive: true });
await mkdir(out('tailwind'), { recursive: true });
await mkdir(out('ts'), { recursive: true });
await Promise.all([
  writeFile(out('css', 'tokens.css'), css),
  writeFile(out('tailwind', 'theme.css'), tailwindTheme),
  writeFile(out('tailwind', 'preset.cjs'), tailwindPreset),
  writeFile(out('ts', 'tokens.js'), tokensJsWithSpring),
  writeFile(out('ts', 'tokens.d.ts'), tokensDts),
]);

console.log(`✓ tokens built — ${base.length} base, ${dark.length} dark`);
console.log(`  build/css/tokens.css  build/tailwind/{theme.css,preset.cjs}  build/ts/{tokens.js,tokens.d.ts}`);
