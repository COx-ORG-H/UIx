import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

/*
 * Every component stylesheet ships: styles/component-list.css imports each styles/components/*.css
 * exactly once, and both bundles (main.css and components.css) read that one list.
 *
 * inline-edit.css (HAR-1381) was written, size-tracked and contract-scanned, but never added to
 * the list, so `InlineEdit` rendered as bare browser buttons in every product from 2.31.0 until
 * HAR-1833 screenshotted it. Each per-file gate read the file itself, and none read the bundle.
 */

const STYLES = fileURLToPath(new URL("../styles/", import.meta.url));
const imports = (file) => [...readFileSync(`${STYLES}${file}`, "utf8").matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);

test("component-list.css imports every component stylesheet exactly once", () => {
  const listed = imports("component-list.css");
  const files = readdirSync(`${STYLES}components`).filter((f) => f.endsWith(".css")).map((f) => `components/${f}`);
  assert.deepEqual(files.filter((f) => !listed.includes(f)), [], "add the missing stylesheet(s) to styles/component-list.css");
  assert.deepEqual(listed.filter((f) => !files.includes(f)), [], "component-list.css imports a stylesheet that does not exist");
  assert.equal(new Set(listed).size, listed.length, "a stylesheet is imported twice");
});

test("both bundles read the one list", () => {
  for (const entry of ["main.css", "components.css"]) {
    assert.ok(imports(entry).includes("component-list.css"), `${entry} does not import component-list.css`);
  }
});
