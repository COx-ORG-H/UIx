import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * The usage roles (HAR-2816, Foundations › Usage roles): surface, text, interactive, selected,
 * disabled and the five status roles. Every pair a role promises is measured here from the
 * built tokens.css, in light and dark, for the default palette and every product theme.
 *
 *   - surface: the three page layers are distinct steps, never the same colour;
 *   - text: primary, hushed and muted text are AA (4.5:1) on every surface layer;
 *   - interactive: the label on a primary button and a link are AA, the focus ring is >= 3:1;
 *   - selected: the selected hairline is >= 3:1 on the track and on the selected fill;
 *   - disabled: the disabled label stays readable (>= 3:1) and sits >= 2:1 away from the
 *     enabled label, and the button CSS drops the fill instead of fading the control;
 *   - status: each role's words are AA on the surface, the app background and its own tint,
 *     and its dot is >= 3:1. Neutral is the default and critical is never a solid fill.
 */

const AA = 4.5;
const NON_TEXT = 3;
const LAYERS = ["bg-app", "surface", "bg-subtle"];
/** Role -> the text token its words wear and the tint it may sit on (StatusDot / soft pill). */
const STATUS = {
  neutral: { text: "neutral-text", tint: "neutral-bg" },
  info: { text: "info-text", tint: "info-bg" },
  success: { text: "success-text", tint: "success-bg" },
  warning: { text: "warning-text", tint: "warning-bg" },
  critical: { text: "danger-text", tint: "danger-bg" },
};

/*
 * Known gaps in product themes, measured when this gate arrived (2026-11-09). Each is the product
 * theme's own override, not the shared palette; the list may only shrink. A listed check that
 * starts passing fails too, so it is removed the day its theme is fixed.
 */
const KNOWN_GAPS = new Set([
  "mission-control light: interactive", // --uix-link on --uix-bg-app 3.15:1
  "mission-control light: critical", // --uix-danger-text on its tint 4.43:1
  "mission-control dark: surface", // bg-app and surface are the same colour
  "mission-control dark: selected", // so the selected fill equals the track
  "posx light: interactive", // --uix-link on --uix-bg-app 3.16:1
]);
/** Run `check`, or prove a known gap is still a gap. */
const gated = (key, check) => () => {
  if (!KNOWN_GAPS.has(key)) return check();
  assert.throws(check, assert.AssertionError, `${key} passes now: remove it from KNOWN_GAPS`);
};

const css = (f) => readFileSync(new URL(`../styles/components/${f}`, import.meta.url), "utf8");
const button = css("button.css");
const pill = css("status-pill.css");

for (const [themeName, blocks] of Object.entries(themes)) {
  for (const mode of ["light", "dark"]) {
    const scope = scopeFor(blocks, mode === "dark");
    const color = (name) => evaluate(`var(--uix-${name})`, scope);
    /** A possibly translucent token composited over an opaque layer. */
    const on = (name, layer) => over(color(name), color(layer));
    const label = `${themeName} ${mode}`;

    test(`${label}: surface layers are three distinct steps`, gated(`${label}: surface`, () => {
      const [app, surface, subtle] = LAYERS.map((l) => color(l).slice(0, 3).join());
      assert.notEqual(app, surface, "bg-app and surface");
      assert.notEqual(surface, subtle, "surface and bg-subtle");
    }));

    test(`${label}: text, hushed and muted text are AA on every surface layer`, gated(`${label}: text`, () => {
      for (const layer of LAYERS) {
        for (const text of ["text", "text-hushed", "text-muted"]) {
          const ratio = contrast(on(text, layer), color(layer));
          assert.ok(ratio >= AA, `--uix-${text} on --uix-${layer}: ${ratio.toFixed(2)}:1`);
        }
      }
    }));

    test(`${label}: interactive label, link and focus ring`, gated(`${label}: interactive`, () => {
      const primary = contrast(color("accent-fg"), color("accent"));
      assert.ok(primary >= AA, `accent-fg on accent ${primary.toFixed(2)}:1`);
      for (const layer of ["bg-app", "surface"]) {
        const link = contrast(on("link", layer), color(layer));
        assert.ok(link >= AA, `link on ${layer} ${link.toFixed(2)}:1`);
        const ring = contrast(on("ring", layer), color(layer));
        assert.ok(ring >= NON_TEXT, `ring on ${layer} ${ring.toFixed(2)}:1`);
      }
    }));

    test(`${label}: the selected hairline marks the choice on the track and on its fill`, gated(`${label}: selected`, () => {
      const track = color("bg-subtle");
      const fill = on("selected-bg", "bg-subtle");
      assert.notEqual(fill.slice(0, 3).join(), track.slice(0, 3).join(), "selected fill differs from the track");
      for (const [name, bg] of [["track", track], ["selected fill", fill]]) {
        const ratio = contrast(over(color("selected-border"), bg), bg);
        assert.ok(ratio >= NON_TEXT, `selected-border on the ${name}: ${ratio.toFixed(2)}:1`);
      }
      const text = contrast(over(color("text"), fill), fill);
      assert.ok(text >= AA, `selected label ${text.toFixed(2)}:1`);
    }));

    test(`${label}: disabled stays readable and reads apart from enabled`, gated(`${label}: disabled`, () => {
      for (const layer of ["bg-app", "surface"]) {
        const bg = color(layer);
        const readable = contrast(on("disabled-text", layer), bg);
        assert.ok(readable >= NON_TEXT, `disabled-text on ${layer} ${readable.toFixed(2)}:1`);
        const apart = contrast(on("disabled-text", layer), on("text", layer));
        assert.ok(apart >= 2, `disabled vs enabled label on ${layer}: ${apart.toFixed(2)}:1`);
      }
    }));

    for (const [role, { text, tint }] of Object.entries(STATUS)) {
      test(`${label}: ${role} words are AA on surface, bg-app and the ${role} tint (the dot wears the words' token)`, gated(`${label}: ${role}`, () => {
        for (const layer of ["surface", "bg-app"]) {
          const bg = color(layer);
          const plain = contrast(on(text, layer), bg);
          assert.ok(plain >= AA, `--uix-${text} on --uix-${layer} ${plain.toFixed(2)}:1`);
          const tinted = over(color(tint), bg);
          const onTint = contrast(over(color(text), tinted), tinted);
          assert.ok(onTint >= AA, `--uix-${text} on --uix-${tint} over --uix-${layer} ${onTint.toFixed(2)}:1`);
        }
      }));
    }
  }
}

/** The declarations of every rule whose selector list is exactly `selector`. */
const rules = (source, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = [...source.matchAll(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
  assert.ok(found.length > 0, `${selector} has no rule`);
  return Object.fromEntries(found.join(";").split(";").map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]).filter(([n, v]) => n && v));
};

test("a disabled button drops its fill and keeps a hairline instead of fading (no colour-only cue)", () => {
  const disabled = rules(button, '.uix-btn:disabled:not([data-pending], [data-loading]), .uix-btn[aria-disabled="true"]:not([data-pending], [data-loading])');
  assert.equal(disabled.background, "transparent");
  assert.equal(disabled.color, "var(--uix-disabled-text)");
  assert.equal(disabled["border-color"], "var(--uix-disabled-border)");
  assert.equal(disabled.cursor, "not-allowed");
  assert.equal(disabled.opacity, undefined, "no opacity fade");
  assert.doesNotMatch(button, /:disabled[^{]*\{[^}]*opacity:\s*\.5/, "the old 50 % fade is gone");
  // a reason keeps the pointer so the tooltip can show; without one, aria-disabled ignores it
  assert.equal(rules(button, '.uix-btn[aria-disabled="true"]:not([data-disabled-reason])')["pointer-events"], "none");
  // a link button stays a bare link: its border reset outranks the disabled hairline (0,3,0, later)
  assert.equal(rules(button, '.uix-btn.uix-btn--link:is(:disabled, [aria-disabled="true"])')["border-color"], "transparent");
  // a pending button is aria-disabled (or natively disabled too) but keeps its full colour
  assert.equal(rules(button, ".uix-btn[data-pending], .uix-btn:has(> [data-uix-btn-busy])").opacity, "1");
});

test("the five status roles map onto StatusDot tones, and the dot is the words' colour", () => {
  for (const [role, { text }] of Object.entries(STATUS)) {
    const tone = role === "neutral" ? "var(--uix-text-hushed)" : `var(--uix-${text})`;
    const dot = rules(pill, `.uix-status-dot--${role}`);
    assert.equal(dot["--tone-fg"], tone, role);
    assert.equal(dot["--tone-dot"], tone, role);
  }
});

test("the role tokens are aliases, part of the frozen contract", () => {
  const baseline = readFileSync(new URL("./tokens.baseline.css", import.meta.url), "utf8");
  const scope = scopeFor([], false);
  for (const [name, alias] of [["selected-bg", "surface"], ["selected-border", "text-muted"], ["disabled-text", "text-muted"], ["disabled-border", "border"]]) {
    assert.equal(scope[name], `var(--uix-${alias})`, name);
    assert.match(baseline, new RegExp(`--uix-${name}\\s*:`), `--uix-${name} missing from tokens.baseline.css`);
  }
});
