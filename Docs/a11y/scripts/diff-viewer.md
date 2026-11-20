# Script — DiffViewer (`diff-viewer`)

Harness region: **DiffViewer** (h2). A region "Configuration differences" with a summary group
("1 conflicted, 2 changed, 0 added, 0 removed, 0 resolved, 3 pending"), a section per kind with an h3
("Conflicted 1", "Changed 2"), and for the conflict on `$.priority` three named value regions (Base
"P3", Current "P2", Incoming "P1") and a group "Resolve $.priority" of three toggle buttons ("Accept
incoming for $.priority", "Keep current for $.priority", "Mark pending for $.priority", the last
pressed). A polite line counts resolutions ("0 of 3 differences resolved.").

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | From the h2, browse down (Down arrow in browse mode; VO+Right). | Region "Configuration differences"; the summary with all six counts. | |
| 2 | Press 3 (next h3) twice. | "Conflicted 1", then "Changed 2", as headings level 3. | |
| 3 | From "Conflicted 1", browse into the entry. | The path `$.priority`, its state "pending", and each value with its version: Base "P3", Current "P2", Incoming "P1". | The value regions are named "Base value for $.priority" etc. Record whether readers announce them as regions (landmark noise) or just read the text. |
| 4 | Tab to the first resolution button. | Group "Resolve $.priority"; button "Accept incoming for $.priority", toggle, not pressed. | |
| 5 | Enter. | Pressed; then (polite) "1 of 3 differences resolved." | The progress line must not interrupt the button state. |
| 6 | Tab to "Mark pending for $.priority". | Not pressed (it was pressed before step 5). | |
| 7 | Browse to the "Changed" entries. | Each path (`$.assignee`, `$.tags`) and "pending". | |
| 8 | iOS VoiceOver / TalkBack: swipe through steps 1–5. | Same information; buttons reachable and their pressed state announced. | |

**Pass** when every "Must convey" item is heard for the pairing.
