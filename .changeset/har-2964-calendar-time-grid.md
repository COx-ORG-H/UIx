---
"@tensor_1/react": minor
"@tensor_1/tokens": minor
---

SchedulingCalendar time grid (HAR-2964, from the TENSOR change-calendar UI council climb):

- **Opens at the work.** The Week/Day grid scrolls inside its own height (`--uix-scheduling-calendar-tg-height`, default `min(70vh, 46rem)`), with the day heads and strips kept on top. It opens at the earlier of 08:00 and the first item that starts on screen, or at the new `scrollToTime` prop, and again for another week or view, never after the user has scrolled.
- **Counts say what they count.** The day count has a label (`labels.dayCount`, "11 changes"). A day head's hidden count reads "+6 more" (`labels.moreEntries`) and adds what a narrow column could not draw to the consumer's count. It sits on a line of its own, under the count.
- **The windows strip's "+2 windows"** has a row of its own under the first day it hides, instead of sitting on top of the last drawn window.
- **Easier to read, especially in dark.** The day's signal has a line of its own. Today's date is a pill, and the gutter shows the time of the now line. Hour and day lines use the strong border. The high band is a tint behind a heavy edge in its hue instead of a solid red block. A finished item in the time grid keeps its full outline.
- **Sidebar:** a sidebar taller than its column fades out at its foot instead of cutting a row.
