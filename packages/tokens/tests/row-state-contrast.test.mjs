import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Text on a table row in every state (HAR-2635, MOTUS): plain, zebra, pinned, selected and
 * hovered rows, for the default and muted text, in every theme and both modes, from the built
 * tokens. A selected row re-points --uix-text-muted to --uix-text-muted-on-selected (table.css):
 * the plain muted grey was 4.36:1 on the light selection tint, on every .uix-cell-sub there and
 * on the frozen id cell, where axe cannot see it (the colour sits in a linear-gradient).
 */

const AA = 4.5; // cell text and .uix-cell-sub are body / meta size, not large text

/**
 * Known and reported, not changed here (a theme value is the theme owner's call): the
 * mission-control light theme's own muted text on its own hover tint. A new failure is not
 * allowed in; a fixed one must leave this list (the check in the loop).
 */
const KNOWN = new Map([
  ["mission-control light: text-muted on hover", "4.45:1, #6E6A68 on #ECEAE6; pre-existing in the theme, found by this matrix (PR for HAR-2635)"],
]);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

test("a selected row re-points --uix-text-muted to --uix-text-muted-on-selected", () => {
  const css = read("../styles/components/table.css");
  assert.match(css, /\.uix-table tbody tr:where\(\[data-selected\], \[aria-selected="true"\]\) \{ --uix-text-muted: var\(--uix-text-muted-on-selected\); \}/);
});

/** Each row state: its background (over the surface, as the row paints it) and the muted text it uses. */
const STATES = [
  { state: "plain", bg: "row", muted: "text-muted" },
  { state: "zebra", bg: "row-alt", muted: "text-muted" },
  { state: "pinned", bg: "row-pinned-bg", muted: "text-muted" },
  { state: "hover", bg: "bg-hover", muted: "text-muted" },
  { state: "selected", bg: "row-selected-bg", muted: "text-muted-on-selected" },
  // hover wins the background on a selected row; the muted re-point stays
  { state: "selected + hover", bg: "bg-hover", muted: "text-muted-on-selected" },
];

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: default and muted text clear AA on every row state`, () => {
      const scope = scopeFor(themeBlocks, dark);
      const surface = evaluate("var(--uix-surface)", scope);
      const failures = [];
      for (const { state, bg, muted } of STATES) {
        const back = over(evaluate(`var(--uix-${bg})`, scope), surface);
        for (const token of ["text", muted]) {
          const ratio = contrast(over(evaluate(`var(--uix-${token})`, scope), back), back);
          const key = `${theme} ${dark ? "dark" : "light"}: ${token} on ${state}`;
          if (ratio >= AA) assert.ok(!KNOWN.has(key), `${key} passes now (${ratio.toFixed(2)}:1): drop it from KNOWN`);
          else if (!KNOWN.has(key)) failures.push(`${token} on ${state} (--uix-${bg}): ${ratio.toFixed(2)}:1`);
        }
      }
      assert.deepEqual(failures, []);
    });
  }
}

test("the evaluator reproduces the defect it guards: plain muted text on the light selection tint was 4.37:1 (MOTUS measured 4.36)", () => {
  const scope = scopeFor([], false);
  const bg = over(evaluate("var(--uix-row-selected-bg)", scope), evaluate("var(--uix-surface)", scope));
  assert.equal(contrast(evaluate("var(--uix-text-muted)", scope), bg).toFixed(2), "4.37");
});

test("dark mode is unchanged: the selected-row muted text is the dark muted text", () => {
  const scope = scopeFor([], true);
  assert.deepEqual(evaluate("var(--uix-text-muted-on-selected)", scope), evaluate("var(--uix-text-muted)", scope));
});
