# UIx — Lessons Learned

UIx-specific rules and footguns. **Local rules win on conflict** with the portfolio core (`ai-engineering-lessons.md`). Portfolio-wide lessons route to the core / `lessons/NN` / an ADR instead; only UIx-specific knowledge lives here. Newest-first, principle-first, each paired with the gate that enforces it.

## Build & tooling

### L01 — `build:react` prunes root devDeps; downstream steps break without an `npm ci`

- **Situation:** Running `build:react` locally pruned optional/dev deps from the repo root (npm prune side-effect), causing subsequent vitest and playwright invocations to fail with "package not found." In CI, the jobs that avoided this did so by running `npm ci` *after* the build step, restoring the full dep tree.
- **Rule:** Don't rely on the root `node_modules` state after any build script that prunes — always precede integration-test/playwright jobs with an explicit `npm ci` restore. Know which build step has pruning side-effects; treat it as destructive.
- **Why it bites:** locally it's easy to run `build:react` in one terminal and `vitest` in another without noticing the prune; CI's isolation hides it until jobs are ordered correctly.
- **Gate:** `ci.yml` separates the build job from test/playwright jobs with `npm ci` at the start of each test job.

### L02 — Lockfile regenerated on Windows omits Linux/macOS native binary variants

- **Situation:** npm lockfile was regenerated during react-dedup work on the Windows dev machine. The lockfile omitted optional platform-specific packages (rollup linux binaries, etc.), causing all four react/vitest CI jobs to fail on Linux with "optional package X was not installed."
- **Rule:** Regenerate lockfiles on Linux/CI (e.g., inside the Docker container or a GitHub Actions job), never on Windows. If you must regenerate locally, commit the lockfile on a CI machine or run `npm install` inside a Linux container before pushing.
- **Why it bites:** Windows-generated lockfiles look correct locally (Windows binaries are present) but are silently wrong for CI. Portfolio-wide lesson at `lessons/18` — UIx-specific pointer only.
- **Gate:** add a cross-platform lockfile check to CI (`npm ls`) or enforce a Linux-only regeneration note in `CONTRIBUTING.md`.

---
<!-- Add new entries above, newest-first, as they bite. -->
