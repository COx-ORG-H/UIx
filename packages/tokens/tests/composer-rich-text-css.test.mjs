import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * A rich-text editor as the CommentComposer's field is framed by the composer, not by itself
 * (TENSOR worklog, canvas v50): no box in a box. A missing rule fails to invisible, not to an
 * error, so the selector and its declarations are pinned here.
 */

const css = readFileSync(new URL("../styles/components/comments.css", import.meta.url), "utf8").replace(/\s+/g, " ");

test("a rich-text field directly inside the audience composer draws no frame of its own", () => {
  const m = css.match(/\.uix-composer--audience > \.uix-rich-text, \.uix-composer--audience > \.uix-rich-text:hover, \.uix-composer--audience > \.uix-rich-text:focus-within \{([^}]*)\}/);
  assert.ok(m, "the rule covers rest, hover and focus-within");
  const body = m[1];
  assert.match(body, /border: 0/);
  assert.match(body, /border-radius: 0/);
  assert.match(body, /background: transparent/);
  assert.match(body, /box-shadow: none/);
});

test("the composer keeps its own focus ring, so the nested editor still shows focus", () => {
  assert.match(css, /\.uix-composer--audience:focus-within \{ border-color: var\(--uix-ring\); \}/);
});
