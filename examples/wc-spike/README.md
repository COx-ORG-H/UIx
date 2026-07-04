# Web-components spike (FR-1) — throwaway

A one-element feasibility probe: `<uix-button>` as a custom element, in **light-DOM** and
**shadow-DOM** modes. It exists to answer "how hard is a framework-agnostic `@tensor_1/wc`?" — it is
**not** a shipped package (no `exports` entry, no CI gate, no `packages/wc`).

## Run it

Serve the repo root and open this file (relative asset paths resolve from there):

```bash
npx serve .
# → http://localhost:3000/examples/wc-spike/uix-button.html
```

Both `<uix-button>` variants should render pixel-identical to the adjacent plain `.uix-btn`, in
light and dark (use the toggle).

## The finding in one line

`--uix-*` **custom properties inherit through the shadow boundary** (tokens Just Work inside a shadow
root), but `.uix-*` **class rules do not** — a shadow-DOM element must **re-inject the component CSS**
(here via `<link>`; in production via `adoptedStyleSheets`, inlined once and shared).

Full write-up + go/no-go trigger:
[`Docs/specs/2026-07-03-web-components-feasibility-spike.md`](../../Docs/specs/2026-07-03-web-components-feasibility-spike.md).
