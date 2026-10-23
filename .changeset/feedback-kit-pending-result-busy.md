---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

State feedback on the latency ladder (motion rollout WP2: HAR-2580, HAR-2581, HAR-2582). Nothing new shows for the first 300 ms of an action; a pending indicator then stays at least 500 ms; an in-place result holds 1.5 s.

- `useDelayedPending(pending, { delay, minVisible })` and the constants `PENDING_DELAY_MS` (300), `PENDING_MIN_VISIBLE_MS` (500), `RESULT_HOLD_MS` (1500).
- `Button loading` now blocks presses at once but shows its spinner only after 300 ms, held at least 500 ms, and keeps the button's full colour instead of the 50 % dim (`loadingDelay={0}` for the old instant spinner; plain markup `data-loading` is unchanged). `Button` stays server-renderable: the timers live in a client child.
- `Button result` (`'success' | 'error' | null`) and `resultLabels`: a check or alert mark and words crossfade over the label for 1.5 s after an action, announced through a polite region outside the button (in the nearest dialog, else the body), with the button's width held to its widest wording; an icon-only button shows the mark alone. Set `result` to `null` when an action starts. `UixLabelsProvider` `buttonResult`; `DEFAULT_BUTTON_RESULT_LABELS`; types `ButtonResult`, `ButtonResultLabels`.
- Migration: the React `Button` no longer renders `data-loading`; while `loading` it carries `data-pending` (at once) and a hidden `[data-uix-btn-busy]` marker child (after the delay). A selector or e2e wait on `button[data-loading]` should use `[aria-busy="true"]`. Any `loading` prop (even `false`) adds that hidden first child.
- `SaveStatus delay` (default 300 ms): a fast save goes straight to "Saved"; `delay={0}` restores every state at once.
- `Spinner delay` and `LoadingState delay` (`true` = 300 ms).
- `BusyRegion busy` and `TableWrap refreshing`: a refetch keeps its rows, dims them under an indeterminate bar and sets `aria-busy`; under reduced motion the bar breathes instead of sweeping; right to left it sweeps leftwards. `BusyRegion` wraps its children in `.uix-busy-region__content`. New stylesheet `components/busy-region.css`.
