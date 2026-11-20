# Shortcut registry and the `?` sheet

Status: implemented (unreleased). Source: the enterprise UX study, roadmap row #1 and "First five" item 1
(`Docs/research/reports/UIx enterprise UX study.md`, notes `keyboard_speed.md`). It unblocks rows #9, #10,
#12 (selection keys), #23 (Mod+Z for undo) and #30 (a visible pending-sequence hint).

## Why

UIx shipped the leaves (`Kbd`, `KbdCombo`, `ShortcutHint`, `aria-keyshortcuts`, per-component keys) but not
the tree that coordinates them. `AppShell` had its own "ignore while typing" guard, `DataWorkspace` its own
Ctrl/⌘+/ listener, and products bound their own j/k. Nothing detected conflicts, nothing listed the keys,
and nothing let a person turn single-character shortcuts off, which WCAG 2.1.4 (Level A) requires for any
shortcut made only of printable characters (`A`, `?`, `G then I`). ADR-0038 forbids TENSOR, MOTUS, MEDx,
POSx and SHOPx from hand-rolling it, so it lives here.

## The contract

- **One registry per document.** `ShortcutProvider` makes it and listens for `keydown` on the document
  (bubble phase, so a component's own key handling that calls `preventDefault` wins). Without a provider,
  `useShortcut` uses the document's default registry with the default storage key. A provider inside
  another one uses the outer registry.
- **A shortcut** is `useShortcut({ id, keys, label, handler, group?, enabled?, allowInInputs?,
  allowInModal?, repeat?, hidden?, when?, scope? })`. The `id` is the command's stable name: remaps, hints
  and palette items find it by id. The same id registered twice (two mounted instances) is one command.
- **Keys** are a string (`'Mod+K'`, `'Shift+?'`, `'G I'`, `'Plus'`) or `KbdCombo` key names (a chord
  `['Mod', 'K']`, a sequence `[['G'], ['I']]`), normalised to `Mod, Ctrl, Alt, Shift, key`.
- **Matching.** `Mod` is ⌘ on Apple, Ctrl elsewhere. A letter or digit needs exactly its modifiers; when the
  typed key is not a Latin letter (a Serbian Cyrillic or Greek layout, Option+letter on a Mac) the physical
  key (`KeyG`) decides. A punctuation mark is decided by the character: Shift is never compared, and Ctrl+Alt
  (AltGr) or Option may have typed it; ⌘ or a Ctrl without Alt must match.
- **Suppression.** Nothing fires while typing (text inputs, textarea, select, contenteditable, textbox,
  combobox, searchbox, spinbutton roles) unless `allowInInputs`; while an IME composes (`isComposing`,
  keyCode 229); on key repeat unless `repeat`; when the event was already handled (`defaultPrevented`);
  under a modal dialog unless the shortcut's scope is inside it or `allowInModal`; and a character-key
  shortcut does not fire while a menu, menubar, listbox or tree outside its scope has focus (type-ahead).
- **Scopes.** Global by default. `ShortcutScope label` (or `scope: ref`) makes its shortcuts active only
  while focus is inside the element: WCAG 2.1.4's "active only on focus". The innermost scope wins over
  outer scopes and globals with the same keys; a later registration wins within one scope. A handler that
  returns `false` passes the key to the next candidate.
- **Sequences** wait `sequenceTimeout` (default 1500 ms; no source names a value, GitHub's is 1.5 s) for the
  next chord. A modifier key going down does not break a sequence; any other key ends it and counts on
  its own. `useShortcuts().pending` exposes the typed prefix for a visible hint.
- **Conflicts.** Two different ids in the same scope whose keys are equal, or one a prefix of the other, on
  the current platform. Reported once each, after the commit that registered them, through `onConflict`
  (default: `console.warn` in development). `findShortcutConflicts(entries)` checks a static map on both
  platforms, for a product's unit test.
- **Preferences** (`ShortcutPreferenceValues`): `characterKeys: 'on' | 'off'` (default `on`; shortcuts on by
  default, unlike Zendesk and ServiceNow) and `overrides: { [id]: 'Alt+A' | null }`. Stored exactly like the
  display preferences: `localStorage['uix-shortcut-preferences']`, parsed defensively, kept in step with
  other tabs (`storage`) and this tab (`uixshortcutpreferencechange`). `storageKey={null}` keeps them in
  memory; `preferences` + `onPreferencesChange` let a product keep them per user on the server.
  `characterKeys: 'off'` turns off every shortcut whose every chord is a printable character with at most
  Shift, in every scope; a remap that adds a modifier brings it back (G217).

## One source of truth

The registry is the only place keys are bound, and every display reads it by `shortcutId`: `KbdCombo`,
`Button`/`ButtonLink` (through `ShortcutHint`), `Tooltip` (also from a Button child), `MenuItem` and its
checkbox and radio rows, and `CommandPalette` items. They show the command's current keys and render nothing
while it is off, so a hint can never advertise a key that does not work. Menu rows and palette options get
`aria-keyshortcuts` from the registry (none for a sequence, which the attribute cannot express; the spoken
text says "G, then I"). Buttons keep the HAR-2416 rule: the keys are the description, said once.

A palette item with `shortcutId` and no `onSelect` or `href` runs the command (`useShortcuts().run(id)`)
after the palette closes and gives focus back: every single-key verb has a modifier path through Mod+K,
even with the switch off.

## The kit's own keys

| Where | Id | Default | Notes |
| --- | --- | --- | --- |
| `ShortcutSheet` | `uix.shortcut-sheet` | `?` | character key: the switch turns it off; the palette and a Button reach it too |
| `CommandPalette` `shortcut` | `uix.command-palette` | none (opt-in, e.g. `'Mod+K'`) | in fields too; over its own dialog, so the same keys close it |
| `AppShell` `navHotkey` | `uix.app-shell.nav` | the prop (e.g. `[`) | same guard as before (AltGr / Option type it); now also off with the switch |
| `DataWorkspace` search | `uix.data-workspace.search` | `Mod+/` | inside the workspace or from an unfocused page to the first one, as before; Ctrl+/ on a Mac no longer counts |

Not migrated, on purpose: widget keys (arrow keys, Home/End, Enter, Space, Escape, type-ahead) in lists,
menus, grids and editors. They are the widgets' own ARIA keyboard models, not shortcuts, and the 2.1.4
exception covers them.

## The sheet

`ShortcutSheet` is a `Modal` (`instant`: keyboard-opened, used many times a day) titled "Keyboard shortcuts".
It lists what would fire with focus where it was when the sheet opened: "Everywhere" first, then each
`ShortcutScope` that contains that focus, outermost to innermost, each split by `group`. A heading per scope
(`h3`, the section is labelled by it), a `dl` per group (term: what it does; definition: its `KbdCombo`).
Disabled, hidden, switched-off and remapped-to-nothing shortcuts are left out. It ends with the character-key
`Switch` and a description of what it does. Escape closes it and focus goes back.

## Tests

- `packages/react/src/shortcut-registry-dom.test.mjs`: parsing, matching per platform and layout, the 2.1.4
  rule, typing targets, conflicts, preferences; the provider, scopes, modals, sequences with mock timers, the
  switch and remaps, storage, controlled preferences, the default registry, the displays (Button, KbdCombo,
  MenuItem, CommandPalette), the sheet, and the kit's migrated keys.
- `tests/a11y/shortcut-registry.spec.mjs` on the docs' live demo: the sheet as a real modal dialog with focus
  return, scope-only verbs, the sequence, the switch and the palette path, a remap in every hint, macOS, axe
  in both themes.

## Follow-ups

- A built-in pending-sequence hint (row #30); the hook exists.
- Row selection keys for DataWorkspace (X, Shift+X, Mod+A, Esc; row #12) on the registry.
- Undo on Mod+Z through the registry (row #23).
- A versioned shortcut map with a changelog, so a UI migration cannot drop keys quietly.
- A remapping UI (the API exists; TENSOR decides where it lives).
