---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`Input`, `Select` and `Textarea` take `size="lg"`** (HAR-1812, MOTUS UXR-11): 44 px, the touch-target floor of a public page and the height of `Button size="lg"`, so a public form no longer restates the controls' height. `Input` and `Select` are `'sm' | 'md' | 'lg'`; `Textarea` gains `size?: 'md' | 'lg'` (its 84 px floor already clears 44 px; `lg` takes the larger type and padding and still grows). New classes `.uix-input--lg`, `.uix-select--lg` (also on a plain `<select class="uix-select">`) and `.uix-textarea--lg`. In an `InputGroup`, the leading and trailing icons move in with the lg field's padding and the text clears them. Documented on the Input & field page beside Button's sizes, with a form at `lg`.
