import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

/*
 * The selected filter chip (`.uix-chip[data-on]`) sets accent-hued text over a
 * --uix-brand-muted tint of that same accent. With the raw accent as the text colour
 * it measured 3.21:1 in dark mode on the Mission Control dashboard (axe, 2026-09-10),
 * and under 3:1 in light mode for the bright POSx and mission-control brands.
 *
 * The a11y gate did not catch it because no specimen page renders a chip already
 * selected. So this computes the contrast directly from what ships: the built
 * tokens.css plus every theme file, in the cascade order a consumer loads them,
 * for both modes, over both page backdrops.
 */

const AA_NORMAL_TEXT = 4.5; // chip text is --uix-text-meta (12.5px), not large text

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

/** Parse the `:root` and dark `:root:where(...)` blocks of a stylesheet into ordered layers. */
function blocks(css) {
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
function evaluate(expr, scope, depth = 0) {
  assert.ok(depth < 20, `runaway var() chain at ${expr}`);
  const e = expr.trim();
  if (e === "transparent") return [0, 0, 0, 0];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(e);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
  }
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

const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = (c) =>
  [0, 1, 2]
    .map((i) => (c[i] <= 0.04045 ? c[i] / 12.92 : ((c[i] + 0.055) / 1.055) ** 2.4))
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const base = blocks(read("../build/css/tokens.css"));
const themes = { default: [] };
for (const f of readdirSync(new URL("../themes/", import.meta.url)).filter((n) => n.endsWith(".css"))) {
  themes[f.replace(/\.css$/, "")] = blocks(read(`../themes/${f}`));
}

/** The variables in force for a mode, applying blocks in source order (tokens.css, then the theme). */
function scopeFor(themeBlocks, dark) {
  const scope = {};
  for (const b of [...base, ...themeBlocks]) if (!b.dark || dark) Object.assign(scope, b.vars);
  return scope;
}

test("the parser sees both modes in tokens.css and at least the four shipped themes", () => {
  assert.equal(base.filter((b) => !b.dark).length, 1);
  assert.equal(base.filter((b) => b.dark).length, 1);
  for (const name of ["tensor", "posx", "shopx", "mission-control"]) assert.ok(name in themes, `theme ${name} not found`);
});

test("the chip rule uses --uix-accent-text for its selected text", () => {
  const rule = /\.uix-chip\[data-on\]\s*\{([^}]*)\}/.exec(read("../styles/components/table-toolbar.css"));
  assert.ok(rule, ".uix-chip[data-on] rule not found");
  assert.match(rule[1], /(?:^|;)\s*color:\s*var\(--uix-accent-text\)/);
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: selected chip text clears AA over its tint`, () => {
      const scope = scopeFor(themeBlocks, dark);
      const text = evaluate("var(--uix-accent-text)", scope);
      const tint = evaluate("var(--uix-brand-muted)", scope);
      for (const backdrop of ["surface", "bg-app"]) {
        const bg = over(tint, evaluate(`var(--uix-${backdrop})`, scope));
        const ratio = contrast(text, bg);
        assert.ok(ratio >= AA_NORMAL_TEXT, `${ratio.toFixed(2)}:1 over --uix-${backdrop} (need ${AA_NORMAL_TEXT})`);
      }
    });
  }
}

test("the evaluator reproduces the defect it guards: raw dark accent on its tint was 3.21:1", () => {
  const scope = scopeFor([], true);
  const bg = over(evaluate("var(--uix-brand-muted)", scope), evaluate("var(--uix-surface)", scope));
  assert.equal(contrast(evaluate("var(--uix-accent)", scope), bg).toFixed(2), "3.21");
});
