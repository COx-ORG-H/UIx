import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

/*
 * HAR-1569 — the tag and chip remove "x" are ONE spec. Each lives in its own component file
 * (a consumer may load only one of them), so this pins the two rule sets to each other: same
 * selectors, same declarations, the only allowed difference being the resting colour (muted on a
 * tag, inherited on a chip so it follows the chip's selected colour). The measured geometry is in
 * tests/a11y/dismiss-control.spec.mjs.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

/** { "<suffix>": { prop: value } } for every rule whose selector starts with `block`. */
const rulesFor = (file, block) => {
  const out = {};
  postcss.parse(read(file)).walkRules((rule) => {
    for (const selector of rule.selectors) {
      if (!selector.startsWith(block)) continue;
      const suffix = selector.slice(block.length);
      const decls = (out[suffix] ??= {});
      rule.walkDecls((d) => { decls[d.prop] = d.value.replaceAll(block, "<block>"); });
    }
  });
  return out;
};

const tag = rulesFor("../styles/components/tag-input.css", ".uix-tag__remove");
const chip = rulesFor("../styles/components/table-toolbar.css", ".uix-chip__remove");

test("tag and chip remove share one rule set (only the resting colour differs)", () => {
  const strip = ({ "": base, ...rest }) => ({ "": { ...base, color: "<host>" }, ...rest });
  assert.deepEqual(strip(chip), strip(tag));
  assert.equal(tag[""].color, "var(--uix-text-muted)");
  assert.equal(chip[""].color, "inherit");
});

test("a 20 px circle with a concentric 24 px hit area, a round ring and a 12 px icon", () => {
  const base = tag[""];
  assert.equal(base.width, "20px");
  assert.equal(base.height, "20px");
  assert.equal(base["border-radius"], "var(--uix-radius-pill)");
  assert.equal(base.padding, "0");
  assert.equal(base["line-height"], "0");
  assert.equal(base.position, "relative");
  assert.equal(base["place-items"], "center");
  // the overhang into the pill's padding is eaten by the margin, so the pill keeps its height
  assert.equal(base["margin-block"], "calc(var(--uix-space-1) / -2)");
  assert.equal(tag["::before"].inset, "-2px");
  assert.equal(tag["::before"]["border-radius"], "inherit");
  assert.equal(tag[" svg"].width, "12px");
  assert.equal(tag[" svg"].height, "12px");
  assert.match(tag[":focus-visible"].outline, /^2px solid var\(--uix-ring\)$/);
});

test("the hover is a tint of the text colour, not the page-level --uix-bg-hover", () => {
  for (const rules of [tag, chip]) {
    assert.match(rules[":hover"].background, /^color-mix\(in srgb, var\(--uix-text\) \d+%, transparent\)$/);
    assert.match(rules[":active"].background, /^color-mix\(in srgb, var\(--uix-text\) \d+%, transparent\)$/);
  }
});

test("both pills leave a 2 px trailing gap for the circle", () => {
  const css = read("../styles/components/tag-input.css") + read("../styles/components/table-toolbar.css");
  assert.match(css, /\.uix-tag:has\(> \.uix-tag__remove:last-child\) \{ padding-inline-end: calc\(var\(--uix-space-1\) \/ 2\); \}/);
  assert.match(css, /\.uix-chip--removable \{ padding-inline-end: calc\(var\(--uix-space-1\) \/ 2\); \}/);
});

test("forced colours outline the hovered remove control (the tint is stripped)", () => {
  const forced = read("../styles/forced-colors.css").replace(/\s+/g, " ");
  assert.match(forced, /\.uix-tag__remove:hover, \.uix-chip__remove:hover \{ outline: 1px solid Highlight;/);
});
