import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";

/*
 * A native checkbox, radio, range or progress bar that a consumer has not yet moved to the kit
 * component is drawn in the browser's own blue (a pale one under `color-scheme: dark`), which
 * reads as a second accent next to a primary button. `accent-color` is inherited, so one
 * declaration on the root in the base layer puts every such control on `--uix-accent`, and a
 * consumer's own rule (unlayered, or in a later layer) still wins.
 */

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

/** [{ selector, layer, value }] for every `accent-color` declaration in a stylesheet. */
const accentDecls = (file) => {
  const out = [];
  postcss.parse(read(file)).walkDecls("accent-color", (decl) => {
    let layer = null;
    for (let node = decl.parent; node; node = node.parent) {
      if (node.type === "atrule" && node.name === "layer") layer = node.params;
    }
    out.push({ selector: decl.parent.selector, layer, value: decl.value });
  });
  return out;
};

test("the base layer puts native form controls on the accent, once, on the root", () => {
  assert.deepEqual(accentDecls("../styles/base.css"), [
    { selector: ":root", layer: "uix.base", value: "var(--uix-accent)" },
  ]);
});

test("the primary button fills with the same token", () => {
  let background;
  postcss.parse(read("../styles/components/button.css")).walkRules((rule) => {
    if (rule.selector !== ".uix-btn--primary") return;
    rule.walkDecls("background", (d) => { background = d.value; });
  });
  assert.equal(background, "var(--uix-accent)");
});
