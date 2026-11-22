# Forms error recovery: ErrorSummary, useFormErrors, useLeaveGuard, ConflictNotice

2026-11-20. Item #2 of the "First five" in the UIx enterprise UX study (report and the forms notes,
`Docs/research/research_notes/UIx enterprise UX study/forms_errors.md`). Docs: Patterns → Form errors.

## What it is

| Piece | Job |
|---|---|
| `ErrorSummary` | GOV.UK's error summary over the existing `.uix-validation-summary` CSS. |
| `useErrorTitle`, `errorTitle` | The "Error: " page-title prefix while errors show. |
| `useFormErrors` | Collects field errors and drives the summary and `Field` with "reward early, punish late" timing. Holds no values; not a form library. |
| `Field` `errorAnnounce`, `errorPrefix` | How a field error is announced, and the visually hidden "Error:" before it. Opt-in; defaults unchanged. |
| `useLeaveGuard` | `beforeunload` plus `confirm(proceed, stay)` for in-app navigation, any router. |
| `ConflictNotice`, `mergeRecordConflict`, `recordConflictChanges` | The banner for a 409 / 412, and its merge model. |

## Decisions

1. **Timing.** Blur shows an error only for a filled-in field. Empty required fields are checked on submit. A shown error re-checks on every change and clears on the fixing keystroke. Once it passes, the field waits for its next blur again, so breaking it mid-word does not flag it. Sources: Etre/Wroblewski (n=22), Baymard, Smashing ("reward early, punish late"). GOV.UK validates on submit only, but long, repeated TENSOR forms fit the blur evidence better. The summary on submit stays mandatory either way.
2. **Announcements.** `Field` keeps `role="alert"` by default, because consumers rely on it. Under `useFormErrors`, an error found on blur is **polite**: the always-mounted message line becomes `aria-live="polite"`, since a region inserted together with its text is often not read. An error a submit revealed is **silent** at the field (`errorAnnounce="off"`) because the summary announces it. The summary puts `role="alert"` on an inner element and takes focus (GOV.UK v4.4.0, JAWS).
3. **Summary contents.** It lists the errors of the last failed submit, in the form's order and with the field's own words. A fixed field leaves the summary until the next submit. If it came back mid-edit, it would enter the alert region and interrupt the person. Server form-level errors are entries without links. A single error still gets a summary.
4. **Focus and scroll.** `focus({ preventScroll })` then `scrollIntoView({ block: 'nearest' })` on the summary, and on a link's whole `.uix-field`. That scrolls whichever scroller holds it (a Drawer body, a pane) and the page only if needed. `scroll-margin-block` leaves room for the ring. The focus ring shows on `:focus`, not only `:focus-visible`, as GOV.UK's does. If a linked control has disappeared or cannot take focus (hidden, disabled, or a non-focusable target), return focus to the summary without a hash jump. Message updates do not request focus; a changed `focusKey` does, including for a passive `autoFocus={false}` summary. A Combobox target is its `inputId`, not its wrapper id.
5. **"Error:" prefix.** `Field` is server-renderable and cannot read `UixLabelsProvider`. It takes `errorPrefix` as a prop and has no default, so a translated app never gets an English "Error:" it did not ask for. `useFormErrors` passes `errorSummary.errorPrefix`.
6. **Leave guard.** Armed only while `dirty`, or while `saveState` is `saving` or `failed`. It is disarmed once saved, so autosaved forms do not cry wolf. The step is a `ConfirmDialog` with the `discardPrompt` words, focus on Keep editing, and Escape stays. `fields` names what is at risk. If the work stops being at risk while the step is open (the save finished), the navigation proceeds. Browsers show their own `beforeunload` words.
7. **Conflict.** The conflict shows as a warning banner (attention, not critical), never a toast. It shows who and when, says "your changes are still here", and lists only the fields the other person changed. **Reload latest** is their record with every change of yours kept. Where both of you changed a field it takes theirs, and the banner says so. **Review changes** opens `DiffViewer` with their changes pre-accepted. Only the fields you both changed need a choice before **Apply**. Actions sit in a wrapping row under the text, because the `Alert` side slot crushed the text at 390 px.

## Shared form fixture

`packages/tokens/docs/live/shared/error-summary-form.tsx` is consumed by the live docs and
`tests/error-summary-form`. The packed consumer smoke compiles the same source with the public
package imports. It includes three required fields, a Combobox, localized count headings, an
existing email description, silent inline submit errors and retained values after validation and
the synchronous demo save. Browser checks cover zero, one and three errors, keyboard recovery,
unavailable targets, passive focus, and long German messages at 320 px with 200% text in light
and dark themes. These are automated checks, not a recorded screen-reader speech result.

## Out of scope / follow-ups

- `SaveStatus` `dirty` / `offline` / `conflict` states (not needed for these pieces).
- A shared submit-error taxonomy (auth expired, transient, unknown outcome).
- `Alert` with two or more side `actions` squeezes its text at phone width (`flex: none`); a kit-wide fix needs its own change.
- Manual screen-reader evidence (NVDA, JAWS, VoiceOver) for the summary and polite blur errors: the browser spec checks the accessibility tree, not a real screen reader.
