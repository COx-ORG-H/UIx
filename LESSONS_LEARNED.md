# UIx engineering lessons

<!-- lesson-skip: fdb7ba7 routine: a fixed-width id cell did not clip; found by looking at the 1280 px shot -->
<!-- lesson-skip: 6a65e33 routine: a state colour pair below AA (same family as the 1d66ae0 / 217df0e entries: check a state colour in every theme), now a row-state contrast matrix; and a (0,2,1) density rule outranking the (0,1,1) cards reset, the 2026-10-23 specificity lesson again, pinned by a Chromium spec -->
<!-- lesson-skip: 727ea02 routine: a layout API (Range.getBoundingClientRect) called in a layout effect without a guard; TENSOR's jsdom suite named it, pinned by a jsdom mount with no shim -->
<!-- lesson-skip: aa0d4ff routine review fixes on unreleased 2.50 code (fixed layout, cards in flow, row-click split, one sort rule, focus edge cases), each measured by the #176 review and pinned by a jsdom or Chromium test; the stale aria-expanded Escape is the same family as the c34ab3b entry (state that trails a queued toggle event) -->
<!-- lesson-skip: 2974f47 routine: verify-components said the zero-tall drop line was hidden; the specimen now points at the drop target -->
<!-- lesson-skip: 610b3fd routine: the API report and the class-defined gate named the two gaps -->
<!-- lesson-skip: fa450cd routine: labels in map units shrank with the fit zoom; counter-scaled within their room, pinned by an on-screen size spec; the TS2488 was caught by CI's dts build -->
<!-- lesson-skip: b04d837 routine: labels drawn per edge group sat under later lines, legend marks were baseline-aligned ::before boxes, and the pan surface was selectable; the operator's demo named each, pinned by Chromium specs -->
<!-- lesson-skip: d6be6d0 routine: an absolutely positioned indicator outlived a resize by one frame; same family as cb64990, pinned by a clip test -->
<!-- lesson-skip: 0c2a40d routine: Chip's onClick dropped the event Menu's trigger reads; the PR #168 review named it, pinned by a jsdom Menu test -->
<!-- lesson-skip: 17f48df routine: decorative key caps had no touch rule; one media query in kbd.css, pinned by a touch-emulated Chromium spec -->
<!-- lesson-skip: caa32c6 routine: fit measured the whole viewport under an overlaid footer; the PR #166 review named it, pinned by jsdom and Chromium tests -->
<!-- lesson-skip: cb64990 routine: a transient indicator kept a stale translate after a mid-slide resize and widened the page; the 320 px overflow spec caught it in CI -->
<!-- lesson-skip: d3a64e3 routine: raw z-index caught by the contract gate, tokenized -->
<!-- lesson-skip: 5bdcb1d same trap as the 0e7b267 entry (mirror reduced-motion rules under :root[data-motion="reduce"]); pinned by a spec -->
<!-- lesson-skip: 38e861a routine review fixes (forced-colours specificity, listener per restart, opaque tint, stale overlap); each pinned by a DOM or browser test -->
<!-- lesson-skip: 8d41b96 routine: the re-shoot found a second path to the same empty-state flash (refreshing turned on a render later); pinned by a jsdom test -->
<!-- lesson-skip: 5cc12fc routine: a table cell's width is a preference, a squeezed table shrank the checkbox column under the frozen id's offset; found by looking at the 390 px shot, pinned by a spec -->
<!-- lesson-skip: 0bb7303 routine: NFD leaves stroked letters (đ ø ł ı) whole; the reviewer named them, a fold test now lists each -->
<!-- lesson-skip: 93d034a routine: a cmdk option marked only by background vanished in forced colours; same family as the existing forced-colours entries, pinned by a spec -->
<!-- lesson-skip: 1fe9677 routine: a backdrop click closed on a press that began inside; pointerdown and click must both land on the backdrop, pinned by jsdom tests -->
<!-- lesson-skip: 7249cfd routine review fixes (draft order kept after a refused reorder, pointercancel as a drop, no Escape cancel); each pinned by a jsdom test -->
<!-- lesson-skip: 9e70b73 same cause as the "a region inserted with text announces nothing" family: the live region unmounted with the actions row; pinned by a same-node test -->
<!-- lesson-skip: 439821c routine review fixes (own 300 ms timer instead of useDelayedPending, reversed range, body not keyed by field); each pinned by a jsdom test -->
<!-- lesson-skip: 7471b8d routine review fixes (empty state picked during a refetch, Escape layering, frozen id, chip ids, load-more error); each named by the reviewer and pinned by a test -->
<!-- lesson-skip: 6d69ac9 routine: a dim value measured below 4.5:1 by the reviewer; measured again and pinned by a CSS contract test -->
<!-- lesson-skip: 652af34 routine: sm padding leaked onto the link variant; pinned by a CSS contract test -->
<!-- lesson-skip: f6eec1c routine: link mode dropped disabled and fell back to href="#"; pinned by jsdom tests -->
<!-- lesson-skip: 7cd7c55 routine: the contract gate named two raw px values in this batch's own fixes; the gate worked -->
<!-- lesson-skip: f05d14b same cause as "An a11y scan only sees the states a specimen renders at load" (recorded); a new specimen showed the state -->
<!-- lesson-skip: f23b7d6 routine: a runtime-only token in one declaration; test:tokens (UIX-03) names it -->
<!-- lesson-skip: 8240ba4 already recorded: StrictMode runs updaters and cleanups twice (3e0ff88 entry); pinned by the StrictMode jsdom test -->
<!-- lesson-skip: 7728f4e routine: a JSX comment between elements read as a text node by literal-a11y-text; the gate named the file and line -->
<!-- lesson-skip: a797ad7 routine: native selects swapped for the kit Select; the static + runtime gates landed in the same commit -->
<!-- lesson-skip: 27305a8 routine: percentage min-height inside a flex item sized by min-height; found by looking at the drawer shot, pinned by a spec -->
<!-- lesson-skip: 3b9609d routine: the reviewer named three shapes the glyph guard missed; each is now a scan test -->
<!-- lesson-skip: 444a356 routine: a hidden presence word led the trigger's accessible name; the reviewer read the name, a spec now asserts it starts with the person -->
<!-- lesson-skip: 217df0e same family as the 1d66ae0 entry (check a state colour in both themes); the dot test now walks every tone in both -->
<!-- lesson-skip: d73d3b7 routine: selected Segmented option below 3:1 against the track, measured by the reviewer; pinned by a contrast spec -->
<!-- lesson-skip: be97dc3 same family as the 217f18f skip (storage that cannot be read back) plus a same-value switch flash; each pinned by a jsdom test -->
<!-- lesson-skip: 229d512 routine review fixes (drawer showed the rail, content unmounted before the exit, no button without phoneNav, Mac Option+[); each pinned by a test -->
<!-- lesson-skip: 28c16a2 routine: this batch's own rhythm sweep caught its own new pair; the gate worked -->
<!-- lesson-skip: 217f18f routine: a merge read back from storage that private mode cannot read; found in review, pinned by a test -->
<!-- lesson-skip: e6cc8ac same cause as the 2026-09-22 docs-specimens entry (unlayered docs prose rules beat @layer kit rules), now for h2/h3/p; scoped the same way with :where() -->
<!-- lesson-skip: e14a553 routine: a raw 1px the contract gate named; replaced with from-font -->
<!-- lesson-skip: f38c222 routine: HAR-2415 named the leak; same shape as the 9cbe96d skip (Escape handled by the hint, not stopped) -->
<!-- lesson-skip: 61b3635 routine: HAR-1764 named the missing type="button"; pinned by a form-submit test -->
<!-- lesson-skip: 9006caa routine: HAR-1828 named the subtree-wide accessible name; pinned by a test -->
<!-- lesson-skip: df9a5e6 routine CSS wrap fix; HAR-1754 named the cause, reflow specs cover it -->
<!-- lesson-skip: 8fe7118 routine review fixes (Tree indent, keyboard underline, passive effect); each found by looking at screenshots -->
<!-- lesson-skip: b4f426d routine review fixes (overflow-wrap anywhere, Escape on a React handler after inner controls, IME guard, focus return, reserved message height); each named by the reviewer and pinned by a test -->
<!-- lesson-skip: 4e3b663 same family as the 2026-10-16 lesson (state that trails a queued event); the field now asks :popover-open; pinned by a deferred-toggle jsdom test -->

<!-- lesson-skip: c26df37 squash-merge of 2b69af6 (PR #118); lesson recorded below under 2b69af6 (one component, three elements) -->
<!-- lesson-skip: cf04a4f not a fix from this session; arrived via git fetch of master (PR #120, own session owns its lesson call) -->
<!-- lesson-skip: 1455c46 squash-merge of 600bc17 (PR #116; already skipped below: routine inherited accent-color rule) -->
<!-- lesson-skip: 662d22b squash-merge of ded3c8f (PR #103); lesson recorded below under ded3c8f (react build, one clean per shared outDir) -->
<!-- lesson-skip: d3578e7 not a fix from this session; arrived via git fetch of master (HAR-1527 review round, own session owns its lesson call) -->
<!-- lesson-skip: aadc713 not a fix from this session; arrived via git fetch of master (HAR-1527 review round, own session owns its lesson call) -->
<!-- lesson-skip: 2ac6bea not a fix from this session; arrived via git fetch of master (HAR-1520 review round, own session owns its lesson call) -->
<!-- lesson-skip: 597cd33 rebased copy of fb709c3 (lesson recorded below under fb709c3) -->
<!-- lesson-skip: 5bee362 rebased copy of 069a9ec (already skipped: routine docs contrast fix) -->
<!-- lesson-skip: 069a9ec routine: docs contrast badge ignored alpha; caught by eyeballing the golden -->
<!-- lesson-skip: 5551372 not a fix from this session; arrived via git pull of master (PR #44, own session owns its lesson call) -->
<!-- lesson-skip: 7d2221d squash-merge of 8c831c1 (already skipped: routine CSS layout fixes) -->
<!-- lesson-skip: 8c831c1 routine CSS layout fixes; each cause shown by measuring the element -->
<!-- lesson-skip: 601d975 routine flex-wrap fix; nowrap bar is visible in the CSS, reflow gate already exists -->
<!-- lesson-skip: a7b5224 routine CSS scoping fix; the audit named the cause -->
<!-- lesson-skip: 1dafe90 routine: inputmode="numeric" has no separators on a phone keypad; pinned by a test -->
<!-- lesson-skip: 74a9cea already recorded: "An a11y scan only sees the states a specimen renders at load" (HAR-1630 paragraph) and settleOverlay under 5ddce2e -->
<!-- lesson-skip: 17a8271 routine CSS wrap fix; the brief measured the cause -->
<!-- lesson-skip: 9cbe96d routine: Escape handled on the popover only, not on the field; the CI failure named the handler that heard it -->
<!-- lesson-skip: 01ccebe same cause as the 3e0ff88 entry (StrictMode runs updaters and cleanups twice); pinned by a test -->
<!-- lesson-skip: 1ff6eca routine: review findings on print CSS (a print rule that lost on specificity, a map name split the wrong way round); found by reading -->
<!-- lesson-skip: 2659d63 routine: unfinished review fixes; each red gate named its cause (raw z-index, a colour missing from the print map, stale expectations) -->
<!-- lesson-skip: f011459 routine: cp1252 write from a Python patch script; fixed by encoding='utf-8' and check-utf8 -->
<!-- lesson-skip: 600bc17 routine: one inherited accent-color rule on the root, no trap; pinned by a test -->
<!-- lesson-skip: f11e68b routine: the PR #166 review measured each map problem (label counts, stroke alpha, description length); pinned by jsdom and Chromium tests -->
<!-- lesson-skip: 07bf8a1 routine: review named the look and the key collision; pinned by a double-booking jsdom test -->
<!-- lesson-skip: 31ec67a same family as the 3e0ff88 entry (effects that do two jobs re-run on an unrelated dep); hydration case pinned by a renderToString test -->
<!-- lesson-skip: 9979dc2 routine: review named each gap; pinned by decode and Chromium tests -->
<!-- lesson-skip: 4dc845e routine CSS fit fix; measured at 320/360/390 by a spec -->
<!-- lesson-skip: 629184a routine: an extension folded into the digits; pinned by a test -->
<!-- lesson-skip: 2acc765 routine: the glyph guard and the contract gate named the line; the column is a stacking context now -->
<!-- lesson-skip: cb5a6d4 routine: a hand-written docs specimen still had the old list markup; the text-stacks sweep named the route -->

### 2026-10-23 · a resize observer reacts a frame late · `5439e94`
- **Rule:** keep a layout guarantee ("never wider than the page", "never outside its box") in CSS that holds at layout time (`overflow: clip`, sizes in relative units), not in a ResizeObserver or `resize` handler that repairs it. An observer runs at the next rendering update, so anything that reads layout right after a viewport change (a test, a scroll measurement) sees the broken state.  **Why:** a sliding indicator ended its slide from a ResizeObserver; the 320 px overflow spec passed 10/10 locally and still read 19 px of sideways scroll in CI.
- **Gate:** `tests/a11y/feedback-kit.spec.mjs` asserts the row computes `overflow: clip` while it slides; `display-preferences.spec.mjs` measures the overflow.  **Tag:** layout, motion, ci-only, generalizable

### 2026-10-23 · row state painted twice · `3c75338`
- **Rule:** when a state (zebra, pinned, selected, hover) is painted in two places, the row and a frozen cell, give the state one value (a custom property set on the row at equal specificity, ordered by precedence) and let both read it. Never restate the precedence as a second set of selectors on the cells: `:nth-child(even)` and `:not(...)` carry specificity that the state attributes do not, so the copies drift. Register the value (`@property ... <color>`) when it must ease, so both painters ease together.  **Why:** table.css already carried a comment about an `:nth-child(even)` that outranked selected on frozen cells; #168 copied the pattern for the frozen id column and the `:not(.uix-table--no-zebra)` it added outranked selected again, so every even selected row showed a stripe in the id column (operator, demo "Prijave", dark).  **Gate:** "every row selected: the frozen checkbox, id and actions cells paint the row's state" in `tests/a11y/data-workspace.spec.mjs` compares painted colours of frozen and plain cells, odd and even, light and dark, and on hover.  **Tag:** css-specificity, single-source, table, generalizable
### 2026-10-23 · an exit animation makes a closed dialog pass toBeVisible · `3bcbcb7`
- **Rule:** to assert an overlay stayed open, check its state (`dialog.open`, `:popover-open`, `aria-expanded`), not `toBeVisible()`. A dialog or popover that just closed stays painted for its exit transition, and Playwright counts it visible.  **Why:** a TagInput spec "Escape closed the list, not the drawer" passed on master while the Escape did close the drawer; it went red only when keyboard closes became instant.
- **Gate:** `tests/a11y/form-fields.spec.mjs` now asserts `dialog.open`; ⚠ TODO no lint for `toBeVisible` as an "it stayed open" check elsewhere.  **Tag:** false-green, motion, overlay, test-double-fidelity

### 2026-10-23 · removing an enter animation exposes state races · `c34ab3b`
- **Rule:** when an overlay stops animating (instant, keyboard-opened, reduced motion), a key handler that gates on React state set by an async browser event (`toggle`, `transitionend`) must also read the DOM (`:popover-open`), because the next key can now arrive before that event.  **Why:** the date fields gated Escape on `open`, updated only by the queued `toggle` event; the 120 ms enter used to hide the gap, and in CI the Escape leaked to the dialog around the field (passed 4/4 locally). The same fix landed on master in parallel as HAR-2389 (`onFieldKeyDown`), which this branch took in the merge.
- **Gate:** `tests/a11y/older-gaps.spec.mjs` range-field test (Enter, then Escape, `outerEscape` 0) failed in CI on the instant open; ⚠ TODO no generic gate for other state-gated key handlers.  **Tag:** race, motion, overlay, local-env-lies



### 2026-10-23 · adding motion to a shipped component · `63d2ba2`
- **Rule:** when you add a decorative element to a component people already use (an indicator, a marker, a busy span), put it **last** (or use a pseudo-element) and let it carry state **only while it animates**. A new first child shifts every `:nth-child` selector and test that counts the items, and a decoration that permanently takes over the selected item's own look breaks every consumer and spec reading that look (contrast rings, fills, underlines).  **Why:** the sliding tab/segment indicator was the first child and always placed; master's display-preference, nav-link and nav-primitive specs (written by other sessions) read the selected option's own ring at rest and picked an option by `:nth-child(2)`.
- **Gate:** the feedback-lists DOM test asserts the indicator is the last child; `feedback-kit.spec.mjs` asserts the indicator is hidden and the option's own mark visible at rest.  **Tag:** compatibility, motion, parallel-sessions, generalizable

### 2026-10-23 · motion, one-shot attributes · `0c7fd01`
- **Rule:** a helper that sets an attribute to play a one-shot animation and removes it on `animationend` (settle, flash, tick) must not let any branch say `animation: none`: an element with no animation never fires `animationend`, so the attribute stays and the animation plays later when the rule stops matching (reduced motion switched off, a hidden panel shown). Give the reduced-motion branch a short real animation (the kit guard's `.001ms`, or a fade), or clear the attribute at once when `getComputedStyle(el).animationName === 'none'`, and listen for `animationcancel` too.  **Why:** `settleDrop` used `animation: none` under reduced motion; every drop left `data-uix-settle`, and the landings all replayed when motion came back.
- **Gate:** `tests/a11y/feedback-kit.spec.mjs` "drag under reduced motion" asserts no `data-uix-settle` remains after a drop.  **Tag:** motion, a11y, reduced-motion, generalizable

### 2026-10-23 · a scale measured from a box the scaled thing sizes · `39bc060`
- **Rule:** when a component scales itself to fit (zoom, transform, font-size by measurement), measure a box whose width cannot depend on the scaled content: a wrapper with its own definite width (the paper's, capped by `max-inline-size: 100%`), never the component's parent. Inline-size containment is not the fix: in a shrink-to-fit context (a centred flex or grid item) the contained box collapses to nothing.  **Why:** the PrintLayout preview first measured its parent; in an app-shell column that sized to its content, every smaller scale made the column narrower and the next measure smaller, down to 4 % (a 30 px page). A `contain: inline-size` wrapper then collapsed the same way at 1280 px. A wrapper sized like the paper is stable: its width comes from its own declaration and its container, never from the zoomed page.  **Gate:** `tests/a11y/print-layout.spec.mjs` checks true paper width at 1280 px and a page inside the screen, in print type, with no false overflow at 320 and 390 px.  **Tag:** layout, feedback-loop, measurement, generalizable

### 2026-10-23 · generated specimens · `0e6630e`
- **Rule:** a committed module generated from rendered components must not read the machine's default locale (or zone): pass `locale` / `formatDate` explicitly in the generator. And a check that compares one-line-per-route modules has to print where they differ; node's assertion diff truncates both strings at the same point and shows no difference at all.  **Why:** the resource-day specimen named its grid with `Intl` in the default locale: "22 October" on the en-GB maintainer machine, "October 22" on CI. The first CI failure printed two identical prefixes, so the cause was invisible until the test reported the first differing index.  **Gate:** `display-specimens.test.mjs` prints the first difference with context; the generator passes `formatDate`.  **Tag:** generated-files, locale, ci-only, generalizable

### 2026-10-23 · print layout · `8212a1f`
- **Rule:** a header or footer that must repeat on every printed page has to be a real `<thead>` / `<tfoot>` of a real `<table>`; Chromium does not repeat the header group of a CSS table built of divs (`display: table-header-group`), and print emulation (`emulateMedia`) does not paginate, so only a real PDF shows it. Give the screen reset of such a table zero specificity (`:where()`), or it out-specifies the print rules that restore the table display.  **Why:** PrintLayout's first two builds printed the header on page 1 and the footer on the last page only; a probe of five structures (div table, div table with cells, real table, real table with rows, fixed elements) showed only real tables and fixed boxes repeat, and then a `.page > :is(thead, tbody, tfoot) { display: block }` screen reset (0,1,1) beat the print `.header { display: table-header-group }` (0,1,0).  **Gate:** `tests/a11y/print-layout.spec.mjs` prints a PDF with `page.pdf` and counts the header and footer links per page against a link drawn once.  **Tag:** print, false-green, test-double-fidelity, cascade, generalizable

### 2026-10-23 · a11y, live regions · `010986c`
- **Rule:** a live region portalled to `document.body` is never announced while a modal `<dialog>` is open: `showModal()` makes everything outside the dialog inert. Portal status text to `el.closest('dialog') ?? document.body` (ButtonFeedback, `announcePolite(text, from)`, ShortcutHint all do).  **Why:** the button's result region worked on a page and was silent in a Drawer footer, the main use; only a reviewer reading ShortcutHint's comment knew.
- **Gate:** `feedback-pending-dom.test.mjs` (result inside a `<dialog>` speaks from the dialog) and `feedback-kit.spec.mjs` (Modal save announces inside the open dialog).  **Tag:** a11y, portal, dialog, generalizable

### 2026-10-23 · a blur that says nowhere · `66d6dd3`
- **Rule:** never read a blur with `relatedTarget === null` as "focus left". Safari (and Firefox on macOS) do not focus a clicked button, so pressing Cancel blurs the field with no `relatedTarget` before the click runs: a save-on-blur saved the draft the person was cancelling. Track a pointer press inside the editor (pointerdown capture, released after the click), keep focus with `onMouseDown={e => e.preventDefault()}` on the editor's own buttons, and when `relatedTarget` is null wait one task and save only if focus is really outside and the editor is still open.
- **Gate:** "1: Cancel clicked where the browser blurs with no relatedTarget …" in `packages/react/src/inline-edit-review-dom.test.mjs` dispatches pointerdown, a focusout with `relatedTarget: null`, then the click, and failed before the fix.  **Tag:** cross-browser, focus, forms

### 2026-10-23 · a generated file with a time in it · `8d6b668`
- **Rule:** a generated, committed file that renders a date or time (a docs specimen, a snapshot) must pin its time zone (and its `now`), and its freshness test must also render under a far-away `TZ` and compare. Otherwise it is the author's zone that is committed, and CI (UTC) regenerates something else.  **Why:** the AuditLog specimen rendered `RelativeTime` and an exact time in the local zone: identical on the author's machine, a failed `gates` job on the first push of PR #168. A fixed `now` was not enough; the zone was the other half.
- **Gate:** `packages/react/src/data-editing-specimens.test.mjs` renders the specimens with `process.env.TZ = 'Pacific/Kiritimati'` and compares them with the committed module (red with the UTC pin removed).  **Tag:** false-green, generated-files, time-zone, generalizable

### 2026-10-23 · a stylesheet no bundle reads · `feat/batch-3-data-editing`
- **Rule:** a new component stylesheet is not shipped until `styles/component-list.css` imports it; check the BUILT bundle for the block class (`grep -c uix-x build/css/styles.css`), and screenshot the component from a harness that links the bundle, before calling it styled.  **Why:** `inline-edit.css` (HAR-1381) was written, size-tracked by `test:size:css` and scanned by `test:contract`, all of which read the file itself, and never added to the list. `InlineEdit` rendered as bare browser buttons in every product for two weeks; its jsdom and Playwright tests checked names, focus and saves, not looks. HAR-1833's first screenshot showed it.
- **Gate:** `packages/tokens/tests/component-list.test.mjs` fails when a `styles/components/*.css` is missing from the list (seen red with the line removed); `tests/a11y/inline-edit-record.spec.mjs` asserts the computed look of the value button.  **Tag:** false-green, css, packaging, generalizable
- **Rule:** never give the only item of an `inline-flex` box a negative inline margin to pull it back onto a column: the box's shrink-to-fit width is the item's width minus that margin, so the item wraps its text early ("Amra / Kovač" in a 900 px column). Put the negative margin on the box.
### 2026-10-23 · an input's type change moves the caret later · `2a0c5b5`
- **Rule:** after changing an input's `type` (a password reveal), put the selection back in a layout effect *after forcing a style update* (`void input.offsetWidth`). Chrome resets the caret to 0 when it rebuilds the field for the new type at the next style update, not when the attribute changes: a `setSelectionRange` straight after the commit reads fine and is then undone. Do not restore again after a frame: a key pressed in between is moved too.  **Why:** `PasswordInput` turned End, X, toggle, Y into "Ycorrect horse batteryX". A MutationObserver saw `selectionStart` 22 right after the change and a `selectionchange` to 0 later; a frame-delayed restore fixed that test and broke Home, →, toggle, Z.
- **Gate:** "B1: typing goes on at the caret after the toggle" in `tests/a11y/form-fields.spec.mjs` types after toggling both ways (stable over 4 repeats). Found by the independent review of #167. Model: Opus 5.5.  **Tag:** browser-quirk, focus, test-double-fidelity, generalizable

### 2026-10-23 · delayed pending and stale answers · `805b46e`
- **Rule:** when a spinner is held back (300 ms, then kept 500 ms), the delayed flag may only decide whether the *spinner* draws, never whether the container (a popup list) is shown, nor whether a "loading" row shows once loading has ended. Until the spinner appears, keep the last settled content (its "no match", its error, its rows) and mark the control busy; and treat the rows as stale: Enter must not pick one, not even the active one.  **Why:** SearchSuggest's list collapsed for 300 ms whenever a search started with no rows, `aria-expanded` flipped and the Retry row `aria-activedescendant` named vanished; after a fast empty answer the loading row and "no match" showed together for 500 ms. Every jsdom test passed, because each read a settled state.
- **Rule:** an async search effect must invalidate the request in flight on *every* run, including the early returns (query too short, disabled), and the field must be busy from the keystroke, not from the end of the debounce.  **Why:** EntityPicker showed the answer for "ab" under "a", and Enter during the 250 ms debounce picked a row of the previous query.
- **Rule:** React's `onSelect` on an input is synthesized from `selectionchange` (and key/mouse events), not from the DOM `select` event. A jsdom test that dispatches `select` never reaches the handler, so an assertion that "the selection stays" passes vacuously; dispatch `selectionchange` on the document.
- **Gate:** `packages/react/src/entity-picker-adoption-dom.test.mjs` (a dropped stale answer; "no match" kept while the next search runs; no pick during a search) and the OtpInput selection test in `password-otp-dom.test.mjs`; all failed before the fix. Found by a fresh-context review of the branch. Model: Opus 5.5.  **Tag:** false-green, test-double-fidelity, async, generalizable
### 2026-10-23 · an in-app motion choice has more readers than CSS · `0e7b267`
- **Rule:** when an app can override `prefers-reduced-motion` (here `:root[data-motion="reduce"]`), every reader must ask the one helper (`prefersReducedMotion()`) or a CSS mirror under `@media (prefers-reduced-motion: no-preference) { :root[data-motion="reduce"] … }`. A component that calls `matchMedia('(prefers-reduced-motion: reduce)')` itself, or a CSS static fallback that only lives under the media query, silently ignores the in-app choice; and a fallback in an `@layer` loses to the unlayered motion policy unless it is `!important` (layered `!important` wins over unlayered).  **Why:** HAR-1372 shipped the switch and mirrored the button, spinner and progress rules, but ECharts kept animating, the toast still slid, and the arrival highlight lost its static fallback; the reviewer found all three by setting the switch, not the OS.
- **Gate:** `tests/a11y/display-preferences.spec.mjs` sets `data-motion="reduce"` with the OS at no-preference and checks toast and arrival computed styles; `display-preferences-dom.test.mjs` fails on a private `matchMedia('(prefers-reduced-motion` in ChartCore.  **Tag:** motion, a11y, single-source, generalizable

### 2026-10-23 · keyboard shortcuts · `34deb5c`
- **Rule:** a single-key shortcut guard that ignores presses with Ctrl or Alt must let AltGr through (`event.getModifierState('AltGraph')`). Windows reports AltGr as Ctrl+Alt, and on German, Bosnian, Polish and Nordic layouts `[`, `]`, `{`, `@`, `\`, `|` and `€` exist only behind AltGr.  **Why:** AppShell `navHotkey="["` (HAR-1371) never fired on the Bosnian staff keyboards it was built for; every jsdom and Chromium test typed `[` with no modifier. `Menu` typeahead and `OrgChart` use the same `!ctrlKey && !altKey` guard.
- **Gate:** "AppShell navHotkey…" in `packages/react/src/staff-nav-dom.test.mjs` dispatches `[` with `ctrlKey`, `altKey` and `modifierAltGraph` and failed before the fix.  **Tag:** i18n, keyboard, test-double-fidelity, generalizable

### 2026-10-23 · one Escape, two layers, in WebKit · `b4e9b87`
- **Rule:** never assume one Escape reaches only the topmost layer. With a light-dismiss popover open inside a modal `<dialog>`, WebKit closes the popover *and* fires `cancel` on the dialog for the same keypress; Chromium and Firefox close only the popover. A dialog that acts on `cancel` must ignore one that arrives in the same task as a popover's `beforetoggle` to `closed` (and reopen if the engine closed it anyway).  **Why:** in Safari a clean kit Drawer closed together with its help popover, and a dirty one asked "Discard changes?", since 2.42.0. The keydown order was identical in both engines (probed); only the extra `cancel` differed, so no keydown-based guard could see it.
- **Gate:** "clean, Escape closes an open popover and leaves the drawer open" in `tests/a11y/discard-prompt.spec.mjs`, now run in WebKit and Firefox by CI's cross-browser job (`CROSS_BROWSER_SPECS`, kept in step by `cross-browser-config.spec.mjs`). It failed in WebKit before `useGuardedDialog` tracked the light dismiss.  **Tag:** cross-browser, overlay, test-double-fidelity, generalizable

### 2026-10-17 · a closed popover with its own display · `feat/har-2029-discard-prompt`
- **Rule:** a class that sets `display` on a `[popover]` element must also hide it while closed (`[popover].x:not(:popover-open) { display: none }`). The browser hides a closed popover only through its UA stylesheet, and any author `display` beats that.  **Why:** `.uix-popconfirm { display: grid }` kept every closed Popconfirm laid out at opacity 0: a fixed 114 px box at the viewport's top-left that took clicks, and an `alertdialog` that role queries counted. The discard step of HAR-2029 reused the class and its spec's `toHaveCount(0)` saw it; Select's popup had hit the same and got a one-off rule.
- **Gate:** `[popover].uix-popover:not(:popover-open) { display: none }` in `popover.css` covers every kit popover (`.uix-filter-popover` sets `grid` too); `tests/a11y/discard-prompt.spec.mjs` asserts the closed step's computed `display` is `none`, and its pending test failed on the old CSS.  **Tag:** false-green, cascade, overlay, generalizable

### 2026-10-16 · state corrected in an effect · `0f75cbf`
- **Rule:** state that must agree with the render that changed it (an active index clamped into a filtered list, a selection pulled back after a load) is corrected in a layout effect or computed during render, never in `useEffect`. In a Playwright test, a one-shot `page.evaluate` read right after retrying assertions can land between the two commits; poll it, or prove the component leaves no such state.  **Why:** React 19 runs a passive effect a task after the commit, so the searchable `Select` showed "10 options" with no `aria-activedescendant` for 18 ms idle and 120+ ms under load. An Enter there closed the list without choosing, and `select.spec.mjs:249` read `null` in CI, on the attempt and on the retry.
- **Gate:** "searchable: no moment after a keystroke…" in `tests/a11y/select.spec.mjs` checks, from a MutationObserver, that an open list always names an active option, then presses Enter right after typing. It failed 10/10 with the passive effect; wall-clock repeats of the old test never failed locally.  **Tag:** race, react, a11y, test-double-fidelity, generalizable

### 2026-10-15 · tokens opaque in one theme only · `1d66ae0`
- **Rule:** before painting a state token on a surface that overlaps other content (a sticky cell, a frozen column, a floating bar), check its value in *both* themes; when one is translucent, layer it over an opaque base (`linear-gradient(tint, tint) var(--uix-surface)`).  **Why:** `--uix-row-selected-bg` / `--uix-row-pinned-bg` are opaque in light and `rgba(…, .08/.16)` in dark, so the frozen first column let scrolled cells show through in dark only, since it shipped.
- **Gate:** `tests/a11y/table-pinned-actions.spec.mjs` asserts each frozen cell is opaque and paints its row's colour over the surface, at rest and on hover, light + dark (fails in dark with the bare tints).  **Tag:** theming, sticky, false-green, generalizable

### 2026-10-13 · a real sleep against a chain of timers · `select-dom.test.mjs`
- **Rule:** a jsdom test that waits for a component's timer that starts another timer (a debounce that starts a load, a delay that starts an animation) runs on `mock.timers` and ticks each hop, never on `setTimeout` sleeps. Drain microtasks and `setImmediate` before and after each tick, inside one async `act`.  **Why:** the async `Select` test slept 260 ms against a 200 ms debounce plus a 20 ms loader. The loader's timer is only set a microtask after the debounce fires, so when a stall leaves both the debounce and the sleep due at once, the sleep runs first and asserts on an empty list. Under full CPU load it failed 6 of 8 runs on Node 24.18 and passed 8 of 8 on Node 22.23; the same pattern without React lost 4 of 25 rounds on Node 22 too. A single sleep that waits on a timer of its own length or shorter is safe: timers due together run in the order they were set.  **Gate:** the test now asserts the debounce edge (nothing at 199 ms, the load at 200 ms), the abort of an in-flight request and dropping its answer; each of six mutations of `Select`'s async code fails a named assertion.  **Tag:** race, test-double-fidelity, generalizable

### 2026-10-11 · one component, three elements · `2b69af6`
- **Rule:** a component that is a `<div>`, a `<button>` or an `<a>` depending on its props has to be measured with all three side by side in one stretched row. A block `<button>` taller than its content centres that content; a `<div>` and an `<a>` do not. Give the button form `display: flex; flex-direction: column` (or grid).  **Why:** the interactive `Stat` put its label 3 to 14 px lower than a read-only tile in the same row (HAR-1753). Every specimen and harness showed tiles of their own content height, where the three forms look the same.  **Gate:** `tests/a11y/stat-row.spec.mjs` stretches div, button and link tiles of unequal content in a grid row and a flex row and compares the label and value offsets (62 px against 13 px on the old CSS). It also runs in Firefox and WebKit in CI's cross-browser job.  **Tag:** false-green, layout, test-double-fidelity
- **Rule:** a specimen whose height depends on its width (an `auto-fit` grid, wrapping text) needs `width: 100%` when it is a `parts` entry of a component reference. The preview stage is a wrapping column flexbox, and it sizes such an item's height before it stretches the width.  **Why:** the stat row came out 540 px tall instead of 217 px, with 274 px tiles, and `tests/docs/verify-components.mjs` passed, because it checks that a specimen is visible and not its size.  **Gate:** none; look at the reference page.  **Tag:** false-green, docs


### 2026-10-08 · jsdom vs browser · `3e0ff88`
- **Rule:** when an action replaces the element it was triggered from (a row re-keyed from "error" to "loading"), decide where focus goes and assert `document.activeElement` after it; in a browser focus falls to `<body>`, and a test that only reads the rows' text passes.  **Why:** `Tree` Retry lost focus; jsdom tests checked text only.
- **Rule:** a `useRef(true)` "mounted" flag cleared in a cleanup must also be set in the effect body. StrictMode runs the cleanup once before the real mount, so the flag stays `false` and every async result is dropped.  **Why:** `InlineEdit` stayed busy after any async save in a StrictMode app.
- **Rule:** look at a mark of 10 px or less in a `deviceScaleFactor: 4` screenshot before calling it done. The avatar's own `overflow: hidden` had clipped its status dot to a quarter since the first release; a normal-scale golden cannot show it.
- **Gate:** `tests/a11y/older-gaps.spec.mjs` (a StrictMode harness: focus after Retry, a failed async save, the avatar's computed `overflow`) and the StrictMode case in `inline-edit-dom.test.mjs`.  **Tag:** focus, StrictMode, visual

### 2026-10-08 · anchored overlays · `5ddce2e`
- **Rule:** no written inset value keeps a CSS-anchor-positioned box inside the viewport while the page scrolls. The browser moves the box with its anchor *after* it resolved `top` / `left`, so `max(8px, min(anchor(bottom), 248px))` clamps at layout time and then rides out with the scroll; with `position-anchor` set, even a plain `top: 248px` is offset. A box that must not leave the viewport gets fixed coordinates and no `position-anchor`; anchoring is for boxes with room to spare.  **Why:** the first HAR-1613 implementation wrote exactly that clamp. jsdom has no anchor positioning, so every unit test passed.  **Gate:** `tests/a11y/overlay-shift.spec.mjs` scrolls a 384 px panel at 320 × 640 in Chromium, with and without anchor positioning; 9 of its tests failed on the clamp. Model: Opus 5.5.  **Tag:** false-green, overlay-position, test-double-fidelity
- **Rule:** script reads an anchor-positioned box's rect one rendering update late after a scroll (the page paints it in place; `getBoundingClientRect` catches up a frame later). Measure such a box two frames after the scroll, and never position anything from that rect inside a scroll handler.
- **Rule:** `el.getAnimations().length === 0` is also true *before* an enter transition starts. `Popover` holds its first frame with `data-uix-placing` (`transition: none`), one `--uix-lift` off its place, and CI measured a panel there once (top 4 instead of 8). Wait with `settleOverlay()` from `tests/a11y/settle.mjs`: the hold released, nothing animating, no transform left.

### 2026-10-08 · echo events · `cbd5ebc`
- **Rule:** a handler for an event the browser also fires for the component's *own* DOM writes (`toggle` on `<details>`, `close` on `<dialog>`) must tell an echo from a user action before it persists anything. Compare with what the component last rendered, not with its latest state.  **Why:** `CollapsibleSection` mounted open (`defaultOpen`), the remembered state closed it, and the two `toggle` events that followed were stored as the person's choice: the first one wrote "open" over the remembered "closed". Same family as the stale `close` event of 2026-09-29.  **Gate:** "defaultOpen applies on a first visit…" in `tests/a11y/tensor-gaps.spec.mjs` reloads the page in Chromium and failed before the fix; `collapsible-steps-dom.test.mjs` dispatches the echo in jsdom.  **Tag:** false-green, test-double-fidelity, persistence

### 2026-10-08 · react build · `ded3c8f`
- **Rule:** when two tsup configs (or any two parallel build steps) write to one `outDir`, none of them may `clean` it. Remove the directory once, before the tool starts, and after the build check that every file `package.json` exports is there. A bare `npx tsup` skips both; use `npm run build -w @tensor_1/react`.
- **Why:** tsup runs the configs of an array under one `Promise.all`, and `clean` is per config: it lists `outDir`, then unlinks what it listed. The ESM config's clean ran 0.3 to 0.5 s before the CJS config wrote its bundles; when that order flipped, all seven `.cjs` files were deleted after the log had printed them, and tsup exited 0. tsup never checks its output.
- **Gate:** `packages/react/scripts/check-dist.mjs` fails on a missing or empty `exports` target. It ends `npm run build`, runs as `test:dist` in CI's `gates` job, and is the package's `prepublishOnly`, because release.yml publishes a second build that no gate reads. `src/dist-exports.test.mjs` fails if a config gets `clean` back. Seen red on a dist with the old order forced.
- **Tag:** false-green, build, race, generalizable

### 2026-10-07 · chart theme · `fb709c3`
- **Rule:** a theme merged into an ECharts option may only *style* components the consumer's option already has. Any component key in the option (`legend`, `title`, `xAxis`, `dataZoom`, `visualMap` …) makes ECharts draw that component, so a theme default for it must be dropped when the option lacks the key.  **Why:** `uixChartTheme()` carried a styled `legend`, and the docs residence chart, which asks for none, grew a "Residence" legend. Every theme test still passed.  **Gate:** `mergeChartTheme`'s `STYLED_ONLY` list plus a `chart-theme.test.mjs` case. `tests/a11y/chart-theme.spec.mjs` asserts the residence chart has no legend text, and it fails on the old merge.  **Tag:** false-green, echarts

### 2026-10-07 · parallel Playwright · `b775755`
- **Rule:** when several worktrees run on one machine, never trust a local Playwright result from the repo config. `playwright.config.mjs` uses port 4178 with `reuseExistingServer`, so it silently tests whichever worktree's `serve` already holds 4178. Run with an untracked config on a unique port and `reuseExistingServer: false`.  **Why:** two agents' a11y runs hit another worktree's server today. One noticed only because its new spec found nothing.  **Gate:** ⚠ TODO. Let the config take its port from an env var, or fail when the server's root isn't this checkout.  **Tag:** false-green, concurrency

### 2026-10-06 · CSS class hooks · `c595cdb`
- **Rule:** before giving a new component's block class (e.g. `.uix-file-upload`) its first CSS rule, look the class up in `HOOKS` in `packages/react/src/react-classes-defined.test.mjs`. Another component may already emit it as an unstyled hook (BrandProfiles' upload `<label>` did), and a bare rule silently restyles that component.  **Why:** when the class gains a rule, the gate says "drop from HOOKS". Doing exactly that ships the restyle, and no visual golden covers the other component.  **Gate:** the HOOKS stale-entry failure now names every component that emits the hook and says the new rule restyles it (HAR-1573). It cannot judge the restyle: scope the rule (`:not(label)`) or pick a new block name.  **Tag:** css-collision, false-green
- **Same cause, other direction (2026-10-07, HAR-1573):** `FilterPopover` put `.uix-label`, the Label tag pill, on its `<label>` field wrapper, so the select sat in an accent band with 1 px below it. A scoped `display: grid` rule fixed the layout and hid the paint, and no golden covered the route. PromptDialog had made the same mistake earlier.  **Gate:** `packages/react/src/no-label-tag-class.test.mjs` fails on any `<label>` carrying `uix-label` in the React sources, docs, guide, `tables.html` and `examples/`; the pill rule is now `.uix-label:not(label)`.

### 2026-10-07 · generated files · `claude/elated-bohr-4f0064`
- **Symptom:** merging #96 turned ten open PRs (#89–#99) DIRTY at once. Every conflict was in `build/css/styles.css`, `build/css/components.css` or `tests/css-size.baseline.json`, files no PR had authored, and each PR needed a rebase plus a rebuild after every further merge.  **Root cause:** each bundle is one minified line, so two branches that rebuilt it conflict whatever they changed. The size baseline stored the two bundle totals, which every CSS change rewrites.  **Fix:** the bundles are git-ignored and built where they are needed (the docs fall back to `styles/main.css`). The baseline has one entry per stylesheet, `--update` rewrites only entries that are out of tolerance, and a bundle is checked against the sum of its inputs.  **Gate:** `packages/tokens/tests/generated-bundles.test.mjs` fails when a bundle is tracked again or a docs page loses its fallback; `size-report.test.mjs` merges the baselines of two simulated PRs with `git merge-file` and shows that the old shape conflicts. Model: Opus 5.5.  **Tag:** merge-conflicts, generated-files, parallel-prs
- **Rule:** before committing a generated file, picture two branches that both regenerate it. If it is one line, or an aggregate of everything (a total, a hash, a count), every pair of branches conflicts on it. Commit a generated file only when it has a line per source item; otherwise build it where it is read.
- **Rule:** a script in `package.json` is not a gate until a workflow runs it. `test:size:css` was in no CI job, and its baseline was still updated by hand in 18 commits over 14 days. It runs in the `gates` job now.
- **Same cause, hand-kept lists (2026-10-08):** `tests/global-setup.mjs` named every harness on one `Promise.all` line and `.gitignore` had a line per harness, so #91, #94, #97 and #99 conflicted with each other on both. A registry that every new item appends to at the same spot is an aggregate written by hand. Global setup now discovers `tests/*/build.mjs`. A derived list can also be short without anyone seeing it, so discovery fails on a `harness.html` with no builder and on zero harnesses. Gate: `tests/a11y/harness-discovery.spec.mjs` (each check was removed in turn and its test went red).

### 2026-10-06 · public API names · `feat/har-1365-filter-popover`
- **Symptom:** the API report for `FilterEditor` (HAR-1365) showed `FilterKind` changing from `'enum' | 'text' | 'number' | 'date' | 'boolean'` to a new union. That is a breaking change to `table-engine`'s exported type, and `tsc` and the build were both green.  **Root cause:** `index.ts` re-exports `table-engine` with `export * from`, and a named export of the same name in the entry silently wins over the star binding. No error, no warning; the old type just leaves the public API.  **Fix:** the new type is `FilterValueKind`.  **Gate:** `packages/react/src/export-names.test.mjs` fails when an entry's explicit export reuses a name from one of its `export *` modules (it fails with the original name). Model: Opus 5.5.  **Tag:** false-green, public-api
- **Rule:** read the `-` lines of an `.api.md` diff before calling a change additive. A "minor" whose report removes or narrows anything is a major in disguise.

### 2026-10-06 · composer layout · `b955d5e`
- **Symptom:** TENSOR's worklog composer had a 0 px tool row at 375 and 320 px: an audience toggle + Send in `toolbarEnd` took the whole bar, and a click on any tool hit the toggle (HAR-1125).  **Root cause:** a flex item with `contain: inline-size` has no content width, so in a `nowrap` row it gets only the leftover space and nothing gives it a floor. The composer opted out of `.uix-composer__bar`'s wrap in `601d975` because "its toolbar scrolls", but that scrolling happens inside the toolbar; the bar never had to stay one row. HAR-749 then wrapped one squeezing item (the status line) with `:has()` instead of adding the floor.  **Fix:** the bar wraps and the tool row has `min-width: min(5 * 32px, 100%)`.  **Gate:** "wide toolbarEnd" in `tests/a11y/rich-text.spec.mjs` measures the row and hit-tests every tool at 1280/768/375/320; 375 and 320 fail on the old CSS. Model: Opus 5.5.  **Tag:** false-green, reflow, containment
- **Rule:** an overflow gate must also assert each child's own usable width, and must cover every variant that overrides the bar. `reflow-320.spec.mjs` only checked the plain `.uix-composer__bar`, and only that nothing crosses its edge, which a child squeezed to 0 px passes.

### 2026-09-30 · anchored overlays · `e20cdc8`
- **Symptom:** TENSOR's emoji picker jumped from below its trigger to above it on the first category click near the bottom of the page (HAR-993).  **Root cause:** the overlay was placed once at open, before its content existed, and grew after the data loaded without being placed again. `useAnchoredPosition`'s capture-phase scroll listener then took the grid's own scroll as a page scroll and re-ran the flip from scratch. The geometry tests are pure and jsdom has no layout, so neither could see it.  **Fix:** the picker has one size in every state, an open overlay keeps its side until that side stops fitting (`stickySide`), scrolls inside the overlay are ignored, and a ResizeObserver re-places it.  **Gate:** `tests/a11y/emoji-picker-placement.spec.mjs` measures the box and page scroll in Chromium, with and without CSS anchor positioning. All 6 tests fail on the old sources. Model: Opus 5.5.  **Tag:** false-green, test-double-fidelity, overlay-position
- **Rule:** `toggle` is a discrete event for React. Each listener's `setState` renders in a microtask right after that listener returns, and a child's listener (registered first) runs before its parent's. Anything that must see what the consumer renders on toggle has to wait for the whole task (`setTimeout(0)`), not the first commit. Popover released its held first frame before EmojiPicker's content existed, so the enter slide started on the wrong side, and only a real-browser read of the transition's first keyframe showed it.
- **Rule:** Playwright's `toBeVisible()` passes at opacity 0. Before running axe on a popover, wait for `getAnimations().length === 0`, or axe measures colours mid-fade (4.49 against 4.5 on the dark link dialog).

### 2026-09-29 · dialog lifecycle · `d3f4d53`
- **Symptom:** Drawer/Modal/Peek mounted with `open` closed itself ~25 ms later in `next dev` (TENSOR HAR-882), releasing the scroll lock.  **Root cause:** browsers QUEUE a `<dialog>`'s `close` event; under StrictMode (or `open` true → false → true in one task) the effect cleanup's `close()` event arrived after the re-run's `showModal()` and reached the NEW listener. The jsdom test stubs dispatched `close` synchronously, so no test could see it.  **Fix:** `useDialog`'s `handleClose` ignores a `close` that finds its dialog open again.  **Gate:** `packages/react/src/dialog-stale-close-dom.test.mjs` queues `close` via `setTimeout(0)`, mounts under StrictMode, asserts the effect really ran twice; all 10 cases fail without the fix. Model: Opus 5.5.  **Tag:** false-green, test-double-fidelity, strictmode
- **Same cause, test side (2026-09-30):** `tests/a11y/drawer.spec.mjs` read the Escape `onClose` count right after `open` went false, so it failed ~1 run in 10 (red a11y on master `a8cd2b8`, with or without the fix). In a real browser, anything that rides the `close` event must be polled (`expect.poll`), never read once.

### 2026-09-24 · live-reorder drag · `feat/view-menu-columns-anatomy`
- **Rule:** a list that reorders *while* a row is dragged must follow the pointer on the window (not on the grip through pointer capture), and must compute the drop slot from the OTHER rows only.  **Why:** React re-keys by moving the dragged row's DOM node, and moving a node releases its pointer capture (and its focus), so SavedViewMenu's drag stalled after the first step down. Counting the dragged row's own midpoint pushed it one slot past the pointer. The jsdom test stubbed fixed rects and dispatched every event on the grip, so it passed on both bugs.  **Gate:** `tests/a11y/view-menu.spec.mjs` drags with a real mouse in Chromium (ViewMenu and SavedViewMenu); both drag tests fail when the dragged row is counted again.

### 2026-09-22 · docs specimens · `feat/saved-view-menu-sections`
- **Rule:** a list-based specimen (`ul.uix-menu` and similar) inside `.uix-docs__page` has to be looked at rendered, because the docs prose rules (`ul { padding-left }`, `li + li { margin-top }`) are unlayered and so beat every `@layer uix.components` rule.  **Why:** the saved-view specimen had been showing prose indents and gaps since it shipped, while contract, a11y and visual gates all stayed green (its route has no golden). The sectioned redesign made the rows look mis-indented against their section titles.  **Gate:** none general. `docs.css` now scopes its prose list rules with `:where()` to docs-authored lists only, so every kit list (`ul.uix-menu`, `.uix-prose ul`, `.uix-related-links__list`, `.uix-tree ul` …) is exempt; the workspace VR golden moved 44 px for exactly the two kit lists on that page and was re-baselined.  **Tag:** false-green, cascade-layers, docs

### 2026-09-18 · layout tests · `2f6e67a`
- **Rule:** measure an overrun against the parent's *content* box, and calibrate a self-sizing test against a property the fix does not touch.  **Why:** `.uix-composer`'s 8 px padding hid an 8 px `.uix-segmented` overrun that was measured against its border box, and a `min-content` calibration collapsed to one character as soon as `overflow-wrap: anywhere` landed, so the test narrowed the box to nonsense and failed for the wrong reason.  **Gate:** `tests/a11y/reflow-320.spec.mjs` measures against the bar's padding edge and forces `overflow-wrap: normal` on the options while calibrating.  **Tag:** false-green, reflow, test-calibration

### 2026-09-18 · layout tests · `8f4970d`
- **Rule:** an overflow or reflow test run against a docs specimen must first write in the longest real (localised) label the component will get; the specimen's short English copy fits even when the CSS is broken.  **Why:** the `1fr 1fr` + nowrap grid only overflowed with German portal labels, so a plain `scrollWidth === clientWidth` check passed on the broken CSS.  **Gate:** `tests/a11y/reflow-320.spec.mjs` injects a long label before measuring.  **Tag:** false-green, i18n, reflow

## Component documentation must verify the component route

Gallery-wide CSS selector coverage does not prove that a component reference shows the
component. Use explicit specimen mappings and check the rendered reference page, including
target visibility and meaningful interactions. Gate: `tests/docs/verify-components.mjs`,
run by the CI a11y job. The gate was observed failing for a missing editorial specimen and
a combobox that selected the wrong source fragment before both were corrected.

## Routed specimens need lifecycle cleanup

Legacy standalone initializers often attach document/window handlers and observers. Calling
them on each route retains detached dialogs and stale state. Dispose listeners, observers
and global nodes before replacing the article. Gate: repeated lightbox navigation and
interaction in the component browser verification; implementation: `disposeShowcase()`.

## A shared preview can still produce a non-portable example

Copying a whole family showcase around a component can pull documentation-only classes and local
assets into the product snippet even when the target component itself is valid. Overlay references
must select the matching trigger and surface as explicit specimen parts; extracted media must be
self-contained or use a consumer-owned URL. Gate: the 82-route browser verification rejects
`uix-docs__*`, `uix-guide__*`, and repository `assets/` URLs in copied component markup.

## Focus the element that actually scrolls

A focusable documentation wrapper does not make a nested overflow container keyboard-scrollable.
Detailed Pipeline rails scroll horizontally on narrow surfaces, so plain HTML needs `tabindex="0"`
on the rail and the React adapter must provide that default. Gate: the docs browser check focuses
the Pipeline element, the React render test asserts its default, and the full axe matrix must pass.

## An a11y scan only sees the states a specimen renders at load

The selected filter chip used the solid accent as text on a tint of that accent: 3.21:1 in dark
mode, and under 3:1 in light mode for bright brands. The axe matrix stayed green because every
specimen renders its chips unselected, and `data-on` is only set after a click. A consumer's axe
run found it (mission-control, 2026-09-10). Stateful colour pairs need a computed check, not a
page scan. Gate: `npm run test:tokens` evaluates the built CSS and every theme file in cascade
order and asserts the selected-chip text clears 4.5:1 in both modes. It was watched to fail with
the old rule restored.

Same cause, 2026-10-08 (HAR-1630): `FileUpload` rendered its rejection messages as
`<ul role="alert">`, which replaces the list role and leaves every `<li>` outside a list (axe
`listitem`, serious). It shipped in 2.31.0 unseen, because the list only exists after a file was
rejected. It was found the day a docs specimen rendered that state at load. A component's error,
empty and rejected states need a specimen or a harness scan of their own; the gate here is the
rejected-file test in `tests/a11y/tensor-gaps.spec.mjs`, which runs axe after the rejection.

## A green Release run can publish nothing

The `v2.16.0` tag passed every gate and the Release run went green, yet npm had no 2.16.0. The
`NPM_TOKEN` secret had been replaced the day after 2.15.0 and resolved blank, and the publish
step treated a missing token as "inert-safe" and exited 0 with a notice. Check the registry, not
the run colour, after every tag. Gate: the publish step now fails the run when the token is
missing or blank.
<!-- lesson-skip: 6afa2d2 timing polish caught by frame review, not a reusable trap -->
<!-- lesson-skip: 96acfc2 Firefox-only cause unconfirmed (not reproducible here); revisit if CI confirms it -->
