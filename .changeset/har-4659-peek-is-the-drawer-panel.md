---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

HAR-4659 — the side `Peek` (a record's quick view beside a list) looks and behaves like the side `Drawer`: it floats `--uix-drawer-gap` in from the screen's edges with large corners and a border all round, slides in and out on the drawer's timings, dims the page behind with the drawer's blurred scrim (`--uix-scrim` + `--uix-scrim-blur`), and closes with a swipe toward the right edge on touch and pen. One set of frame rules now styles both (`drawer.css` targets `.uix-peek` with `.uix-drawer`), so they cannot drift apart again; `peek.css` keeps only what a peek adds (the record arrows, the hint line, its header, body and footer), and the header and footer take the drawer's horizontal padding. `--uix-scrim-peek` (HAR-3085) is no longer used by the kit and stays defined for consumers that read it. No markup or prop changes.
