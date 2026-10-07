import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, oklch, over, scopeFor } from "./css-color.mjs";

/*
 * The calm status ramp (HAR-1562). The dark status hues used to be brightened one by one to
 * pass AA, with no shared target: status text ranged 6.8:1 (danger) to 11.2:1 (attention) on
 * the dark surface, out-shouting secondary text, and the solids ran at chroma 0.17-0.22, which
 * glows on near-black. These targets put every hue at one lightness with capped chroma:
 *   - dark TEXT tokens: OKLCH L 74-80 %, C <= 0.10
 *   - dark SOLIDS: C <= 0.14
 *   - dark TINTS: composite over the surface to C <= 0.03
 * and keep every pair AA in both modes. Values are read from the built tokens.css.
 */

const AA = 4.5;
const HUES = ["success", "warning", "info", "danger", "attention", "overdue"];
const TEXT = [...HUES.map((h) => `${h}-text`), "amber-text"];
const SOLID = [...HUES.map((h) => `${h}-solid`), "neutral-solid"];
const TINT = { success: "success-bg", warning: "warning-bg", info: "info-bg", danger: "danger-bg", attention: "attention-bg", overdue: "overdue-bg", amber: "amber-bg" };
/** Text token -> the tint it sits on in a pill/alert. */
const TEXT_ON = { ...Object.fromEntries(Object.entries(TINT).map(([h, bg]) => [`${h}-text`, bg])), "neutral-text": "neutral-bg" };
/** Foreground token -> the solid fill it is painted on. */
const FG_ON = { "success-fg": "success", "warning-fg": "warning", "info-fg": "info", "danger-fg": "danger" };

const dark = scopeFor([], true);
const light = scopeFor([], false);
const color = (scope, name) => evaluate(`var(--uix-${name})`, scope);
const surface = (scope) => color(scope, "surface");

for (const name of TEXT) {
  test(`dark --uix-${name} sits in the status-text band (L 74-80 %, C <= 0.10)`, () => {
    const { L, C } = oklch(color(dark, name));
    assert.ok(L >= 0.74 && L <= 0.8, `L ${(L * 100).toFixed(1)} %`);
    assert.ok(C <= 0.1, `C ${C.toFixed(3)}`);
  });
}

for (const name of SOLID) {
  test(`dark --uix-${name} chroma <= 0.14`, () => {
    const { C } = oklch(color(dark, name));
    assert.ok(C <= 0.14, `C ${C.toFixed(3)}`);
  });
}

for (const name of Object.values(TINT)) {
  test(`dark --uix-${name} composites to a faint wash (C <= 0.03)`, () => {
    for (const backdrop of ["surface", "bg-app"]) {
      const { C } = oklch(over(color(dark, name), color(dark, backdrop)));
      assert.ok(C <= 0.03, `C ${C.toFixed(3)} over --uix-${backdrop}`);
    }
  });
}

for (const [mode, scope] of [["dark", dark], ["light", light]]) {
  for (const [text, tint] of Object.entries(TEXT_ON)) {
    test(`${mode}: --uix-${text} is AA on surface, bg-app and its own tint`, () => {
      const fg = color(scope, text);
      for (const backdrop of ["surface", "bg-app"]) {
        const bg = color(scope, backdrop);
        const plain = contrast(over(fg, bg), bg);
        assert.ok(plain >= AA, `${plain.toFixed(2)}:1 on --uix-${backdrop}`);
        const tinted = over(color(scope, tint), bg);
        const onTint = contrast(over(fg, tinted), tinted);
        assert.ok(onTint >= AA, `${onTint.toFixed(2)}:1 on --uix-${tint} over --uix-${backdrop}`);
      }
    });
  }
  for (const [fg, fill] of Object.entries(FG_ON)) {
    test(`${mode}: --uix-${fg} on --uix-${fill} is AA`, () => {
      const ratio = contrast(color(scope, fg), color(scope, fill));
      assert.ok(ratio >= AA, `${ratio.toFixed(2)}:1`);
    });
  }
}

test("dark status-text contrast spread on the surface is <= 2.0 (was 4.18)", () => {
  const ratios = TEXT.map((name) => contrast(color(dark, name), surface(dark)));
  const spread = Math.max(...ratios) - Math.min(...ratios);
  assert.ok(spread <= 2, `spread ${spread.toFixed(2)} (${ratios.map((r) => r.toFixed(2)).join(", ")})`);
});

test("the neutral family, --uix-success-text and --uix-radius-xl are part of the frozen contract", () => {
  const baseline = readFileSync(new URL("./tokens.baseline.css", import.meta.url), "utf8");
  for (const name of ["neutral-solid", "neutral-text", "neutral-bg", "neutral-border", "success-text", "radius-xl"]) {
    assert.match(baseline, new RegExp(`--uix-${name}\\s*:`), `--uix-${name} missing from tokens.baseline.css`);
  }
});

test("components paint status text with the text role, never the solid role", () => {
  const css = (f) => readFileSync(new URL(`../styles/components/${f}`, import.meta.url), "utf8");
  const offenders = [];
  const solids = /var\(--uix-(success|warning)\)/;
  for (const [file, rule] of [
    ["status-pill.css", /\.uix-pill--success\s*\{[^}]*--tone-fg:\s*([^;]+);/],
    ["status-pill.css", /\.uix-pill--sla-ok\s*\{[^}]*--tone-fg:\s*([^;]+);/],
    ["alert.css", /\.uix-alert--success\s*\{[^}]*--tone-fg:\s*([^;]+);/],
    ["alert.css", /\.uix-alert--warning\s*\{[^}]*--tone-fg:\s*([^;]+);/],
    ["stat-tile.css", /\.uix-stat__trend--up\s*\{\s*color:\s*([^;]+);/],
    ["sla.css", /\.uix-sla\[data-state="ok"\]\s*\{\s*color:\s*([^;]+);/],
  ]) {
    const m = rule.exec(css(file));
    assert.ok(m, `${rule} not found in ${file}`);
    if (solids.test(m[1])) offenders.push(`${file}: ${m[0].trim()}`);
  }
  assert.deepEqual(offenders, []);
});

test("the evaluator reproduces the defect it guards: old dark danger-text was 6.83:1, warning 11.01:1", () => {
  const old = { surface: "#111111", "danger-text": "#F87171", "warning-text": "#FCBB00" };
  const s = evaluate(old.surface, {});
  assert.equal(contrast(evaluate(old["danger-text"], {}), s).toFixed(2), "6.83");
  assert.equal(contrast(evaluate(old["warning-text"], {}), s).toFixed(2), "11.01");
});
