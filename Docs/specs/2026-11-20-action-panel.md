# The per-row action panel

Status: implemented (unreleased). Source: the enterprise UX study, roadmap row #10
(`Docs/research/reports/UIx enterprise UX study.md`, notes `keyboard_speed.md`). Builds on the shortcut
registry (`Docs/specs/2026-11-20-shortcut-registry.md`, #303).

## Why

A TENSOR agent works a ticket queue all day from the keyboard. `RowActions` gave each row hover
verbs and DataWorkspace gave rows a keyboard model (`rowNavigation`, `activeRowId`, `onRowActivate`),
but nothing listed a row's actions with their keys, and Ctrl/⌘+K could mean only one thing on a page.
Raycast's action panel answers the first: Enter runs the primary action on the focused item, Cmd/Ctrl+K
lists every action with its shortcut, searchable. Superhuman's conflict rule answers the second: the
first press keeps the local meaning, a second press escalates to the global palette.

## The contract

- **Actions** are data (`ActionPanelAction`): `id` (the command id: keys, remaps and palette items find
  it by this), `label`, `group`, `keywords`, `description`, `icon`, `keys`, `onSelect`, `disabled`,
  `primary`, `destructive`, `undoable`, `confirm`.
- **Order** (`groupActionPanelActions`): with no query, the primary action first, then the others in
  their groups (each where its first action is), then the destructive ones in a trailing group of
  their own. With a query, one list ranked like the palette (`filterCommandItems`: case and diacritics
  folded, label prefix first), the destructive matches still last, so a loose query and Enter never
  reach Delete first.
- **Enter** on the item (not on a control in it) runs the enabled `primary` action. In DataWorkspace,
  `onRowActivate` stays the primary when set; then no action shows ↵.
- **Ctrl/⌘+K, first press local.** The item's Mod+K is `uix.action-panel`, registered in the item's
  scope (DataWorkspace: the table wrap; `ActionPanelScope`: the item). The registry ranks the innermost
  scope first, so on an item with actions it opens the panel and takes the key. Off an item (a header,
  the toolbar), in a text field, or on an item with no enabled action, the handler returns `false` and
  the key goes on to the global palette's registration: the palette opens on the first press.
- **Second press global.** The open panel registers the same id in its own dialog's scope (hidden from
  the sheet). It closes the dialog, gives focus back to the item synchronously and returns `false`;
  the next candidate is the palette, which records the item as the place to give focus back to. No
  palette: the browser gets the key. A remap of `uix.action-panel` moves both presses.
- **The panel** is a modal native `<dialog>`, named "Actions for {name}", anchored with
  `useAnchoredPosition` (`bottom-end` of the row, or of the ⋯ button that opened it; capped to the
  viewport), with a transparent backdrop (it reads as a menu off its row; the page is inert). Inside:
  the palette's `.uix-cmdk` list (combobox field + listbox via `aria-activedescendant`, ↑/↓, Home/End
  on an empty query, Enter), the count announced politely, each option with the keys it has now
  (`keysFor(id, item)`: remaps and the switch apply) and `aria-keyshortcuts` for them; the primary shows
  ↵ without `aria-keyshortcuts` (Enter is the item's key, not the option's). It opens and closes
  instantly (`data-uix-instant`, the motion contract's keyboard rule).
- **Running an action** closes the dialog, gives focus back to the item (or to the control inside it
  that had focus, such as the ⋯ button), then calls `onSelect`: an action that opens its own dialog
  finds focus on the item and gives it back there. A row that left the list meanwhile hands focus to
  the row now in its place (DataWorkspace's existing fallback).
- **Destructive actions** confirm unless `undoable`: the panel shows a confirm step in place of the list
  (a `group` named by the question, described by the consequence; Cancel has focus, as in
  `ConfirmDialog`). From the list, Escape steps back to the list; from the action's own key on the item
  (which opens the panel straight on the step), Escape closes. `undoable` actions run at once and show
  their own `toast.undoable`.
- **Action keys** are registered by `id` in the item's scope: they work only with focus inside it (WCAG
  2.1.4 "active only on focus"), the `?` sheet lists them under the scope (DataWorkspace: its `label`)
  after "Show actions", the single-key switch turns character keys off and remaps apply. The panel is
  the modifier path to every action. DataWorkspace registers the tab-stop row's actions (asked for once
  per change of that row) and resolves a key against the row focus is in; other rows' actions are asked
  for only when their keys, Enter, panel or ⋯ button need them.
- **Pointer and touch:** a ⋯ `Button` per mounted row with an enabled action (`aria-haspopup="dialog"`,
  named like the panel, its hint reading `uix.action-panel`). `actionPanelTrigger={false}` leaves it out.
- **Any item** opts in with `ActionPanelScope` (a `ShortcutScope` with the panel, the keys and Enter).
- **Words:** `UixLabelsProvider` `actionPanel` (`ActionPanelLabels`).

## Tests

- `packages/react/src/action-panel-dom.test.mjs`: the model's order; DataWorkspace `getRowActions`: the
  panel's options and keys, first and second press, off-row presses, Enter and `onRowActivate`, keys in
  scope, the switch and a remap, the sheet's scope, the confirm step from a key and from the list,
  focus after a deleted row, undoable, the ⋯ button, filtering and the empty state, the words;
  `ActionPanelScope`.
- `tests/a11y/action-panel.spec.mjs` on the docs' live demo (`tests/action-panel/harness.tsx`): the real
  modal dialog anchored under the row, focus return, the palette hand-over, the sheet, Delete and
  Archive, the ⋯ button at 375 px, macOS, axe with the panel and the confirm step open in both themes.

## Follow-ups

- Sub-menus inside the panel (Raycast's "Change status → list"), sharing the palette's page stack
  once the palette-deltas work lands.
- Running an action's modifier keys while the panel is open (Raycast does).
- The same rule inside the rich-text editor if it binds Mod+K to insert a link.
