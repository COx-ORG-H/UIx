import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * A form control's edge (TENSOR HAR-2974). An empty input is filled with the surface it sits on,
 * so its border is the only thing that shows where to type: a graphical object that needs 3:1
 * against its surroundings (WCAG 1.4.11). On dark the hairline --uix-border is .08 white, which
 * measured 1.2:1 in a TENSOR drawer; the operator chose the 3:1 edge (2026-11-11). Light keeps
 * the hairline it had: that was not part of the decision, so it is pinned, not raised.
 */

const NON_TEXT = 3;
const BACKDROPS = ["bg-app", "bg-subtle", "surface", "surface-2", "surface-3"];

for (const [theme, themeBlocks] of Object.entries(themes)) {
  test(`${theme} dark: a control edge clears 3:1 on every dark surface, resting and under the pointer`, () => {
    const scope = scopeFor(themeBlocks, true);
    for (const token of ["control-border", "control-border-hover"]) {
      for (const backdrop of BACKDROPS) {
        const page = evaluate(`var(--uix-${backdrop})`, scope);
        const edge = over(evaluate(`var(--uix-${token})`, scope), page);
        const ratio = contrast(edge, page);
        assert.ok(ratio >= NON_TEXT, `--uix-${token} ${ratio.toFixed(2)}:1 on --uix-${backdrop} (need ${NON_TEXT})`);
      }
    }
  });

  test(`${theme}: the edge under the pointer is stronger than the resting edge, in both modes`, () => {
    for (const dark of [false, true]) {
      const scope = scopeFor(themeBlocks, dark);
      const page = evaluate("var(--uix-surface)", scope);
      const rest = contrast(over(evaluate("var(--uix-control-border)", scope), page), page);
      const hover = contrast(over(evaluate("var(--uix-control-border-hover)", scope), page), page);
      assert.ok(hover > rest, `${dark ? "dark" : "light"}: hover ${hover.toFixed(2)}:1 is not above rest ${rest.toFixed(2)}:1`);
    }
  });
}

test("light keeps the hairline: the control edge is --uix-border, its hover --uix-border-strong", () => {
  const tokens = JSON.parse(readFileSync(new URL("../tokens/base/color.json", import.meta.url), "utf8"));
  assert.equal(tokens["control-border"].$value, "var(--uix-border)");
  assert.equal(tokens["control-border-hover"].$value, "var(--uix-border-strong)");
});

test("every form control draws its edge from the control tokens, not the hairline", () => {
  const rules = {
    "input.css": [".uix-input {", ".uix-otp__cell {"],
    "textarea.css": [".uix-textarea {"],
    "select.css": [".uix-select {", ".uix-select-trigger {"],
    "tag-input.css": [".uix-taginput {"],
  };
  for (const [file, selectors] of Object.entries(rules)) {
    const css = readFileSync(new URL(`../styles/components/${file}`, import.meta.url), "utf8");
    for (const selector of selectors) {
      const at = css.indexOf(selector);
      assert.ok(at >= 0, `${selector} not found in ${file}`);
      const body = css.slice(at, css.indexOf("}", at));
      assert.match(body, /border:\s*1px solid var\(--uix-control-border\)/, `${selector} in ${file}`);
    }
  }
});
