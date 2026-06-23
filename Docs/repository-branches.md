# Repository branches & the v1/v2 split

> **TL;DR —** `master` is **this** project (UIx **v2** styleguide) and is the canonical default branch.
> `main` is a **different, unrelated** project (UIx **v1** registry) that happens to share this GitHub repo.
> **Never merge between them.** All v2 work, CI, and releases live on `master`.

## What's going on

This repo (`COx-ORG-H/UIx`) currently hosts **two unrelated projects** on two branches with **no shared git
history** and incompatible layouts:

| Branch | Project | Stack | npm package | Status |
|---|---|---|---|---|
| **`master`** *(GitHub default)* | **UIx v2** — stack-neutral, build-free styleguide + DTCG token source + React lib | npm; vanilla HTML/CSS/JS + a tsup React build | `@uix/tokens@2.0.0`, `@uix/react@2.0.0` | **This project.** ADR-0016 Phase 2 release gates landed; CI + release run here. |
| **`main`** | **UIx v1** — `@uix` React/Next/shadcn composite **registry** + 67-token contract | pnpm workspace; shadcn registry | `@uix/tokens@1.0.0` | A **separate** project (also kept at `../UIx`). A 1-commit orphan, built/audited 2026-06-10. |

By design they reuse the same `--uix-*` token contract so v1 and v2 stay swappable (see the [README](../README.md)) —
but they are **separate codebases**: npm vs pnpm, styleguide vs registry, and crucially **no common git ancestor**.

## How this bit us (2026-06-23)

- GitHub's **default branch is `master`**, but the local `origin/HEAD` ref pointed at `main` and tooling/notes kept
  calling `main` "the main branch."
- A request to "merge the v2 branch into `main`" would have triggered an `--allow-unrelated-histories` merge —
  fusing the v1 registry and the v2 styleguide (two `package.json`s, pnpm+npm lockfiles, two `packages/tokens`
  layouts). It was caught *before* merging; the v2 work went to **`master`** (a clean fast-forward) and **`main`
  was left untouched**.

## Handling — from now on

1. **`master` is canonical for v2.** All v2 styleguide work, branches, CI, and releases target `master` (the
   default). Mentally, **`master` _is_ "main"** for this project. (`ci.yml` triggers on `master`.)
2. **Never cross-merge `main` ↔ `master`.** They share no ancestor; a merge between them is always wrong.
3. **Don't develop v2 on `main`** — it is not this project's branch.
4. **Fix the stale ref locally:** `git remote set-head origin master` (so `origin/HEAD` → `master`).

## Open decisions (owner: Haris)

Not yet resolved — recorded here so they don't get lost:

- **The v1 registry on `main` duplicates `../UIx`.** Decide whether to (a) **delete the `main` branch** from this
  repo (if v1 is safely preserved in its own repo), or (b) **move it to its own GitHub repo**. Until then `main`
  stays parked and untouched.
- **The `@uix` npm scope is shared by v1 and v2.** `@uix/tokens` is currently unpublished (the scope is free).
  Publishing v2 from `master` establishes `@uix/tokens` on npm starting at **2.0.0**. Decide v1's
  `@uix/tokens@1.0.0` plan — superseded by v2, or coexist as different majors under one scope? **Resolve this
  before the first publish** (see the Phase 2 plan's Phase B / human-action checklist).
