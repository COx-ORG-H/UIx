# UIx reviewer & rotation policy

**Status:** Active (GOV-2 — carries ADR-0016 Decision 7)
**Scope:** who reviews changes to the `--uix-*` contract surface, and the branch-protection settings that enforce it.

This is the companion to [`Docs/contract-change-process.md`](./contract-change-process.md): that doc is the *checklist* for a contract change; this doc is the *who reviews it and how the platform gates it*. Together they are the bus-factor-1 stand-in for a second human reviewer.

## The second-reviewer expectation

Every PR that touches the canonical contract paths (below) must be reviewed by a code owner before it merges. The contract is a set of one-way doors — rename/remove a token, change a per-token `var()` fallback chain, or emit a new brand slot is a MAJOR + an ADR (ADR-0016 Decision 2, carried from ADR-0004). Those changes must be reviewed *consciously*, never rubber-stamped inside a large diff. The point of the code-owner gate is to force a deliberate second look at exactly the lines that can silently break a shipped consumer (Tensor, POSx, SHOPx, mission-control).

### The honest solo-maintainer reality

UIx is a bus-factor-1 project: `@harisxdizdarevic` is the only maintainer, so "second reviewer" and "author" are usually the same person. We do not pretend otherwise. The gate is therefore automated, not social:

- **CODEOWNERS is the stand-in for the second human.** It forces the maintainer to be a requested reviewer on every contract PR, so the change is acknowledged as a contract change rather than lost in a large diff.
- **The status checks are the real reviewer.** `test:parity` and `test:contract` fail the PR if the `--uix-*` contract drifts without an intentional baseline update. Prose cannot be rubber-stamped past a red gate.
- **Self-merge is allowed only after the gates are green** and the [contract-change checklist](./contract-change-process.md#the-checklist-every-contract-pr) is satisfied in the PR description.

### The rotation slot (when a second reviewer exists)

The policy is written so a real second reviewer drops straight in with no process change:

- Reserve a **rotation slot** — a second code owner who shares the review load on contract PRs. When staffed, the expectation upgrades from "maintainer acknowledges" to "a human who did **not** author the change approves it." That is the goal state; the automated gate is the floor until then.
- The rotation reviewer's job is the same conscious look the maintainer owes today: confirm the semver bump matches the change class, an ADR exists for any MAJOR, and the baseline update (if any) is intentional.
- Adding the second reviewer is a one-line CODEOWNERS edit (see [below](#how-to-add-a-second-codeowner)); no workflow or branch-protection change is needed to activate the rotation.

## Canonical contract paths (NARROWED)

These are the **specific files** the code-owner gate and the contract guard protect — **not** the whole `packages/tokens/` tree and **not** the whole `scripts/` directory. New, non-contract scripts (dev helpers, one-off tooling) added under `scripts/` must **not** trip the contract guard; only the four named contract scripts below are canonical.

- `packages/tokens/tokens/` — DTCG token source of truth
- `packages/tokens/themes/` — per-product brand themes (write-only brand slots)
- `packages/tokens/tests/tokens.baseline.css` — byte-faithful generated-contract baseline
- `packages/tokens/style-dictionary.config.mjs` — Style Dictionary build config
- `packages/tokens/scripts/build-styles.mjs` — token → CSS build
- `packages/tokens/scripts/build-themes.mjs` — theme → CSS build
- `packages/tokens/scripts/check-parity.mjs` — parity gate (source vs. baseline)
- `packages/tokens/scripts/check-contract.mjs` — completeness / brand-slot allowlist gate

Anything **outside** this list — including other files under `packages/tokens/scripts/` — is ordinary code: normal PR review, no code-owner gate, no contract guard.

## Required branch-protection settings

Configured on the default branch (Settings → Branches → branch protection rule). These are the platform enforcement behind the policy above:

- **Require a pull request before merging.** No direct pushes to the protected branch.
- **Require review from Code Owners.** A CODEOWNERS-matched approval is mandatory for any PR that touches the canonical contract paths.
- **Require status checks to pass before merging**, with these checks marked as required gates:
  - **gates** — the standard lint/type/unit gate suite
  - **visual** — visual-regression (VR) review
  - **a11y** — accessibility checks
  - **contract-guard** — parity + completeness (`test:parity` + `test:contract`) over the canonical contract paths
- **Include administrators.** The maintainer is not exempt — the same gates apply to `@harisxdizdarevic`'s own PRs. This is what makes bus-factor-1 safe: the author cannot bypass the automated reviewer.
- **Disallow force-pushes** (and disallow branch deletion) on the protected branch, so history and the baseline cannot be silently rewritten.

## How to add a second CODEOWNER

To staff the rotation slot with a real second reviewer:

1. Edit [`.github/CODEOWNERS`](../.github/CODEOWNERS).
2. Add the new handle **alongside** `@harisxdizdarevic` on each canonical contract path — e.g.:

   ```
   /packages/tokens/tokens/                       @harisxdizdarevic @second-reviewer
   ```

   Listing two owners means either may satisfy the code-owner review requirement; the branch-protection rule can additionally require the **author** not self-approve, which is what turns the rotation into a genuine four-eyes check.
3. No workflow or branch-protection change is required — CODEOWNERS is read directly by the platform. The new reviewer is active on the next PR that touches those paths.
4. When onboarding the second reviewer, point them at this file and at [`Docs/contract-change-process.md`](./contract-change-process.md) so they review against the same semver rules and one-way-door checklist the maintainer uses.
