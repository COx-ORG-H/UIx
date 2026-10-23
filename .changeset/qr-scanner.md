---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`QrScanner`** (HAR-1254; SHOPx SHOP-07 receipt scan and SHOP-09 till scan, the public scan page; MOTUS circulation intake): a camera viewfinder for a decoder the product supplies. `decode(frame)` receives `{ imageData, video }` (scaled to `maxFrameSize`, every `interval` ms) and returns the text it read, or nothing; the component makes no network request. `onResult` is called once per new text (`repeatAfter` ms before the same text counts again) and a polite status says "Code read: {value}" once; the viewfinder's corners turn green for a moment (no movement under reduced motion; no decorative scanning line). States (`onStatusChange`): `idle` (the `explainer` and a start button, before any browser prompt), `asking`, `scanning`, `denied` (how to allow the camera again, and Try again), `unsupported` (no camera API), `no-camera`, `no-frame`; a camera the browser already allows starts at once with `autoStart`, one it already refused shows `denied` without a prompt. A hint appears after `hintAfter` ms without a code; a torch toggle where the camera has one; `manualEntry` is rendered in every state. The camera stops on Stop, on unmount and while the page is hidden. Words: `labels` or `UixLabelsProvider` `qrScanner`.

New stylesheet `styles/components/qr-scanner.css`: the frame is 4:3 while the camera runs and a padded panel in every other state, so no message is cut at 320 px.
