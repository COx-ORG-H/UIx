import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor } from "./css-color.mjs";

/*
 * Dark-theme structure (HAR-3087, HAR-3088, HAR-3085). On near-black, the step that separates a
 * light page from its card does not show: every TENSOR council judge named the dark rows, cards and
 * page as blending together, in every round, and never the light ones. The text contrast probe
 * passed throughout, so this pins the structure instead: edges, surface steps, the selected row and
 * the peek backdrop, measured on what ships (tokens.css) and composited the way the page paints them.
 * Light is pinned unchanged. The operator chose the values from a picture pair (2026-11-12).
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const light = scopeFor([], false);
const dark = scopeFor([], true);
const color = (expr, scope) => evaluate(expr, scope);
/** An edge or a tint as the page paints it: composited over the surface it sits on. */
const on = (expr, backExpr, scope) => {
  const back = color(backExpr, scope);
  return contrast(over(color(expr, scope), back), back);
};
const step = (a, b, scope) => contrast(color(a, scope), color(b, scope));

test("dark: row dividers and card edges read on the card and on the page", () => {
  assert.ok(on("var(--uix-border)", "var(--uix-surface)", dark) >= 1.35, "border on the card");
  // a card's edge paints over the card's own background (background-clip: border-box) and is seen
  // against the page outside it
  const edge = over(color("var(--uix-border)", dark), color("var(--uix-surface)", dark));
  assert.ok(contrast(edge, color("var(--uix-bg-app)", dark)) >= 1.35, "the card edge against the page");
  assert.ok(on("var(--uix-border-strong)", "var(--uix-surface)", dark) >= 1.8, "border-strong on the card");
  // the strong edge stays a step above the plain one
  assert.ok(on("var(--uix-border-strong)", "var(--uix-surface)", dark) > on("var(--uix-border)", "var(--uix-surface)", dark) + 0.3);
});

test("dark: page, card and table header are three visible steps", () => {
  assert.ok(step("var(--uix-bg-app)", "var(--uix-surface)", dark) >= 1.06, "page against card");
  assert.ok(step("var(--uix-surface)", "var(--uix-surface-2)", dark) >= 1.08, "card against the header band");
  // the header band is the raised surface, and the frozen header cells follow it
  const table = read("../styles/components/table.css");
  assert.match(table, /\.uix-table thead th \{[^}]*background: var\(--uix-surface-2\)/);
  assert.match(table, /\.uix-table--pinned-col thead th:first-child, \.uix-table--pinned-actions thead th:last-child \{[^}]*background: var\(--uix-surface-2\)/);
  assert.match(read("../styles/components/data-workspace.css"), /\.uix-data-workspace__grid--pin-id thead th:nth-child\(2\) \{[^}]*background: var\(--uix-surface-2\)/);
});

test("dark: the card's top highlight is a visible lit edge, since a black shadow cannot show on the page", () => {
  const shadow = dark["shadow-sm"];
  const alpha = Number(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/.exec(shadow)?.[1]);
  assert.ok(alpha >= 0.07, `top highlight alpha ${alpha}`);
});

test("dark: a selected row reads apart from plain, zebra, hover and pinned rows (HAR-3088)", () => {
  const surface = color("var(--uix-surface)", dark);
  const paint = (expr) => over(color(expr, dark), surface);
  const selected = paint("var(--uix-row-selected-bg)");
  for (const [name, expr] of [["plain", "var(--uix-row)"], ["zebra", "var(--uix-row-alt)"], ["pinned", "var(--uix-row-pinned-bg)"]]) {
    assert.ok(contrast(selected, paint(expr)) >= 1.3, `selected against ${name}: ${contrast(selected, paint(expr)).toFixed(2)}:1`);
  }
  // hover differs from selected: by luminance or by hue (selection is the accent wash, hover is neutral)
  const hover = paint("var(--uix-bg-hover)");
  const blueShift = (c) => c[2] - c[0];
  assert.ok(contrast(selected, hover) >= 1.15 || Math.abs(blueShift(selected) - blueShift(hover)) > 0.1);
});

test("dark: the list beside a peek stays legible under its backdrop (HAR-3085)", () => {
  const scrim = color("var(--uix-scrim-peek)", dark);
  for (const [rowName, rowExpr] of [["plain", "var(--uix-row)"], ["zebra", "var(--uix-row-alt)"]]) {
    const row = over(color(rowExpr, dark), color("var(--uix-surface)", dark));
    const dimmedRow = over(scrim, row);
    for (const [textName, textExpr] of [["text", "var(--uix-text)"], ["muted", "var(--uix-text-muted)"]]) {
      const dimmedText = over(scrim, over(color(textExpr, dark), row));
      const ratio = contrast(dimmedText, dimmedRow);
      assert.ok(ratio >= 3, `${textName} on a dimmed ${rowName} row: ${ratio.toFixed(2)}:1`);
    }
  }
  // it still dims: the page behind reads as behind
  assert.ok(scrim[3] >= 0.25, `peek scrim alpha ${scrim[3]}`);
  // the peek uses its own token; modal and drawer keep the heavier --uix-scrim
  assert.match(read("../styles/components/peek.css"), /\.uix-peek::backdrop \{[^}]*background: var\(--uix-scrim-peek\)/);
  assert.equal(dark.scrim, "rgba(0,0,0,.5)");
});

test("light is unchanged: page, card, raised surface, edges, selection and the peek backdrop", () => {
  assert.deepEqual(
    Object.fromEntries(["bg-app", "surface", "surface-2", "border", "border-strong", "row-selected-bg", "scrim", "scrim-peek", "shadow-sm"].map((n) => [n, light[n]])),
    {
      "bg-app": "#FAFAFA", surface: "#FFFFFF", "surface-2": "#FFFFFF", border: "#E5E5E5", "border-strong": "#D4D4D4",
      "row-selected-bg": "#DBEAFE", scrim: "rgba(0,0,0,.5)", "scrim-peek": "rgba(0,0,0,.5)", "shadow-sm": "0 1px 2px rgba(0,0,0,.06)",
    },
  );
});

test("the gate catches the defect it guards: the 2.62 dark values fail it", () => {
  const old = { ...dark, border: "rgba(255,255,255,.08)", "bg-app": "#0A0A0A", "surface-2": "#171717", "row-selected-bg": "rgba(48,128,255,.16)", "scrim-peek": "rgba(0,0,0,.5)" };
  assert.ok(on("var(--uix-border)", "var(--uix-surface)", old) < 1.35);
  assert.ok(step("var(--uix-surface)", "var(--uix-surface-2)", old) < 1.08);
  const surface = color("var(--uix-surface)", old);
  assert.ok(contrast(over(color("var(--uix-row-selected-bg)", old), surface), over(color("var(--uix-row-alt)", old), surface)) < 1.3);
  const row = color("var(--uix-row)", old);
  const scrim = color("var(--uix-scrim-peek)", old);
  assert.ok(contrast(over(scrim, over(color("var(--uix-text-muted)", old), row)), over(scrim, row)) < 3);
});
