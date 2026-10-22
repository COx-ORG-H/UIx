---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`ContactCard`** (HAR-1379; MOTUS C-15, TENSOR incident people card and user peek): the React wrapper of `.uix-contact`. `name` (a quiet link with `href` / `renderLink`; `nameAs` for a heading), `role`, `avatar`, `email` and `phone` as selectable text, Email / Call as `mailto:` / `tel:` `ButtonLink`s whose accessible names start with their visible words ("Email {name}", WCAG 2.5.3), then your `actions` and `stats`. `state="purged"`: a neutral placeholder avatar, "Removed contact", "Personal data erased", and no role, details, links or actions even when stale props still carry them; `state="unavailable"`: the name and a line saying the details are unavailable, nothing else. `bare` drops the card frame and its padding for a surface that already has one. Words: `labels` or `UixLabelsProvider` `contactCard`. `telHref(phone)` is exported.

`contact-card.css`: the actions wrap (equal widths, at least 7rem each) instead of squeezing, long names and addresses break inside the card, and new parts `.uix-contact--bare`, `__details`, `__detail`, `__placeholder`, `__note`.
