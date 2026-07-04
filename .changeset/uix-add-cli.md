---
"@tensor_1/tokens": minor
---

Add the `uix` copy-in CLI (DIST-3, ADR-0017 option C): `uix add <name> --dest <dir>` copies a
component's CSS out of the package and prints the `--uix-*` imports it needs; `uix list` enumerates
the registry. The package now ships a `uix` bin plus the component source CSS (`styles/components/`)
so the copy-in path works from an npm install.
