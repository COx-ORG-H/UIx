import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * The choice border (HAR-3071). An unchecked Checkbox or Radio is drawn only by its 1px edge, so
 * WCAG 2.2 SC 1.4.11 asks that edge to reach 3:1 against whatever the control sits on. The edge
 * was --uix-border-strong, 1.2-1.5:1 in both themes (a council judge could not tell the row
 * checkboxes from the rows in dark). --uix-choice-border is measured here from the built
 * tokens.css, for the default palette and every product theme, light and dark, and for the two
 * scopes that re-point it: more contrast (display-preferences.css) and print (print-layout.css).
 *
 * The edge paints over the box's own --uix-surface fill (the background reaches under the
 * border), so a translucent edge is composited over the surface first, then measured against
 * each layer a box can sit on: the surfaces, the plain, zebra and hovered row, the subtle band
 * and the app background.
 */

const NON_TEXT = 3;
const LAYERS = ["surface", "surface-2", "surface-3", "row", "row-alt", "bg-hover", "bg-subtle", "bg-app"];

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const checkboxCss = read("../styles/components/checkbox.css");
const radioCss = read("../styles/components/radio.css");

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

/** The edge as painted (over the box's surface fill) and its ratio against every layer. */
function measure(scope, edgeExpr = "var(--uix-choice-border)") {
  const surface = evaluate("var(--uix-surface)", scope);
  const edge = over(evaluate(edgeExpr, scope), surface);
  return LAYERS.map((layer) => ({ layer, ratio: contrast(edge, over(evaluate(`var(--uix-${layer})`, scope), surface)) }));
}

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    for (const [scopeName, scopeVars] of Object.entries(SCOPES)) {
      const name = `${theme} ${dark ? "dark" : "light"}${scopeName}`;
      test(`${name}: the choice border is >= 3:1 on every layer a checkbox or radio sits on`, () => {
        const scope = { ...scopeFor(themeBlocks, dark), ...scopeVars };
        const failures = measure(scope).filter(({ ratio }) => ratio < NON_TEXT).map(({ layer, ratio }) => `--uix-${layer}: ${ratio.toFixed(2)}:1`);
        assert.deepEqual(failures, []);
      });
    }
  }
}

/** The declaration block of the first rule whose selector is exactly `selector`. */
const ruleBody = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
};

test("an unchecked checkbox, radio and radio-card check draw their edge with --uix-choice-border", () => {
  for (const [css, selector] of [[checkboxCss, ".uix-checkbox__box"], [radioCss, ".uix-radio__dot"], [radioCss, ".uix-radio-card__check"]]) {
    const body = ruleBody(css, selector);
    assert.match(body, /border:\s*1px solid var\(--uix-choice-border\)/, `${selector} edge`);
    assert.doesNotMatch(body, /--uix-border-strong/, `${selector} must not fall back to the 1.5:1 hairline`);
  }
});

test("checked, indeterminate and invalid boxes keep their own edge colour", () => {
  assert.match(checkboxCss, /input:indeterminate \+ \.uix-checkbox__box \{ background: var\(--uix-accent\); border-color: var\(--uix-accent\);/);
  assert.match(checkboxCss, /\.uix-checkbox-group\[data-invalid\] \.uix-checkbox__box \{ border-color: var\(--uix-danger\); \}/);
  assert.match(radioCss, /input:checked \+ \.uix-radio__dot \{ border-color: var\(--uix-accent\); \}/);
});

test("the gate catches the defect it guards: --uix-border-strong as the edge is under 3:1 in both themes", () => {
  const light = Math.min(...measure(scopeFor([], false), "var(--uix-border-strong)").map(({ ratio }) => ratio));
  const dark = Math.min(...measure(scopeFor([], true), "var(--uix-border-strong)").map(({ ratio }) => ratio));
  // the vulnerabilities climb measured 1.48:1 on a light row and about 1.5:1 on a dark one (HAR-3071)
  assert.equal(measure(scopeFor([], false), "var(--uix-border-strong)").find(({ layer }) => layer === "row").ratio.toFixed(2), "1.48");
  assert.ok(light < NON_TEXT && dark < NON_TEXT, `light ${light.toFixed(2)}:1, dark ${dark.toFixed(2)}:1`);
});
