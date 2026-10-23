---
"@tensor_1/react": patch
"@tensor_1/tokens": patch
---

**`DatePicker` and `DateRangePicker mode="field"`: an Escape pressed right after the calendar opened no longer reaches what is around the field** (HAR-2389). The field decided whether Escape was its own from React state that follows the popover's `toggle` event, which the browser queues: in the moment between the calendar opening and that event (seen under CI load), the Escape closed the calendar *and* reached the page, so a Drawer or Modal holding the field could treat it as its own. The field now asks the popover itself whether it is open.
