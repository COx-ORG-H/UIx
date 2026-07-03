<!--
  UIx v2 pull request template.
  The "Contract change?" gate keeps the --uix-* contract from being changed by
  accident inside a large diff (bus-factor-1 stand-in for a second reviewer).
  See ../Docs/contract-change-process.md and ../Docs/reviewer-policy.md.
-->

## Summary

<!-- What does this PR do, and why? -->

## Contract change?

Does this PR touch the `--uix-*` contract surface — `packages/tokens/tokens/`,
`packages/tokens/themes/`, `tests/tokens.baseline.css`, `style-dictionary.config.mjs`,
or `packages/tokens/scripts/`?

- [ ] **This PR touches the `--uix-*` contract** — the checklist below is REQUIRED.
- [ ] **This PR does NOT touch the contract** (opt out — skip the checklist below).

> If you only touched component CSS, a demo, docs, or tests unrelated to the token
> contract, tick the opt-out box and skip straight to the sign-off.

### Contract-change checklist (required only when it IS a contract change)

- [ ] **Is it really a contract change?** If you only touched component CSS / a demo, it isn't — skip this process.
- [ ] **Edit the DTCG source**, never the generated output. `npm run build` regenerates `build/`.
- [ ] **Update `tests/tokens.baseline.css` in the same commit** if (and only if) the change is intentional. `npm run test:parity` is the gate: a value/name drift with no baseline update fails CI; a baseline update with no token change is a red flag in review.
- [ ] **Run `npm run test:contract`** — structural categories present, every theme covers its tier, no un-justified raw values.
- [ ] **Add a changeset** (`npm run changeset`) classifying the bump per the table below. Linked: tokens + react move together.
- [ ] **For any major:** open or link an ADR (`D:\Development\Docs\adr\`) before merging. No major lands without the recorded decision.
- [ ] **CODEOWNERS** will request the maintainer's review automatically. Self-merge only after the gates are green and the checklist above is satisfied in the PR description.

### Semver rules — the one-way doors

| Change | Bump | Also required |
|---|---|---|
| **Add** a new `--uix-*` token (new name, additive) | **minor** | changeset; update baseline |
| Change a token **value** (intentional retune) | **minor** (or major if it visually breaks consumers) | changeset; update baseline; VR review |
| **Rename or remove** a token | **major** | **new ADR**; changeset; migration note |
| Change a **`var()` fallback chain** | **major** | **new ADR**; changeset |
| **Emit a new brand slot** (extend write-only override set) | **major** | **new ADR**; changeset |
| Add a structural **category** the completeness gate checks | minor | update `check-contract.mjs` allowlist intentionally |

**"major + ADR" is non-negotiable:** these are the changes that cannot be undone without breaking a shipped consumer.

## Sign-off

- [ ] Gates are green (`test:parity` + `test:contract`).
- [ ] I have read the process below and this PR satisfies it.

---

- Contract-change process: [`../Docs/contract-change-process.md`](../Docs/contract-change-process.md)
- Reviewer policy: [`../Docs/reviewer-policy.md`](../Docs/reviewer-policy.md)
