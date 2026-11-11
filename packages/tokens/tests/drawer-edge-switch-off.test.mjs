import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Two quiet states the TENSOR council named twice (HAR-2974, round 5; operator: "one more round").
 *
 * 1. A drawer body that scrolls on below its footer shows a soft edge on its last visible line,
 *    and none once it is scrolled to the end or when it does not scroll: an opacity keyframe on
 *    the body's scroll timeline. (A background on the body did the same, but axe cannot measure
 *    text contrast over a background image: 10 drawer texts went from "pass" to "incomplete".)
 *    Checked in Chromium, also under reduced motion; without timeline support there is no edge.
 * 2. An off switch is read from its track's edge, not its 1.3:1 fill: the ring clears 3:1 against
 *    the surface beside it and the track inside it (WCAG 1.4.11), in every theme and mode.
 */

const read = (file) => readFileSync(new URL(`../styles/components/${file}`, import.meta.url), "utf8");
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  return css.slice(at, css.indexOf("}", at));
};

test("the drawer's scroll edge rides the body's scroll timeline and paints nothing behind the text", () => {
  const css = read("drawer.css");
  assert.match(rule(css, ".uix-drawer__body"), /scroll-timeline:\s*--uix-drawer-body block/);
  assert.doesNotMatch(rule(css, ".uix-drawer__body"), /background/, "a background under the fields blinds the contrast scan");
  assert.match(css, /\.uix-drawer \{ timeline-scope: --uix-drawer-body; \}/, "the footer can read its sibling's timeline");
  const edge = rule(css, ".uix-drawer__footer::before");
  assert.match(edge, /opacity:\s*0;/, "no edge while the body does not scroll");
  assert.match(edge, /animation-timeline:\s*--uix-drawer-body/);
  assert.match(edge, /pointer-events:\s*none/);
  assert.match(css, /@supports \(animation-timeline: scroll\(\)\)/);
  assert.match(css, /@keyframes uix-drawer-more \{ 0%, 96% \{ opacity: 1; \} 100% \{ opacity: 0; \} \}/, "opacity only");
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
