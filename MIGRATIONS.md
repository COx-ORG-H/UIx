# UIx migrations & recovery

*Owner artifact for **RDY-MIG-RECOVERY-01** (readiness layer 5 — data/migrations & recovery). `check:semver` already **blocks** a breaking token-contract change that ships without a major bump. This document is the other half: the **forward migration path** a consumer follows across a major, and the **recovery runbook** for rolling back a bad state. `scripts/check-migrations.mjs` enforces that a major bump cannot merge without a matching entry below.*

**The law (mechanized by `check:migrations`):** every **major** `@uix/tokens` bump — any token rename/removal, or an emitted→slot flip (`check-token-semver.mjs`) — requires (1) an ADR (per ADR-0004's semver law) and (2) a `## <version>` section here listing the removed/renamed tokens and the exact consumer steps. Minor/patch bumps (added tokens, value changes) need no entry — they are backward-compatible by construction (names are the contract; values are defaults).

---

## Recovery runbook

Three failure modes, three rehearsed recoveries. (This is a runbook, not a backup — the actual "backup" is npm's immutable version history + git.)

### 1. A bad `@uix/tokens` publish (wrong values, broken CSS)
Consumers pin, they don't chase `latest`:
```powershell
pnpm add @uix/tokens@<last-good-version>     # e.g. @1.0.0 — npm versions are immutable
```
Then, in this repo: fix forward and publish a patch. **Never** `npm unpublish` a version other consumers may already have pinned (it breaks their installs). If the bad version must be blocked, `npm deprecate @uix/tokens@<bad> "use >=<fixed>"` — a warning, not a removal.

### 2. A broken vendored composite (a bad `shadcn add --overwrite`)
The vendored copy lives in the consumer's git — recovery is local:
```powershell
git checkout -- components/uix/<item>.tsx     # revert to the pre-overwrite copy
# or re-pull a known-good registry version:
npx shadcn add @uix/<item> --overwrite
node ..\UIx\scripts\uix-diff.mjs record        # re-baseline the lock after either
```
`uix-diff check` will show the file as `clean-current` again once it matches the lock.

### 3. A consumer stuck on a stale/forked composite
`uix-diff check --registry ..\UIx\dist\r --max-age-days <N>` surfaces `clean-but-outdated` and fails past the age budget; forks are visible as `forked` forever. Recovery is re-`add` (§2) or an intentional `// uix-fork:` owning the divergence.

---

## Version log

### 1.0.0 — initial contract (2026-06-10)
Initial published contract (67 tokens: brand slot tier, status `*-fg` tokens, sidebar slots). **No migration** — there is no prior published version to migrate from. Baseline recorded in `contract-snapshot.json`.

---

## Template for a future major (copy when a breaking change lands)

```markdown
### <major>.0.0 — <one-line summary> (<date>)
**Breaking:** <what changed and why; link the ADR>.

| Removed / renamed | Replacement | Consumer action |
|---|---|---|
| `--uix-old-name` | `--uix-new-name` | rename in your `@uix-overrides` block |

**Migration steps**
1. `pnpm up @uix/tokens@<version>`
2. Rename overrides as per the table; run `uix-lint-tokens` — it now rejects the old names.
3. Re-`add` any composite whose token reads changed; `uix-diff record`.

**Rollback:** `pnpm add @uix/tokens@<previous>` (Recovery runbook §1).
```
