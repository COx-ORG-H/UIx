# Style Dictionary v4 → v5 readiness (DTCG-3)

**Decision: GO.** `style-dictionary` is bumped `^4` → `^5` (5.5.0). The build emits **byte-identical**
`--uix-*` output; no config migration was required.

## Why this was a tripwire

The token build (`packages/tokens/style-dictionary.config.mjs`) is the single source of the `--uix-*`
contract. Its two load-bearing behaviours are:

- the `uix/name` transform (`"uix-" + token.path.join("-")`, deliberately *not* `name/kebab`), and
- the **identity `uix/value`** transform, which returns `token.original.$value` verbatim so runtime
  values like `var(--uix-brand,#1447E6)` and `color-mix(…)` survive — the whole brand-override
  mechanism (ADR-0019).

If a v5 change to the value/transform pipeline (transform registration, `token.original` access,
`getPlatformTokens`/`hasInitialized`) moved even one byte of generated output, that would be a
parity-breaking contract change and a **NO-GO**. The rule was: verify byte-identity first, and
**never** edit `tests/tokens.baseline.css` to force parity.

## Verification (run in isolation, before any other Batch 7 change)

1. Built at `style-dictionary@4.4.0`, snapshotted SHA-256 of the five generated files.
2. Bumped the devDep to `^5` (installed 5.5.0) and rebuilt.
3. Results:
   - `git diff --stat packages/tokens/build/` → **empty** (zero changed bytes).
   - `sha256sum -c` of `build/css/tokens.css`, `build/tailwind/{theme.css,preset.cjs}`,
     `build/ts/{tokens.js,tokens.d.ts}` → **all OK** (identical to the v4 snapshot).
   - `npm run test:parity`, `npm run test:contract`, `npm run test:dtcg` → **green**.
   - `npm run build:all` → succeeds.

## API compatibility notes

The config's v4-era async API is unchanged under v5.5.0 — all of the following behaved identically:

- `StyleDictionary.registerTransform({ name, type, transform })` (static registration),
- `new StyleDictionary({ source, platforms })` + `await sd.hasInitialized`,
- `await sd.getPlatformTokens('css')` returning `{ allTokens }`,
- reading `token.original.$value` (the identity transform) and `token.$value`.

No code change was needed; the bump is purely a dependency version move.

## Classification

Tooling-only. No `--uix-*` output change, no token JSON change, no baseline change. Recorded as a
patch-level changeset (`.changeset/dtcg-sd-v5-readiness.md`). If a future v5.x minor *did* move
output, this doc would be superseded by a NO-GO recording the exact blocking delta and the devDep
would return to `^4`.
