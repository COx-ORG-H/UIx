---
"@tensor_1/tokens": patch
---

`Segmented`: in a narrow container the options move to a new row first and wrap their labels at spaces; a label breaks inside a word only when that one word is wider than the whole container (`overflow-wrap: break-word`, no longer `anywhere`). German view switchers no longer read "Mona / t" at 375 px (TENSOR HAR-1519; the class HAR-1601 fixed for the ViewMenu alone).

`SchedulingCalendar`: the calendar is one `minmax(0, 1fr)` column, so no child's minimum widens it past its container; in a full-width agenda row a marker label wraps instead of setting the row's width (one-line virtual rows keep their ellipsis). A German freeze marker no longer pushed TENSOR's agenda 260 px past a 375 px phone (HAR-1519).
