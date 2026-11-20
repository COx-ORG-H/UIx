# Script — DataWorkspace (`data-workspace`)

Harness region: **DataWorkspace** (h2). A native table named "Incidents" (`role="table"`, not a
grid): 8 incidents, a select-all checkbox, sortable Title / Priority / Assignee header buttons, a
checkbox and an "Open INC-…" link per row, and row navigation (one row in the tab order, arrows move
it, Enter activates). A "Bulk actions" toolbar appears above the table once a row is selected.

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | From the h2 "DataWorkspace", press T (NVDA / JAWS next table; VO: VO+Cmd+T; iOS: tables rotor). | Table, its name "Incidents", 9 rows and 5 columns (or the reader's equivalent). | Some readers count the header row; record the numbers heard. |
| 2 | Ctrl+Alt+Down (NVDA / JAWS table navigation; VO: VO+Down in the table) into the first body row, then Ctrl+Alt+Right across it. | Each cell with its column header: "ID", "Title", "Priority", "Assignee"; the first column's checkbox named "Select INC-1001", not checked. | The select column's header is the select-all checkbox; a reader may read it as the header name. |
| 3 | Tab to the "Priority" header button (focus mode turns on in NVDA / JAWS), press Enter. | Button "Priority"; after Enter, that the column is now sorted ascending (from `aria-sort` on the header cell). | Readers differ on announcing an `aria-sort` change while focus stays on the button. If nothing is said, move off and back to the header (Ctrl+Alt+Left / Right) and record whether "sorted ascending" is heard there. |
| 4 | Enter again. | Sorted descending. | As step 3. |
| 5 | Shift+Tab back to the table body, or Tab until the first row has focus. | A row receives focus: its content (INC-…, title, priority, assignee) is read. | The row's name concatenates its cells, including "Select INC-…" and "Open INC-…": record whether the reading is usable or too long. |
| 6 | Down arrow, then End, then Home. | Focus moves row by row; the newly focused row's content each time. | In NVDA / JAWS browse mode, arrows move the virtual cursor instead. Note which mode the reader was in and whether the row model still worked. |
| 7 | Enter on a row. | The row's primary action ran (the harness records it; the page does not change). | Nothing should be announced beyond the row; a surprise page change is a fail. |
| 8 | Tab once from a focused row, then Space. | Checkbox "Select INC-…", then "checked". | Space on the row itself does nothing (it only stops the page scrolling); selection is the checkbox. |
| 9 | Right after step 8, listen; then navigate to the "Bulk actions" toolbar above the table (Shift+Tab, or browse mode up). | The new count, "1 selected", spoken when the row is selected; then toolbar "Bulk actions", "1 selected", button "Assign to me". | **Known issue**: the count is plain text, not a live region, so it is likely not spoken on selection. If it is not, item 7 fails. |
| 10 | Tab to "Select all rows on this page", Space. | Checkbox named "Select all rows on this page", state checked (it was "mixed"/"half checked" before), and the new count "8 selected". | Same known issue as step 9. |
| 11 | Turn on OS reduce motion, reload, repeat step 3. | Rows reorder without animation; nothing is lost. | |

**Pass** when steps 1–10 convey everything in "Must convey" for the pairing. While the selection
count is not announced (steps 9 and 10), record checklist item 7 as `fail` for every pairing that
does not speak it, and so the pairing as `fail`: the known issue explains the failure, it does not
excuse it. DataWorkspace is touch-relevant (protocol §1), so VoiceOver iOS and TalkBack are required
for Stable: run steps 1, 3, 8 and 9 with swipes and double taps.
