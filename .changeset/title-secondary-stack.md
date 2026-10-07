---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

List, Toast and Pipeline: a title and its secondary text now stack with the same result whatever element the markup uses. `.uix-list__title`/`__meta` and `.uix-pipeline__title`/`__description` are block-level, and `.uix-toast__body` is a flex column with a `--uix-space-1` gap, so `<span>`/`<strong>` markup no longer renders as one run-on line with a 0 px gap. The React output is unchanged. The three docs specimens use `<div>`, and `tests/a11y/docs-text-stacks.spec.mjs` measures every explorer route for glued text (HAR-1568).
