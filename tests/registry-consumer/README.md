# registry-consumer smoke (DIST-3)

Exercises the `uix add` copy-in CLI (`packages/tokens/bin/uix.mjs`) the way a non-React consumer
would, and proves the registry manifest is trustworthy end-to-end.

`run.mjs` drives `uix add` over five representative components (`button`, `card`, `table`, `alert`,
`status-pill`) into a throwaway temp dir and asserts:

- each component's CSS file is copied in, and
- every `--uix-*` token the registry declares for that component is actually **declared** in
  `build/css/tokens.css` (so a copied component can't reference a non-existent variable), and
- `uix add <unknown>` exits non-zero.

Run it (after `npm run build`):

```bash
npm run test:registry:consumer
```

It is wired into CI as part of the release-gated suite and pairs with `test:registry` (which
drift-checks the manifest against the CSS).
