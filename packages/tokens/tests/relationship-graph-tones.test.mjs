import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * RelationshipGraph tones (HAR-1639): a toned edge is a 2 px line, a toned node a border and a
 * 4 px bar, each drawn on the map's --uix-bg-subtle. They carry meaning a legend names, so they
 * need 3:1 against the map (WCAG 1.4.11). The warning tone used --uix-warning-border, #D97706
 * on #F5F5F5: 2.9:1 (review of PR #166).
 */

const NON_TEXT = 3;
const css = readFileSync(new URL("../styles/components/relationship-graph.css", import.meta.url), "utf8");
const TONES = Object.fromEntries(
  [...css.matchAll(/\[data-tone="(\w+)"\]\s*\{\s*--uix-graph-tone:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

test("every graph tone is declared", () => {
  assert.deepEqual(Object.keys(TONES).sort(), ["accent", "danger", "info", "neutral", "success", "warning"]);
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    for (const [tone, value] of Object.entries(TONES)) {
      test(`${theme} ${dark ? "dark" : "light"}: the ${tone} graph tone clears 3:1 against the map`, () => {
        const scope = scopeFor(themeBlocks, dark);
        const map = over(evaluate("var(--uix-bg-subtle)", scope), evaluate("var(--uix-surface)", scope));
        const line = over(evaluate(value, scope), map);
        const ratio = contrast(line, map);
        assert.ok(ratio >= NON_TEXT, `${value}: ${ratio.toFixed(2)}:1 (need ${NON_TEXT})`);
      });
    }
  }
}
