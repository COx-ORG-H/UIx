---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Accessibility remediation across the library (2026-07 audit, all S1–S4 findings):

**Blockers fixed:** sortable table headers are now real buttons inside the `<th>` (keyboard-operable, `aria-sort` preserved); the rich select and CommandPalette implement the full APG combobox pattern (`aria-activedescendant`, `aria-expanded`, labelled triggers, result-count announcements); Inbox is a working keyboard listbox; sidebar rail mode keeps nav-item accessible names via the visually-hidden clip pattern.

**React:** Modal/Drawer/Peek dialogs are named via `aria-labelledby` (title is now an `h2`) and spread rest props onto the `<dialog>`; `useDialog(open, onClose?)` syncs state and scroll-lock on native Esc close; Tooltip moves `aria-describedby` onto the trigger, adds Esc dismissal and hoverable bubbles (WCAG 1.4.13); Toast gains a persistent polite announcer, `role="region"` and dismiss focus handoff; Tabs implement roving tabindex + arrow keys with the new `TabPanel` export; virtualized Tree keeps focus/tab-entry across window eviction and gains typeahead; Kanban cards are focusable listitems with an `onMove` Alt+Arrow contract; Field auto-associates label↔control and injects `aria-required`; Button loading uses `aria-disabled`/`aria-busy` instead of hard-disabling; Alert gets live-region roles; Chart's fallback table is correctly hidden (`uix-visually-hidden`) and honors reduced motion; Progress/Meter/Spinner/States gain accessible names and reliable announcements; Stat/Avatar/Meter no longer encode state by color alone; Timeline is a real list; AppShell ships a skip link; `Tr` uses `data-selected` (aria-selected is invalid on native rows).

**Tokens/CSS:** new `forced-colors.css` layer (Windows High Contrast support for switch/radio/checkbox/progress/meter and text-field focus); global `[hidden]` guard; hover-revealed controls (nav star, table pin) reveal on `:focus-visible`; 24px minimum targets for tag-remove and nav star; type scale emitted in rem; collapsed nav groups and hidden AppShell sidebars are `visibility:hidden` (no invisible tab stops); indeterminate checkbox mark renders.

New a11y gates: open-state axe scans (modal + rich select open) and keyboard-operability tests (skip link, dialog focus restore, combobox arrowing, sort, column resize).
