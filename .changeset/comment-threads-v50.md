---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Comment threads as approved for TENSOR's worklog (HAR-4713, TENSOR ADR-0360).

- **No words of their own.** `Comment`, `CommentThread`, `CommentComposer` and the new parts take every word from `UixLabelsProvider` `comments` (`CommentLabels`, `DEFAULT_COMMENT_LABELS`, `useCommentLabels`), in all six label packs. The fold count, the new count and the leave question are plural-aware. The 2.71 label props still work and still win.
- **`CommentNewNotice`.** The one "new since your last visit" notice: a divider, then one row with the count and a "Show ↑" button, and a stepper ("2 of 3", previous, next) only when there is more than one new entry. `CommentUnreadDivider` is deprecated in its favour.
- **Own entries are never new.** `Comment` takes `isNew` and `own`; the "New" chip never shows on the viewer's own entry, and a `CommentThread` reply marked `own` folds like any other. A reply's `unread` / `own` reach the `Comment` inside it, so the chip and the fold cannot disagree. This changes one 2.71 case: a `Comment` in a reply marked `unread` now shows the chip without `unreadLabel` (in the provider's words, English without one); pass `isNew={false}` to keep it off.
- **Composer words from the person.** `CommentComposer` takes `recipient` and `external: true` and fills the choice, hint and commit button ("An Sophie Wagner", "Sophie Wagner sieht das nicht.", "An Sophie Wagner senden"). `internal` and `external` words are now optional, field by field. The form submits the effective audience as a hidden `audience` field, so the submit handler sends with what the button said (a locked internal thread always submits `internal`). The frame's restyle by audience uses the motion tokens.
- **Drafts with a guard.** `useCommentDrafts` keeps one draft per thread and asks before an unsent reply is lost, both when a thread's composer closes and when the page is left. `CommentThread` `draft` shows a "Draft" marker while the composer is closed, `onResumeDraft` makes it reopen the composer. `composer={open && …}` counts as closed.
- **Slots.** `Comment` `attachments` for `FileRow`s; `actions` for the reply button and `CommentReaction` chips; `ActionPanelScope` around a `Comment` gives it its `ActionPanel`.
- **Look (tokens).** The internal badge is filled and the outside badge outlined, the reverse of their frames (hairline outline for internal, filled bubble for outside); the "New" chip and the notice use the info accent. Neutral only: no amber or red for audience.
- **Client boundary.** `Comments.tsx` (`Comments`, `Comment`) now starts with `"use client"`, because `Comment` reads its words from the provider. Server components can still render them with server-rendered children.
