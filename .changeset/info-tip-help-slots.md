---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

InfoTip: a small ? that explains a page, section or field, plus a `help` slot on PageHeader, Card, SectionHead and Field (HAR-737, for TENSOR's contextual help, HAR-736 / ADR-0226).

- **`<InfoTip content label placement? />`.** `content` is plain text, never HTML, and blank lines become paragraphs. Empty or whitespace-only content renders nothing. `label` is the button's accessible name, e.g. "About: Incidents". The panel is a top-layer kit `Popover` (`popover="manual"`, so it never closes another open popover), at most about 360 px wide, and it is the button's `aria-describedby`.
- **Behaviour.** Hover opens it after about 300 ms and it stays open while the pointer crosses into the panel. Keyboard focus opens it at once, and a click or tap keeps it open. Esc closes it and keeps focus on the ?. It does not close an enclosing dialog. A press outside also closes it.
- **The ?** is a fixed 9 px filled glyph (Material Symbols `question_mark`, Apache-2.0), with no circle, the same size next to any text. It sits superscript at the top right of the title or label: its top is 0.2em above the cap line (`vertical-align: calc(1cap + 0.2em - 9px)`). Muted at rest, it turns the primary-button blue (`--uix-accent`) on hover and while open, with a 25 px hit area. The brief asked for a 16 px button with a 12 px `CircleHelp`. The operator replaced that during review because the ringed glyph was unreadable and read as part of the word.
- **`help?: string | null` + `helpLabel?: string`** on `PageHeader` (after the title), `Card` and `SectionHead` (after the title) and `Field` (after the label, before the required marker). The ? always sits beside the heading or `<label>`, never inside it. A heading keeps its title as its name, and a Field label's control stays the input (a button inside a label becomes its activation target, TENSOR HAR-743). With `help`, Field draws the required marker as `.uix-field__required` after the ?. `helpLabel` defaults to `"About: <title>"` in English, so pass a translated one. The four components stay server-renderable: the slot helpers live outside the `"use client"` InfoTip module.
- **CSS:** new `info-tip.css` (`.uix-info-tip`, `__button`, `__panel`) and row classes `.uix-page-header__title-row`, `.uix-card__title-row`, `.uix-section-head__title-row`, `.uix-field__label-row` and `.uix-field__required`. Markup without `help` is unchanged.
- **Migration:** none. Every new prop is optional.
