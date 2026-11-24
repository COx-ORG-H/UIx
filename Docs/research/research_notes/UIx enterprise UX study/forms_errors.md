# Enterprise form design and error recovery (UIx: TENSOR / POSx / MEDx), as of 2026-11-20

Evidence-strength tags used throughout:
- **[R-quant]** controlled study with numbers
- **[R-qual]** usability-testing observations, no sample sizes published
- **[NORM]** normative standard (WCAG)
- **[DS]** published design-system guidance (GOV.UK, Carbon, React Aria), usually backed by service experience rather than a published study
- **[OPINION]** practitioner or expert opinion, vendor blog or forum consensus
- **[UNVERIFIED]** from background knowledge; not re-fetched this session

Research method note: 21 search/fetch calls. The SAP Fiori draft-handling page returned 403, so the Fiori guidance is not verified here.

## 1. Validation timing, error wording, error summaries, and focus on submit failure

### Takeaway
The only quantified study (Wroblewski/Etre 2009, n=22) supports inline validation **after** the user finishes a field over submit-only validation. Validating before or while the user types tested worst. GOV.UK takes the opposite default: validate on submit only. The two positions meet at "reward early, punish late" (validate late, clear errors early) combined with a GOV.UK-style error summary on submit. For dense enterprise forms, use this baseline: blur validation for non-empty fields; empty required fields checked only on submit; errors cleared on the keystroke that fixes them; on submit, an error summary that takes focus and links to each field; field-level messages worded identically to the summary.

### Cited Findings
**Timing evidence**
- [R-quant] Etre usability study for Luke Wroblewski (A List Apart, 2009-09-01): 22 participants aged 21–49 each used 6 registration-form variants. The best inline variant against the submit-only control: success rate +22%, errors −22%, satisfaction +31%, completion time −42%, eye fixations −47% — [A List Apart](https://alistapart.com/article/inline-validation-in-web-forms/)
- [R-quant] In the same study, "after" (on-blur) validation was 7–10 s faster than the "while" and "before and while" variants. "Before and while" (on focus and keypress) had the highest error rate and the worst satisfaction. The article recommends "while" with a delay only for tightly bounded inputs such as usernames and passwords — [A List Apart](https://alistapart.com/article/inline-validation-in-web-forms/)
- [R-quant] Inline messages were noticed by only 30–50% of users on simple fields, against 80–100% on harder fields, so inline validation helps most on hard fields. Persistent success messages beat fading ones, which users missed and which made them worry a valid field had turned invalid. Messages inside the field gave no benefit over messages beside it — [A List Apart](https://alistapart.com/article/inline-validation-in-web-forms/)
- Caveat: commenters on the article raised the small sample, learning bias from the within-subjects design, and percentages on small counts. The authors cited budget constraints — [A List Apart](https://alistapart.com/article/inline-validation-in-web-forms/)
- [R-qual] Baymard (2024-01-09) reports 31% of benchmarked e-commerce sites have no inline validation. The same article's video summary says 32%, and the article does not reconcile the two — [Baymard](https://baymard.com/blog/inline-form-validation)
- [R-qual] Baymard found premature validation (flagging a field before the user has typed) frustrating in testing. Its recommendations: validate most fields on blur, validate fixed-length inputs (postcode, phone, card) once the length is reached, update the message on each keystroke, and remove it as soon as the input is valid. Blur-only clearing left stale errors, which was especially confusing on confirmation fields (L.L. Bean example) — [Baymard](https://baymard.com/blog/inline-form-validation)
- [R-qual] Baymard: positive validation (checkmarks) reduced cognitive load. One counter-example: Home Depot showed a checkmark on a password field without checking that the two password fields matched — [Baymard](https://baymard.com/blog/inline-form-validation)
- [DS] GOV.UK: "Do not validate when the user moves away from a field." Validate when the user tries to continue or submit. Inline validation only "if your user research shows that, on balance, it solves more problems for users than it causes", with the Character count component as the example. Stated reason: mid-entry validation "can cause problems – especially for users who type more slowly." GOV.UK cites long service use (e.g. adult passport renewal), not a formal study — [GOV.UK Validation pattern](https://design-system.service.gov.uk/patterns/validation/)
- [OPINION] "Reward early, punish late" (credited to Mihael Konjević): when a field is already showing an error, re-validate on every change and clear the error immediately; when a field is valid or still being typed in, wait for blur before flagging — [Smashing Magazine 2022](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/); [search summary incl. Filament/Vuelidate discussions](https://github.com/filamentphp/filament/discussions/12164)
- [OPINION] Smashing (Vitaly Friedman, 2022): "Late validation almost always performs better." Validate empty required fields "only on submit", because blanks usually mean the user skipped ahead, is jumping around, or is pasting. Use keystroke validation only for unambiguous severe errors (letters in a digits-only field) or helpful live feedback (password strength, availability, character count). For hard compound values (e.g. VAT number), offer an on-demand "Validate" button. Validate tightly coupled groups such as card details together — [Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [OPINION] Smashing: give users a way to "proceed despite the live validation error" when a validator wrongly rejects valid input, and measure the effect. Avoid disabled submit buttons; the article claims they "often cause nearly 100% abandonment rates", a figure taken from another Smashing article and not independently verified. "Disabling copy-paste is never a good idea" — [Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [OPINION] NN/g (Krause, 2019, reviewed 2024-12): validate inline "as soon as the user has finished filling in a field". Do not show errors while the user is typing. Show success indicators only for complex inputs (availability, password strength), not for "required" checks. The article cites no study — [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [DS] React Aria: by default, errors appear when a value is committed (blur) or the form is submitted, never per keystroke. Realtime display is opt-in: a controlled value plus `isInvalid`/`errorMessage`. `validationBehavior="native"` (the default) blocks submission. `validationBehavior="aria"` only marks fields required/invalid for assistive technology and leaves blocking to the app (e.g. React Hook Form) — [React Aria Forms](https://react-aria.adobe.com/forms)

**Error message wording**
- [DS] GOV.UK: say what happened and how to fix it, in plain English. Avoid "forbidden", "illegal", "you forgot", "prohibited", "please", "sorry", "valid/invalid", "oops", jargon and error codes, and generic messages ("An error occurred", "This field is required", "Select an option"). Templates: missing input as an instruction ("Enter your first name"); too long as a description ("Name must be 35 characters or less"); wrong format with the specific format named. Do not repeat an example the hint already shows — [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/)
- [DS] GOV.UK: place the message after the label and hint, directly above the input, with a red border on the field. Prefix it with visually hidden "Error:" text so screen readers announce it. Use identical wording in the field message and the summary — [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/)
- [OPINION] NN/g: messages should be "explicit, human-readable, polite, precise, and give constructive advice". Pair colour with an icon so colour-blind users can find the error. Use red for errors, orange or yellow for warnings, green or blue for success. Don't put messages only in tooltips or hover icons. Use modals sparingly. If the same error occurs three or more times in one attempt, treat it as a design flaw and offer extra help — [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [DS] Carbon distinguishes **error** (the user must act before submit or save) from **warning** (an exception that may cause problems but is not blocking). The state text replaces persistent helper text while it shows — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)

**Error summary and focus**
- [DS] GOV.UK: "Always show an error summary when there is a validation error, even if there's only one." Place it at the top of `main`, below breadcrumbs or back link and above the `<h1>`. Heading: "There is a problem". Each entry links to its field: single-field questions link to the input, multi-field questions (date) to the first erroneous sub-field, radios and checkboxes to the first option. Keyboard focus moves to the summary; GOV.UK Frontend JS has done this automatically since February 2025 — [GOV.UK Error summary](https://design-system.service.gov.uk/components/error-summary/)
- [DS] GOV.UK: prefix the page `<title>` with "Error: ". In v4.4.0 (Nov 2022) `role="alert"` moved to a nested element and `aria-labelledby` was removed, because JAWS was not reading the whole summary — [GOV.UK Error summary](https://design-system.service.gov.uk/components/error-summary/)
- [DS] GOV.UK: when redisplaying the page, keep every answer, passing and failing. Don't clear fields. Set `novalidate` on the form, and don't put `required` on inputs (to suppress the browser's native bubbles) — [GOV.UK Validation](https://design-system.service.gov.uk/patterns/validation/); [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/)
- [OPINION] NN/g: a summary must not be the only error indicator. Always pair it with field-level messages — [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)

### Inferences
- Recommended UIx `Form` default (a synthesis, not a single source): (a) on blur, validate only non-empty, touched fields; (b) once a field shows an error, re-validate on every change and clear it the moment it passes; (c) check empty required fields only on submit; (d) on submit failure, render an `ErrorSummary` at the top of the form, move focus to it, prefix the document title with "Error:", link each entry to its field, and show field messages with identical text; (e) never disable the submit button to signal invalidity.
- GOV.UK's submit-only default suits low-frequency, one-question-per-page citizen services. TENSOR agents fill long forms repeatedly, which matches the Etre and Baymard settings where blur validation helped. Blur validation is therefore the better fit for TENSOR, but the summary-on-submit layer should stay mandatory.
- When focus moves to the summary on submit inside an app shell, it needs `tabindex="-1"` and a scroll-into-view inside the form's scroll container, not the window. This is an implementation inference; check it against UIx Drawer and DataWorkspace scrollers.
- Add a non-blocking "warning" severity (Carbon) to UIx field state. ITSM forms often need soft validation, such as "Priority P1 without an on-call assignee".

### Gaps
- There is no recent (post-2015) controlled study of validation timing for expert or repeat enterprise users. Every quantified result comes from consumer registration or checkout.
- Neither the "nearly 100% abandonment" figure for disabled submit buttons nor the Frontiers in Psychology (2014) citation Smashing uses was verified.
- Baymard's adaptive-error-message research (specific messages per failure cause) was not fetched.

## 2. Long and multi-step forms: one thing per page, progress, drafts, resume, conditional reveal, section navigation

### Takeaway
GOV.UK's "one thing per page" is the default for citizen services. GOV.UK itself allows several questions per page for internal tools where users repeat and switch between tasks quickly, which is TENSOR's situation. For expert enterprise forms the evidence favours a long, sectioned single page with section navigation, conditional reveal, and draft/save-and-return. Wizards fit only infrequent, linear, consequential flows (e.g. a change request submission or an approval). Progress indicators should be tested before they are added.

### Cited Findings
- [DS] GOV.UK question pages: start with one question per page so users "understand what you're asking them to do". Use the label or legend as the page `<h1>`. Always include a Back link, and never break the browser back button. After a one-time action such as a payment, back should show a sensible message instead of repeating the action. Label the button "Continue", not "Next" — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [DS] GOV.UK: "Sometimes it makes sense to group a number of related questions on the same page". The given example is internal services where users repeat and switch between tasks quickly; use a statement heading in that case — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [DS] GOV.UK progress: test without a progress indicator first, and fix question order, type or number before adding one. Show a total count only if it can be calculated reliably, which conditional branching often prevents. Avoid indicators that show all questions, allow back-navigation, and mark the current step all at once — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [OPINION] Smashing: for long forms, use one-task-per-page flows with a task list and save-and-continue; for short forms, validate on submit — [Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [DS] Carbon: complex product forms are usually mostly optional fields. Long forms reduce overwhelm with accordion or multi-step designs — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [NORM] WCAG 2.2 SC 3.3.7 applies to multi-step processes: information already entered must be auto-populated or available to select later in the same process (see section 7) — [W3C Understanding 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)
- [UNVERIFIED] GOV.UK also publishes a "Task list" pattern (sections with statuses such as "Completed", "Incomplete", "Cannot start yet"), a "Check answers" pattern, and a "Save and return" / "Save a draft" pattern for long applications. These were not fetched this session; the Question pages page only links to Check answers — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [UNVERIFIED] The GOV.UK Radios and Checkboxes components support "conditional reveal" of a nested question, and recommend keeping revealed content to a single simple question and avoiding nested reveals. Not re-fetched.

### Inferences
- TENSOR incident and request forms: a sectioned long form (e.g. Summary / Classification / Assignment / Impact / Related / Approvals) with a sticky section index or anchor nav, section-level error counts that link to the error summary, and conditional sections revealed in place. When a reveal hides a section, keep its data but exclude it from validation and submit, or warn before clearing it (see section 5 on dependent fields).
- TENSOR change requests (CAB approvals, risk assessment): a task-list pattern fits best. Each section gets a status (Not started / In progress / Complete / Needs attention), and the request is submitted once from a check-answers review. This also gives 3.3.7 a natural place to show data entered earlier.
- POSx (cashier, speed-critical) and MEDx (clinical, high error cost) differ. POSx favours keyboard-first single-screen forms with minimal steps. MEDx favours explicit review and confirm steps before irreversible submits, reusing GOV.UK's "back after one-time action" rule.

### Gaps
- No controlled study comparing one-thing-per-page with long single-page forms for expert or enterprise users was found. GOV.UK's position comes from citizen-service practice.
- The SAP Fiori draft-handling and object-page section-navigation guidance returned 403 and is not verified here.

## 3. Concurrent editing and conflicts: optimistic locking UX, "someone else changed this", presence

### Takeaway
The backend consensus is optimistic concurrency: a version or ETag field, with HTTP 409 or 412 on a mismatch. The UX consensus is practitioner-level only: never silently overwrite, never show a vague toast, keep the user's unsaved values, show which fields changed, and let the user choose (reload theirs onto latest, keep theirs, or merge per field). Presence ("Alex is editing") is a hint and never a substitute for the server check. No usability study with numbers was found.

### Cited Findings
- [OPINION] Atlassian Forge SQL guidance: an UPDATE that affects 0 rows signals that someone else modified the record. Explicitly warning the user and prompting a reload is presented as the clearest option — [Atlassian developer blog](https://www.atlassian.com/blog/developer/reliable-data-storage-using-optimistic-locking-in-forge-sql)
- [OPINION] SAP CAP Java: treat HTTP 412 Precondition Failed (an ETag mismatch) as "data has changed since it was last read". The user reloads the latest version, reviews the differences, and reapplies their changes — [SAP Community](https://community.sap.com/t5/technology-blog-posts-by-sap/handling-concurrent-updates-in-cap-java/ba-p/14403125)
- [OPINION] AppMaster (2025-06-11) on busy admin tools: return 409 Conflict with a short message. Practitioner answers recommend reloading the latest record while keeping the user's unsaved values and highlighting changed fields, which beats a generic error toast. A "currently being edited" indicator helps only as a hint and cannot replace the server-side check — [AppMaster](https://appmaster.io/blog/optimistic-locking-busy-admin-tools); [yomotherboard Q&A](https://yomotherboard.com/?p=499125)
- [OPINION] Background: MediaWiki edit conflicts and Bugzilla "mid-air collisions" are the classic web examples of optimistic concurrency surfaced to users — [Wikipedia: Optimistic concurrency control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [OPINION] JD Edwards (Oracle): the second user to save gets a message that the record changed and must re-select it before editing. This is the minimal enterprise pattern, which loses the second user's work — [Oracle JD Edwards docs](https://docs.oracle.com/en/applications/jd-edwards/development-tools/9.2.x/eotbf/optimistic-locking.html)
- [R-qual, academic] Fine-grained visual awareness of others' concurrent changes has been studied as a way to reduce merge conflicts (arXiv 1508.01872, software-engineering context; not fetched, title only) — [arXiv](https://arxiv.org/pdf/1508.01872)
- [UNVERIFIED] SAP Fiori draft handling (fetch blocked, 403): Fiori uses exclusive drafts with a lock, an "Edited by / Locked by <user>" indicator in lists and object headers, an "unsaved changes by <user>" state, and lock expiry after inactivity, after which another user may take over. Specific timeout values were not verified. Source as listed in the original assignment: [SAP Fiori draft handling](https://www.sap.com/design-system/fiori-design-web/foundations/best-practices/global-patterns/object-handling/draft-handling)

### Inferences
- UIx could provide a `ConflictNotice` / `ConflictResolver` pattern:
  1. An inline banner at the top of the form (not a toast), worded along the lines of "This incident was changed by Alex at 14:02 while you were editing."
  2. A field-level diff of their value against yours, for the overlapping fields only.
  3. Actions: "Review changes" (per-field keep mine / take theirs), "Reload and keep my edits" (rebase non-conflicting fields automatically), and "Discard my changes".
  4. Never lose the local draft; hold it in memory or a draft store until resolved.
  This maps onto TENSOR incident updates, where agents and automation commonly write to the same record.
- Non-overlapping field edits (e.g. their Assignee change while you edit Description) can be merged automatically, with a quiet "Updated by Alex: Assignee" note. Only overlapping fields should block. This is a design inference; no study backs it.
- Presence ("2 others viewing", avatar stack, "Alex is editing Impact") is a soft-lock hint. It pairs with UIx Avatar and SaveStatus but must not stand in for 409/412 handling.
- Status transitions and approvals (approve/reject) should use stricter rules than free-text fields. If the record's state changed, re-show the decision with the new state and never auto-apply it.

### Gaps
- No peer-reviewed or NN/g/Baymard usability study of edit-conflict dialogs in business apps was found.
- ServiceNow and Jira field-level conflict UX, the most relevant ITSM comparators, were not researched in this pass.
- Fiori lock timeouts and the "take over" flow are unverified because of the 403.

## 4. Autosave semantics, Saving/Saved/Failed status, unsaved-changes guards, navigation away

### Takeaway
No authoritative design system specifies an autosave state machine. Practitioner consensus: show an honest persistent status with at least four states (Unsaved changes / Saving… / Saved [time] / Not saved – Retry). Debounce writes. Make failure loud and sticky. Use an unsaved-changes navigation guard only where autosave is absent or has failed. UIx already ships `SaveStatus` (2.19.0, wrap fix 2.54.0, per project memory), so the open work is semantics, not a new component.

### Cited Findings
- [OPINION] A status that only ever reads "Saved" misleads users. Show "Unsaved changes" while the user is typing and "Saving…" during the write. On failure, switch immediately to a clear "Changes not saved" and never fall back to a false "Saved" — [saasui.design](https://www.saasui.design/blog/saas-autosave-save-states-ux-patterns)
- [OPINION] Debounce autosave so it does not fire on every keystroke and flood the API — [Refine AutoSaveIndicator](https://refine.dev/docs/core/components/auto-save-indicator)
- [OPINION] GitLab design pattern proposal: short relative labels ("Saved just now", "Saved x minutes ago"); failure messages offer Retry — [GitLab design issue 121](https://gitlab.com/gitlab-org/gitlab-design/issues/121)
- [DS] Grafana Saga save pattern: warn about unsaved changes when edits are applied but not saved; confirm successful manual saves with a toast; choose the save pattern by the item's importance and the friction involved — [Grafana Saga save pattern](https://grafana.com/developers/saga/patterns/save/); [Grafana design-system repo](https://github.com/grafana/design-system/blob/main/docs/06-patterns/save.mdx)
- [OPINION] Example four-state save indicator (saved, saving, unsaved, failed) with a last-saved timestamp and retry — [21st.dev save indicator](https://21st.dev/@klyv-ui/components/save-indicator.md)
- [DS] GOV.UK: on any error, redisplay with every entered value kept. Users must never re-enter data — [GOV.UK Validation](https://design-system.service.gov.uk/patterns/validation/)
- [NORM] WCAG 3.3.7 example: after a payment error, the card number stays in the form — [W3C Understanding 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)

### Inferences
- Proposed UIx autosave contract, a synthesis:
  - States: `idle`, `dirty` ("Unsaved changes"), `saving` ("Saving…"), `saved` ("Saved · 14:02" or relative time), `error` ("Not saved · Retry", sticky, with `role="status"` escalating to an alert), `offline` ("Offline – changes kept on this device").
  - Behaviour: debounce about 1–2 s after the last change, and flush on blur and before navigation. A save in flight keeps the field editable. Further edits queue a follow-up save; they don't cancel it.
  - Each save carries a version or ETag, so a 409 routes into the conflict UX (section 3) instead of showing "error".
- The navigation guard (`beforeunload` plus router blocker) is armed only while the state is `dirty`, `saving` or `error`. It is disarmed once `saved`. This avoids "cry-wolf" dialogs on autosaved forms. The dialog names the consequence ("Leave without saving? Your changes to Impact and Description will be lost") and makes "Stay" the default.
- Where data is clinically or financially consequential (MEDx orders, POSx tenders), autosave should save a **draft** and never commit the record. Commit stays an explicit action. This matches the Fiori draft-versus-active model [UNVERIFIED].
- Announce status changes politely (`aria-live="polite"`) only on transitions to `saved` after a user pause, and on `error`. Announcing every "Saving…" is noisy. This is an accessibility inference, not a sourced rule.

### Gaps
- No usability study quantifying autosave trust or status-label effects was found.
- No primary source for recommended debounce intervals was found; the 1–2 s figure above is a design inference.
- The SAP Fiori draft autosave and indicator specifics are unverified (403).

## 5. Field-level patterns: required/optional, help text vs placeholder, dates, comboboxes, dependent fields, read-only vs disabled, masks

### Takeaway
The sources disagree on required/optional marking: NN/g says mark every required field with an asterisk, GOV.UK says mark optional fields and never use asterisks, and Carbon says mark whichever type is rarer, consistently. For enterprise forms that mix required and optional, Carbon's rule plus an explicit word ("Required"/"optional") is the most defensible choice. Placeholders must never replace labels or hold critical information; use persistent helper text. Use read-only, not disabled, for values users need to read or copy. Accept any unambiguous input format, and prefer clean-up over hard masks.

### Cited Findings
- [OPINION] NN/g (Budiu, 2019-06-16): mark every required field even when most are required ("The short answer is yes"); a note such as "all fields are required" is weak because users skip instructions. Use an asterisk before the label (scannable left edge), not pale gray, or the word "Required". Marking optional fields as "optional" additionally reduces cognitive load. Login forms can omit marks. No formal study is cited — [NN/g Required fields](https://www.nngroup.com/articles/required-fields/)
- [DS] GOV.UK: add "(optional)" to optional field labels, or to the legend for radios and checkboxes. "Never mark mandatory fields with asterisks" — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [DS] Carbon: simple user-facing forms are mostly required; complex product forms are mostly optional. Mark only the less common type, "(optional)" or "(required)", and apply that consistently across the product — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [DS] Carbon: persistent helper text below the input is the preferred aid. Placeholder text is low contrast, disappears on input, must not replace the label or hold crucial information, and is off by default. Fluid inputs fall back to tooltips — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [DS] Carbon, read-only versus disabled: **disabled** is for permission, dependency or prerequisite blocks; it is non-interactive and exempt from WCAG contrast. **Read-only** is for values users review but cannot change; it stays focusable, is announced by screen readers, and meets contrast — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [DS] Carbon: an error or warning replaces the helper text while active. In two-column rows the row responds as a group, so an error expands its neighbour too, keeping fields aligned — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [OPINION] Smashing: accept any unambiguous format (spaces, delimiters, `+`/`00` prefixes) and normalise server-side or late. Silent auto-correction frustrates users; if input is reformatted, show what changed and allow undo. Never block paste — [Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [R-qual] Baymard: validate fixed-length inputs once the expected length is reached, rather than on blur — [Baymard](https://baymard.com/blog/inline-form-validation)
- [DS] GOV.UK, multi-field date input: error summary links go to the first sub-field with an error, or the first sub-field if unknown. Wrong-format messages must name the expected format — [GOV.UK Error summary](https://design-system.service.gov.uk/components/error-summary/); [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/)
- [NORM] A one-character-per-box split code input fails WCAG 3.3.8 if pasting the full code fills only the first box. This generalises to any segmented input (dates, IDs): paste into the first segment must distribute across segments — [W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- [UNVERIFIED] GOV.UK Date input recommends three separate day/month/year text fields for memorable dates such as date of birth, and a date picker only for dates near the present. Comboboxes for large reference lists should follow the WAI-ARIA APG Combobox pattern (input with `role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox popup) with server-side search. Neither was fetched this session.

### Inferences
- UIx default: `Field` gets a `necessity` prop (`required` | `optional` | `auto`). With `auto`, a form-level setting marks the rarer type in words. TENSOR agent forms, which are mostly optional, would show "Required"; POSx and MEDx short forms, which are mostly required, would show "(optional)". Programmatic `aria-required` is always set regardless of the visual mark.
- Make read-only the default for computed or locked values in TENSOR (ticket number, SLA due date, fields locked by state). Reserve disabled for "not available yet because of X", and always pair it with a reason (helper text or an InfoTip), since disabled fields drop out of the tab order and screen-reader discovery.
- Dependent fields (Category → Subcategory, Service → CI): when a parent change makes the child value impossible, don't clear it silently. Mark it ("No longer valid for Category 'Network'"), keep the old value visible, and require re-selection. This follows the "never clear user data" principle and is not a separately sourced pattern.
- Large reference-list comboboxes (CI/CMDB, users, locations, ICD codes in MEDx): async search with a debounce, "recent" and "suggested" groups, explicit no-results and error states with a retry, and the selected value shown as text so it stays readable when the list is closed.
- Masks: prefer formatting on blur with visible normalisation over keystroke masks that block typing or paste. Every segmented input must support pasting the full value.

### Gaps
- No primary research on enterprise combobox usability, such as type-ahead against browse for 10k+ item lists, was found in this pass.
- Date and time entry research (GOV.UK date input research, NN/g date-input articles, timezone entry for change windows) was not fetched; it needs a follow-up for TENSOR change-window scheduling.
- No study of input-mask error rates was found.

## 6. Server-side errors, partial failures, retry, idempotency in UI

### Takeaway
Server validation is mandatory regardless of client validation. Server field errors should flow into the same field-error and summary channels as client errors, and clear when the user edits that field. Guidance on partial failures and idempotency is thin. The patterns below are inferences from the general principles (keep data, say what happened and how to fix it, one-time actions must not repeat) rather than tested patterns.

### Cited Findings
- [DS] GOV.UK: "You'll always need to carry out server side validation, even if you use client side validation", because JS may fail or be bypassed. Make sure client and server rules don't conflict — [GOV.UK Validation](https://design-system.service.gov.uk/patterns/validation/)
- [DS] React Aria: pass server errors to `<Form validationErrors={{field: msg}}>` keyed by field `name`. They show immediately and clear for a field once its value changes. Zod `flatten().fieldErrors` maps directly onto them. Localise on the server — [React Aria Forms](https://react-aria.adobe.com/forms)
- [OPINION] Smashing: a client-side format check can pass while the server rejects the value, so design the server-error path explicitly — [Smashing](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [OPINION] NN/g: if server verification is needed, make the error clear and easy to find when the page reloads — [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [DS] GOV.UK: after a one-time action such as a payment, back navigation should show a sensible message instead of repeating the action — [GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [DS] GOV.UK: avoid generic system messages ("An error occurred", error codes); say what happened and what to do — [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/)
- [OPINION] Failed saves should show a retry action rather than a generic failure — [GitLab design issue 121](https://gitlab.com/gitlab-org/gitlab-design/issues/121); [saasui.design](https://www.saasui.design/blog/saas-autosave-save-states-ux-patterns)

### Inferences
- UIx error taxonomy for form submits:
  1. **Field validation (400/422)**: map errors to fields and the summary; focus the summary.
  2. **Form-level business rule** (e.g. "Change window overlaps a freeze"): show a summary entry with no field link, or a link to the governing section.
  3. **Conflict (409/412)**: open the conflict UX (section 3).
  4. **Auth expired (401)**: keep the draft and re-authenticate in a dialog or new tab without losing form state. This also serves WCAG 2.2.5 re-authenticating (AAA) and 3.3.8.
  5. **Transient (5xx, network)**: inline banner "Not submitted. Your answers are kept." with Retry; the submit button returns to enabled.
  6. **Unknown outcome (timeout after send)**: say so honestly ("We couldn't confirm whether this was submitted"), then check status before offering a retry.
- Idempotency: generate an idempotency key per submit intent, created when the form opens or the first submit is attempted and reused on retry. Show an in-flight state and ignore duplicate activations, without disabling the button before the first click. This prevents duplicate incidents and orders, which matters most for POSx tenders and MEDx orders.
- Partial failure on bulk or multi-entity submits (e.g. creating an incident plus 3 linked tasks, or an approval with notifications): report per-item results ("Incident INC-123 created. 1 of 3 tasks failed: Retry failed task"). Never roll the success message up into a single "Saved" or "Failed".

### Gaps
- No design-system guidance on idempotency keys or unknown-outcome states was found. Treat these patterns as engineering inference.
- Error-announcement behaviour across screen readers for server errors arriving asynchronously after submit was not tested or sourced beyond GOV.UK's JAWS fix.

## 7. Accessibility: aria-invalid, aria-describedby, error announcement, WCAG 2.2 3.3.7 Redundant Entry and 3.3.8 Accessible Authentication

### Takeaway
WCAG 2.2 adds two binding criteria for forms. 3.3.7 Redundant Entry (Level A): within a process, data already given must be auto-populated or selectable, and browser autofill alone doesn't count. 3.3.8 Accessible Authentication (Minimum) (Level AA): no cognitive-function test at login unless an alternative or mechanism exists, so allow paste and password managers, and segmented code inputs must accept a full paste. For field errors, the proven combination is an "Error:" prefix, a message associated with the input, a title prefix, and focus on the summary.

### Cited Findings
- [NORM] SC 3.3.7 Redundant Entry (A): information previously entered by or provided to the user that is required again in the same process must be auto-populated or available to select. Exceptions: re-entry is essential, security requires it, or the earlier information is no longer valid. Browser autofill does not satisfy it. Scope is one process or session, which can span domains; uploaded documents are excluded. Technique G221: provide data from a previous step. Examples include a "billing same as shipping" checkbox and keeping the card number after a payment error — [W3C Understanding 3.3.7](https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html)
- [NORM] SC 3.3.8 Accessible Authentication (Minimum) (AA): no cognitive-function test (remembering a password, transcribing a code, puzzles) at any login step unless one of four exceptions holds: an alternative method, a mechanism (password manager, copy-paste), object recognition, or personal non-text content. It covers login and account recovery, not account creation. Scripts that block paste or autofill fail. Codes must be pasteable. A split one-digit-per-box code fails if paste fills only the first box. Asking for selected characters (1st, 3rd, 5th) fails. Show-password toggles help. Hardware keys, app confirmations and OS biometrics are not cognitive tests — [W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)
- [DS] GOV.UK: visually hidden "Error:" prefix on field messages; "Error: " prefix on the page `<title>`; focus moves to the error summary; `role="alert"` sits on a nested element so JAWS reads the whole summary (v4.4.0 fix) — [GOV.UK Error message](https://design-system.service.gov.uk/components/error-message/); [GOV.UK Error summary](https://design-system.service.gov.uk/components/error-summary/)
- [DS] GOV.UK uses `novalidate` and avoids the `required` attribute, to suppress inconsistent native error bubbles. GOV.UK asks for research on whether omitting `required` harms screen-reader users — [GOV.UK Validation](https://design-system.service.gov.uk/patterns/validation/)
- [DS] React Aria `validationBehavior="aria"` exposes required and invalid state to assistive technology without blocking native submission; labels and descriptions are announced on focus; visible labels are expected — [React Aria Forms](https://react-aria.adobe.com/forms)
- [DS] Carbon: read-only fields stay focusable and screen-reader accessible; disabled fields don't and are exempt from contrast rules. Always use a visible label — [Carbon Form usage](https://carbondesignsystem.com/components/form/usage/)
- [OPINION] NN/g: add an icon so errors are not conveyed by colour alone; don't put errors only in tooltips or hover icons — [NN/g](https://www.nngroup.com/articles/errors-forms-design-guidelines/)
- [UNVERIFIED] The WAI forms tutorial and ARIA practice: set `aria-invalid="true"` on the input only after validation fails, never on initial render, and associate the message via `aria-describedby` (or `aria-errormessage`, which has weaker assistive-technology support). Inline errors appearing on blur generally should not be live-region alerts, because each one interrupts; the submit-time summary is where focus and announcement belong. Not fetched this session; cross-check against the [W3C WAI Forms tutorial](https://www.w3.org/WAI/tutorials/forms/notifications/).

### Inferences
- UIx `Field` contract: set `aria-invalid` only after a validation attempt fails. The error text's id is listed in `aria-describedby` after the hint id, so the order is label → hint → error. Prefix visible or hidden text with "Error:", localisable. An optional `warning` severity uses `aria-describedby` but not `aria-invalid`.
- TENSOR 3.3.7: requester and affected-user details, CI, and location entered in an incident should prefill the related task or change. A "Copy from parent incident" control satisfies "available to select". Approval steps must not ask approvers to re-type justification already given.
- 3.3.8 applies to TENSOR, POSx and MEDx sign-in and step-up auth (e.g. MEDx e-signature for orders, POSx manager override). UIx OTP/PIN inputs must distribute a full paste across segments, allow password-manager autofill (`autocomplete="one-time-code"` / `current-password`), and never block paste.
- Add a CI check in the UIx test suite: on submit failure, the summary has focus, the title is prefixed, every summary link targets an existing focusable id, and summary text equals field text. This mechanises the GOV.UK rules.

### Gaps
- The WAI forms tutorial pages (notifications, validation) and the ARIA APG combobox were not fetched in this pass; the `aria-errormessage` support status as of 2026 is unverified.
- No 2025–2026 screen-reader test data was found comparing live-region announcement of inline errors with summary-only announcement.
- The Adam Silver "Form Design Patterns" book and Luke Wroblewski's "Web Form Design" were not consulted directly. Adam Silver's "live validation is problematic" position is known only through the Smashing citation.
