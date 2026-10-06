---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

An imperative toast queue: `toast()`, `toast.success/error/warning/info/loading`, `toast.update`, `toast.dismiss`, `toast.promise` and `toast.undoable`, rendered by `Toaster` (UIx HAR-1363; TENSOR A2/C3 and MOTUS A3/A4/C-13, which retires `sonner` in both).

- **`Toaster`** now also renders a toast store (default: the one behind `toast()`; `store` prop for another). It shows at most `limit` toasts (default 3), pauses timers while hovered or focused and while the tab is hidden, closes the focused toast on Esc, and takes a `position` (`bottom-end` default, plus `bottom-start`, `bottom-center`, `top-end`, `top-start`, `top-center`). Hand-managed `<Toast>` children render as before.
- **Defaults:** success/info/default 5 s, warning 8 s; error and loading stay until dismissed or updated. A reused `id` replaces in place. A loading toast that settles is announced again.
- **`toast.undoable(message, { onUndo, onCommit })`:** the TENSOR C2 undo pattern. `onCommit` runs when the toast closes without Undo.
- **`Toast`** gains `tone="warning"` and an `action` slot (`.uix-toast__action`). Tone glyphs are built in until the icon set (HAR-996) lands.
- **The store is a plain module** (`createToastStore`, `createToastApi`, `ToastStore`, `ToastRecord`, `ToastOptions`, …) with no React import.
