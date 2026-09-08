# TENSOR UIx convergence — paste-ready agent prompts

**UIx target:** `@tensor_1/tokens@2.15.0` and `@tensor_1/react@2.15.0`  
**Source plan:** `Docs/plans/2026-09-08-tensor-uix-component-convergence.md` in UIx  
**Rule:** replace `[REGISTERED-ID]` only after the registration prompt has updated TENSOR's canonical ledger.

## 0. Register the TENSOR slices

```text
Work in E:\Development\Projects\TENSOR. This is a planning/ledger task only: do not implement UI changes.

Read, in order, the workspace AGENTS.md chain, TENSOR/AGENTS.md, Docs/CLAUDE.md, Docs/build-operating-manual.md, Docs/vertical-slice-policy.md, Docs/cowork-definition-of-ready.md if present, Docs/build-plan.md, and only the relevant entries in Docs/build-state.json. Fetch origin/main and treat origin/main plus the live scripts as authoritative. Inspect the published @tensor_1/react@2.15.0 type declarations and the UIx convergence plan at E:\Development\Worktrees\uix-styleguide-uix-promotion\Docs\plans\2026-09-08-tensor-uix-component-convergence.md.

Register seven independently landable UI convergence slices, preserving this dependency order: dependency/client seam; Breadcrumbs+Combobox+obsolete CSS; states+RelativeTime; CardLink/detail/settings compositions; Sidebar+generic dialogs; DataTable controls+cleanup ratchet; final consumer proof. Reuse existing planned slice IDs if origin/main already contains equivalent work; otherwise allocate IDs according to the current build-plan convention. For every slice, add a complete Definition of Ready, exact in/out scope, dependencies, acceptance criteria, verification commands, rollback note, and canonical build-state entry. Do not mark implementation done. Do not modify product code. Run pnpm build-state:normalize, pnpm build-state:check, pnpm build-state:validate, and pnpm slice:dupes. Commit on a documentation slice branch, push it, and open a PR; never push or merge main. Report the registered IDs and PR URL.
```

## 1. Dependency and client seam

```text
Implement TENSOR slice [REGISTERED-ID] in E:\Development\Projects\TENSOR. Read the required AGENTS.md/CLAUDE chain, the current slice entry in Docs/build-state.json, Docs/build-operating-manual.md, Docs/vertical-slice-policy.md, the UI lesson files, local LESSIONS_LEARNED/LESSONS_LEARNED files that apply, and scripts/uix-sync.mjs before editing. Fetch origin/main, run pnpm slice:preflight -- [REGISTERED-ID] using the repository's documented syntax, stake the slice, and work only on branch slice/[REGISTERED-ID].

Upgrade @tensor_1/tokens and @tensor_1/react to 2.15.0 from npm, regenerate pnpm-lock.yaml, run the canonical UIx sync flow, and update @tensor/vendor-uix so imports still cross the supported client seam. Verify the installed dist files—not sibling UIx source—preserve per-file "use client" directives for interactive exports in a Next production build. Remove or correct stale TENSOR documentation/comments claiming UIx drops the directive. Do not migrate visual call sites in this slice, edit UIx, use link:/file: dependencies, or weaken the vendor seam.

Acceptance: package manifests/lockfile/vendor seam agree on 2.15.0; production build consumes npm artifacts; existing UI is unchanged. Run focused vendor tests, pnpm lint, pnpm typecheck, pnpm build, pnpm build-state:check, pnpm build-state:validate, and pnpm pr:preflight. Complete the repository DoD, update the slice ledger truthfully, commit, push slice/[REGISTERED-ID], and open a PR. Never push or merge main. Report files, commands, results, and PR URL.
```

## 2. Breadcrumbs, Combobox, and obsolete CSS

```text
Implement TENSOR slice [REGISTERED-ID] after the UIx 2.15.0 dependency slice lands. Follow the full TENSOR read order, fetch origin/main, preflight/stake the slice, and work on slice/[REGISTERED-ID]. Inspect every import of packages/shared/ui/src/breadcrumbs.tsx and combobox.tsx plus the global .link-quiet and ID-cell-arrow selectors before editing.

Replace the local Breadcrumbs and Combobox implementations with @tensor/vendor-uix exports/adapters. Preserve Next routing through a thin TENSOR adapter only where native href navigation is insufficient; preserve translation/customization-resolver labels and current form semantics. Convert .link-quiet users to the existing .uix-link--quiet contract and delete the redundant ID-cell arrow/quiet-link CSS only after browser evidence proves the installed token artifact owns it. Do not change product data fetching, validation policy, permissions, or UIx source.

Add focused render/keyboard tests for current-page breadcrumbs and combobox open/filter/arrow/Enter/Escape/blur behavior. Run those tests, pnpm lint, pnpm typecheck, pnpm test:tokens, pnpm build, representative Playwright journeys in light/dark themes, build-state gates, and pnpm pr:preflight. Complete the DoD, commit, push, and open a PR; never merge main. Report deleted modules/selectors and PR URL.
```

## 3. States and RelativeTime

```text
Implement TENSOR slice [REGISTERED-ID] after the dependency slice. Follow the canonical read/preflight/stake flow and work on slice/[REGISTERED-ID]. Inventory imports of RelativeTime and every local Empty/Error/Forbidden/NotFound/loading state before changing anything.

Migrate call sites to UIx 2.15.0 RelativeTime, EmptyState, FilteredEmptyState, ErrorState, ForbiddenState, NotFoundState, LoadingState, and their page/drawer/inline variants. Keep locale, time zone, translations, customization-resolver copy, sanitized error mapping, telemetry, permission decisions, and recovery callbacks in TENSOR. Use deterministic `now` values in tests. Delete local components only when all imports and equivalent tests have moved; do not pass raw exceptions or authorization objects into UIx.

Verify invalid dates, future/past buckets, absolute-date fallback, filtered-empty recovery, retry behavior, and drawer/page density. Run focused Vitest, pnpm lint, pnpm typecheck, pnpm build, state-focused a11y/browser tests, build-state gates, and pr:preflight. Complete DoD, commit, push, open a PR, never merge main, and report migration counts plus PR URL.
```

## 4. Card, page, detail, and settings compositions

```text
Implement TENSOR slice [REGISTERED-ID] after the dependency slice. Follow TENSOR's complete read/preflight/stake flow and work on slice/[REGISTERED-ID]. Read ADR-0057 and inspect PressableCard, the local DetailLayout, Section, settings Breadcrumbs/RelatedLinks, ToggleRow, and CollapsibleSection plus all consumers.

Replace product-neutral structure with UIx CardLink, Card, DescriptionList, DetailPage/DetailLayout, RelatedLinks, ToggleRow, and CollapsibleSection. Preserve TENSOR routing adapters, Markdown rendering, translations/customization resolver, metrics data, permissions, and the ADR-0057 relatedPanels cross-module contract. A thin TENSOR DetailLayout adapter is allowed only for those product contracts. Do not move Markdown, registries, permissions, or related-panel policy into UIx and do not edit UIx locally.

Prove whole-card keyboard focus, no nested interactive controls, responsive detail layout, tabs/current-page semantics, settings toggles, and related-panel behavior. Run focused tests, pnpm lint, pnpm typecheck, pnpm build, representative light/dark Playwright journeys, build-state gates, and pr:preflight. Complete DoD, commit, push, open a PR, never merge main, and report retained adapters and deleted duplicates.
```

## 5. Sidebar and generic dialogs

```text
Implement TENSOR slice [REGISTERED-ID] after the dependency slice. Follow the canonical read/preflight/stake flow and work on slice/[REGISTERED-ID]. Inventory Sidebar/NavGroup/favourites overrides and ConfirmDialog/PromptDialog/ConfirmAction consumers; read the relevant navigation, accessibility, audit, RBAC, and compensation lessons/ADRs before editing.

Adopt UIx 2.15.0 Sidebar/NavGroup controlled disclosure, full/rail behavior, focus restoration, and generic ConfirmDialog/PromptDialog. Remove local rail/favourites CSS only when light/dark/full/rail evidence passes. Keep Next routing, visibility rules, translations/customization resolver, permissions, action identifiers, audit append-only behavior, compensation metadata, and irreversible-operation policy in TENSOR adapters. ConfirmAction must remain a policy wrapper; never let UIx decide authorization or audit semantics.

Test keyboard disclosure, collapse while focus is inside, rail tooltips/names, Escape/focus return, pending confirmations, prompt validation, and compensated/destructive flows. Run focused unit tests, compliance tests where policy wrappers change, pnpm lint, pnpm typecheck, pnpm build, pnpm test:a11y or focused equivalent, browser journeys, build-state gates, and pr:preflight. Complete DoD, commit, push, open a PR, never merge main, and report retained policy seams.
```

## 6. DataTable controls and cleanup ratchet

```text
Implement TENSOR slice [REGISTERED-ID] after the dependency slice and the direct-wrapper slice. Follow the full read/preflight/stake flow and work on slice/[REGISTERED-ID]. Read ADR-0053 and the analyst data-experience principles, then inventory FilterPopover, ColumnVisibilityMenu, DensityToggle, SavedViewDropdown, DataTable toolbar chrome, list-surface registries, URL view state, and all tests.

Use UIx 2.15.0 ViewMenu, FilterPopover, and SavedViewMenu for controlled presentation. Adapt TENSOR's typed filter descriptors to UIx text/number/date/enum/boolean editors and keep DataTable, TanStack integration, list-surface/peek registries, URL serialization, persistence, tenancy, permissions, telemetry, and bulk-operation policy in TENSOR. Preserve saved-view create/rename/delete through caller-rendered actions. Delete retired local controls only after all consumers move. Add a narrow Knip/compliance ratchet that rejects those retired imports and duplicated UIx selectors; do not ban legitimate DataTable adapters and do not edit UIx.

Test each filter kind, density/zebra/freeze, required columns, saved-view select/pin/actions, URL round trips, and list surfaces. Run focused Vitest, pnpm lint, pnpm typecheck, pnpm compliance, pnpm build, representative list Playwright journeys, build-state gates, and pr:preflight. Complete DoD, commit, push, open a PR, never merge main, and report what deliberately remains in DataTable.
```

## 7. Final consumer proof

```text
Implement TENSOR slice [REGISTERED-ID] only after all six UIx adoption slices have landed. Follow the canonical read/preflight/stake flow and work on slice/[REGISTERED-ID]. This is a proof/cleanup slice: do not redesign screens or broaden scope.

From current origin/main, scan for every retired local UIx duplicate and obsolete selector named by the prior slices. Verify package manifests, lockfile, @tensor/vendor-uix, and installed npm artifacts all use 2.15.0. Repair only convergence regressions found by the proof. No sibling-source imports, link:/file: dependency, UIx repository edits, business-policy migration, or wholesale DataTable replacement.

Acceptance: zero imports of retired Breadcrumbs, Combobox, RelativeTime, state, PressableCard, settings composition, generic dialog, and table-control modules; zero obsolete quiet-link/ID-arrow/rail overrides; retained adapters are documented and product-specific. Run pnpm lint, pnpm typecheck, pnpm test, pnpm test:tokens, pnpm compliance, pnpm build, pnpm test:a11y, pnpm test:e2e:smoke, pnpm build-state:check, pnpm build-state:validate, pnpm repo:hygiene:audit, and pnpm pr:preflight. Record exact evidence and any environment-only skipped suite. Complete DoD, commit, push, and open a PR; never merge main. Report final counts, evidence, residual product adapters, and PR URL.
```
