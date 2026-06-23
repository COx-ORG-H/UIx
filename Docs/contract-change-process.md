# UIx contract-change process

**Status:** Active (lands with v2 1.0 — ADR-0016 Decision 7)
**Scope:** any change under the CODEOWNERS contract surface — `packages/tokens/tokens/`, `packages/tokens/themes/`, `tests/tokens.baseline.css`, `style-dictionary.config.mjs`, `packages/tokens/scripts/`.

This is the bus-factor-1 stand-in for a second reviewer: a written, gated checklist so the `--uix-*` contract is never changed by accident inside a large diff. The gates (Law 1) enforce what this prose describes — `test:parity` + `test:contract` fail the PR if the contract drifts without an intentional baseline update.

## What "the contract" is

The promise consumers (Tensor, POSx, SHOPx, mission-control) depend on, frozen since ADR-0004 and carried by ADR-0016:

1. **The `--uix-*` prefix and every contract token name.** Consumers reference these names; renaming or removing one breaks them silently (CSS just falls back / goes unstyled).
2. **The per-token `var()` fallback chains** — e.g. `--uix-accent: var(--uix-brand, <default>)`. These are what make live brand overrides work; changing a chain changes every product's runtime theming.
3. **The write-only brand-slot behaviour** — products override only `--uix-brand` / `--uix-brand-fg`; `accent`/`link`/`ring`/`brand-muted` re-chain. Emitting a *new* brand slot is a contract change.
4. **Token values** — guarded byte-faithfully against `tests/tokens.baseline.css`.

## Semver rules (the one-way doors)

| Change | Bump | Also required |
|---|---|---|
| **Add** a new `--uix-*` token (new name, additive) | **minor** | changeset; update baseline |
| Change a token **value** (intentional retune) | **minor** (or major if it visually breaks consumers) | changeset; update baseline; VR review |
| **Rename or remove** a token | **major** | **new ADR**; changeset; migration note |
| Change a **`var()` fallback chain** | **major** | **new ADR**; changeset |
| **Emit a new brand slot** (extend write-only override set) | **major** | **new ADR**; changeset |
| Add a structural **category** the completeness gate checks | minor | update `check-contract.mjs` allowlist intentionally |

"major + ADR" is non-negotiable: these are the changes that cannot be undone without breaking a shipped consumer.

## The checklist (every contract PR)

1. **Is it really a contract change?** If you only touched component CSS / a demo, it isn't — skip this process.
2. **Edit the DTCG source**, never the generated output. `npm run build` regenerates `build/`.
3. **Update `tests/tokens.baseline.css` in the same commit** if (and only if) the change is intentional. `npm run test:parity` is the gate: a value/name drift with no baseline update fails CI; a baseline update with no token change is a red flag in review.
4. **Run `npm run test:contract`** — structural categories present, every theme covers its tier, no un-justified raw values.
5. **Add a changeset** (`npm run changeset`) classifying the bump per the table above. Linked: tokens + react move together.
6. **For any major:** open or link an ADR (`D:\Development\Docs\adr\`) before merging. No major lands without the recorded decision.
7. **CODEOWNERS** will request the maintainer's review automatically. Self-merge only after the gates are green and the checklist above is satisfied in the PR description.

## Why this exists

ADR-0004 set "staleness — never auth/build breakage — as the worst acceptable failure mode," and ADR-0016 made the silent-freeze class structurally impossible on the *distribution* side (versioned, integrity-hashed npm). This process closes the *authoring* side: the contract cannot drift silently because the gate fails, and it cannot change deliberately without a recorded, reviewed decision.
