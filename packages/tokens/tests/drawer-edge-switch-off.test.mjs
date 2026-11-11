import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Two quiet states the TENSOR council named twice (HAR-2974, round 5; operator: "one more round").
 *
 * 1. A drawer body that scrolls on below its footer shows a soft edge on its last visible line,
 *    and none once it is scrolled to the end or when it does not scroll: the footer's shadow on the
 *    body's scroll timeline. A background on the body (10 texts) and a ::before on the footer (its
 *    2 buttons) both made axe file text contrast as "incomplete"; a box-shadow does not.
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
  assert.match(css, /\.uix-drawer__footer \{ animation: uix-drawer-more linear both; animation-timeline: --uix-drawer-body; \}/);
  assert.match(css, /@supports \(animation-timeline: scroll\(\)\)/);
  const frames = css.slice(css.indexOf("@keyframes uix-drawer-more"));
  assert.match(frames, /0%, 96% \{[^}]*box-shadow: [^}]*var\(--uix-border-strong\);\s*\}\s*100% \{[^}]*box-shadow: none;\s*\}/, "a shadow outside the footer, no pseudo element");
  assert.doesNotMatch(css, /\.uix-drawer__footer::(before|after)/, "a pseudo element beside the buttons blinds the contrast scan");
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
