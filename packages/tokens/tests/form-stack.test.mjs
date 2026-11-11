import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * The form field stack (TENSOR HAR-2974, operator 2026-11-11: "every UI change in UIx"; all forms
 * take one rhythm). A product composes `.uix-form-stack` and `.uix-form-stack__title`; it writes
 * no spacing of its own. Measured in the TENSOR CMDB attribute drawer: 16/42 px mixed gaps became
 * an even 30 px once every field reserved its message line and the stack gap was --uix-space-1.
 */

const css = readFileSync(new URL("../styles/components/form.css", import.meta.url), "utf8");
const rule = (selector) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} not found`);
  return css.slice(at, css.indexOf("}", at));
};

test("the stack spaces fields by the small gap, since each field reserves its message line", () => {
  const stack = rule(".uix-form-stack");
  assert.match(stack, /display:\s*flex;\s*flex-direction:\s*column;\s*gap:\s*var\(--uix-space-1\)/);
});

test("a non-field child keeps a normal gap below it, the last one none", () => {
  assert.match(css, /\.uix-form-stack > :not\(\.uix-field, \.uix-form-stack__title\):not\(:last-child\) \{ margin-block-end: var\(--uix-space-3\); \}/);
});

test("a group title is set from tokens only", () => {
  const title = rule(".uix-form-stack__title");
  for (const decl of title.split(";").map((d) => d.trim()).filter((d) => d.includes(":") && !d.startsWith(".")))
    assert.match(decl.split(":").slice(1).join(":").trim(), /^(0|600|var\(--uix-[\w-]+\)(\s+var\(--uix-[\w-]+\))?)$/, decl);
});
