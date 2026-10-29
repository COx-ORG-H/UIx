---
'@tensor_1/tokens': patch
'@tensor_1/react': patch
---

Radio, Checkbox and Switch keep their hidden `<input>` inside their label (HAR-2708). The input is `position: absolute`, but the label was not positioned, so inside a scroller whose positioned ancestor sits outside it (the AppShell main area) the input stayed at its scroll-0 spot: a focus scroll or an automated click landed on whatever was there. The labels are now `position: relative`; nothing moves visually.
