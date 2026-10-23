---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

Review fixes for the batch 5 display components (PR #166):

- **SchedulingCalendar resource day** (HAR-983): hour lines only; a free slot is open paper with no box and no words at rest, and shows the ghost surface and "+ 08:15" on hover (pointer devices) and keyboard focus; a booking is the time grid's own entry chip (`entry` + `tg-item`), heavy only when selected; "no schedule" stays hatched; slots are 2.75rem tall under a coarse pointer. Two bookings at the same start are two items: one tab stop and one `aria-current` (stops were keyed by start).
- **QrScanner** (HAR-1254): the first render is `idle` on the server and in the browser (it rendered `unsupported` on the server: a hydration mismatch); a new `facingMode` while scanning switches the camera (it left a black frame); a read is cleared when the camera goes, so a refused or lost camera is announced.
- **QrCode** (HAR-1251): the "too long" state is words, not an `img` named like a working code; optional `eci` marks non-ASCII text as UTF-8 (ECI 26); a `minVersion` that is not a finite number throws a `RangeError` instead of reading as "too long"; `DEFAULT_QR_CODE_LABELS` is exported.
- **CodeDisplay** (HAR-1253): `size="lg"` fills its container and scales a three-by-three code to fit one line (down to the h2 size) instead of breaking it in a card at 320–360 px.
- **ContactCard** (HAR-1379): `telHref` puts an extension ("ext. 12", "x12", "#12", "lok. 12") after the number as `;ext=` instead of dialling it.
- **PrintLayout** (HAR-986): the screen preview is the page at its true width and print type size, scaled down whole to the room it has (it reflowed narrower at one page's height, so a poster that prints on one page was reported as overflowing at 320–390 px); the page sits in a `.uix-print-preview` box. The overflow measure subscribes once per page shape instead of on every render.
