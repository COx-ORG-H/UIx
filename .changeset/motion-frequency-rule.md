---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

Daily controls move fast again: **the more often something is seen, the less it moves.** Daily controls settle in about 150 ms or less, and anything started from the keyboard is instant. This takes back part of the 2.60 animate-ui change (operator, 2026-11-08) for high-frequency controls only. Modals, drawers, toasts, popovers, tabs, the switch, data-change tints, list motion and the reduced-motion policy are unchanged. Foundations → Motion states the rule.

- **Menu and Select list.** From the keyboard (↓, Enter, Space, Escape) they open and close at once, rows included: `Menu` no longer passes `data-uix-animate-keys`, and `Select` marks its popup `[data-uix-key-opened]`. From the pointer they grow from `.95` over `--uix-dur-menu`, now 120 ms (was 220 ms from `.9`), on `--uix-ease-out`, and leave over `--uix-dur-exit-fast`.
- **Hover highlight** (`useHoverGlide`: Menu, Select, Sidebar). Pointer only. It shows at once, moves between rows over the new `--uix-dur-glide-hover` (90 ms) on `--uix-ease-out` instead of the 280 ms spring, and fades out over `--uix-dur-exit-fast`. A row reached from the keyboard paints its own background at once, and a key press takes the pointer's mark away instantly. A sidebar row with keyboard focus now shows the hover tint as well as its ring.
- **Sidebar group** (`NavGroup`). No height animation. The rows fade in together over `--uix-dur-fast`, with no stagger, slide or blur, and the chevron turns over `--uix-dur-fast`. A keyboard toggle is instant.
- **Checkbox.** Fully ticked within the new `--uix-dur-check` (120 ms). The tick starts with the fill (was 500 ms to fully ticked), and unticking takes 120 ms (was 300 ms).
- **Radio.** The dot grows from `.6` and fades in over `--uix-dur-fast` on `--uix-ease-out`, with no overshoot. It no longer springs from `0` over 880 ms.
- **Tooltip.** After the 400 ms hover delay the first bubble grows from `.95` over `--uix-dur` (160 ms) on `--uix-ease-out` (was `.7` over the 410 ms tooltip spring). A neighbour hovered within `--uix-delay-tooltip-skip` appears at once with `[data-uix-instant]`. The 2.60 morph (`data-morph`, `data-morphing`, the sliding label swap) is removed.
- **Peek.** `.uix-peek` slides in over `--uix-dur-slow` (240 ms) on `--uix-ease-out`, with no overshoot, and leaves on `--uix-ease-out`. Before, it used the drawer's 400 ms slide. The Drawer is unchanged.
- **Dashboard arrival.** `--uix-dur-arrive-count` is 300 ms (was 600 ms). Give `Arrive` a `name` on a product dashboard, so it arrives once per browser session instead of on every visit.
- **Animated icons.** Every opt-in icon motion ends within 400 ms: `--uix-dur-icon-draw` 600 → 400 ms, `--uix-dur-icon-swing` 900 → 400 ms, `--uix-dur-icon-spin` 1250 → 400 ms. They stay off by default.

**Tokens.** Added: `--uix-dur-glide-hover` (90 ms) and `--uix-dur-check` (120 ms). Removed, because nothing uses them any more: `--uix-ease-bounce`, `--uix-dur-bounce`, `--uix-ease-tooltip`, `--uix-dur-tooltip`, `--uix-dur-swap-in`, `--uix-swap-shift` and `--uix-swap-blur`, with the `uix-swap-in` / `uix-swap-out` keyframes and the bounce and tooltip entries of the `spring` export. If a product uses any of these directly, switch to `--uix-ease-out` and a `--uix-dur-*` token. Kept for compatibility, but the kit no longer uses them: `--uix-dur-fade`, `--uix-ease-fade`, `--uix-dur-disclosure` and `--uix-delay-draw`.
