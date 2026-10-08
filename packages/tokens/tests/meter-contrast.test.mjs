import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Meter `tone="neutral"` and `tone="accent"` (HAR-1606): a fill for a plain proportion that is
 * neither good nor bad. The fill is a graphical object that carries the value, so it needs
 * 3:1 against the track it grows over (WCAG 1.4.11).
 *
 * A page scan cannot check this for every brand: the docs render one theme. So, like the
 * selected-chip test, this computes it from what ships: the built tokens.css plus every theme
 * file, in both modes, with the track composited over both page backdrops.
 */

const NON_TEXT = 3;
const css = readFileSync(new URL("../styles/components/meter.css", import.meta.url), "utf8");
const declared = (selector) => {
  const rule = new RegExp(`${selector.replace(/[.[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(rule, `${selector} rule not found in meter.css`);
  const value = /background:\s*([^;]+);/.exec(rule[1]);
  assert.ok(value, `${selector} has no background`);
  return value[1].trim();
};

const TRACK = declared(".uix-meter");
const FILLS = {
  neutral: declared('.uix-meter__fill[data-tone="neutral"]'),
  accent: declared('.uix-meter__fill[data-tone="accent"]'),
};

test("the meter rules read their colours from tokens", () => {
  for (const value of [TRACK, ...Object.values(FILLS)]) assert.match(value, /^var\(--uix-[\w-]+\)$/);
  assert.notEqual(FILLS.neutral, declared(".uix-meter__fill"), "neutral is not the default success green");
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    for (const [tone, fillValue] of Object.entries(FILLS)) {
      test(`${theme} ${dark ? "dark" : "light"}: the ${tone} meter fill clears 3:1 against the track`, () => {
        const scope = scopeFor(themeBlocks, dark);
        for (const backdrop of ["surface", "bg-app"]) {
          const page = evaluate(`var(--uix-${backdrop})`, scope);
          const track = over(evaluate(TRACK, scope), page);
          const fill = over(evaluate(fillValue, scope), track);
          const ratio = contrast(fill, track);
          assert.ok(ratio >= NON_TEXT, `${ratio.toFixed(2)}:1 over --uix-${backdrop} (need ${NON_TEXT})`);
        }
      });
    }
  }
}
