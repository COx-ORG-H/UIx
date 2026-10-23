import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * PR #168 review (batch 3, data and editing) — stylesheet contracts:
 *   (e) a small link button has no side padding (it sat 12 px off the text it belongs to);
 *   (b) a refetch dims its content to 0.8, not 0.6 (status pills under 0.6 fell below 4.5:1);
 *   (a) frozen-column dividers go when a measured TableWrap does not overflow.
 */
const css = (name) => readFileSync(new URL(`../styles/components/${name}`, import.meta.url), "utf8");
const ruleBody = (text, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = text.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

test("(e) .uix-btn--link.uix-btn--sm has padding-inline 0", () => {
  assert.match(ruleBody(css("button.css"), ".uix-btn--link.uix-btn--sm"), /padding-inline:\s*0\s*;/);
});

test("(b) BusyRegion and a refreshing TableWrap dim to 0.8", () => {
  const busy = css("busy-region.css");
  assert.match(ruleBody(busy, ".uix-busy-region:has(> .uix-busy-bar[data-shown]) > .uix-busy-region__content"), /opacity:\s*\.8\s*;/);
  assert.match(ruleBody(busy, ".uix-table-wrap:has(> .uix-busy-bar[data-shown]) > .uix-table > tbody"), /opacity:\s*\.8\s*;/);
});

test("(a) a TableWrap measured without overflow draws no frozen-column dividers", () => {
  assert.match(css("table.css"), /\.uix-table-wrap\[data-overflow="false"\][^{]*\.uix-table--pinned-col[^{]*\{\s*box-shadow:\s*none;/);
});
