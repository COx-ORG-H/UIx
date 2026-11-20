# Script — Combobox and EntityPicker (`combobox`)

Two harness regions. **Combobox** (h2): a required "Category" combobox with the hint "Type to
filter", groups Hardware (Laptop, Printer, disabled Monitor) and Software (Email, VPN), a no-match
message in a status region that is mounted from the start. It **opens on focus**. **EntityPicker**
(h2): "Assignee", an async search (300 ms; `zzz` finds nothing, `fail` rejects), results in a
listbox with a polite count, the chosen person shown as a button "Assignee: <name>. Change" with a
"Clear <name>" button. EntityPicker renders with `search-suggest.css`; it is recorded here because
the study paired it with Combobox.

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | Tab into "Category". | Name "Category", combo box, required, expanded (it opens on focus), the hint "Type to filter"; the active option "Laptop". | Readers differ in whether they read the active option on focus. |
| 2 | Down, Down. | "Printer", then "Email": the disabled "Monitor" is skipped. Group names "Hardware" / "Software" when the reader reports groups. | |
| 3 | Enter. | "Email" chosen; collapsed. The field reads "Email". | |
| 4 | Tab away, then Shift+Tab back into "Category". | Name, role, expanded, and that "Email" is the chosen value. | **Known issue to judge**: on return the edit text is cleared (the full list shows), and the chosen option is the active, selected one. Record whether the reader says "Email" / "selected" or reads the field as blank. A blank read with no "Email" is a fail of item 3. |
| 5 | Type `zz`. | "No matching category" (status). | The listbox is empty; nothing else should be read as an option. |
| 6 | Escape. | Collapsed; the text returns to the chosen value. | |
| 7 | EntityPicker: Tab into "Assignee", type `am`. | Combo box "Assignee"; after the search, the count ("1 result") and, on Down, the option "Amra Kovač, IT › Service desk". | **Known issue**: the count reads "1 results" (not plural-aware yet; plural labels are their own work package). Note whether "Searching…" is spoken too. |
| 8 | Down, Enter. | The choice is made; focus lands on the button "Assignee: Amra Kovač. Change". | |
| 9 | Tab to "Clear Amra Kovač", Enter. | Button name; after Enter, focus back in the empty "Assignee" field. | |
| 10 | Type `fail`. | The error message and a "Retry" (or "Try again") row reachable with Down. | |
| 11 | iOS VoiceOver / TalkBack: steps 1–3 and 7–8 with touch. | Same information as above. | The on-screen keyboard may cover the list; record whether options are reachable by swiping. |

**Pass** when every "Must convey" item is heard for the pairing. Step 4 decides whether the re-focus
behaviour is acceptable for that reader.
