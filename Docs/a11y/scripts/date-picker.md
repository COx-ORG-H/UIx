# Script — DatePicker (`date-picker`)

Harness region: **DatePicker** (h2). A text field "Due date" (value 20/11/2026, hint "Weekdays
only") and a button "Change date, Friday, 20 November 2026" that opens a calendar popover named
"Calendar" (`role="dialog"`, non-modal). The month is a group of day buttons: the chosen day is
`aria-pressed`, today (18 November) is `aria-current="date"`, weekends and days outside 1 Nov 2026 –
31 Jan 2027 are `aria-disabled`. The month name is a polite live region. Arrows move by day and week,
PageUp / PageDown by month, Home / End to the week's ends. Typed text is read on Enter or blur; text
that is not a date shows an alert.

| # | Do | Must convey | Watch for |
|---|----|-------------|-----------|
| 1 | Tab into "Due date". | Edit "Due date", its value 20/11/2026, the hint "Weekdays only". | |
| 2 | Tab to the calendar button. | Button "Change date, Friday, 20 November 2026", collapsed (it has a dialog popup). | |
| 3 | Enter. | Dialog "Calendar"; focus on "Friday, 20 November 2026", pressed (chosen). | **Known issue**: NVDA stays in browse mode here (the days are buttons in a group, not a grid), so the arrows in steps 4–7 move NVDA's cursor, not the day. Try them first as they are and record what happens (that is the result for item 5); then press NVDA+Space (JAWS: Enter / Insert+Z as needed) and repeat, and record that too. |
| 4 | Left. | "Thursday, 19 November 2026". | |
| 5 | Left again (to 18 November). | "Wednesday, 18 November 2026" and that it is today ("current date"). | Support for `aria-current="date"` varies: record what is heard. |
| 6 | Right three times (to 21 November). | "Saturday, 21 November 2026", unavailable / dimmed. | Unavailable days still take focus; they must say they cannot be chosen. |
| 7 | PageDown. | The month change, "December 2026" (live region), and the focused day. | Some readers speak the month and the day; some only one. |
| 8 | Escape. | The calendar closes; focus is back on the calendar button, read with the unchanged date. | |
| 9 | In "Due date", press Down. | The calendar opens on the chosen day, as in step 3. | |
| 10 | Left, Enter. | The calendar closes; focus back in "Due date"; the new value 19/11/2026 is read. | |
| 11 | Replace the text with `31/02/2026`, press Enter. | Invalid entry, and the alert saying what is wrong and the expected format. | The alert is `role="alert"`: it should interrupt. Record whether it is spoken twice (once as alert, once as the field's description). |
| 12 | iOS VoiceOver / TalkBack (required: DatePicker is touch-relevant, protocol §1): open the calendar with a double tap, swipe through days, double tap one. | Each day's full date, unavailable days marked, the chosen day pressed / selected. | |

**Pass** when every "Must convey" item is heard and focus always returns to where the calendar was
opened from.
