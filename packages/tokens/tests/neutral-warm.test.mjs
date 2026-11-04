import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { base, contrast, evaluate, over } from "./css-color.mjs";

/*
 * The opt-in warm neutrals (calm kit 2.56). themes/neutral-warm.css applies only under
 * <html data-uix-neutral="warm">, re-values the neutral surface, border and text tokens and
 * nothing else, and keeps every text role AA on every warm surface in both modes, including
 * the status words on their own tints.
 */

const css = readFileSync(new URL("../themes/neutral-warm.css", import.meta.url), "utf8");
const scoped = [...css.matchAll(/(:root\[data-uix-neutral="warm"\](?::where\([^)]*\))?)\s*\{([^}]*)\}/g)].map((m) => ({
  dark: m[1].includes(":where("),
  vars: Object.fromEntries([...m[2].matchAll(/--uix-([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])),
}));

const scope = (dark) => {
  const out = {};
  for (const b of [...base, ...scoped]) if (!b.dark || dark) Object.assign(out, b.vars);
  return out;
};
const NEUTRALS = ["bg-app", "bg-subtle", "bg-hover", "bg-active", "surface", "surface-2", "surface-3", "border", "border-strong", "text", "text-hushed", "text-muted"];

test("the warm skin is scoped to the attribute, has a light and a dark block, and sets only neutrals", () => {
  assert.equal(scoped.length, 2);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /(^|\})\s*:root\s*\{/, "no unscoped :root block");
  for (const block of scoped) assert.deepEqual(Object.keys(block.vars).sort(), [...NEUTRALS].sort());
});

for (const [mode, dark] of [["light", false], ["dark", true]]) {
  const s = scope(dark);
  const c = (name) => evaluate(`var(--uix-${name})`, s);
  test(`${mode}: text, hushed and muted text are AA on every warm surface`, () => {
    for (const bg of ["surface", "surface-2", "surface-3", "bg-app", "bg-subtle", "bg-hover"]) {
      const back = c(bg);
      for (const fg of ["text", "text-hushed", "text-muted"]) {
        const ratio = contrast(over(c(fg), back), back);
        assert.ok(ratio >= 4.5, `--uix-${fg} on --uix-${bg}: ${ratio.toFixed(2)}:1`);
      }
    }
  });
  test(`${mode}: status words stay AA on the warm surface and on their tints`, () => {
    for (const hue of ["danger", "warning", "success", "info"]) {
      for (const bg of ["surface", "bg-app"]) {
        const back = c(bg);
        const tint = over(c(`${hue}-bg`), back);
        const fg = c(`${hue}-text`);
        assert.ok(contrast(fg, back) >= 4.5, `${hue}-text on ${bg}: ${contrast(fg, back).toFixed(2)}`);
        assert.ok(contrast(fg, tint) >= 4.5, `${hue}-text on its tint over ${bg}: ${contrast(fg, tint).toFixed(2)}`);
      }
    }
  });
}
