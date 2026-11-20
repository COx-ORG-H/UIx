---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

In-place text swaps go out, then in: two texts fading over each other cannot be read mid-swap. A `Button` result, the `Select` trigger's value and the `FileDrop` prompt now fade the old text fully out before the new one fades in, and each swap still ends within the time its crossfade took (Button 160 ms, Select 400 ms, FileDrop 120 ms). The old text leaves on `--uix-dur-exit-fast` (`--uix-dur-swap-out` for the Select); the new one waits that long and arrives over the rest. Icons and images may still overlap their fades. The docs Motion page states the rule under Mechanics. No API change.
