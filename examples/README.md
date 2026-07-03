# examples

Runnable consumer apps for `@tensor_1/*`, one per consumption mode. Each example is a real,
minimal integration you can open and poke at — **and each doubles as smoke coverage**: every
example ships a `verify.mjs` that packs the package to a tarball, installs it into an isolated
temp dir (no workspace symlink), and asserts that the subpaths the example uses actually resolve
from a published install. So the `examples/` tree is both documentation and a test surface: if an
export moves or a file drops out of the package, the matching `verify.mjs` fails.

They all share the same isolated-tarball harness, copied verbatim from
`tests/smoke-consumer/run.mjs` (ADR-0016 Decision 6).

## Examples

| Example                        | Slice | Consumption mode                                   | Smoke check                        |
| ------------------------------ | ----- | -------------------------------------------------- | ---------------------------------- |
| [`plain-css/`](./plain-css/)   | FR-2  | Static HTML, no bundler — `<link>` the shipped CSS | `node examples/plain-css/verify.mjs` |

## Coming as sibling dirs

Later slices add more consumers alongside `plain-css/`, reusing this same harness:

- **FR-3 — Tailwind** (`tailwind/`): consume the `@tensor_1/tokens/tailwind` theme + `tailwind/preset`.
- **FR-4 — TypeScript** (`typescript/`): import typed constants from `@tensor_1/tokens/ts` and components from `@tensor_1/react`.
- **FR-1 — web components** (`web-components/`): the framework-agnostic custom-elements consumer.
