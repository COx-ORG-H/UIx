import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { base, contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

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
