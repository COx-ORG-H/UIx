---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**What TENSOR's `ConfirmAction` needs from the kit confirmations** (HAR-1831), so it can become a thin adapter over `ConfirmDialog`, `Popconfirm` and the undo toast.

`Popconfirm`
- `children`: content between the text and the buttons, e.g. a required reason field. A field there has focus when the step opens, and the step takes its full width (`.uix-popconfirm--content`, `.uix-popconfirm__content`). `confirmDisabled` keeps Confirm disabled until it is filled.
- `role` (default `alertdialog` when `destructive`, else `dialog`), and `title` is optional: without it the step is named by its confirm button (`labelledBy: 'title' | 'confirm'` to choose).
- Escape is only the step's own: not while a popup inside it is open (a Select's list closes first), not one meant for a dialog opened above it, and only the newest open step answers (a small shared overlay stack). `onEscapeKeyDown(event)` runs first and `preventDefault()` keeps the step open. With focus inside the step the Escape no longer also reaches a Drawer or Modal around it.
- `closeWhenAnchorHidden`: cancel when the anchor scrolls out of view.
- `confirmProps` (also on `ConfirmDialog`): attributes for the confirm button, e.g. `{ 'data-action-id': 'ci.delete' }`; its `onClick` runs first and `preventDefault()` stops the confirm. New type `ConfirmButtonProps`.

`ConfirmDialog`
- `pending` now also blocks Escape (and any close request), the × and Cancel until the action settles; Confirm shows its loading state.
- A dialog the caller unmounts while open (`{open && <ConfirmDialog …/>}`) gives focus back to the control that opened it: `Modal`, `Drawer` and `Peek` now open and close their `<dialog>` in a layout effect, while it is still in the document.
- It forwards its `ref` to the `<dialog>`, and so does `Modal`.
- `typeToConfirmLabel` takes a node; `typeToConfirmPlaceholder`; the field is `aria-invalid`, with a message under it (`typeToConfirmMismatch`, or `UixLabelsProvider` `confirmDialog.typeToConfirmMismatch`, default "That does not match {value}."), as soon as the typed text stops being the start of the value. The message space is reserved, so the footer does not move.

Undo toast
- `pauseOnHover: false` on any toast (and on `toast.undoable`): a fixed timer that closes the toast `duration` after it appears, even under the pointer, with focus in it or in a hidden tab, for an undo window that must end on time.
- `toast.undo(id)` undoes an undoable toast from code, as if Undo were pressed; `toast.dismiss(id)` still commits.
