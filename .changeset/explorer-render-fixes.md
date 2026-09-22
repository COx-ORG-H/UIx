---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Rendering fixes found in the docs explorer, plus larger avatar sizes.

- `.uix-metric-input`: the control row is pinned to `--uix-control-h`, so the stacked +/− steps split the input height instead of making the unit and step columns 3 px taller than the input.
- `.uix-relationship-graph__node`: selected, highlighted and conflicted fills are now opaque (`color-mix` over `--uix-surface`). The old translucent tints let edges, which run to node centres, cross through the node label.
- `.uix-stepper`: `width: fit-content`, so a stepper no longer stretches to full width inside a column flex or grid container.
- `.uix-brand-profiles`: form tracks can shrink (`minmax(0,1fr)`), and the native file input is capped at its container. Before this, the input's ~360 px intrinsic width pushed the form underneath the preview card.
- New `.uix-avatar--xl` (64 px) and `.uix-avatar--2xl` (96 px) sizes with a proportionally larger status dot. React `Avatar` `size` accepts `'xl' | '2xl'`.
