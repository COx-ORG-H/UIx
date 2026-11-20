# Command palette: sources, pages, aliases, context boost and frecency

Status: implemented (unreleased). Source: the enterprise UX study, roadmap row #9
(`Docs/research/reports/UIx enterprise UX study.md`, notes `keyboard_speed.md` §1). Builds on the items
mode (HAR-1378) and the shortcut registry (#303), which keeps owning the open key
(`COMMAND_PALETTE_SHORTCUT_ID`).

## Why

The items mode already ranked with diacritics folded, kept recents and groups and showed each command's
keys. TENSOR needs the rest of what Superhuman, Raycast, Linear and cmdk do: tickets and people found on the
server as the person types, nested pages ("Assign to…" → people), aliases that say why a command matched,
commands that fit the current screen ranked first, and a ranking that learns from use. No ITSM competitor
documents a global palette, so this is a differentiator. ADR-0038: it lives here, not in a product.

## The contract

- **Sources.** `sources={[{ id, label, load(query, signal), minQueryLength?, debounce?, contextBoost? }]}`
  on the palette or on a page. Each source is debounced (200 ms), asks from `minQueryLength` characters
  (default 1), and is aborted when a keystroke, a page change or closing overtakes it; a late answer is
  dropped, and an `AbortError` is never a failure. Results form the source's own group, **after** the
  commands, in the server's order (the palette does not filter them again: cmdk's `shouldFilter={false}`
  for entities). A late answer therefore never moves rows already shown. Sources are ordered among
  themselves by `contextBoost`, then as given.
- **Loading without flicker.** Whether a source is loading is derived from the query during render, so the
  keystroke's own render is already busy (`aria-busy` on the field and the list). The last answer stays on
  screen while the next loads, marked stale: not choosable (Enter never picks a row of the previous query),
  dimmed only after the pending delay. A source with nothing to show yet gets a loading row only after
  300 ms (`DelayedRender`); "No results" never shows while anything is loading.
- **Errors.** A failed search becomes one option, "Search failed · Retry", in its group; choosing it (Enter
  or a click) searches again at once. The error replaces that source's earlier rows.
- **Count.** Announced politely once every source has answered: "3 results", then any failure
  ("People: Search failed"), and the page's name after the page changed.
- **Pages.** An item's `page: { id, label, items?, sources?, placeholder? }` opens a level instead of
  running. The field empties and takes the page's label as its name; a breadcrumb (`nav` "Breadcrumb", the
  kit's `Breadcrumbs`) shows the way, ancestors as buttons. Escape, or Backspace in an empty field, steps
  back with that level's query and active row restored; a held Backspace that was still deleting does not.
  The Escape keydown is cancelled so the dialog's close request never starts; a `cancel` that an engine
  sends anyway in the same task is refused. Escape on the top level closes as before; closing returns to
  the top level. Focus never leaves the field (a crumb press keeps it there, a keyboard click returns it).
- **Aliases.** `aliases` find the command like its label. When an alias matched better than the label, the
  row reads "Mark done (Archive)" (Superhuman). A whole alias ranks like a label prefix (Raycast);
  `keywords` still find without being shown.
- **Ranking.** `rankCommandItems(items, query, { fold, frecency })`: match quality (1 label prefix, 0.9 alias
  prefix, 0.8 word starts, 0.6 contains, 0.4 keywords) × `(1 + contextBoost)` × `(1 + 0.5 × frecency)`.
  Boost and frecency reorder, never hide. Plain items rank exactly as `filterCommandItems` did (a test
  compares both). A custom `filter` keeps its own order.
- **Frecency.** `useCommandFrecency({ storage?, storageKey?, halfLife?, max? })`: one decayed count per
  command (each use adds 1, the count halves every week), scored `v / (v + 3)`, at most 200 commands kept.
  `localStorage` by default (`uix-command-frecency`, kept in step with other tabs); a `storage` adapter
  (`read`, `write`, `subscribe?`) keeps it with the person on the server; `null` for none. Read after
  mount, never on the server. `recent(items)` gives the recent list, `reset(id?)` is Raycast's "Reset
  ranking". Pass the hook's result as `frecency`: the palette records every command chosen through it,
  not a source's results (the server ranks those).

## Locale folding

`rankCommandItems` takes the fold as a parameter (`CommandFold`: every spelling a text answers to), the
shape of `foldKeys` from the locale-search PR (#317). Until that lands the palette passes
`defaultCommandFold` (`foldForSearch`); after, one line passes `(text) => foldKeys(text, foldContext(locale))`.

## Not done here

- Virtualising long source results (each source shows at most `limit` rows).
- Learning from the query typed (Raycast's "previously used search terms").
- The AT evidence script for the new states (`Docs/a11y/scripts/command-palette.md`).
