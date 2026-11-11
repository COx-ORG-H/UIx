---
"@tensor_1/tokens": minor
---

Form field stack (TENSOR HAR-2974). `.uix-form-stack` stacks a form's fields with `--uix-space-1` between them. Every `.uix-field` reserves its message line, so that small gap gives one even rhythm: 30 px between controls, against TENSOR's mixed 16/42 px. A filled message line keeps 8 px below it, and anything that is not a field keeps 16 px of room around it, so a visible hint never touches the next label (measured in a TENSOR category drawer). `.uix-form-stack__title` opens a group of fields (h3 type, 16 px above and below). Products compose these classes instead of writing their own form spacing (the TENSOR operator's 2026-11-11 rule).
