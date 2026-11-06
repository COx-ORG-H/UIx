---
"@tensor_1/tokens": patch
"@tensor_1/react": patch
---

FileRow in a narrow rail: a row under 280 px wide (TENSOR's 226 px incident side rail) wraps the file name to two lines and wraps the meta line, instead of cutting the name to about ten letters. With a fine pointer, its resting actions (download, more) float over the row's end on hover or focus rather than reserving their width. The row is its own size container (`container: uix-file-row / inline-size`), so this follows the row's width, not the screen's. State actions (cancel, retry, details) keep their place in the flow. Pinned by a 226 px rail in the file-kit harness and `file-kit.spec.mjs`.
