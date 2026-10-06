---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `Lightbox`, a full-screen media viewer (HAR-1367; TENSOR C12 `capture-viewer.tsx`, MOTUS C-8 programme gallery). It has previous/next buttons, ←/→, Home/End and swipe, an announced counter, a caption, a fit/actual-size toggle and video items. It's a native `<dialog>` with focus on Close and focus returned to the opener. Tokens: gallery rules in `components/lightbox` (`.uix-lightbox--gallery`, `__stage`, `__media`, `__bar`, `__nav`, `__close`). The single-image `.uix-lightbox` is unchanged.
