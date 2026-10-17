---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Drawer` and `Modal` ask before throwing away unsaved input** (HAR-2029, TENSOR audit UXC-01). New props `dirty` and `pending`:

- `dirty` (e.g. react-hook-form's `formState.isDirty`): Escape, the close button, a backdrop click (Drawer) and a `DialogClose` open an anchored "Discard changes?" step with focus on "Keep editing". Keep editing returns focus to where it was; Discard calls `onClose`. A clean dialog closes at once, as before.
- `pending` (a save in flight): none of them does anything; the close button is `aria-disabled`.
- **`DialogClose`**: a `Button` for the footer's Cancel that goes through the same guard (the step opens against it).
- Words: a new `UixLabelsProvider` group `discardPrompt` (`title`, `description`, `keepEditing`, `discard`), or `discardLabels` on one dialog.
- Escape is taken on the dialog's keydown after the controls inside it (an open Select still closes its list first), so repeated Escape presses never close a dirty dialog, whatever the browser's close-watcher rules. If the browser still closes a guarded dialog by force, it reopens and asks.
- `useDialog(open, onClose, keepOpen?)`: the optional `keepOpen` is asked before a native close is passed on.
- The Drawer's close button is now styled by `.uix-drawer__close` (it had inline styles); `.uix-drawer__close` and `.uix-dialog__close` are dimmed while `aria-disabled`.

Products that passed `dismissOnBackdrop={false}` to keep a form drawer open can pass `dirty` instead and drop it.
