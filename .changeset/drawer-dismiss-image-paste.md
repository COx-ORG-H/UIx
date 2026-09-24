---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Drawer closes on a backdrop click; images in the comment and template editor presets, and a notice where images aren't allowed (TENSOR HAR-547, HAR-749, HAR-770).

- **Drawer closes on a backdrop click** (opt out with `dismissOnBackdrop={false}`). A click on the dimmed backdrop calls `onClose`, like Escape and the close button, so consumers need no change. Set `dismissOnBackdrop={false}` on a drawer that holds unsaved form input; Escape and the close button still close it. `Peek` already closed this way, and both now share one handler (`hooks/backdropDismiss.ts`): a click on the `<dialog>` itself outside its box counts, a click on its content never does, and a click that lands mid-close never re-fires `onClose`. A consumer `onClick` on either still runs first. On a phone, the browser's modal `max-width` leaves a 2em + 6px strip of backdrop (34 px at 320 px), and a tap on it closes the panel too.
- **Images in every `RichTextEditor` preset.** `comment` and `template` now take pasted or dropped images, and show the toolbar image button, whenever `onUploadImage` is set, as `full` already did. Without `onUploadImage` nothing changes in the toolbar.
- **`imagesUnavailableReason?: string`.** An image file pasted or dropped where images are off used to vanish silently. Now the editor inserts nothing and says why in its status line (`role="status"`): this text, or the new `imagesUnsupported` label ("Images can't be added here."). The notice clears on the next edit. A paste that also carries text (Excel, Word and Docs add a PNG rendering of what you copied) stays a text paste: no upload, no notice.
- **Composer status row.** In `variant="composer"` a status message (uploading, failed, images off) takes its own row under the tools. Inline, it squeezed the toolbar to a sliver on a 320 px phone.
- **`.uix-mark` (HAR-770).** It was reported as a phantom class. It is defined in `table.css` (since 2.5.0) and renders a themed tint in both themes. A new test now checks that every `uix-*` class a React component emits has a rule in `@tensor_1/tokens`, with deliberate hook classes listed by name and reason.
- **Labels:** new `imagesUnsupported` in `RichTextLabels` (default above). Translate it with the others.
- **Migration:** none. Every new prop is optional. A consumer with a drawer that must not close on a stray click sets `dismissOnBackdrop={false}`.
