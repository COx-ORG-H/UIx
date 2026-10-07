---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

Calm, balanced dark status ramp and a neutral status family (HAR-1562, absorbs HAR-1384).

- **Dark status values retuned.** Every dark status TEXT token now sits in one lightness band (OKLCH L 74–80 %, chroma ≤ 0.10) near `--uix-text-hushed`; solids are capped at chroma 0.14 and tints are the solid at 12 % alpha. Status text contrast on the dark surface now spans 8.1–9.8:1 (it was 6.8–11.2:1). The dark danger fill is `#BE3A41` (white text 5.4:1), so products no longer need a local dark danger override. `--uix-info` (a fill with white text) is unchanged.
- **New tokens (additive):** `--uix-success-text` (light aliases `--uix-success`, dark `#7CC79F`), the neutral status family `--uix-neutral-solid` / `-text` / `-bg` / `-border`, and `--uix-radius-xl: 24px`.
- **Components paint status text with the text role:** `.uix-pill--success` / `--sla-ok`, `.uix-alert--success` / `--warning` icons, `.uix-stat__trend--up` and `.uix-sla[data-state="ok"]`.
- Light-mode values are unchanged apart from the new tokens.
