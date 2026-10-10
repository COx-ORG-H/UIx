import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Presence dots (HAR-1374): online, busy, away, offline. Each is a 10 px graphical object whose
 * colour carries part of its meaning (the shape and the hidden text carry the rest), so the
 * colour needs 3:1 against the surface it sits on (WCAG 1.4.11). The rings are 2 px wide, which
 * is why they use text colours rather than the lighter status hues.
 *
 * Computed from what ships, for every theme in both modes, like the selected-chip and meter
 * tests: no docs page renders all four states in every theme.
 */

const NON_TEXT = 3;
const css = readFileSync(new URL("../styles/components/avatar.css", import.meta.url), "utf8");
const first = (re, what) => {
  const match = re.exec(css);
  assert.ok(match, `${what} not found in avatar.css`);
  return match[1].trim();
};

const COLOURS = {
  online: first(/\.uix-presence \{[^}]*background:\s*(var\(--uix-[\w-]+\))/, "the online fill"),
  busy: first(/\.uix-presence--busy \{[^}]*background:\s*(var\(--uix-[\w-]+\))/, "the busy fill"),
  away: first(/\.uix-presence--away \{[^}]*box-shadow:\s*inset 0 0 0 2px (var\(--uix-[\w-]+\))/, "the away ring"),
  offline: first(/\.uix-presence--offline \{[^}]*box-shadow:\s*inset 0 0 0 2px (var\(--uix-[\w-]+\))/, "the offline ring"),
};

test("the four presence states use four different colours", () => {
  assert.equal(new Set(Object.values(COLOURS)).size, 4);
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    for (const [state, value] of Object.entries(COLOURS)) {
      test(`${theme} ${dark ? "dark" : "light"}: the ${state} presence dot clears 3:1 on the surface`, () => {
        const scope = scopeFor(themeBlocks, dark);
        for (const backdrop of ["surface", "bg-app"]) {
          const page = evaluate(`var(--uix-${backdrop})`, scope);
          const ratio = contrast(over(evaluate(value, scope), page), page);
          assert.ok(ratio >= NON_TEXT, `${ratio.toFixed(2)}:1 over --uix-${backdrop} (need ${NON_TEXT})`);
        }
      });
    }
  }
}
