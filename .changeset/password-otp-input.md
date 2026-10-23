---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

**`PasswordInput`, `OtpInput` and `InputGroup trailingAction`** (HAR-1376). `PasswordInput` is an `Input type="password"` with a reveal toggle inside the field's end: a button with `aria-pressed` whose name stays "Show password" (`labels.show` or `UixLabelsProvider` `passwordInput`); a pointer press keeps the caret in the field, and a revealed password is hidden again when its form submits. `revealed` / `defaultRevealed` / `onRevealedChange`, `size` and every `Input` prop (`autoComplete`, `name`, Field wiring) pass through. `OtpInput` is one native input (`inputMode="numeric"`, `autoComplete="one-time-code"`, `pattern`, `maxLength`) drawn as `length` cells: paste-friendly ("123 456" and "123-456" keep the digits), `onComplete(code)` once per filled code, `mode="alphanumeric"`, `groupSize`, the error state from `Field`. `InputGroup` gains `trailingAction`, a real control inside the field's end (`.uix-input-group__action`); the cells are `.uix-otp`, `__input`, `__cell`, `__sep`.
