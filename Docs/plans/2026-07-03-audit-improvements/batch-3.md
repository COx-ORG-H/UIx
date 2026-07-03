# Batch 3 — DTCG-validity gate + wrappers B

*Depends on Batch 2 (merged). Paste below the line into a fresh agent.*

---

Work in `E:/Development/Projects/UIx` (clean `master`). Branch:
`git checkout master && git pull && git checkout -b batch3-dtcg-wrappersB`. Assume Batch 0–2 landed (ADR-0019
ratifying the DTCG deviation set; BREADTH-2 wrapper batch A already in the barrel + api.md). DTCG-2 and BREADTH-3
write disjoint files; only DTCG-2 edits `ci.yml`.

### DTCG-2 — DTCG-validity conformance gate (parity-neutral)  *(dep DTCG-4)*
Create `packages/tokens/scripts/check-dtcg.mjs` that walks `tokens/base/*.json` + `tokens/dark/*.json` and for
every leaf asserts: `$type` and `$value` present; `$type` ∈ the ADR-0019-ratified set (color, fontFamily,
dimension, number, shadow, cubicBezier, duration); no stray non-`$` top-level metadata keys. Exit non-zero with a
per-token message. It **reads JSON only — never rebuilds or compares `build/css/tokens.css`** (so it cannot move
`--uix-*` output). Dependency-free. Add `test:dtcg` to `packages/tokens/package.json` (package-only; do NOT add a
root alias, to keep root `package.json` untouched this batch). Add ONE "DTCG validity" step to the EXISTING `gates`
job in `ci.yml`, after `build`. **Verify:** `npm run test:dtcg -w @tensor_1/tokens` exits 0; drop `$type` in a
SCRATCH copy → exits 1; new gates step green; `git diff build/css/tokens.css` after a rebuild is empty;
`test:parity` + `test:contract` stay green and unmodified.

### BREADTH-3 — Wrapper batch B (SECOND serial wrapper batch)  *(dep BREADTH-2)*
Create `packages/react/src/components/{AuditLog,NotificationCenter,Reactions,Attachment,ViewMenu}.tsx` using the
`cx()` pattern and root classes matching the REAL CSS (`uix-audit-log`, `uix-notification-center`, `uix-reactions`,
`uix-attachment`, `uix-view-menu` — **verify exact BEM child names via `git show HEAD:` before coding**; some have
fewer sub-elements than you'd assume). List-shaped ones expose a container + item pair (e.g. `AuditLog` +
`AuditLogItem`) mirroring `List`/`ListItem` and `Comments`/`Comment`. Append exports in ONE
`// --- breadth batch B ---` block AFTER batch A's (no interleaving). Regenerate `etc/uix-react.api.md` via
`npm run test:api:update` (whole-surface report must contain A + B). Append a demo block to
`packages/tokens/index.html`. Flip these five rows Planned→Alpha in `Docs/component-roadmap.md`. **Verify:**
`npm run build:react && npm run test:api` (no drift) + `npm run typecheck -w @tensor_1/react`. **VR/a11y
(correction C4):** re-baseline the `*-linux.png` goldens via the pinned container / `update-visual-goldens` and
run `npm run test:a11y`, fixing any violation your demo markup introduces; do not assert local `test:visual` on
Windows.

### WHEN DONE
`npm run build:all`, `test:parity`, `test:contract`, `test:api`, `test:smoke`, `test:a11y`, `test:dtcg` green;
re-baseline VR goldens for the `index.html` change and commit the PNGs. Add a **changeset (minor)** for the new
`@tensor_1/react` exports. Commit and push.
