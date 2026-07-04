# Third-party notices & provenance

*Owner artifact for **RDY-COMPLIANCE-DOC-01** (readiness layer 10). UIx is MIT-licensed (`LICENSE`). This file inventories the licenses of what UIx builds on and the provenance of its vendored source, so a consumer redistributing UIx code inherits a clean, attributed license chain.*

## UIx license
UIx (`@uix/tokens` + the `@uix` registry) is **MIT** © 2026 Haris Dizdarevic. Registry composites are **vendored** (copied) into consumers under the same MIT terms — a consumer owns and may fork its copy (`// uix-fork:`), consistent with the shadcn distribution model.

## Runtime dependencies pulled into consumers
Registry items declare these npm packages (the purity allowlist, `check-purity.mjs`). All are permissive (MIT/ISC) — compatible with MIT redistribution. **Verify at publish time** (licenses can change across majors); `pnpm licenses list` is the authoritative check.

| Package | Typical license | Pulled in by |
|---|---|---|
| `react`, `react-dom` | MIT | all components |
| `clsx` | MIT | `utils` (cn) → most components |
| `lucide-react` | ISC | icon-bearing components (data-table, states, …) |
| `@tanstack/react-table` | MIT | `data-table` |
| `react-hook-form` | MIT | `form` |
| `zod` | MIT | `form` |
| `@hookform/resolvers` | MIT | `form` |

Build/dev-time only (not shipped to consumers): `shadcn` (MIT), the fixtures' Next.js/Tailwind toolchain.

## Provenance of vendored source
- **`@itsmx/shared-ui`** — 15 of the seed composites were ported from this **first-party** package (same owner, same portfolio; see README "What this is" and AUDIT §1). Not a third-party license event — it is internal code relocation under the same ownership. The `/* … ported from @itsmx/shared-ui/… */` headers record the lineage.
- **shadcn registry format** — UIx consumes shadcn's open registry schema and CLI (`shadcn build` / `shadcn add`). shadcn is MIT; UIx ships no shadcn source, only registry JSON conforming to its public schema.

## For redistributors
The MIT `LICENSE` must travel with any redistribution of UIx source. Vendored registry files carry a `// @uix-registry <item> <sha> <date>` stamp (provenance), not a per-file license header — the repo-root `LICENSE` governs. When first publishing, run `pnpm licenses list` and reconcile any non-permissive result against this table.
