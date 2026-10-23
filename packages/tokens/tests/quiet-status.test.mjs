import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor } from "./css-color.mjs";

/*
 * Quiet status defaults (HAR-1563, colour K2), checked from the stylesheets that ship.
 *
 * - StatusPill `dot`: no fill, the label in --uix-neutral-text (= text-hushed), the dot in the
 *   tone's *-solid. `outline`: a neutral hairline and a hushed label; only critical keeps a
 *   toned border. `filled` stays the default look (the React prop accepts it as `soft`).
 * - Stat: the trend chip is neutral unless `sentiment` says otherwise; direction never colours
 *   it. A toned tile keeps a neutral border and leads its value with a dot.
 * - Alert: the warning icon is the text role (>= 3:1 on its tint, WCAG 1.4.11) and the
 *   borders are a 24 % hairline of the tone.
 * The rendered colours are measured in Chromium by tests/a11y/quiet-status.spec.mjs.
 */

const read = (f) => readFileSync(new URL(`../styles/components/${f}`, import.meta.url), "utf8");
const pill = read("status-pill.css");
const stat = read("stat-tile.css");
const alert = read("alert.css");

/** The declarations of every rule whose selector list is exactly `selector`. */
const rules = (source, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = [...source.matchAll(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
  assert.ok(found.length > 0, `${selector} has no rule`);
  return Object.fromEntries(found.join(";").split(";").map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([n, v]) => n && v));
};

test("dot pill: transparent, no inline padding, neutral label, the dot in the tone's solid", () => {
  const dot = rules(pill, ".uix-pill--dot");
  assert.equal(dot.background, "transparent");
  assert.equal(dot["padding-inline"], "0");
  assert.equal(dot.color, "var(--uix-neutral-text)");
  assert.equal(rules(pill, ".uix-pill--dot .uix-pill__dot").background, "var(--tone-solid, var(--uix-neutral-solid))");
  assert.match(pill, /\.uix-pill--danger, \.uix-pill--critical, \.uix-pill--p1 \{ --tone-solid: var\(--uix-danger-solid\); \}/);
  // a size never gives the dot treatment its box back
  assert.equal(rules(pill, ".uix-pill--dot:is(.uix-pill--sm, .uix-pill--lg)")["padding-inline"], "0");
});

test("outline pill: neutral hairline and hushed label; only critical keeps a toned border", () => {
  const outline = rules(pill, ".uix-pill--outline");
  assert.equal(outline.border, "1px solid var(--uix-neutral-border)");
  assert.equal(outline.color, "var(--uix-neutral-text)");
  assert.doesNotMatch(pill, /color-mix\(in srgb, var\(--tone-fg\)/, "the old hue-tinted outline border is gone");
  assert.equal(rules(pill, ".uix-pill--outline.uix-pill--critical")["border-color"], "var(--uix-danger-solid)");
  // --uix-neutral-text is text-hushed and --uix-neutral-border is border-strong (HAR-1562)
  const scope = scopeFor([], false);
  assert.equal(scope["neutral-text"], "var(--uix-text-hushed)");
  assert.equal(scope["neutral-border"], "var(--uix-border-strong)");
});

test("progress is the info tone under the policy's name", () => {
  assert.match(pill, /\.uix-pill--progress \{ --tone-bg: var\(--uix-info-bg\); --tone-fg: var\(--uix-info-text\);/);
});

test("stat trend: neutral by default, coloured only by sentiment, never by direction", () => {
  const chip = rules(stat, ".uix-stat__trend");
  assert.equal(chip.color, "var(--uix-neutral-text)");
  assert.equal(chip.background, "var(--uix-neutral-bg)");
  assert.doesNotMatch(stat, /\.uix-stat__trend--(up|down)\s*\{/, "a direction class carries no colour");
  assert.equal(rules(stat, ".uix-stat__trend--negative").color, "var(--uix-danger-text)");
  assert.equal(rules(stat, ".uix-stat__trend--positive").color, "var(--uix-success-text)");
});

test("toned stat tile: neutral border, toned value led by a dot", () => {
  assert.doesNotMatch(stat, /border-color:\s*var\(--uix-(warning|danger)-border\)/);
  assert.equal(rules(stat, ".uix-stat:is(.uix-stat--warning, .uix-stat--danger) .uix-stat__value").color, "var(--stat-tone-text)");
  const dot = rules(stat, ".uix-stat:is(.uix-stat--warning, .uix-stat--danger) .uix-stat__value::before");
  assert.equal(dot.background, "var(--stat-tone-solid)");
  assert.equal(dot["border-radius"], "50%");
});

test("alert borders are a 24 % hairline of the tone", () => {
  for (const tone of ["info", "success", "warning", "danger"]) {
    assert.match(alert, new RegExp(`\\.uix-alert--${tone}\\s*\\{[^}]*--tone-border: color-mix\\(in srgb, var\\(--uix-${tone}\\) 24%, transparent\\)`));
  }
});

for (const dark of [false, true]) {
  test(`${dark ? "dark" : "light"}: the warning alert icon is >= 3:1 on its tint (WCAG 1.4.11)`, () => {
    assert.match(alert, /\.uix-alert--warning\s*\{[^}]*--tone-fg: var\(--uix-warning-text\)/);
    const scope = scopeFor([], dark);
    const c = (n) => evaluate(`var(--uix-${n})`, scope);
    const tint = over(c("warning-bg"), c("surface"));
    const ratio = contrast(over(c("warning-text"), tint), tint);
    assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1`);
  });
  test(`${dark ? "dark" : "light"}: a neutral trend chip and a dot pill's label are AA`, () => {
    const scope = scopeFor([], dark);
    const c = (n) => evaluate(`var(--uix-${n})`, scope);
    const surface = c("surface");
    const chip = over(c("neutral-bg"), surface);
    assert.ok(contrast(over(c("neutral-text"), chip), chip) >= 4.5);
    assert.ok(contrast(over(c("neutral-text"), surface), surface) >= 4.5);
  });
}

// Review of #165: in the dot and outline treatments the dot is the only mark of the tone, so every
// tone's dot clears 3:1 on the surface in both themes (the pale light solids were 2.06 to 2.82).
for (const dark of [false, true]) {
  test(`${dark ? "dark" : "light"}: every pill dot (--tone-solid) is at least 3:1 on the surface`, () => {
    const scope = scopeFor([], dark);
    const surface = evaluate("var(--uix-surface)", scope);
    const low = [];
    let rules = 0;
    for (const m of pill.matchAll(/([^{}]+)\{\s*--tone-solid:\s*([^;]+);\s*\}/g)) {
      const value = m[2].replace(/var\(--uix-([\w-]+)\)/g, (_, n) => `var(--uix-${n})`);
      const colour = evaluate(value, scope);
      const ratio = contrast(over(colour, surface), surface);
      if (ratio < 3) low.push(`${m[1].trim()}: ${ratio.toFixed(2)}`);
      rules += 1;
    }
    assert.ok(rules >= 8, `found ${rules} --tone-solid rules`);
    assert.deepEqual(low, []);
  });
}
