# Tensor → UIx component convergence

**Date:** 2026-09-08  
**Owner:** UIx maintainers  
**Delivery:** one additive UIx minor release, followed by independently landable TENSOR adoption slices  
**Status:** UIx implementation complete; release verification in progress

## Definition of Ready

### Problem and audience

UIx is the shared visual and interaction layer for the house products, but TENSOR still owns a second
set of reusable React modules and CSS repairs. Product engineers must choose between similarly named
interfaces, UI fixes are made twice, and other products cannot reuse behavior already proven in TENSOR.
This work moves the domain-neutral behavior to UIx and leaves only TENSOR data, policy, routing,
translation, permission, audit, and telemetry adapters in TENSOR.

### Non-goals

- Do not move TENSOR business concepts, tRPC/data access, permissions, feature flags, audit metadata,
  journey instrumentation, entity registries, or regulatory badge mappings into UIx.
- Do not move TENSOR's complete `DataTable`; its surface registry and combined interface remain a
  consumer module. Only reusable table controls move.
- Do not introduce Next.js, TanStack Table, Radix, Lucide, react-hook-form, or Zod as UIx runtime
  dependencies. UIx remains React-only and stack-neutral.
- Do not remove TENSOR code from the UIx repository. TENSOR migration is a separate set of slices.
- Do not change or remove existing UIx props or token names. This is an additive minor release.

### Acceptance criteria

1. `@tensor_1/react` exports the following domain-neutral modules with public types:
   - `Breadcrumbs`
   - `Combobox`
   - `RelativeTime` and its pure formatting/bucketing helpers
   - `CardLink` plus interactive Card styling
   - `DetailPage` (composed above the existing `DetailLayout` grid)
   - enriched state family: variants, recovery actions, `ForbiddenState`, `NotFoundState`
   - generic `ConfirmDialog` and `PromptDialog`
   - `RelatedLinks`, `ToggleRow`, `CollapsibleSection`, `AsyncOperationStatus`
   - `ViewMenu`, `FilterPopover`, and `SavedViewMenu` as reusable table controls
2. Existing `Card`, `DetailLayout`, States, Sidebar and NavGroup interfaces remain source compatible.
3. Sidebar rail presentation, controlled NavGroup state/focus restoration, and NavFavourites contrast
   are owned by UIx rather than requiring product CSS.
4. All new user-facing copy is passed through props or an explicit formatter; no product vocabulary is
   embedded in UIx.
5. React render/model tests cover semantic markup, state selection, invalid input, and exported classes.
6. The component roadmap and canonical docs catalogue report every new React export accurately and show
   representative examples.
7. `build:all`, React tests, parity, contract, API, smoke, docs tests and accessibility tests pass. Linux
   visual baselines remain CI authority.
8. A linked minor changeset is consumed, packages are versioned, the release tag is pushed, the tag
   workflow passes, and the published npm versions are verified from the registry.
9. The TENSOR migration plan below names independently landable slices with acceptance criteria and
   paste-ready prompts.

### Stack and architecture decision

The external seam remains `@tensor_1/react`. Modules use UIx CSS classes and native HTML behavior, with
small inline SVGs where an icon is intrinsic. Data and framework adapters are injected through props.
Existing modules are deepened additively when the visual concept already exists; new names are used when
the current interface is intentionally smaller (`DetailPage` above `DetailLayout`, `CardLink` beside
`Card`). This maximizes leverage without a breaking release.

Rejected: copying TENSOR files verbatim. They contain Tailwind classes, Lucide/Next imports, English
defaults, and product-policy fields. The behavior and tests are the source material; the UIx
implementation must use the UIx contract and a smaller public interface.

### Top risks and early checks

1. **Public-interface bloat.** Keep product policy out and apply the deletion test to every prop. Review
   public types before implementation; API Extractor makes accidental expansion visible.
2. **Accessibility regression in interactive modules.** Build native semantics first; cover combobox,
   dialogs, disclosure focus, and terminal-state recovery in tests and the axe gallery.
3. **Published artifact differs from source.** Build `dist`, run the packed smoke consumer, publish only
   through the tag workflow, then query npm independently.
4. **Docs work is concurrent in the primary checkout.** This branch is isolated in a dedicated worktree
   from `origin/master`; merge conflicts are resolved without overwriting the other branch's uncommitted
   documentation work.

### Data, security and compliance

UIx receives already-resolved React nodes, labels, URLs and callbacks. It fetches and stores no tenant or
personal data. URL-bearing modules use ordinary anchors and do not sanitize consumer data; callers remain
responsible for trusted destinations. Error modules accept display-safe problem text, not raw exception
objects. Confirmation modules emit callbacks only; authorization, audit, compensation and irreversible
operation policy remain in the consumer.

### Production-readiness seed

This changes an existing library, not a new tenant-facing service. Ownership: UIx CI owns API/package/a11y
gates; the tag workflow owns npm publication; TENSOR adoption slices own consumer migration and product
browser verification. Rollback is a patch release plus pinning TENSOR to its prior UIx version. Existing
exports remain compatible, so consumers may migrate incrementally.

## UIx implementation plan

### UIX-CVG-01 — direct missing wrappers

- Add `Breadcrumbs` over `breadcrumbs.css` with explicit item ids, current-page semantics, configurable
  separator and native links.
- Add controlled `Combobox` over `combobox.css`; separate pure filtering/active-index helpers, reset the
  query on every open/close path, and implement the WAI-ARIA input/listbox keyboard model.
- Add tests, exports, roadmap rows, API report and docs specimens.

### UIX-CVG-02 — universal state and time modules

- Add locale/time-zone-aware `RelativeTime`, a single shared refresh timer, a valid-date guard, injectable
  formatter, and pure bucket/format helpers.
- Deepen States additively with `inline | full-page | drawer`, recovery-action slots, filtered-empty
  handling, density-aware loading, `ForbiddenState`, and `NotFoundState`.
- Do not encode permissions, RFC-specific transport behavior, or English product explanations.

### UIX-CVG-03 — navigation and page composition

- Add `CardLink` and `.uix-card--interactive`; preserve the existing `Card` interface.
- Add `DetailPage` using `PageHeader`, Tabs-style links, metrics and the existing `DetailLayout` grid.
- Add `RelatedLinks`, `ToggleRow`, and `CollapsibleSection` as small composition modules.
- Deepen Sidebar/NavGroup with controlled state, focus restoration, complete rail selectors, and compliant
  favourites text contrast.

### UIX-CVG-04 — dialogs and asynchronous feedback

- Add generic `ConfirmDialog` and `PromptDialog` on native `Modal`, with caller-supplied labels/content,
  pending state, Enter/Escape behavior and focus restoration inherited from `useDialog`.
- Add `AsyncOperationStatus` using UIx Card/Progress/StatusPill/Alert concepts and caller-owned state.
- TENSOR compensation/audit metadata remains a wrapper around `ConfirmDialog`.

### UIX-CVG-05 — reusable table controls

- Add `ViewMenu` for density, zebra, freeze and column visibility using controlled descriptors.
- Add a controlled, descriptor-driven `FilterPopover` with text, number, boolean, enum and date editors.
- Add `SavedViewMenu` with controlled selection and caller-rendered create/rename/delete actions.
- Do not import TENSOR registries or TanStack Table.

### UIX-CVG-06 — release

- Update the roadmap and docs catalogue/specimens.
- Add one linked minor changeset for tokens + React because component CSS and the React interface move
  together.
- Run every local deterministic gate, commit, push, open the PR and wait for CI.
- Merge only when required checks are green, then version from `origin/master`, tag, push, wait for the
  release workflow, and verify both package versions from npm.

## TENSOR adoption slices

These slices are ordered so every change can land independently while the compatibility shims remain.
The TENSOR agent must register them in its canonical build plan/state using the repository's current
slice-registration rules; identifiers below are proposed names, not authority until registered there.

### UIX-ADOPT-01 — dependency and client-seam upgrade

Upgrade `@tensor_1/tokens` and `@tensor_1/react` to the new published version, regenerate the lockfile,
verify per-file client directives against Next production build, update `@tensor/vendor-uix`, and remove
stale claims that the package loses `"use client"`. No visual migration yet.

### UIX-ADOPT-02 — direct wrappers and obsolete CSS

Replace local Breadcrumbs and Combobox with UIx exports. Replace `.link-quiet` call sites with
`.uix-link--quiet`; delete the redundant ID-cell arrow and quiet-link CSS only after browser tests prove
the installed artifact owns the behavior.

### UIX-ADOPT-03 — states and relative time

Migrate all terminal states and `RelativeTime` call sites. Keep translation wrappers where TENSOR needs
resolver-provided copy. Delete local modules and their duplicate tests after equivalent consumer tests use
the public UIx interface.

### UIX-ADOPT-04 — card, page and detail composition

Replace `PressableCard`, settings Breadcrumbs/RelatedLinks, ToggleRow, CollapsibleSection, and the generic
portion of TENSOR's DetailLayout. Retain a thin TENSOR adapter only for Markdown and declared cross-module
panel policy. Migrate `Section` to UIx Card + DescriptionList rather than adding another parallel name.

### UIX-ADOPT-05 — sidebar and dialog convergence

Adopt UIx Sidebar/NavGroup rail behavior and generic Prompt/Confirm dialogs. Keep navigation visibility,
Next routing, translation, permissions and compensation/audit contracts in TENSOR adapters. Remove local
rail and favourites CSS after visual/a11y verification in all sidebar modes.

### UIX-ADOPT-06 — table controls and cleanup gate

Replace FilterPopover, ColumnVisibilityMenu/DensityToggle, SavedViewDropdown and generic toolbar chrome
with UIx controls. Keep DataTable, list-surface/peek registries, query state and bulk-operation policy in
TENSOR. Add or update a lint/Knip ratchet that rejects the retired local modules and duplicated UIx CSS.

### UIX-ADOPT-07 — final consumer proof

Run TENSOR's lint, typecheck, focused unit tests, production build, accessibility suite and representative
browser journeys. Verify source imports no retired local module, no duplicated global selector remains,
and the installed npm artifacts—not sibling source—render every migrated surface.

## Prompt templates

The final delivery response must include:

1. a registration prompt for a TENSOR planning agent to add/validate the slices above against current
   `origin/main` and TENSOR's build ledger;
2. one implementation prompt per registered slice, including required read order, exact scope,
   acceptance criteria, commands, commit/push/PR behavior, and a prohibition on editing UIx locally;
3. optional prompts for POSx/SHOPx agents to upgrade only after they confirm actual use of the promoted
   modules.

## Implementation record

Implemented on `codex/uix-tensor-promotions` in the isolated worktree
`E:\Development\Worktrees\uix-styleguide-uix-promotion`. The public components, CSS contracts, pure
models, shared relative-time clock, render/model tests, API report, docs catalogue, roadmap, packed-smoke
export list, linked minor changeset, and intentional CSS-size baseline are included. TENSOR was inspected
read-only and was not modified. Paste-ready registration and implementation prompts are stored in
`Docs/plans/2026-09-08-tensor-uix-adoption-prompts.md`.
