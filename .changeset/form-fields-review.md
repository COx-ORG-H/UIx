---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**Form fields, after review** (HAR-1376, HAR-1377, HAR-1835, HAR-1834, HAR-1588, HAR-1812, HAR-1575).

- **`PasswordInput`.** Toggling the reveal keeps the caret and selection where they were. Chrome used to move the caret to the start, so typing went on there. At `lg` the toggle is a 44 px target; it still looks 36 px.
- **`TagInput`.**
  - Adding goes as far as it can. A paste or a typed list adds every piece up to the first refusal (a duplicate, `maxTags` or `validate`). It fills `maxTags` up to the cap, and the refused piece and the rest stay in the field with the reason.
  - The chips are a named list (`role="list"`, labels `list`, `count`), and the field's description says how many there are.
- **`OtpInput`.**
  - A paste is inserted at the caret, up to `length`, and replaces the code only when the whole code is selected. A paste with nothing usable in it changes nothing.
  - Full-width digits count.
  - There is no `maxLength` any more, so autofill no longer cuts "ABCD-EFGH" before cleaning.
  - The digits run left to right in an RTL page, and a cell can shrink to 20 px, so 8 cells fit a phone card.
- **`TimePicker`.**
  - Enter and the arrows during an IME composition are left to the composition, and "１４：３０" is read.
  - A `min` after `max` (22:00 to 06:00) is an overnight range: the list, the keys and the check wrap midnight, and the new `outside` label applies.
  - With no locale from a prop or the provider, the server and the first client render write a neutral 24-hour time. The viewer's clock follows once mounted.
  - New exports: `isOvernightRange` and `timePartEnds`.
- **`DateTimePicker`.** It takes `hour12`, and the `Field`'s hint and error describe the time too.
- **`EntityPicker` / `SearchSuggest`.** Disabling the picker during a search ends its busy state, and a disabled field shows no spinner.
- **`Combobox`.** "No match" is announced: its status region is mounted empty and then filled.
- **`Select size="lg"`.** It keeps 44 px of end padding for its chevron (it was 64 px).
- **`FilterPopover`, for consumers' end-to-end tests.** With `type="select" | "enum" | "boolean"` the control is now a `<button role="combobox">` that opens the kit's list. A hidden native select only carries the form value. Playwright `selectOption()` on the old native select no longer works: click the trigger, then the option (`getByRole('option', { name })`).
- **The native-select gate.** It now skips comments, scans `.ts` as well as `.tsx`, and also catches `createElement('select')`, `h('select')` and `jsx('select')`.
