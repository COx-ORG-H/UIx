import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, over, scopeFor, themes } from "./css-color.mjs";

/*
 * A Timeline entry's text (HAR-3086): the event in --uix-text-hushed, the actor (<strong>) in
 * --uix-text, the detail line in --uix-text-muted. Quieter than body copy, still text: each at
 * least 4.5:1 on every surface a feed sits on (a card, a drawer, a raised panel, the page), in both
 * modes of every theme.
 */
const TEXT = 4.5;
const BACKDROPS = ["bg-app", "surface", "surface-2", "surface-3"];
const css = readFileSync(new URL("../styles/components/timeline.css", import.meta.url), "utf8");
const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found in timeline.css`);
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
};

test("the entry's parts draw from the text tokens: title hushed, actor full, detail muted", () => {
  assert.match(rule(".uix-timeline__title"), /color:\s*var\(--uix-text-hushed\)/);
  assert.match(rule(".uix-timeline__title :where(strong, b)"), /color:\s*var\(--uix-text\)/);
  assert.match(rule(".uix-timeline__detail"), /color:\s*var\(--uix-text-muted\)/);
});

for (const [theme, blocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: every part of an entry is at least 4.5:1 on every feed surface`, () => {
      const scope = scopeFor(blocks, dark);
      for (const token of ["text-hushed", "text", "text-muted"]) {
        for (const backdrop of BACKDROPS) {
          const page = evaluate(`var(--uix-${backdrop})`, scope);
          const ink = over(evaluate(`var(--uix-${token})`, scope), page);
          const ratio = contrast(ink, page);
          assert.ok(ratio >= TEXT, `--uix-${token} ${ratio.toFixed(2)}:1 on --uix-${backdrop} (need ${TEXT})`);
        }
      }
    });
  }
}
