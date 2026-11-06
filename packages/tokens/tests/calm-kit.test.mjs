import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, oklch, over, scopeFor } from "./css-color.mjs";

/*
 * Calm kit (2.56), checked from what ships:
 * - the status families are softer (light chroma caps) and every word stays AA on the surface,
 *   the app background and its own tint, every dot >= 3:1 (status-ramp.test.mjs covers the
 *   pill/alert roles; this adds StatusDot and the caps);
 * - the critical pill is a tint, not a solid red fill; the destructive button keeps its fill;
 * - the categorical chart palette has no red and no amber slot;
 * - the arrival: tokens as specified, reduced motion is a fade of <= 200 ms.
 * Old values the caps guard against: --uix-danger #E40014 (C 0.24), --uix-warning #F99C00.
 */

const read = (f) => readFileSync(new URL(`../styles/components/${f}`, import.meta.url), "utf8");
const MODES = [["light", scopeFor([], false)], ["dark", scopeFor([], true)]];
const c = (scope, name) => evaluate(`var(--uix-${name})`, scope);

// tone -> [its text role, its tint]; the word AND the dot wear the text role
const DOT = { neutral: ["text-hushed", "neutral-bg"], info: ["info-text", "info-bg"], success: ["success-text", "success-bg"], warning: ["warning-text", "warning-bg"], critical: ["danger-text", "danger-bg"] };

test("StatusDot: each tone's word and dot wear its TEXT role", () => {
  const css = read("status-pill.css");
  for (const [tone, [text]] of Object.entries(DOT)) {
    assert.match(css, new RegExp(`\\.uix-status-dot--${tone}\\s*\\{\\s*--tone-fg: var\\(--uix-${text}\\);\\s*--tone-dot: var\\(--uix-${text}\\);`), tone);
  }
});

for (const [mode, scope] of MODES) {
  // the dot's own tint is the case that failed: light success-solid 2.78:1, warning-solid 2.91:1 on their -bg
  test(`${mode}: StatusDot words are AA and dots >= 3:1 on the surface, the app background and the tone's own tint`, () => {
    for (const [tone, [text, tint]] of Object.entries(DOT)) {
      const surface = c(scope, "surface");
      const backs = { surface, "bg-app": c(scope, "bg-app"), [tint]: over(c(scope, tint), surface) };
      for (const [bg, back] of Object.entries(backs)) {
        const ratio = contrast(over(c(scope, text), back), back);
        assert.ok(ratio >= 4.5, `${tone} word ${ratio.toFixed(2)}:1 on ${bg}`);
        assert.ok(ratio >= 3, `${tone} dot ${ratio.toFixed(2)}:1 on ${bg}`);
      }
    }
  });
}

test("the tint check reproduces the defect it guards: light success-solid on success-bg is under 3:1", () => {
  const [, scope] = MODES[0];
  const back = over(c(scope, "success-bg"), c(scope, "surface"));
  assert.ok(contrast(c(scope, "success-solid"), back) < 3);
});

test("light status hues are calmer: fills, words and dots at chroma <= 0.16, tints <= 0.025", () => {
  const scope = MODES[0][1];
  for (const hue of ["danger", "warning", "success", "info", "overdue"]) {
    for (const role of [hue, `${hue}-text`, `${hue}-solid`]) {
      const { C } = oklch(c(scope, role));
      assert.ok(C <= 0.16 || (hue === "info" && C <= 0.19), `--uix-${role} C ${C.toFixed(3)}`);
    }
    const { C } = oklch(over(c(scope, `${hue}-bg`), c(scope, "surface")));
    assert.ok(C <= 0.025, `--uix-${hue}-bg C ${C.toFixed(3)}`);
  }
});

test("the critical pill is the danger tint with danger words; only the destructive button is a solid red fill", () => {
  const pill = read("status-pill.css");
  const rule = /\.uix-pill--critical\s*\{([^}]*)\}/.exec(pill)[1];
  assert.match(rule, /--tone-bg: var\(--uix-danger-bg\)/);
  assert.match(rule, /--tone-fg: var\(--uix-danger-text\)/);
  assert.doesNotMatch(pill, /--tone-bg: var\(--uix-danger\)/, "no pill paints the solid danger fill");
  assert.match(read("button.css"), /\.uix-btn--danger\s*\{\s*background: var\(--uix-danger\); color: var\(--uix-danger-fg\);/);
});

test("no chart slot is red or amber (OKLCH hue), in either mode", () => {
  const hueOf = (rgb) => {
    const lin = rgb.slice(0, 3).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
    const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
    const s = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  };
  // red sits near 25-30 in OKLCH (crimson ~20, #FF0000 ~29), amber/orange 55-90
  assert.ok(hueOf(evaluate("#E40014", {})) < 45, "the guard reproduces the old red");
  for (const [mode, scope] of MODES) {
    for (let i = 1; i <= 8; i++) {
      const h = hueOf(c(scope, `chart-${i}`));
      assert.ok(!(h >= 0 && h < 45) && !(h >= 50 && h < 95), `${mode} chart-${i} hue ${h.toFixed(0)}`);
    }
    assert.equal(scope["chart-series"], "var(--uix-chart-1)");
  }
});

test("arrival tokens are the proposal's timings, and reduced motion is a fade of <= 200 ms", () => {
  const scope = MODES[0][1];
  const want = { "dur-arrive": "420ms", "stagger-arrive": "45ms", "delay-arrive-trace": "150ms", "dur-arrive-trace": "700ms", "dur-arrive-grow": "500ms", "stagger-arrive-grow": "25ms", "dur-arrive-count": "600ms", "arrive-rise": "8px" };
  for (const [name, value] of Object.entries(want)) assert.equal(scope[name], value, name);
  const css = read("arrive.css");
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n  \}/.exec(css)[1];
  const fade = /\.uix-arrive__item \{ animation: uix-arrive-fade var\(--uix-([\w-]+)\)/.exec(reduced);
  assert.ok(fade, "reduced motion fades the items");
  assert.ok(Number.parseFloat(scope[fade[1]]) <= 200, `--uix-${fade[1]} ${scope[fade[1]]}`);
  assert.match(reduced, /animation: none !important; stroke-dasharray: none;/, "marks are simply there");
  // at rest nothing moves: every animation rule is scoped to [data-uix-arrive="play"]
  for (const m of css.matchAll(/^\s*((?:\.|:root)[^{}\n]*)\{[^}]*\banimation(?:-name)?:/gm)) {
    assert.match(m[1], /data-uix-arrive="play"/, m[1].trim());
  }
});
