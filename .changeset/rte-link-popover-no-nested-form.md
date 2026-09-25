---
"@tensor_1/react": patch
---

`RichTextEditor`: applying a link no longer reloads the page or submits the form around the editor.

- **The bug.** The link popover was a `<form>`, and it renders in place (no portal), so an editor inside a consumer's record form nested one form in another. Chrome stops a `submit` event at the nearest enclosing form, so React's root listener never saw it, the popover's `preventDefault()` never ran, and **Apply** did a native GET submit that reloaded the page and lost the unsaved record. Where the event does bubble (jsdom, older engines), React's `onSubmit` reached the host form and submitted the whole record instead.
- **The fix.** The popover is a `<div>` now (same `uix-rich-text__link-form` class, same layout). **Apply** is `type="button"`, and Enter in the URL field applies the link and prevents the implicit submit of the host form (an IME's composition-confirming Enter is left alone, as a native form does). Escape still closes it. React's "`<form>` cannot be a descendant of `<form>`" console error on every editor inside a form is gone too.
- **Migration:** none.
