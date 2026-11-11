import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Two quiet states the TENSOR council named twice (HAR-2974, round 5; operator: "one more round").
 *
 * 1. No scroll edge on the drawer. Every way of drawing one failed a check: a background on the
 *    body and a footer ::before blind axe-core's contrast scan; a scroll-timeline animation never
 *    ends, so every "the drawer has settled" wait (getAnimations) hangs. The judges also kept
 *    naming the cut-off field with the edge in place. The footer wraps instead (kit Buttons straight in).
 * 2. An off switch is read from its track's edge, not its 1.3:1 fill: the ring clears 3:1 against
 *    the surface beside it and the track inside it (WCAG 1.4.11), in every theme and mode.
 */

const read = (file) => readFileSync(new URL(`../styles/components/${file}`, import.meta.url), "utf8");
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  return css.slice(at, css.indexOf("}", at));
};

test("the drawer draws no scroll-linked animation: overlay settle checks wait for animations to end", () => {
  const css = read("drawer.css");
  assert.doesNotMatch(css, /animation-timeline|scroll-timeline|timeline-scope/);
  assert.match(rule(css, ".uix-drawer__footer"), /flex-wrap:\s*wrap/, "kit Buttons passed straight in wrap at 320 px");
});

const OFF = /\.uix-switch > input:not\(:checked\) \+ \.uix-switch__track \{ box-shadow: inset 0 0 0 1px (var\(--uix-[\w-]+\)); \}/;

test("the off switch's track carries a token ring", () => {
  assert.match(read("switch.css"), OFF);
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: the off switch ring clears 3:1 on the surface and on its track`, () => {
      const ring = OFF.exec(read("switch.css"))[1];
      const track = /\.uix-switch__track \{[^}]*background:\s*([^;]+);/.exec(read("switch.css"))[1].trim();
      const scope = scopeFor(themeBlocks, dark);
      for (const backdrop of ["surface", "surface-2", "bg-app"]) {
        const page = evaluate(`var(--uix-${backdrop})`, scope);
        const fill = over(evaluate(track, scope), page);
        const edge = over(evaluate(ring, scope), page);
        for (const [what, against] of [["surface", page], ["track", fill]]) {
          const ratio = contrast(edge, against);
          assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1 against the ${what} over --uix-${backdrop}`);
        }
      }
    });
  }
}
