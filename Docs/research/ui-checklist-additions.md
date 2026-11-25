# Additions for `Docs/audit-for-saas-products/05-ui-ux-and-component-framework.md` (workspace repo)

Apply these four changes to the version on `origin/main` (which already has §5.1b, probes 44–55). Keep the wording; adjust only to fit the file if something moved.

---

## Change 1: insert two new sections right after probe 55 (end of §5.1b), before `## 5.2`

## 5.1c Motion, material and touch refinements (probes 56–66)

From the 2026-11-20 study of iOS 27, One UI 9 and Android 17 against UIx (UIx `Docs/research/reports/Smartphone OS motion for UIx.md`; shipped in UIx PRs #286–#300). The phones' polish comes from continuity and honesty about cost, not from better curves. Glass and animated blur were rejected on purpose. Every vendor walked transparency back within a year, and blur starves GPU-less VDI desktops. Grade with a clip or a frame set, as in 5.1a.

| # | Probe | What good looks like | Repro / signature | Default severity | Likely owner |
|---|-------|---------------------|-------------------|------------------|--------------|
| 56 | **Only geometry overshoots** | A spring that overshoots (pop, tooltip, bounce) moves only `transform`/`translate`/`scale`/`rotate`/`clip-path`; opacity and colour ride a curve that never passes 1; no overshoot at all on data, status or anything that travels | Grep transitions that put an overshooting easing on `opacity` or a colour; UIx gates it as `check-motion` rule `overshoot-effect` | S4 (S3 when it flickers) | LIBRARY (+CONTRACT) |
| 57 | **Text swaps go out, then in** | When a label, value or status text changes in place, the old text leaves before the new one arrives; two texts are never readable on one frame (images may crossfade) | Pause the animations and step a button result, a select value, a save status every 20 ms; both words visible together = fail | S3 | LIBRARY |
| 58 | **No animated blur, no glass** | A blur radius is constant (behind a scrim) or driven per frame from script; nothing CSS-animates `filter`/`backdrop-filter`; no refraction or glass over content | Grep `transition`/`@keyframes` for `filter`; open a modal on a no-GPU profile and watch frame time | S2 (crashes Linux WebKit, starves VDI) | LIBRARY |
| 59 | **Reduce transparency is a setting** | An in-app transparency preference (Standard / Reduce / System) removes every blur and firms the scrims; more contrast implies it; WebKit can't report the media query, so the setting must exist | Turn Reduce on, open modal, drawer, select, spinner overlay; any blur left = fail | S3 | LIBRARY (+PRODUCT exposes the setting) |
| 60 | **Scroll edges, nothing hides** | Content that continues shows a soft edge on that side only; a pinned header firms its divider once rows pass under it; no blur; no toolbar or nav auto-hides; static under reduced motion | Scroll a table, a drawer body and a long menu; a hard cut with no cue, or chrome that disappears = fail | S4 | LIBRARY |
| 61 | **Continuity only where it's occasional** | Morphs between surfaces (view transitions) only on occasional changes (maximise, a canvas drop); the queue → record path stays instant; closing a record returns focus to its row with a one-time arrival cue | Open and close five records from a queue by mouse and keyboard; any travel animation, or focus landing on `body` after close = fail | S3 | LIBRARY + PRODUCT (passes the row id) |
| 62 | **Long work stays in view** | Work over ~10 s (export, import, bulk update, discovery) lives in a persistent task tray: count, progress, current step, cancel, then a result with an action (download, open, retry the rest); it survives navigation | Start an import and change page; the job gone, or only a one-shot toast = fail | S2 on import/bulk flows, else S3 | LIBRARY (tray) + PRODUCT (wiring) |
| 63 | **One swipe model; finger ≠ pointer** | Swipe-to-dismiss uses one shared slop / fling speed / distance on every surface, touch and pen only (a mouse drag selects text); a stronger press under a coarse pointer never changes fine-pointer frames | Emulate touch, swipe a toast, a drawer and a peek; different thresholds per surface, or a mouse drag that dismisses = fail | S4 | LIBRARY |
| 64 | **Feedback is never haptics-only** | Commit moments (result, swipe-away, limit) emit a semantic event a product can listen to; vibration is off by default and only accompanies a visible or announced signal; iPhone has no web vibration | Turn haptics on, screen and screen reader off; a moment conveyed only by vibration = fail | S3 | LIBRARY |
| 65 | **Concentric corners** | A nested surface's radius is its container's minus the inset, from a token (`--uix-radius-inner`), never a hand-typed calc; pills stay pills; never below 0 | Zoom segmented controls, pill tabs, cards in cards; curves that aren't parallel = fail | S4 | LIBRARY |
| 66 | **Native apps get the same springs** | Spring tokens publish stiffness, damping, mass and a cubic-bezier fallback, so React Native / SwiftUI / Compose rebuild the same motion instead of guessing from sampled curves | Read the token build for the spring parameters | S4 | LIBRARY |

## 5.1d Operator speed, language, assistance and evidence (probes 67–84)

From the 2026-11-20 enterprise UX study (keyboard and speed, dense tables, AI assistance, forms, writing and i18n, accessibility, measuring, plus an ITSM competitor teardown; UIx `Docs/research/reports/UIx enterprise UX study.md`; shipped in UIx PRs #302–#318). Incumbent ITSM tools leave keyboard speed and background work open, and none documents a global command palette, so these probes are where an operator console wins or loses daily minutes. Severity defaults assume a daily-use staff surface.

| # | Probe | What good looks like | Repro / signature | Default severity | Likely owner |
|---|-------|---------------------|-------------------|------------------|--------------|
| 67 | **One shortcut contract** | Every shortcut is registered once with a scope; tooltips, key hints, the palette and the `?` sheet all render from that registry; conflicts warn; the sheet lists only what's active here | Remap a key, then compare the tooltip hint with what the key does; any disagreement, or a raw `keydown` binding outside the registry = fail | S3 | LIBRARY + PRODUCT (register, don't bind raw) |
| 68 | **Single keys can be switched off (2.1.4)** | Single-character shortcuts can be turned off or remapped, fire only in their scope and never in text fields; Mod/punctuation chords need exactly their modifiers so AltGr layouts don't trigger them | On a German layout type "/" (AltGr+7) in a field; switch single keys off and press "a" on a row; anything fires = fail | S2 (Level A) | LIBRARY |
| 69 | **Actions where the hands are** | On a focused row Enter runs the primary action and Mod+K lists all its actions with their keys; a second Mod+K opens the global palette; the palette loads server results without flicker and nested pages step back with Esc or Backspace | Tab to a row, press Mod+K twice; type a query on a slow source; results blank between keystrokes = fail | S3 | LIBRARY |
| 70 | **Undo over confirm, for frequent reversible actions** | The undo window is visible (a countdown that pauses on hover and focus), Mod+Z undoes the latest action, repeats collapse ("Resolved 3 tickets"), toasts are rate-limited; irreversible actions still confirm | Resolve three tickets fast; three stacked toasts, or a confirm dialog on a reversible action = fail | S3 | LIBRARY + PRODUCT |
| 71 | **Errors summarised on submit** | A failed submit shows an error summary at the top ("There is a problem") that takes focus and links to each field with the same words; the title gets "Error: "; fields validate on leave and clear on the fixing keystroke; typed input is never cleared | Submit an empty form with a screen reader on; focus staying on the button, or errors only at the fields = fail | S2 | LIBRARY (summary) + PRODUCT |
| 72 | **No silent overwrite, no silent loss** | A save conflicts server-side when the record changed; the conflict keeps the person's values and shows what changed (reload or review); a route-level leave guard runs only while changes are unsaved, saving or failed | Edit one record in two tabs and save both; the second save silently wins, or the guard nags on a clean form = fail | S2 | PRODUCT + LIBRARY |
| 73 | **Counts follow the language** | Count text uses `Intl.PluralRules` categories (bs/hr/sr need one/few/other: 1 and 21 one, 2–4 and 22–24 few); no "{n} items" concatenation; packs per locale incl. `sr-Latn` and `sr-Cyrl`; machine-drafted packs are flagged for native review | Select 1, 2, 5, 21 rows in `bs`; "2 odabranih" = fail | S3 | LIBRARY + PRODUCT |
| 74 | **Search ignores diacritics, sorts by locale** | "djordje" finds Đorđe (đ has no Unicode decomposition: fold đ→dj explicitly), č/ć/š/ž match without accents, Serbian Cyrillic answers Latin; sorting uses `Intl.Collator` per locale with numeric IDs (INC-2 before INC-10) | Search "djordje", "cevapi"; sort INC-1, INC-2, INC-10 | S3 | LIBRARY |
| 75 | **Text survives translation and settings** | A padded pseudo-locale (+35 %, long compounds), WCAG 1.4.12 text spacing and a 20/24 px default font size lose no text; accessible names contain the visible label (2.5.3, voice control); new CSS is direction-neutral (ratchet); italic Serbian Cyrillic uses the font's `locl` forms | Run the pseudo-locale, text-spacing and font-24 lanes; clipped or overlapping words = fail | S2 (1.4.12/2.5.3), S3 otherwise | LIBRARY |
| 76 | **Focus never hidden by a sticky layer (2.4.11)** | Header, bulk bar, toasts and task tray register their heights; scrollers use them as `scroll-padding`, and virtualised `scrollToIndex` honours them; a control's own styled wrapper doesn't count as covering it | Tab through a 60-row queue with the bulk bar and two toasts open; a focused control fully under any layer = fail | S2 | LIBRARY |
| 77 | **Every drag has a click path (2.5.7)** | Kanban cards, sortable lists, canvas move/resize and column resize each have a single-pointer path (a Move menu, step buttons, "Resize…"); a keyboard grab alone doesn't satisfy it; moves are announced and focus follows the item | Do every drag with clicks only; a drag-only action, or a silent move = fail | S2 | LIBRARY + PRODUCT (announcement text) |
| 78 | **Time limits warn and keep work** | A session timeout warns ahead, focuses Extend, announces once (not every second) and keeps drafts on expiry (2.2.1); pasting a full one-time code into any box fills them all and password managers aren't blocked (3.3.8) | Force a near-expiry; paste "123 456" into box 3 of an OTP input | S2 | LIBRARY + PRODUCT |
| 79 | **SLA clocks inform without nagging** | Up to three thresholds, a paused state with its reason, breach; no flashing or looping; the time is read on request, a threshold crossing is announced once and only if the product opts in; the queue sorts by time left | Watch a timer cross a threshold with a screen reader on; a per-minute announcement or a pulsing red cell = fail | S3 | LIBRARY |
| 80 | **AI proposes, people approve by consequence** | AI content is labelled with a disclosure; consequential writes (resolve or close, CI change, customer reply) never auto-apply; an unknown or missing consequence band counts as high; AI never overwrites what the person typed; AI-filled fields show provenance and can revert, and an edited value becomes the person's | Type in a field, then trigger an AI fill; resolve an incident through a proposal without approving; either succeeding = fail | S1 for an unapproved consequential write, else S2 | LIBRARY + PRODUCT |
| 81 | **AI output is accessible and safe** | Streaming announces the finished message once, never token by token (a "Loading" heartbeat about every 5 s), and Stop works; source links allow only http(s) and relative URLs; feedback measures acceptance together with reversion; explanations aren't used as trust boosters | Stream an answer with NVDA on; feed a `javascript:` source URL | S1 for script injection, else S2 | LIBRARY |
| 82 | **Telemetry carries no content** | Kit events (feedback, proposals, usage) carry ids, kinds and timings only, never user text; id fields are validated so free text can't ride in them | Inspect emitted event payloads after typing personal data into a form | S2 | LIBRARY |
| 83 | **Assistive-tech evidence exists** | Each complex widget (data workspace, palette, combobox, date picker, diff viewer, toasts) has a manual screen-reader script and dated results for NVDA + Chrome, JAWS + Chrome/Edge, VoiceOver and TalkBack; an automated NVDA lane runs in CI; an ACR against EN 301 549 V4.1.1 can be produced | Look for results files and the status table; "axe passes" offered as the only evidence = fail | S2 (procurement blocker) | LIBRARY |
| 84 | **Budgets that hold** | A 10k-row render benchmark with INP-style interaction latency, a bundle budget per entry (with a Button-only probe), a nightly no-GPU lane; every PR records its own growth in the baseline so the tolerance never erodes across a merge queue | Merge two PRs that each fit the tolerance; master failing its own size gate afterwards = fail | S3 | LIBRARY |

---

## Change 2: probe 39 (in §5.1a)

Replace `Animations touch \`transform\`, \`opacity\` (and where needed \`filter\`/\`clip-path\`); never`
with `Animations touch \`transform\`, \`opacity\` (and where needed \`clip-path\`; a blur moves only from script, never as a CSS-animated \`filter\`, see probe 58); never`.

---

## Change 3: §5.2 heading and opening

Replace the heading `## 5.2 Accessibility (WCAG 2.1 AA) (S2)` with `## 5.2 Accessibility (WCAG 2.2 AA) (S2)`, and insert this paragraph right under it:

EN 301 549 V4.1.1 (published September 2026) adopts WCAG 2.2 AA; once the EU Official Journal cites it (expected December 2026 to January 2027) it is the presumed standard for EU procurement and the European Accessibility Act. Grade against 2.2: the new criteria are probes 50 (2.5.8), 68 (2.1.4, already Level A), 71–72 (3.3.7), 76 (2.4.11), 77 (2.5.7) and 78 (2.2.1, 3.3.8).

Then append to the existing "Automated" bullet: ` Axe covers only part of WCAG; it is evidence of a floor, not of conformance (probe 83).`
And add a bullet after it:
`- Lanes: forced colours (focus drawn as an outline, not a shadow), WCAG 1.4.12 text spacing, 20/24 px default font size, 400 % reflow, label-in-name (probe 75).`

---

## Change 4: §5.3 Correctness

Append to the "Selection semantics" bullet: ` The banner and bulk bar state the scope and count *and restate the filter in words*; a query-scoped selection is handed to the server as a query plus exclusions, never a client-side id list of every match.`

Add two bullets after it:
- `- **Semantics:** read-mostly queues and asset lists stay a native \`<table>\` with a labelled checkbox per row and a whole-row link on the row's title; ARIA \`grid\` (one tab stop, arrow keys, Enter/F2/Escape) is only for spreadsheet-like editing. Escape order: cancel an edit, then close a popover, then clear the selection.`
- `- **Text matching:** search folds diacritics and sorting collates by locale (probe 74).`

---

## Change 5 (small): `Docs/lessons/12-ui-design-systems-a11y.md`

In the "Design the transition, not the frame" bullet, where it says "Meanwhile the check is audit-for-saas-products/05 probes 32–43.", change to "Meanwhile the check is audit-for-saas-products/05 probes 32–43, with the 2026-11 refinements in 56–66." And at the end of the line "The concrete UI/UX + wiring checklist is `audit-for-saas-products/05`+`06`…" add: " Probes 67–84 cover operator speed, language, AI assistance and accessibility evidence." If lesson 12 is generated into skills by `Infrastructure/agent-kits/portfolio-lessons/build.mjs`, re-run that build.
