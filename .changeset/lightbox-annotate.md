---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Lightbox` for an annotating viewer** (HAR-1826, TENSOR C12 capture redaction): `actions` renders buttons in a toolbar before Close (Tab order: actions, then Close; inside the dialog's focus trap); `renderOverlay({ index, item, media, width, height })` is laid over the picture's own box (not the letterbox around a fitted one) and follows the fit / actual-size toggle, and a stroke on it never swipes; `onKeyDown` runs first for every key and `onEscapeKeyDown` for Escape: `event.preventDefault()` claims the key, so the viewer neither pages nor closes while a draft is open. A single item shows no counter (it showed "1 of 1"). The words can now come from `UixLabelsProvider` (`lightbox`). With actions, the picture starts below the toolbar.
