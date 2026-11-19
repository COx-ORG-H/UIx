import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Sparkline (HAR-2880). The line, its marks and the dashed target line are graphical objects that
 * carry the trend, so each needs 3:1 against the page it sits on (WCAG 1.4.11); the value written
 * beside it is text and needs 4.5:1 (1.4.3). Computed from what ships — the built tokens and every
 * theme, in both modes, over both page backdrops — because a page scan sees one theme only.
 * In forced colours every mark is drawn in CanvasText, the shapes (dash, diamond) still telling
 * them apart.
 */

const NON_TEXT = 3;
const TEXT = 4.5;
const source = readFileSync(new URL("../styles/components/chart-card.css", import.meta.url), "utf8");
const [normal, forced] = source.split("@media (forced-colors: active)");
assert.ok(forced, "chart-card.css has a forced-colors block");

const escape = (selector) => selector.replace(/[.[\]"=()-]/g, "\\$&");
/** The value of `property` in the first rule whose whole selector list includes `selector`. */
const declared = (css, selector, property) => {
  const rule = new RegExp(`(?:^|[,}\\s])${escape(selector)}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, "m").exec(css);
  assert.ok(rule, `${selector} rule not found`);
  const value = new RegExp(`(?:^|;|\\s)${property}:\\s*([^;]+);`).exec(rule[1]);
  assert.ok(value, `${selector} sets no ${property}`);
  return value[1].trim();
};

const MARKS = {
  "ink line": [".uix-sparkline__line", "stroke"],
  "series line": [".uix-sparkline--series .uix-sparkline__line", "stroke"],
  "ink last point": [".uix-sparkline__end", "fill"],
  "series last point": [".uix-sparkline--series .uix-sparkline__end", "fill"],
  "lone point": [".uix-sparkline__point", "fill"],
  "target line": [".uix-sparkline__target", "stroke"],
  "crossed-threshold diamond": [".uix-sparkline__end--crossed", "fill"],
};
const VALUE = [".uix-sparkline__value", "color"];

test("the sparkline rules read their colours from tokens only", () => {
  for (const [selector, property] of [...Object.values(MARKS), VALUE]) {
    assert.match(declared(normal, selector, property), /^var\(--uix-[\w-]+\)$/, selector);
  }
  assert.match(declared(normal, ".uix-sparkline__target", "stroke-dasharray"), /\d/, "the target line is dashed, not a second solid line");
});

test("forced colours draw every mark in CanvasText", () => {
  for (const [selector, property] of Object.values(MARKS)) {
    if (selector.startsWith(".uix-sparkline--series")) continue; // the plain rule covers both tones
    assert.equal(declared(forced, selector, property), "CanvasText", selector);
  }
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    const scope = scopeFor(themeBlocks, dark);
    const mode = dark ? "dark" : "light";
    for (const [name, [selector, property]] of Object.entries(MARKS)) {
      test(`${theme} ${mode}: the ${name} clears ${NON_TEXT}:1 on the page`, () => {
        for (const backdrop of ["surface", "bg-app"]) {
          const page = evaluate(`var(--uix-${backdrop})`, scope);
          const ratio = contrast(over(evaluate(declared(normal, selector, property), scope), page), page);
          assert.ok(ratio >= NON_TEXT, `${ratio.toFixed(2)}:1 over --uix-${backdrop} (need ${NON_TEXT})`);
        }
      });
    }
    test(`${theme} ${mode}: the written value clears ${TEXT}:1`, () => {
      for (const backdrop of ["surface", "bg-app"]) {
        const page = evaluate(`var(--uix-${backdrop})`, scope);
        const ratio = contrast(over(evaluate(declared(normal, ...VALUE), scope), page), page);
        assert.ok(ratio >= TEXT, `${ratio.toFixed(2)}:1 over --uix-${backdrop} (need ${TEXT})`);
      }
    });
  }
}
