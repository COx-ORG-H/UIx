---
"@tensor_1/tokens": minor
"@tensor_1/react": minor
---

New `OrgChart`: reporting lines as a top-down chart of person cards (HAR-1807; TENSOR's People directory had only an indented list).

- **Cards:** photo or initials (`Avatar`), name, title, team, location, an optional `badge` ("You"), and the number of direct reports, which is also the control that shows or hides them.
- **Lazy reports:** `loadChildren(node)` runs the first time a person is opened, with a loading row and a retryable error row in place of the reports. A controlled `expanded` opens a whole reporting line; `revealId` scrolls to and focuses a person once their card exists (search), then calls `onReveal`.
- **Compact:** a row of people without reports of their own stacks in one column (`stackLeaves`, default true).
- **Frame:** zoom 25–150 %, Fit to width, reset, drag-to-pan; a wide chart starts centred on its top.
- **Narrow:** below 48rem of the chart's own width (container query) it becomes an indented vertical tree.
- **Keyboard:** a WAI-ARIA tree with one tab stop whose arrows follow the picture in the chart (↑ manager, ↓ reports, ← → along a level) and are the tree keys in the list; Enter opens a person, Space shows or hides their reports.
- **Words:** `labels` or `UixLabelsProvider` `orgChart`; English defaults in `DEFAULT_ORG_CHART_LABELS`.
- **Tokens:** a new `components/org-chart` module.
