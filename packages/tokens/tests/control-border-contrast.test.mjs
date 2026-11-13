import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * A form control's edge at 3:1 in both themes (TENSOR HAR-2974; the kit test of HAR-3104). An empty
 * input is filled with the surface it sits on, so its border is the only thing that shows where to
 * type: a graphical object that needs 3:1 against its surroundings (WCAG 1.4.11). The hairline
 * --uix-border measured 1.2:1 in both themes. Dark: the operator chose the 3:1 edge (2026-11-11).
 * Light: the operator chose the lightest edge that clears 3:1, from a picture of three (2026-11-13).
 * Painted over the white fill, .44 measured 2.92:1 on mission-control's off-white, so the lightest
 * edge that clears it is rgba(0,0,0,.45); this test pins that choice.
 */

const NON_TEXT = 3;
const BACKDROPS = ["bg-app", "bg-subtle", "surface", "surface-2", "surface-3"];

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: a control edge clears 3:1 on every surface, resting and under the pointer`, () => {
      const scope = scopeFor(themeBlocks, dark);
      // The edge paints over the control's own fill (--uix-surface), not over the page around it.
      const fill = evaluate("var(--uix-surface)", scope);
      for (const token of ["control-border", "control-border-hover"]) {
        for (const backdrop of BACKDROPS) {
          const page = evaluate(`var(--uix-${backdrop})`, scope);
          const edge = over(evaluate(`var(--uix-${token})`, scope), fill);
          const ratio = contrast(edge, page);
          assert.ok(ratio >= NON_TEXT, `${dark ? "dark" : "light"} --uix-${token} ${ratio.toFixed(2)}:1 on --uix-${backdrop} (need ${NON_TEXT})`);
        }
      }
    });
  }

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

test("light is the operator's edge: rgba(0,0,0,.45) resting, .56 under the pointer", () => {
  const tokens = JSON.parse(readFileSync(new URL("../tokens/base/color.json", import.meta.url), "utf8"));
  assert.equal(tokens["control-border"].$value, "rgba(0,0,0,.45)");
  assert.equal(tokens["control-border-hover"].$value, "rgba(0,0,0,.56)");
});

/** The `--uix-*` declarations of the first rule for `selector` in a stylesheet. */
const declarationsOf = (file, selector) => {
  const css = readFileSync(new URL(`../styles/components/${file}`, import.meta.url), "utf8");
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found in ${file}`);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  return Object.fromEntries([...body.matchAll(/--uix-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
};

// The dark edge is a fixed value, so a scope that re-points the hairline re-points the edge too.
test("more contrast and print draw the control edge from their own hairline", () => {
  const more = declarationsOf("display-preferences.css", ':root[data-contrast="more"]');
  assert.equal(more["control-border"], "var(--uix-border)");
  assert.equal(more["control-border-hover"], "var(--uix-border-strong)");
  const print = declarationsOf("print-layout.css", ".uix-print-layout");
  assert.equal(print["control-border"], print.border);
  assert.equal(print["control-border-hover"], print["border-strong"]);
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
