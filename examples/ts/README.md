# TS / `cssVar` consumer example (FR-4)

Consume the UIx `--uix-*` contract as **typed constants** from `@tensor_1/tokens/ts` — for
non-DOM contexts (SSR, canvas/ECharts, React Native) and for compile-time-safe token references.

## What it shows

`app.ts` reads one member of each exported map with its correct narrow type:

| Import | Type | Use |
|---|---|---|
| `cssVar[name]` | `string` (`var(--uix-<name>)`) | in the browser — resolves brand + dark at runtime |
| `light[name]` | `string` | the light literal value (non-DOM) |
| `dark[name]` | `string \| undefined` | the dark override, `undefined` where dark inherits light |
| `num[name]` | `number \| undefined` | numeric tokens (spacing, z-index, …) |

Every key is a member of the `UixTokenName` union, so a mistyped token name is a **compile
error**, not a silent `undefined` (see the documented guard line in `app.ts`).

## Verify (doubles as CI smoke coverage)

```bash
node examples/ts/verify.mjs
```

It packs `@tensor_1/tokens` to a tarball, installs it into an isolated consumer (no workspace
symlink), runs `tsc --noEmit` against the packed `.d.ts`, and asserts at runtime that
`cssVar.accent === 'var(--uix-accent)'` and `num['space-4']` is a number.
