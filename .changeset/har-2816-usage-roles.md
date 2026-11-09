---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Usage roles (HAR-2816): a Foundations page documents what each colour is for — surface, text, interactive, selected, disabled and the five status roles by meaning (neutral, info, success, warning, critical) — and `usage-roles.test.mjs` measures every pair in light and dark for the default palette and each product theme.

- New alias tokens `--uix-selected-bg`, `--uix-selected-border`, `--uix-disabled-text` and `--uix-disabled-border`. The segmented control's selected option uses the selected pair (same values).
- A disabled button is muted text, no fill and a hairline with the not-allowed cursor, instead of a 50 % faded copy of the enabled button, so disabled differs from enabled without relying on colour. A pending or loading button keeps its full colour.
- `Button` takes `disabledReason`: with `disabled`, the button stays focusable as `aria-disabled`, takes no press, and shows and announces the reason in a Tooltip.
- `statusRoleOf(tone)`, `STATUS_ROLES` and the `StatusRole` type fold any `StatusPill` tone onto the five roles; only failures and breaches are critical.
