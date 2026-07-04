---
"@tensor_1/tokens": minor
---

Add the copy-in `registry/registry.json` manifest (DIST-2, per ADR-0017): a generated inventory
of every CSS component — its file, cascade layer, and exact `--uix-*` token dependencies — shipped
in the package for non-npm / copy-in consumers. Drift-gated in CI (`test:registry`).
