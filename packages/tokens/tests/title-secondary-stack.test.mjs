import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * List, Toast and Pipeline: a title and its secondary text stack whatever element the markup uses
 * (HAR-1568). The docs specimens wrote them as <span>/<strong>; the component CSS never set `display`,
 * so they rendered as one run-on line with a 0 px gap while every React-based gate (<div> markup) was green.
 * jsdom has no layout, so the rendered proof is tests/a11y/docs-text-stacks.spec.mjs; this pins the CSS text
 * that makes the stack independent of the element type, so an edit that drops it fails here in milliseconds.
 *
 * Model: each text element is block-level (`display: block`), or a child of a flex column. Both blockify a
 * <span> child. HAR-1577 builds on this: a shared title -> secondary rhythm may replace these per-component
 * rules with one primitive, but must keep every pair block-level.
 */

const read = (name) => readFileSync(new URL(`../styles/components/${name}.css`, import.meta.url), "utf8").replace(/\s+/g, " ");

/** The declaration block of the first rule whose selector list is exactly `selector`, or "" when absent. */
const ruleBody = (source, selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = source.match(new RegExp(`(?:^|[}{;] |\\*/ )${esc}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : "";
};

const list = read("list");
const toast = read("toast");
const pipeline = read("pipeline");

test("List: title and meta are block-level, so <span> markup stacks", () => {
  assert.match(ruleBody(list, ".uix-list__title"), /display: block/);
  assert.match(ruleBody(list, ".uix-list__meta"), /display: block/);
});

test("Toast: the body is a column with a --uix-space-1 gap, so <span> markup stacks 4 px apart", () => {
  const body = ruleBody(toast, ".uix-toast__body");
  assert.match(body, /display: flex/);
  assert.match(body, /flex-direction: column/);
  assert.match(body, /gap: var\(--uix-space-1\)/);
  assert.match(body, /min-width: 0/, "a long message wraps instead of widening the toast");
});

test("Toast: the message adds no margin of its own (the flex gap is the only spacing)", () => {
  const msg = ruleBody(toast, ".uix-toast__msg");
  assert.ok(msg, "the .uix-toast__msg rule exists");
  assert.doesNotMatch(msg, /margin-top/, "margin-top is not the stack: it did nothing on an inline <span>, and would double the gap now");
});

test("Pipeline: title and description are block-level, the description sits --uix-space-1 below", () => {
  const title = ruleBody(pipeline, ".uix-pipeline__title");
  assert.match(title, /display: block/);
  assert.match(title, /text-overflow: ellipsis/, "text-overflow only applies to a block container");
  const description = ruleBody(pipeline, ".uix-pipeline__description");
  assert.match(description, /display: block/);
  assert.match(description, /margin-top: var\(--uix-space-1\)/);
});
