import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

/*
 * Shared colour evaluator for the token tests: reads what ships (the built tokens.css plus
 * every theme file, in the cascade order a consumer loads them) and resolves --uix-* colour
 * expressions to sRGB, so contrast and OKLCH checks run on the real values, not on copies.
 */

const read = (url) => readFileSync(url, "utf8");

/** Parse the `:root` and dark `:root:where(...)` blocks of a stylesheet into ordered layers. */
export function blocks(css) {
  const out = [];
  for (const m of css.matchAll(/(:root(?::where\([^)]*\))?)\s*\{([^}]*)\}/g)) {
    const vars = {};
    for (const d of m[2].matchAll(/--uix-([\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out.push({ dark: m[1] !== ":root", vars });
  }
  return out;
}

/** Split on commas that are not inside parentheses. */
function splitTop(s) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

/** Evaluate a CSS colour expression to [r, g, b, a] in 0..1, resolving --uix-* against scope. */
export function evaluate(expr, scope, depth = 0) {
  assert.ok(depth < 20, `runaway var() chain at ${expr}`);
  const e = expr.trim();
  if (e === "transparent") return [0, 0, 0, 0];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(e);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(e);
  if (rgba) return [rgba[1], rgba[2], rgba[3]].map((c) => Number(c) / 255).concat(rgba[4] === undefined ? 1 : Number(rgba[4]));
  const v = /^var\(\s*--uix-([\w-]+)\s*(?:,(.*))?\)$/s.exec(e);
  if (v) {
    if (v[1] in scope) return evaluate(scope[v[1]], scope, depth + 1);
    assert.ok(v[2] !== undefined, `--uix-${v[1]} is undefined and has no fallback`);
    return evaluate(v[2], scope, depth + 1);
  }
  const mix = /^color-mix\(\s*in srgb\s*,(.*)\)$/s.exec(e);
  if (mix) {
    const [a, b] = splitTop(mix[1]).map((part) => {
      const pm = /^(.*?)\s+(\d+(?:\.\d+)?)%$/s.exec(part);
      return pm ? { c: evaluate(pm[1], scope, depth + 1), p: Number(pm[2]) / 100 } : { c: evaluate(part, scope, depth + 1), p: null };
    });
    const pa = a.p ?? 1 - (b.p ?? 0.5);
    const pb = b.p ?? 1 - pa;
    // CSS Color 5: interpolate premultiplied components, then un-premultiply.
    const alpha = a.c[3] * pa + b.c[3] * pb;
    const rgb = [0, 1, 2].map((i) => (alpha === 0 ? 0 : (a.c[i] * a.c[3] * pa + b.c[i] * b.c[3] * pb) / alpha));
    return [...rgb, alpha];
  }
  throw new Error(`unsupported colour expression: ${e}`);
}

/** Composite a (possibly translucent) colour over an opaque backdrop. */
export const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (c) => [0, 1, 2].map((i) => linear(c[i])).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);

/** WCAG 2 contrast ratio of two opaque colours. */
export const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** OKLCH lightness (0..1) and chroma of an opaque sRGB colour (Björn Ottosson's OKLab). */
export function oklch(c) {
  const [r, g, b] = [0, 1, 2].map((i) => linear(c[i]));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B) };
}

export const base = blocks(read(new URL("../build/css/tokens.css", import.meta.url)));
export const themes = { default: [] };
for (const f of readdirSync(new URL("../themes/", import.meta.url)).filter((n) => n.endsWith(".css"))) {
  themes[f.replace(/\.css$/, "")] = blocks(read(new URL(`../themes/${f}`, import.meta.url)));
}

/** The variables in force for a mode, applying blocks in source order (tokens.css, then the theme). */
export function scopeFor(themeBlocks, dark) {
  const scope = {};
  for (const b of [...base, ...themeBlocks]) if (!b.dark || dark) Object.assign(scope, b.vars);
  return scope;
}
