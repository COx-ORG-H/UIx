# Script — CommandPalette (`command-palette`)

Harness region: **CommandPalette** (h2). A button "Open command palette" opens the palette in a modal
`<dialog>`; below it the same palette sits in place ("Commands in place"). The palette is an
always-expanded combobox over a listbox: groups "Actions" and "Pages", the active option set through
`aria-activedescendant`, shortcuts in the option name and `aria-keyshortcuts`, a disabled "Archive
(read-only)", and a polite result count in a status region.

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | Tab to "Open command palette", Enter. | Dialog; the field "Commands", combo box (edit), expanded; the active option "Create incident" (and its shortcut Control+I). | NVDA / JAWS should switch to focus mode on their own. VoiceOver macOS may read the dialog name first. |
| 2 | Type `rep`. | The active option changes to "Reports, Monthly reports and exports"; the count "1 result" (polite, after typing stops). | The count is debounced: it may come a moment after the option. Record whether both are heard and in which order. |
| 3 | Delete the text, press Down twice. | Each newly active option: "Assign to me, A", then "Escalate to on-call lead"; the group "Actions" when the reader reports groups. | JAWS and NVDA read `aria-activedescendant` changes; VoiceOver macOS support has varied. If an option is not spoken, record it. |
| 4 | Press End. | The last enabled option, "Reports". The disabled "Archive (read-only)" is skipped. | If the reader reaches Archive by browsing, it must be announced as unavailable / dimmed. |
| 5 | Press Escape. | The dialog closes; focus is back on "Open command palette" and the button is read. | |
| 6 | Reopen, type `assign`, Enter. | The dialog closes, focus returns to the button. | The command runs silently in the harness; a product would announce its outcome. |
| 7 | Move to "Commands in place" (in-page palette) with Tab. | Combo box "Commands in place", expanded, and its listbox reachable with arrows as in steps 2–4. | |
| 8 | iOS VoiceOver / TalkBack: open the palette with a double tap, type with the on-screen keyboard, swipe right through the options, double tap one. | Each option's name, its disabled state where it applies, and the result count after typing. | Swipe order must follow the visual order of groups and options. |

**Pass** when every "Must convey" item is heard for the pairing and Escape always returns focus to
the opener.
