# Analyst Data-Experience — UIx token & contract additions

**Repo:** uix-styleguide (UIx v2, `master`) · **Package:** `@tensor_1/tokens` (+ `@tensor_1/react`)
**Status:** **Canon** (2026-06-25). Implementation tracked as Track U (U1–U5 + Meter/Inbox wrappers) in the uix-styleguide repo; companion TENSOR slices are ADX-T1..T8 in Phase 11.7.
**Date:** 2026-06-25
**Companion:** `../TENSOR/Docs/analyst-dx-tensor-codebase.md` (the app-repo half) · `../TENSOR/Docs/analyst-data-experience-principles.md` (shared audit).

This is the **token/primitive-contract half** of the analyst data-experience work, triggered by the TENSOR audit. The headline up front, because it changes how to read this doc:

> **The styleguide is ~90% of the way there.** `table.css` already ships row selection (`tr[aria-selected]`) and density tiers; `Meter` is a ready threshold bar; `Inbox` is a triage primitive; `DetailLayout` ships the related-panels rail; the severity ramp (`danger`/`warning`/`amber`) and the SOLID-vs-TEXT status split are already modelled. Almost every "gap" in the audit is **TENSOR not consuming** these, not a missing token.

So this doc is deliberately small and surgical: five additions, four of them token/contract, one governance. None is breaking; all are additive; each needs a `tokens/dark` parity value.

---

## U1 — A time-pressure semantic, distinct from severity and from error

**Current (verified).** Time-to-breach is expressed by overloading existing roles: TENSOR renders SLA breach as `it.breached ? 'var(--uix-danger)' : 'var(--uix-warning)'` (`TENSOR …/widgets/list-widgets.tsx:160`). The token contract has three *severity* tiers (`color.json:42` — "danger = SEV-1, warning = SEV-2, amber = SEV-3") and status roles, but **no semantic for "how close to a deadline."** That conflates three different meanings on `danger`/`warning`: *how severe is the incident*, *how close to SLA breach*, and *validation error*.

**Propose.** A small time-pressure group in `tokens/base/color.json`, following the established SOLID-vs-TEXT split (`success`/`success-bg`/`success-fg` + `*-text`):

```
"attention":      "<amber-distinct-from-warning>",   // "approaching deadline / at risk"
"attention-bg":   "...",  "attention-text": "...",  "attention-solid": "...",
"overdue":        "<red-aligned-with-danger-role>",  // "breached / past due"
"overdue-bg":     "...",  "overdue-text": "...",  "overdue-solid": "..."
```

`attention` must read **apart from `--uix-warning`** (which means validation-warning) so "SLA at risk" and "form warning" aren't the same swatch. `overdue` may share danger's hue but is a separate role so products can retheme breach independently of error. Serves SLA *and* the sibling time signals (renewal-due, EoL/EoS countdown, patch-overdue, maintenance-imminent) so each module stops hand-picking `danger`/`warning`.

**Consumers.** `status-pill` (new tone, see U4), `meter` (new `data-tone="overdue"`), TENSOR ADX-T2.

---

## U2 — Complete the severity / priority ramp to the ITSM range

**Current (verified).** The ramp stops at three tiers: `danger`=SEV-1, `warning`=SEV-2, `amber`=SEV-3 (`color.json:42–43`). ITSM uses SEV-1…5 and P1…P5; SEV-4/SEV-5 and the low priorities have **no token** and fall back ad hoc (TENSOR's incident list drives severity through a local `@/components/ui/badge` `severityBadgeCategory`, off-contract).

**Propose.** Make the ramp contractual end-to-end — either explicit `--uix-sev-4` / `--uix-sev-5` (e.g. info-toned, then neutral) or a documented, enforced mapping (`sev-4 → info`, `sev-5 → neutral`) in the token `$description`s. Same for priority if products distinguish P-tiers from SEV-tiers. Goal: a downstream never has to invent a tier color.

**Consumers.** `status-pill` priority/severity tone classes (U4); TENSOR replaces its local severity badge (ADX-T8).

---

## U3 — A dedicated row-selection token

**Current (verified).** Selection has no token of its own — `table.css:22` paints the selected row with `var(--uix-brand-muted)`. But `--uix-brand-muted` is *also* the unread tint (`notification-center.css:7`) and the inbox accent fill (`inbox.css:7`), and pinned rows use a third token (`row-pinned-bg`, `color.json:62`). Once bulk-select ships (TENSOR ADX-T1), "selected" needs to read apart from "pinned" and "unread" in the same table.

**Propose.** Add `--uix-row-selected-bg` (and optionally `--uix-row-selected-line` for a leading accent edge) to `color.json`, distinct from `row-pinned-bg` and `brand-muted`. Point `table.css`'s `tr[aria-selected="true"]` at it. Add a surface token for the bulk-action bar that appears on selection if the bar isn't covered by an existing surface role.

**Consumers.** `table.css`, TENSOR `data-table.tsx`.

---

## U4 — Reconcile the `status-pill` contract with its implementation

**Current (verified).** `status-pill.css:1` advertises a "tone API (status / **priority** / **SLA**)" but the file ships only five generic tones: `neutral`, `success`, `info`, `warning`, `danger` (`status-pill.css:9–13`). There are no priority or SLA tone classes — so the "SLA tone" TENSOR is told to use doesn't exist, which is why it falls back to raw `danger`/`warning` literals.

**Propose.** Ship the advertised classes, backed by U1/U2: `--sla-ok` (→ success), `--sla-at-risk` (→ `attention`), `--sla-breached` (→ `overdue`); and priority tones `--p1…--p5` mapped onto the completed severity ramp. Then the contract claim becomes true. The repo already has `scripts/check-contract.mjs` — extend it to fail when a documented tone has no rule (see U5).

**Consumers.** TENSOR ADX-T2/T8 (renders SLA + severity through the pill instead of literals).

---

## U5 — A consumer-parity guard (the root-cause fix; governance, not a token)

**Current.** The divergence that produced this whole workstream is **consumption drift**: TENSOR ships `@tensor_1/react` + `@tensor_1/tokens` yet re-implements `Table`, the status `Badge`, and SLA rendering locally, so styleguide investment (selection, meter, inbox, SLA tone) goes unused and the surfaces drift. The repo already has `scripts/check-contract.mjs` and `scripts/check-parity.mjs` — the bones of a guard.

**Propose.** Two cheap additions, no new runtime:
1. **Contract self-check:** extend `check-contract.mjs` so any tone/role named in a component's header comment (the "status / priority / SLA" claim) must have a matching CSS rule, or CI fails. Catches U4-class drift at the source.
2. **Consumer-adoption note:** publish a short "primitives downstreams should consume, not fork" list in the package README (`Table` selection, `Meter`, `Inbox`, `StatusPill` SLA/priority, `DetailLayout` rail), with the token each is themed by. Gives TENSOR a checklist to converge against (its ADX-T8).

This is the item that keeps the other four from silently rotting after they ship.

---

## Notes for whoever picks this up

- **Additive, non-breaking.** New tokens only; no renames of the `--uix-*` contract that 70+ component files depend on (per `style-dictionary.config.mjs` design notes).
- **Dark parity required.** Every new token needs a `tokens/dark/color.json` value; `check-parity.mjs` should be made to cover them.
- **Theme overrides.** Products retheme via `themes/*.tokens.json` (e.g. `tensor.tokens.json`); the new roles must be overridable there like the existing brand/status roles.
- **Sequence:** U1 → U4 → (U2, U3 in parallel) → U5. U1+U4 unblock the highest-value TENSOR item (ADX-T2, SLA surfacing); U3 unblocks bulk-select polish (ADX-T1); U2 unblocks the severity-badge convergence (ADX-T8).
