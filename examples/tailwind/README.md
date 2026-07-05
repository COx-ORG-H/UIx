# Tailwind consumer example (FR-3)

Consume the UIx `--uix-*` contract as **Tailwind v4 utilities**. Importing
`@tensor_1/tokens/tailwind` registers the tokens in Tailwind's `@theme`, so you get utilities like
`bg-uix-accent`, `text-uix-text-muted`, and `rounded-uix-md` — whose values stay `var(--uix-*)`, so
the product brand and dark mode still cascade through them.

## Files

- `src/input.css` — the entry, in the required import order: `@tensor_1/tokens/css` →
  `.../themes/tensor` → `.../tailwind` → `tailwindcss`.
- `index.html` — uses `bg-uix-accent`, `text-uix-accent`, `text-uix-text-muted`, `rounded-uix-md`,
  plus a plain `.uix-btn` component class (the two systems coexist).

## Build

```bash
npm install
npm run build          # tailwindcss -i src/input.css -o dist/output.css
```

Then open `index.html`.

> Tailwind v3 projects use the preset instead:
> `presets: [require('@tensor_1/tokens/tailwind/preset')]`.

## Verify (doubles as CI smoke coverage)

```bash
node examples/tailwind/verify.mjs
```

Packs `@tensor_1/tokens`, installs it + a pinned Tailwind v4 CLI into an isolated consumer (no
workspace symlink), runs the real Tailwind build, and asserts the compiled CSS contains a `uix-*`
utility rule generated from the `@theme`.
