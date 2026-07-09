---
"@tensor_1/react": patch
---

**UIX-FIX-03 — Modal / Drawer / Peek now lock background scroll.**

A native `<dialog>` opened with `showModal()` makes the background inert but still lets it scroll behind the overlay. `useDialog` now locks page scroll while any dialog is open:

- Locks the scrolling root (`document.scrollingElement`, i.e. `<html>` in standards mode — so `body { overflow: hidden }` alone would not stop it) with `overflow: hidden`.
- Compensates the vanishing scrollbar's width with `padding-right` so the page doesn't shift.
- Sets `overscroll-behavior: contain` so the scroll doesn't chain to the page.
- Reference-counted across stacked dialogs, and restored on close (via the effect cleanup, which runs synchronously on the `open` prop flip — independent of the dialog's exit animation).

No API changes. Applies to `Modal`, `Drawer`, and `Peek` (all built on `useDialog`).
