import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * Dark-theme structure (HAR-3087, HAR-3088, HAR-3085). On near-black, the step that separates a
 * light page from its card does not show: every TENSOR council judge named the dark rows, cards and
 * page as blending together, in every round, and never the light ones. The text contrast probe
 * passed throughout, so this pins the structure instead: edges, surface steps, the header band, hover,
 * the selected row and the peek backdrop, measured on what ships (tokens.css) and composited the way
 * the page paints them. Light is pinned unchanged. The operator chose the direction from a picture
 * pair (2026-11-12); the #237 review moved the band onto its own token, kept the menus' hover step,
 * and traded part of the selection tint for an accent edge, so a checked checkbox keeps 3:1 on it.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const table = read("../styles/components/table.css");
const light = scopeFor([], false);
const dark = scopeFor([], true);
const color = (expr, scope) => evaluate(expr, scope);
/** An edge or a tint as the page paints it: composited over what it sits on. */
const on = (expr, backExpr, scope) => {
  const back = color(backExpr, scope);
  return contrast(over(color(expr, scope), back), back);
};
const step = (a, b, scope) => contrast(color(a, scope), color(b, scope));
const paintOnSurface = (expr, scope) => over(color(expr, scope), color("var(--uix-surface)", scope));

test("dark: row dividers and card edges read on the card and against the page", () => {
  assert.ok(on("var(--uix-border)", "var(--uix-surface)", dark) >= 1.35, "border on the card");
  // a card's edge paints over the card's own background and is seen against the page outside it
  assert.ok(contrast(paintOnSurface("var(--uix-border)", dark), color("var(--uix-bg-app)", dark)) >= 1.35, "the card edge against the page");
  assert.ok(on("var(--uix-border-strong)", "var(--uix-surface)", dark) >= 1.8, "border-strong on the card");
  assert.ok(on("var(--uix-border-strong)", "var(--uix-surface)", dark) > on("var(--uix-border)", "var(--uix-surface)", dark) + 0.3);
});

test("dark: page, card and table header band are three visible steps, and a hovered row is a fourth", () => {
  assert.ok(step("var(--uix-bg-app)", "var(--uix-surface)", dark) >= 1.06, "page against card");
  assert.ok(step("var(--uix-surface)", "var(--uix-table-head-bg)", dark) >= 1.08, "card against the header band");
  // a hovered row right under the header must not look like the header
  assert.ok(step("var(--uix-table-head-bg)", "var(--uix-bg-hover)", dark) >= 1.08, "header band against a hovered row");
  // the header band and its frozen cells paint the band token
  assert.match(table, /\.uix-table thead th \{[^}]*background: var\(--uix-table-head-bg\)/);
  assert.match(table, /\.uix-table--pinned-col thead th:first-child, \.uix-table--pinned-actions thead th:last-child \{[^}]*background: var\(--uix-table-head-bg\)/);
  assert.match(read("../styles/components/data-workspace.css"), /\.uix-data-workspace__grid--pin-id thead th:nth-child\(2\) \{[^}]*background: var\(--uix-table-head-bg\)/);
});

test("dark: the keyboard position in a menu, listbox or palette (bg-hover on surface-2) is no weaker than in 2.62", () => {
  // .uix-menu__item[data-active], .uix-listbox__option[data-active], .uix-cmdk__item[data-active]
  assert.ok(step("var(--uix-surface-2)", "var(--uix-bg-hover)", dark) >= 1.088, "bg-hover on surface-2");
  assert.ok(step("var(--uix-surface)", "var(--uix-bg-hover)", dark) >= 1.15, "bg-hover on the card");
});

test("dark: the card's top highlight is a visible lit edge, since a black shadow cannot show on the page", () => {
  const alpha = Number(/inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/.exec(dark["shadow-sm"])?.[1]);
  assert.ok(alpha >= 0.07, `top highlight alpha ${alpha}`);
});

test("dark: a selected row reads apart by its tint and its accent edge, and a checked checkbox keeps 3:1 on it (HAR-3088)", () => {
  const selected = paintOnSurface("var(--uix-row-selected-bg)", dark);
  // a pinned row is an accent wash too, so against it the edge carries more of the difference
  for (const [name, expr, floor] of [["plain", "var(--uix-row)", 1.15], ["zebra", "var(--uix-row-alt)", 1.15], ["pinned", "var(--uix-row-pinned-bg)", 1.1]]) {
    const ratio = contrast(selected, paintOnSurface(expr, dark));
    assert.ok(ratio >= floor, `tint against ${name}: ${ratio.toFixed(2)}:1`);
  }
  // the edge is the accent, at least 3:1 on the selected row and on the plain row beside it
  assert.equal(dark["row-selected-edge"], "var(--uix-accent)");
  const accent = color("var(--uix-accent)", dark);
  assert.ok(contrast(accent, selected) >= 3, `accent edge / checked box on the selected row: ${contrast(accent, selected).toFixed(2)}:1`);
  assert.ok(contrast(accent, paintOnSurface("var(--uix-row)", dark)) >= 3);
  // table.css draws it on the first cell, keeps a frozen column's divider beside it, and not in card mode
  assert.match(table, /\.uix-table:not\(\.uix-table--cards\) tbody tr:where\(\[data-selected\]\) > :first-child \{ box-shadow: inset 2px 0 0 var\(--uix-row-selected-edge\); \}/);
  assert.match(table, /\.uix-table\.uix-table--pinned-col tbody tr:where\(\[data-selected\]\) > td:first-child \{ box-shadow: inset 2px 0 0 var\(--uix-row-selected-edge\), 1px 0 0 var\(--uix-border\); \}/);
  assert.match(table, /\.uix-table-wrap\[data-overflow="false"\] \.uix-table--pinned-col tbody tr:where\(\[data-selected\]\) > td:first-child \{ box-shadow: inset 2px 0 0 var\(--uix-row-selected-edge\); \}/);
});

test("light: a checked checkbox keeps 3:1 on a selected row too, and the edge is off", () => {
  const selected = paintOnSurface("var(--uix-row-selected-bg)", light);
  assert.ok(contrast(color("var(--uix-accent)", light), selected) >= 3);
  assert.equal(light["row-selected-edge"], "transparent");
});

test("dark: the list beside a peek stays legible under its backdrop (HAR-3085)", () => {
  const scrim = color("var(--uix-scrim-peek)", dark);
  for (const [rowName, rowExpr] of [["plain", "var(--uix-row)"], ["zebra", "var(--uix-row-alt)"]]) {
    const row = paintOnSurface(rowExpr, dark);
    const dimmedRow = over(scrim, row);
    for (const [textName, textExpr] of [["text", "var(--uix-text)"], ["muted", "var(--uix-text-muted)"]]) {
      const ratio = contrast(over(scrim, over(color(textExpr, dark), row)), dimmedRow);
      assert.ok(ratio >= 3, `${textName} on a dimmed ${rowName} row: ${ratio.toFixed(2)}:1`);
    }
  }
  assert.ok(scrim[3] >= 0.25, `peek scrim alpha ${scrim[3]}`);
  assert.match(read("../styles/components/peek.css"), /\.uix-peek::backdrop \{[^}]*background: var\(--uix-scrim-peek\)/);
  assert.equal(dark.scrim, "rgba(0,0,0,.5)", "modal and drawer keep the heavier scrim");
});

test("product themes: the header band never equals a hovered row", () => {
  for (const [name, blocks] of Object.entries(themes)) {
    const scope = scopeFor(blocks, true);
    assert.ok(step("var(--uix-table-head-bg)", "var(--uix-bg-hover)", scope) >= 1.03, `${name} dark: band against hover`);
  }
});

test("light is unchanged: page, card, raised surface, hover, edges, selection, the header band and the peek backdrop", () => {
  assert.deepEqual(
    Object.fromEntries(["bg-app", "surface", "surface-2", "bg-hover", "border", "border-strong", "row-selected-bg", "scrim", "scrim-peek", "shadow-sm", "table-head-bg"].map((n) => [n, light[n]])),
    {
      "bg-app": "#FAFAFA", surface: "#FFFFFF", "surface-2": "#FFFFFF", "bg-hover": "#EFEFEF", border: "#E5E5E5", "border-strong": "#D4D4D4",
      "row-selected-bg": "#DBEAFE", scrim: "rgba(0,0,0,.5)", "scrim-peek": "rgba(0,0,0,.5)", "shadow-sm": "0 1px 2px rgba(0,0,0,.06)", "table-head-bg": "var(--uix-surface)",
    },
  );
});

test("the gate catches the defect it guards: each 2.62 dark value fails its check", () => {
  const old = {
    ...dark,
    border: "rgba(255,255,255,.08)", "border-strong": "rgba(255,255,255,.14)", "bg-app": "#0A0A0A", "bg-hover": "#1F1F1F",
    "table-head-bg": "var(--uix-surface)", "row-selected-bg": "rgba(48,128,255,.16)", "row-selected-edge": "transparent",
    "scrim-peek": "rgba(0,0,0,.5)", "shadow-sm": "0 1px 2px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.04)",
  };
  assert.ok(on("var(--uix-border)", "var(--uix-surface)", old) < 1.35, "border");
  assert.ok(on("var(--uix-border-strong)", "var(--uix-surface)", old) < 1.8, "border-strong");
  assert.ok(step("var(--uix-bg-app)", "var(--uix-surface)", old) < 1.06, "page against card");
  assert.ok(step("var(--uix-surface)", "var(--uix-table-head-bg)", old) < 1.08, "no header band");
  assert.ok(Number(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/.exec(old["shadow-sm"])[1]) < 0.07, "lit edge");
  const selected = paintOnSurface("var(--uix-row-selected-bg)", old);
  assert.ok(contrast(selected, paintOnSurface("var(--uix-row-alt)", old)) < 1.15, "selection tint against zebra");
  assert.notEqual(old["row-selected-edge"], "var(--uix-accent)", "no edge");
  const row = paintOnSurface("var(--uix-row)", old);
  const scrim = color("var(--uix-scrim-peek)", old);
  assert.ok(contrast(over(scrim, over(color("var(--uix-text-muted)", old), row)), over(scrim, row)) < 3, "peek backdrop");
  // and the #237 review's catch: a .28 tint drops a checked checkbox under 3:1
  const strong = paintOnSurface("rgba(48,128,255,.28)", dark);
  assert.ok(contrast(color("var(--uix-accent)", dark), strong) < 3, "a .28 tint is too strong for the accent");
});
