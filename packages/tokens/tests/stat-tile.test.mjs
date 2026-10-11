import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * HAR-1753 — the interactive stat tile, checked from the stylesheet that ships.
 *
 * A row (grid or flex) stretches its tiles to the tallest one. A <button> that is taller than
 * its content centres that content, so with `display: block` an interactive tile's label sat
 * 3 to 14 px lower than the label of the read-only <div> tile beside it. A flex column starts
 * its rows at the top whatever the height of the button.
 *
 * This file pins the rules. The offsets themselves are measured in Chromium by
 * tests/a11y/operator-primitives.spec.mjs, which fails on the old `display: block`.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../styles/components/stat-tile.css");

/** Every declaration block whose selector list is exactly `selector`. */
const bodies = (source, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]);
};
const declarations = (source, selector) => {
  const found = bodies(source, selector);
  assert.ok(found.length > 0, `${selector} has no rule`);
  return Object.fromEntries(found.join(";").split(";").map((d) => d.split(":").map((part) => part.trim())).filter(([name, value]) => name && value));
};

test("the interactive tile is a column that starts at the top, never a block", () => {
  const tile = declarations(css, ".uix-stat--interactive");
  assert.equal(tile.display, "flex", "a block <button> centres its content when a row stretches it");
  assert.equal(tile["flex-direction"], "column");
  // nothing may move the rows off the top edge again
  assert.ok(!("justify-content" in tile) || tile["justify-content"] === "flex-start");
  assert.ok(!("align-items" in tile) || tile["align-items"] === "stretch", "the rows keep the full width, so they wrap as before");
  assert.equal(tile.width, "100%");
  assert.equal(tile["text-align"], "start");
});

test("the tile's rows carry no auto margin and no alignment of their own", () => {
  for (const row of [".uix-stat__label", ".uix-stat__value", ".uix-stat__meta"]) {
    const rules = declarations(css, row);
    assert.ok(!("align-self" in rules), `${row} sets align-self`);
    assert.doesNotMatch(rules["margin-top"] ?? "", /auto/, `${row} has an auto margin`);
  }
});

test("the link tile needs no rule of its own: an <a> is a block that starts at the top", () => {
  // link.css gives a.uix-stat `display: block`, and that selector outranks .uix-stat--interactive.
  // A block <a> does not centre its content, so both forms lay their rows out from the top.
  const link = read("../styles/components/link.css");
  assert.match(link, /a:is\(\.uix-card, \.uix-stat, \.uix-kanban__card\)\s*\{\s*display:\s*block;\s*\}/);
  assert.ok(!("display" in declarations(css, ".uix-stat--link")));
});

test("a pending tile is dimmed, shows the progress cursor and drops the hover cue", () => {
  const pending = declarations(css, '.uix-stat--interactive[aria-busy="true"]');
  assert.equal(pending.cursor, "progress");
  assert.ok(Number(pending.opacity) > 0 && Number(pending.opacity) < 1, "dimmed");
  // it must stay reachable by pointer and keyboard: aria-disabled, not an inert element
  assert.ok(!("pointer-events" in pending));
  assert.ok(!("visibility" in pending));
  // the base hover tint does not apply while busy, at no cost in specificity
  assert.match(css, /\.uix-stat--interactive:hover:where\(:not\(\[aria-busy="true"\]\)\)\s*\{/);
  assert.equal(bodies(css, ".uix-stat--interactive:hover").length, 0, "an unguarded hover rule would tint a pending tile");
});
