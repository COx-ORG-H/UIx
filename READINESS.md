# UIx — production-readiness block

*The lesson-21 readiness seed for UIx. Every cross-cutting layer has a **named owner-slice** or an explicit **`deferred-until-<trigger>`** decision — a layer with no owner is the failure mode (it only surfaces in a late audit). Each owner-slice's "done" is a **gate**, not a doc (Law 1). Production cut-over — here, **first npm publish + first external consumer** — is blocked on `RDY-GATE`, which depends on every layer being `done` or explicitly deferred.*

**What "production" means for UIx.** UIx is not a runtime SaaS — it is a **distribution mechanism**: a versioned npm token package (`@uix/tokens`) plus a shadcn registry of composite components **vendored** (copied) into N sibling projects. So the enterprise layers reinterpret: there are no tenants, but there *are* N independently-mutable consumer copies; there is no database, but there *is* a token contract that migrates; there is no server to harden, but there *is* code that installs into every consumer and runs in their bundle. The layers below are mapped to that reality; the mapping is the point of this doc.

**Cut-over trigger:** `@uix` npm scope claimed → publish `@uix/tokens@1.0.0` → first non-fixture consumer (`DASHx` per README phase 3). `RDY-GATE` must be green first.

---

## Layer coverage map

| Layer (lesson 21) | UIx reinterpretation | Owner-slice | State | Gate |
|---|---|---|---|---|
| 1. Architecture & boundaries | Two-mechanism arch (npm values / registry code / no shared primitives) | *pre-existing* (ADR-0004, README, AUDIT) | ✅ done | ADR-0004; `AUDIT.md` |
| 2. Multi-tenancy & isolation | N consumer copies + host apps: no cross-consumer / host bleed | **RDY-ISOLATION-01** | ✅ this build | `check:isolation` |
| 3. Identity & access | *(no runtime auth surface)* | — | `deferred-until-never` | npm publish is the only privileged action → RDY-HARDEN provenance |
| 4. API & contracts | The token **contract** (names) + registry item manifests | *pre-existing* + **RDY-MIG-RECOVERY-01** | ✅ done / this build | `check:semver`, `check:manifest` |
| 5. Data, migrations & recovery | Token-contract migrations (breaking = major) + consumer rollback | **RDY-MIG-RECOVERY-01** | ✅ this build | `check:migrations` |
| 6. Secrets & key management | No secrets in package/registry/CI; npm token at publish only | **RDY-HARDEN-01** (secret-shape scan) | ✅ this build | `check:supply-chain` |
| 7. Security & supply chain | Vendored code runs in every consumer; dep hygiene; no dangerous sinks | **RDY-HARDEN-01** | ✅ this build | `check:supply-chain`, `dependabot.yml` |
| 8. Observability & operability | *(no runtime)* — drift visibility is the operability surface | *pre-existing* (`uix-diff`, registry stamps) | ✅ done | `uix-diff check --max-age-days` |
| 9. Availability, scaling & perf | *(no server)* — registry hosting is static/optional; builds never contact it | — | `deferred-until` static-host deploy | *(builds are offline by design; README)* |
| 10. Compliance, audit & lifecycle | OSS license/attribution; **doc claims must not outrun their gates** | **RDY-COMPLIANCE-DOC-01** | ✅ this build | `check:compliance` (+ `LICENSE`, `THIRD_PARTY.md`) |
| 11. Cost & FinOps | Per-item **consumer install footprint** (vendored files + npm deps) + CI time | **RDY-COST-01** | ✅ this build | `check:cost` (`cost-budget.json`) |
| 12. Delivery, config & continuity | Every gate wired + CI runs the same `check` a dev runs; no orphan/decorative gate | **RDY-GATE-CONSISTENCY-01** | ✅ this build | `check:gates` |
| 12b. Repo & code hygiene (lesson 17) | No manifest drift, no orphan files, counts match prose, no dead weight | **RDY-HYGIENE-01** | ✅ this build | `check:manifest` |
| 12c. Human adoption journey (lesson 14) | The documented onboarding path is **executable and verified**, not just prose | **RDY-JOURNEY-01** | ✅ this build | `uix-doctor` (run vs both fixtures in `check`) |
| 13. AI safety & cost | *(not an AI product)* | — | `deferred-until-never` | n/a |
| **RDY-GATE** | cut-over gate: depends on all above; blocks first publish/consumer | **the aggregate `pnpm check`** | ✅ this build | `pnpm check` green ⇒ every covered layer's gate green |

---

## The 8 owner-slices built this pass

Each lands a **pure-node gate** wired into `pnpm check` (so it rides the existing CI, which already runs `pnpm check`), plus its artifact. Ordered as built.

### RDY-HYGIENE-01 — repo & internal-consistency (lesson 17)
**Gap:** the AUDIT flagged "manifest drift" (README named `status-pill`/`stat-tile` before they existed). Nothing mechanically ties the prose counts, the manifest, and the files on disk together.
**Gate — `scripts/check-manifest.mjs` (`check:manifest`):** every `registry.json` `files[].path` exists; every `.tsx/.ts` under `registry/uix/` is claimed by exactly one item (no orphan/untracked component file); every `@uix/<x>` in `registryDependencies` resolves to a real item; the item/file/token **counts asserted in README + AUDIT prose match reality** (parsed, compared). Drift can't merge.

### RDY-GATE-CONSISTENCY-01 — delivery: no decorative gate (layer 12)
**Gap:** "an unenforced rule is a suggestion" (Law 1). A gate script can exist in `scripts/` yet never be invoked by `check`; CI could run a subset of what a dev runs. Both are silent.
**Gate — `scripts/check-gate-consistency.mjs` (`check:gates`):** every `scripts/check-*.mjs` / `lint-*.mjs` gate file **is referenced in the `check` chain** (no orphan gate); every `check:*`/`lint:*`/`test:*` npm script is reachable from `check`; **`ci.yml` runs `pnpm check`** (not a hand-picked subset). Adding a gate script without wiring it fails.

### RDY-ISOLATION-01 — cross-consumer / host isolation (layer 2, reinterpreted)
**Gap:** a composite is copied into N host apps. Purity (`check:purity`) already isolates it from primitive bases. But a composite could still **bleed**: define a global `--uix-*` token (leaking into the host), style a bare global selector (`:root`/`html`/`body` — restyling the host), keep **module-scope mutable state** (cross-request SSR bleed — the exact `keySeq` bug the AUDIT caught in §5.5), or write `globalThis`/`window`/`document` at import time.
**Gate — `scripts/check-isolation.mjs` (`check:isolation`):** bans all four in `registry/uix/`. Components *read* tokens; they never *define* them or touch host globals.

### RDY-HARDEN-01 — security & supply chain (layers 6–7)
**Gap:** vendored code runs inside every consumer's bundle — it is the real attack surface. No dangerous-sink scan, no dependency-update automation, no secret scan.
**Gate — `scripts/check-supply-chain.mjs` (`check:supply-chain`)** + **`.github/dependabot.yml`:** scans `registry/uix/` + `scripts/` + `packages/tokens/` for `dangerouslySetInnerHTML` / `eval(` / `new Function(` / `child_process` / external network calls in vendored code / secret-shaped literals. Codifies `markdown.tsx`'s "no HTML sink" invariant so a future edit can't silently reintroduce an XSS sink. Dependabot keeps npm + actions deps current (drift is the disqualifying failure mode per README).

### RDY-MIG-RECOVERY-01 — token migrations & consumer recovery (layer 5)
**Gap:** `check:semver` *blocks* a breaking token change without a major bump — but ships **no migration path** and no rollback story. A consumer hitting a major bump has nothing to follow.
**Gate — `scripts/check-migrations.mjs` (`check:migrations`)** + **`MIGRATIONS.md`:** when the contract's major version exceeds the snapshot's (a breaking change is in flight), a matching `## <version>` migration entry **must exist** in `MIGRATIONS.md` (with the rename map + consumer steps) or the check fails. `MIGRATIONS.md` also carries the **recovery runbook** (pin-back a bad token version; re-`add`/revert a broken composite; roll back a bad publish).

### RDY-COMPLIANCE-DOC-01 — license, attribution & honest docs (layer 10)
**Gap:** the package is meant for a **public** npm scope and is vendored into other repos, yet `package.json` says `"license": "UNLICENSED"` with **no LICENSE file** — legally that forbids the exact use the design intends. And lesson-21 layer 10: *never assert a control is "enforced" in a regulator-facing doc unless its gate exists* — UIx's README/AUDIT make many "the linter prevents / CI-enforced / gate blocks" claims.
**Gate — `scripts/check-doc-claims.mjs` (`check:compliance`)** + **`LICENSE` (MIT)** + **`THIRD_PARTY.md`:** a `LICENSE` file + non-`UNLICENSED` SPDX must exist; README/AUDIT enforcement-claims ("the linter prevents X", "CI-enforced", "gate blocks Y") are cross-checked against the actually-wired gate set — an over-claim (doc says enforced, no gate) fails. `THIRD_PARTY.md` inventories vendored-dep licenses + the `@itsmx/shared-ui` provenance.
> **Owner note:** MIT is the conventional design-system license (shadcn is MIT) and the only thing consistent with "public scope, vendor freely." The SPDX identifier is the owner's final legal call — trivially changed in `LICENSE` + `package.json`.

### RDY-COST-01 — per-item consumer footprint (layer 11)
**Gap:** AUDIT §5.7 — adding one small item (`@uix/states`) transitively vendors the whole data-table chain and installs `@tanstack/react-table`. That install cost is invisible; nothing bounds it.
**Gate — `scripts/check-cost.mjs` (`check:cost`)** + **`cost-budget.json`:** for each registry item, computes the transitive closure over `registryDependencies` → files vendored + npm deps added + LOC, and **fails if an item exceeds its budget**. Cost per "feature" (per item) becomes a tracked, bounded metric with an alarm — the layer-11 gate.

### RDY-JOURNEY-01 — executable onboarding journey (lesson 14)
**Gap:** the README's "Start a new project" journey is prose. "No entry point = not shipped." Nothing verifies a consumer wired UIx correctly, and the journey silently rots.
**Gate — `scripts/uix-doctor.mjs`** (run against **both fixtures** inside `check`, and shippable to consumers): validates the documented wiring — `globals.css` has the three `@uix/tokens` imports **in order** + the `@uix-overrides` fence; `@uix/tokens` is a dependency; (warn) `components.json` registers `@uix`; (warn) a `lint:tokens` script is wired. The fixtures *are* the canonical documented-journey consumers, so gating `uix-doctor` on them means the happy path can't break unseen.

---

## RDY-GATE — the cut-over gate

`pnpm check` is the aggregate readiness gate: it now runs, in one chain, every layer's gate above. **Green `pnpm check` ⇒ every covered layer is green.** Deferred layers (3, 9, 13) are explicitly `deferred-until-<trigger>` in the map above — none is silent. Before the first publish / first external consumer, `pnpm check` must pass and the deferred triggers must still hold.

*Seeded 2026-07-04 as the lesson-21 readiness block for UIx (retrofit — UIx predates the model). Decision basis: ADR-0004 (design system), ADR-0005 (readiness-layer model), lesson 21.*


