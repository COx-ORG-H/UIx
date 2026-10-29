import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Text on a table row in every state (HAR-2635, MOTUS): plain, zebra, pinned, hovered and selected
 * rows, for the default and muted text, in every theme, both modes, and the scopes that set their
 * own muted colour: more contrast (display-preferences.css) and print (print-layout.css). A
 * selected row derives its muted text from the scope's own (table.css): the plain muted grey was
 * 4.36:1 on the light selection tint, on every .uix-cell-sub there and on the frozen id cell, where
 * axe cannot see it (the colour sits in a linear-gradient). A fixed colour regressed every scope
 * with its own muted (PR #179 review), so this checks each of them.
 */

const AA = 4.5; // cell text and .uix-cell-sub are body / meta size, not large text
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const tableCss = read("../styles/components/table.css");

/**
 * Known and reported, not changed here (a theme value is the theme owner's call): the
 * mission-control light theme's own muted text on its own hover tint. A new failure is not
 * allowed in; a fixed one must leave this list (the check in the loop).
 */
const KNOWN = new Map([
  ["mission-control light: text-muted on hover", "4.45:1, #6E6A68 on #ECEAE6; pre-existing in the theme, found by this matrix (PR for HAR-2635)"],
]);

/** The selected row's muted expression from table.css, in terms of the scope's own muted colour. */
const selectedRule = /\.uix-table tbody tr:where\(\[data-selected\], \[aria-selected="true"\]\) \{ --uix-text-muted: (color-mix\([^;]+\)); \}/.exec(tableCss);
const tableMuted = /\.uix-table \{ --uix-table-muted: var\(--uix-text-muted\); \}/.test(tableCss);

test("a selected row derives its muted text from the table's own scope (no fixed colour)", () => {
  assert.ok(tableMuted, "the table keeps its scope's muted colour in --uix-table-muted");
  assert.ok(selectedRule, "a selected row re-points --uix-text-muted to a mix of --uix-table-muted and --uix-text");
  assert.match(selectedRule[1], /var\(--uix-table-muted\)/);
  assert.match(selectedRule[1], /var\(--uix-text\)/);
});
const SELECTED_MUTED = selectedRule[1].replace("var(--uix-table-muted)", "var(--uix-text-muted)");

/** The `--uix-*` declarations of the first rule for `selector` in a stylesheet. */
const declarationsOf = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  return Object.fromEntries([...body.matchAll(/--uix-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};
const SCOPES = {
  "": {},
  " more contrast": declarationsOf(read("../styles/components/display-preferences.css"), ':root[data-contrast="more"]'),
  " print": declarationsOf(read("../styles/components/print-layout.css"), ".uix-print-layout"),
};

/** Each row state: its background (over the surface, as the row paints it) and the muted text it uses. */
const STATES = [
  { state: "plain", bg: "var(--uix-row)", muted: "var(--uix-text-muted)" },
  { state: "zebra", bg: "var(--uix-row-alt)", muted: "var(--uix-text-muted)" },
  { state: "pinned", bg: "var(--uix-row-pinned-bg)", muted: "var(--uix-text-muted)" },
  { state: "hover", bg: "var(--uix-bg-hover)", muted: "var(--uix-text-muted)" },
  { state: "selected", bg: "var(--uix-row-selected-bg)", muted: SELECTED_MUTED },
  // hover wins the background on a selected row; the muted re-point stays
  { state: "selected + hover", bg: "var(--uix-bg-hover)", muted: SELECTED_MUTED },
];

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    for (const [scopeName, scopeVars] of Object.entries(SCOPES)) {
      const name = `${theme} ${dark ? "dark" : "light"}${scopeName}`;
      test(`${name}: default and muted text clear AA on every row state`, () => {
        const scope = { ...scopeFor(themeBlocks, dark), ...scopeVars };
        const surface = evaluate("var(--uix-surface)", scope);
        const failures = [];
        for (const { state, bg, muted } of STATES) {
          const back = over(evaluate(bg, scope), surface);
          for (const [token, expr] of [["text", "var(--uix-text)"], ["text-muted", muted]]) {
            const ratio = contrast(over(evaluate(expr, scope), back), back);
            const key = `${name}: ${token} on ${state}`;
            if (ratio >= AA) assert.ok(!KNOWN.has(key), `${key} passes now (${ratio.toFixed(2)}:1): drop it from KNOWN`);
            else if (!KNOWN.has(key)) failures.push(`${token} on ${state}: ${ratio.toFixed(2)}:1`);
          }
        }
        assert.deepEqual(failures, []);
      });
      test(`${name}: a selected row's muted text is never weaker than the scope's own`, () => {
        const scope = { ...scopeFor(themeBlocks, dark), ...scopeVars };
        const back = over(evaluate("var(--uix-row-selected-bg)", scope), evaluate("var(--uix-surface)", scope));
        const own = contrast(over(evaluate("var(--uix-text-muted)", scope), back), back);
        const derived = contrast(over(evaluate(SELECTED_MUTED, scope), back), back);
        assert.ok(derived >= own - 0.005, `${derived.toFixed(2)}:1 < the scope's own ${own.toFixed(2)}:1`);
      });
    }
  }
}

test("the evaluator reproduces the defect it guards: plain muted text on the light selection tint was 4.37:1 (MOTUS measured 4.36)", () => {
  const scope = scopeFor([], false);
  const bg = over(evaluate("var(--uix-row-selected-bg)", scope), evaluate("var(--uix-surface)", scope));
  assert.equal(contrast(evaluate("var(--uix-text-muted)", scope), bg).toFixed(2), "4.37");
});
