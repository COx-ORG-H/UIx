# Keyboard-first speed and responsiveness patterns (for UIx / TENSOR), as of 2026-11-20

Scope: transferable patterns from best-in-class desktop productivity apps (Linear, Superhuman, Raycast, GitHub, Vercel, cmdk, VS Code) for a React + CSS design system whose main consumer is TENSOR, a keyboard-first ITSM/service desk where agents triage, assign, comment on and resolve tickets all day.

Method note: 16 searches and fetches against primary sources: Superhuman blog, W3C Understanding doc, web.dev, the cmdk README, GitHub Docs, Linear enablement guide, the Raycast manual, Vercel Web Interface Guidelines, and Rauno Freiberg's essay. Some product details below come from prior knowledge and could not be re-verified this session. They are listed only under **Gaps**, tagged [unverified].

---

## 1. Command palettes: ranking, recency, scoped commands, nested pages, shortcuts in results, opening speed

### Takeaway
The best palettes come from one global, non-typing shortcut (Cmd/Ctrl+K). They rank with fuzzy match plus aliases plus product-tuned weights, not fuzzy score alone, and then layer frecency on top. They boost commands that fit the current context instead of hiding most of them. Each result shows its own shortcut, so the palette works as a shortcut-teaching surface. Nested pages are a stack popped by Esc, or by Backspace on an empty query.

### Cited Findings
**Opening and dismissal (Superhuman)**
- Pick an opening shortcut that is "simple, memorable" and does not clash with typing or common shortcuts. Examples are Cmd+K (Superhuman, Linear, Slack) and Cmd+Shift+P (Sublime, VS Code). — [Superhuman: How to build a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Bind it at the top level so it works on every screen, rendered in its own layer above the app. Pressing the shortcut again dismisses it and restores focus to the previously focused element. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Conflict rule: if the shortcut already means something in context (Cmd+K means "insert link" in an editor), the first press keeps the local action and a second press opens the palette. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- The palette can be skipped in rarely used contexts with few applicable actions (for example settings dialogs) when Esc is enough. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)

**Ranking (Superhuman)**
- Case-insensitive fuzzy matching tolerates typos ("opn" matches "Open"), filtered by a tunable score threshold (their example is 0.0015). — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Each command is matched against its title and all its aliases, and the highest score wins. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Per-command tuning:
  - A default score sets the order before the user types. A default of 0 hides the command until the user types.
  - A "scale" multiplier boosts or dampens a command.
  - A "follow" list forces command A to always rank below command B, whatever the query. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Fuzzy matching alone is not enough. Use usage data and product judgment to decide what ranks first. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Synonyms are shown as "Command title (matching alias)", for example "Mark Done (Archive)". This reinforces the canonical wording and explains why a result matched. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)

**Recency and frecency (Raycast, Superhuman)**
- Raycast Root Search ranks exact alias matches first, then alias prefix matches, then title fuzzy score. Frecency (frequency plus recency) sits lower in the ordering. The manual's two copies of the page disagree on exactly where frecency falls. — [Raycast manual: Search Bar](https://manual.raycast.com/search-bar)
- A 2026 Raycast changelog entry says ranking automatically accounts for how often each element is opened and for previously used search terms. — [Raycast changelog v2.9, Oct 22 2026](https://www.raycast.com/changelog/macos) (summarised by the search tool, not fetched directly)
- Raycast offers a per-command "Reset Ranking" action that clears learned frecency and search terms. This is a user escape hatch for bad learned ranking. — [Raycast manual: Command Aliases & Hotkeys](https://manual.raycast.com/command-aliases-and-hotkeys)
- Raycast aliases are short, strict keywords. Typing the full alias pins the command to the top. — [Raycast manual](https://manual.raycast.com/command-aliases-and-hotkeys)
- Superhuman tracks the last-used item in some lists (for example labels). It names adapting order to usage over time as an area to explore, not a shipped rule. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)

**Scoped commands and context (Superhuman, Raycast)**
- Keep most commands available everywhere and hide only commands that are fully irrelevant. Context is expressed by boosting or reducing scores: Send and Attach when a draft is focused, "Add Zoom Link" on a new calendar event, different weights for a list view versus a single conversation. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Raycast's Action Panel (Cmd/Ctrl+K on a selected item) lists every action for that item:
  - Enter runs the first (primary) action without opening the panel.
  - Each action shows its shortcut on the right.
  - Typing fuzzy-filters actions into one flat list across sections.
  - Some actions open sub-menus or custom views.
  - Esc closes the panel, or steps back from a sub-menu. — [Raycast manual: Action Panel](https://manual.raycast.com/action-panel.md)

**Nested pages and implementation (cmdk by Paco Coursey)**
- cmdk is headless and composable: `Command`, `Command.Dialog` (Radix Dialog), `Input`, `List`, `Item`, `Group`, `Separator`, `Empty`, `Loading`, and a `useCommandState` hook built on `useSyncExternalStore`. — [cmdk README](https://github.com/pacocoursey/cmdk)
- `Item.keywords` act as aliases for filtering and ranking. A custom `filter(value, search, keywords)` returns a rank. `shouldFilter={false}` hands filtering and sorting to the app. `loop` wraps arrow navigation. Items become active on pointer enter. Styling hooks are `data-selected` and `data-disabled`. — [cmdk README](https://github.com/pacocoursey/cmdk)
- Nested pages are a documented pattern, not built in: a page stack where Escape, or Backspace with an empty search, pops a level. — [cmdk README](https://github.com/pacocoursey/cmdk)
- Filtered-out groups get the `hidden` attribute instead of unmounting. — [cmdk README](https://github.com/pacocoursey/cmdk)
- `List` exposes a `--cmdk-list-height` CSS variable for animating height. — [cmdk README](https://github.com/pacocoursey/cmdk)
- cmdk has no virtualization and states "Good performance up to 2,000-3,000 items". Beyond that, use `shouldFilter={false}` with your own virtualization. — [cmdk README](https://github.com/pacocoursey/cmdk)
- cmdk does not ship a default keybinding. The app wires Cmd/Ctrl+K itself. — [cmdk README](https://github.com/pacocoursey/cmdk)
- Accessibility: cmdk "can also be used as an accessible combobox". Labelling, ARIA attributes and DOM order were tested with VoiceOver. — [cmdk README](https://github.com/pacocoursey/cmdk)

**Shortcuts in results and teaching**
- Superhuman: the palette is where users "learn the shortcut for next time". Each command gets a distinct icon. — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Raycast: each action shows its shortcut on the right "so you can learn to trigger actions directly". — [Raycast manual: Action Panel](https://manual.raycast.com/action-panel.md)

**Visual and opening speed**
- Superhuman's design guidance:
  - Center the palette and let it cover much of the app.
  - Use a monospaced font.
  - Show about five commands, with the last one cut off to signal there are more.
  - The palette should be "blazingly fast". — [Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Rauno Freiberg on animation: a command menu invites a fade, but at hundreds of uses a day the animation "does start to feel more like cognitive burden". The macOS App Switcher never animates. If Cmd and Tab are pressed fast enough, focus switches without showing the UI at all. — [Rauno Freiberg: Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design)

### Inferences
- UIx `CommandPalette` should be built on a cmdk-style headless core, or wrap cmdk. It should support:
  - per-command `keywords`/aliases, a `defaultScore`, a `scale` multiplier, an optional rank-after constraint, and a `contextBoost(context)` hook
  - pluggable frecency, stored per user by the consumer and not by UIx
  - a `shortcut` field rendered as `<Kbd>` on the right of each result
  - a page stack (Esc or empty-Backspace pops a level) and a "(matched alias)" suffix
- Opening speed: the palette should appear on the keydown frame with no entry animation, or at most an opacity-only fade under about 100 ms. That fits the existing UIx motion contract's reduced-motion stance. The toggle shortcut should restore prior focus on close.
- A per-row "Actions" (Cmd/Ctrl+K on the focused ticket) is distinct from the global palette. Raycast's model (Enter runs the primary action, Cmd/Ctrl+K lists all actions with their keys) maps directly to a TENSOR ticket row.
- For TENSOR scale (thousands of tickets, users, CIs), entity search must be async with `shouldFilter={false}` and virtualization. Static commands can use built-in filtering.

### Gaps
- No primary source found for Linear's palette ranking or recency. [unverified] Linear's Cmd+K is context-aware (it shows actions for selected issues first) and supports nested sub-menus, for example Change status, then a status list.
- [unverified] VS Code's Command Palette (Ctrl/Cmd+Shift+P) shows each command's keybinding inline and a "recently used" section at the top. Ctrl/Cmd+P (Quick Open) uses prefixes: `>` for commands, `@` for symbols, `:` for line. Not re-fetched.
- [unverified] GitHub's command palette opens with Ctrl/Cmd+K (Ctrl+Alt+K in text fields), is scoped to the current repo or org, and uses prefix modes (`#` issues/PRs, `!` projects, `@` users/orgs, `/` files, `>` commands). The GitHub shortcuts page fetched did not list the palette key.
- Arc/Dia palette behaviour: no sources fetched.
- No product publishes a palette open-time target in ms. Only the general 100 ms / 50 ms targets (Q4) apply.

---

## 2. Shortcut systems: discoverability, sequences, conflicts, teaching, customisation

### Takeaway
The converging pattern has several parts:
- Single-letter verbs on the focused object (A assign, L label, S status).
- G-prefixed two-key sequences for navigation.
- `?` for a context-sensitive cheat sheet and Cmd/Ctrl+K for the palette.
- Shortcuts surfaced in palette results and tooltips.

GitHub also lets users turn off character-key shortcuts, which is the WCAG 2.1.4 compliance mechanism (see Q6).

### Cited Findings
**Discoverability**
- GitHub: `?` on most pages opens a dialog listing that page's shortcuts. — [GitHub Docs: Keyboard shortcuts](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- Linear: `?` shows the full shortcut list. Linear's enablement guide says this; another Linear guide says Cmd+/, so the sources conflict. The help window launched in March 2021. — [Linear: Navigating Linear](https://linear.app/enablement/guide/navigating-linear); [Linear changelog 2021-03-25](https://linear.app/changelog/2021-03-25-keyboard-shortcuts-help)
- Superhuman: the UI shows keyboard shortcut hints, and the Cmd+K command library finds actions without menus. — [Superhuman: built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/)

**Sequence (chorded) shortcuts**
- GitHub: G C (Code), G I (Issues), G P (Pull requests), G A (Actions), G W (Wiki), G G (Discussions), G S (Security), G N (Notifications, site-wide). — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- Linear: G then I opens Inbox and G then M opens My Issues. `/` searches issues, projects and documents, including by identifier such as `LIN-123`. Cmd/Ctrl+K opens the command menu. — [Linear: Navigating Linear](https://linear.app/enablement/guide/navigating-linear)

**Single-key verbs on the focused object (GitHub)**
- In issue/PR lists, `A` filters by or edits assignee, `L` labels, `M` milestone, `U` author. On an individual issue/PR, `A` sets the assignee, `L` applies a label, `M` sets a milestone, and `Q` requests a reviewer. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- In lists, `O` or `Enter` opens and `C` creates. Ctrl/Cmd+/ focuses search. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- In notifications `E` marks done. In Projects `E` archives the selected items. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- Lower-frequency, structural actions use Alt/Option+Shift chords: Alt+Shift+C creates a sub-issue, Alt+Shift+P edits the parent. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)

**Conflicts with browser/OS**
- Superhuman's "first press keeps the local meaning, second press escalates" rule resolves Cmd+K versus editor link insertion. — [Superhuman palette post](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Vercel: "Locale-aware keyboard shortcuts". Support non-QWERTY layouts and show platform-specific symbols (⌘ vs Ctrl). — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

**Teaching shortcuts and coaching**
- Superhuman's onboarding is a single one-to-one coaching session. Staff set up the inbox, show faster workflows and teach keyboard shortcuts. — [Superhuman blog: single coaching session](https://blog.superhuman.com/the-fastest-way-to-inbox-zero-a-single-coaching-session/) (per search snippet. A third-party source says 30 minutes, but this was not confirmed on Superhuman's own page.)
- Superhuman argues shortcuts beat the mouse "in almost all cases". — [Superhuman: built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/); [Superhuman: Keyboard vs. mouse](https://blog.superhuman.com/keyboard-vs-mouse/)

**Customisation**
- Raycast: users assign global hotkeys and aliases per command. — [Raycast manual](https://manual.raycast.com/command-aliases-and-hotkeys)
- GitHub: users can disable character-key shortcuts and keep modifier shortcuts. GitHub's docs do not describe remapping. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)

### Inferences
- UIx needs a central shortcut registry (`ShortcutProvider` / `useShortcut`) that:
  - knows scope (global, view, focused component) and type (single-key, sequence, modifier)
  - suppresses single keys while focus is in editable fields, contenteditable, or open menus and listboxes
  - generates the `?` cheat sheet and palette `<Kbd>` hints from the same source, so the three never drift
  - exposes an off switch for character keys and a remap API (Q6)
- Sequence shortcuts need a short timeout window and a visible "G…" pending indicator. No source gave a specific timeout (see Gaps).
- For TENSOR, a GitHub-like mapping fits well: A assign, L label/category, S status, P priority, C comment/create, E resolve/done, G-prefix for queues.

### Gaps
- [unverified] Superhuman shows a toast teaching the shortcut when an action is done with the mouse (for example "Next time, press E"). The fetched speed article does not mention this, and the Superhuman help article returned 403.
- [unverified] Linear tooltips show the shortcut next to the button label on hover, and its menus list shortcuts right-aligned.
- Sequence timeout values (for example about 1–1.5 s for G then X) are not documented in any fetched source.
- Linear's customisation of shortcuts was not found. [unverified] Linear does not allow general remapping.
- Arc/Dia, Vercel dashboard: not researched (budget).

---

## 3. Focus management after actions and list navigation

### Takeaway
"Focus stays where your hands are". The palette restores the previous focus on close. Focus should never be hidden by sticky chrome. Focus moves predictably after destructive or completing actions. Concrete J/K, X and auto-advance behaviours exist in Gmail, Superhuman and Linear, but their primary docs could not be fetched this session (see Gaps).

### Cited Findings
- Close of the palette (toggle or Esc) restores the previously focused element. — [Superhuman palette post](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- Vercel guidelines:
  - "Keyboard works everywhere", following the WAI-ARIA Authoring Practices patterns.
  - Use a visible `:focus-visible` ring and `:focus-within` for groups.
  - Sticky headers, footers and overlays must never obscure the focused element.
  - "Manage focus": trap, move and return focus per WAI-ARIA.
  - "Autofocus for speed" on desktop when a screen has one primary input.
  - On submit, focus the first error. — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)
- Vercel guidelines: "URL as state". Deep-link filters, tabs, pagination and expanded panels, and restore scroll position on Back/Forward. — [Vercel](https://vercel.com/design/guidelines)
- GitHub Projects: arrow keys move focus and Shift+Space selects an item. In issue lists, `O`/Enter opens. GitHub does not document J/K for issue lists, only for the network graph. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- WCAG 2.1.4's motivating example is a keyboard user who presses `S` by accident, focus jumps to search, and they lose their place. Unexpected focus moves are an accessibility harm. — [W3C Understanding 2.1.4](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)

### Inferences
- UIx list primitives (Table/DataWorkspace rows, queue lists) should provide a roving active row (`aria-activedescendant` or roving tabindex) with ArrowUp/Down and optional J/K. When a row is removed from the view (resolved, assigned away, moved to another queue), focus moves to the next row, or to the previous row if it was the last. Focus must never fall to `<body>`.
- After an inline edit (assign popover, status menu), focus should return to the originating row, not the trigger button, so the next keystroke acts on the same ticket.
- The "peek" pattern (a preview pane that follows the active row) is already in flight in UIx (DataWorkspace peekRowId focus return, PR #295). It should keep focus in the list while the peek updates.

### Gaps
- [unverified] Gmail and Superhuman: `J`/`K` move between conversations, `X` selects, `E` archives (Superhuman: "Mark Done"). After archive the next conversation opens automatically. Gmail exposes this as an "auto-advance" setting (newer, older, or back to list).
- [unverified] Linear: J/K or arrows move through issue lists, `X` toggles selection, Shift+click or Shift+arrow extends a range, Space opens a peek preview, and Cmd/Ctrl+A selects all. Not confirmed from a primary page; the Linear docs URL for keyboard shortcuts returned 404.
- No source gave timings for focus moves (for example scroll-into-view behaviour or smooth versus instant scroll).

---

## 4. Perceived speed: optimistic updates, prefetch, local-first sync, instant navigation, skeleton vs keep-previous-data, INP

### Takeaway
The products' own published targets are stricter than the web standard. Superhuman aims for under 100 ms, under 50 ms where possible, and claims 1–2 frames for its renderer. Google's INP "good" threshold is 200 ms or less at p75. They get there with a local database plus an optimistic transaction queue with server-confirmed rollback (Linear), and by preloading what the user is likely to open next (Superhuman). Skeletons need a show-delay and a minimum visible time, or they cause flicker.

### Cited Findings
**Latency targets**
- Superhuman follows Paul Buchheit's 100 ms rule (Buchheit created Gmail), the threshold "where interactions feel instantaneous". Superhuman treats 100 ms as the maximum and aims for under 50 ms "whenever possible". — [Superhuman: built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/)
- A Rahul Vohra tweet, cited in the same article, says a new renderer shows emails in 1–2 Chrome frames (under 32 ms). The figure is self-reported. — [Superhuman](https://blog.superhuman.com/superhuman-is-built-for-speed/)
- A third-party guide claims Superhuman's internal target is 50–60 ms for all interactions. [unverified, single third-party source] — [blakecrosley.com guide](https://blakecrosley.com/guides/design/superhuman)
- Vercel network latency budget: POST, PATCH and DELETE should complete in under 500 ms. — [Vercel guidelines](https://vercel.com/design/guidelines)

**INP: how the industry measures responsiveness**
- Thresholds at p75 of page loads, split by mobile and desktop: good is 200 ms or less, needs improvement is above 200 and up to 500 ms, poor is above 500 ms. — [web.dev: INP](https://web.dev/articles/inp)
- INP observes clicks, taps and key presses. Hover, scroll and zoom are excluded. It reports the worst interaction, ignoring one highest interaction for every 50 interactions. — [web.dev: INP](https://web.dev/articles/inp)
- An interaction has three phases: input delay, processing duration (event handlers), and presentation delay (until the next frame). — [web.dev: INP](https://web.dev/articles/inp)
- INP is the successor to FID, which measured only the first interaction's input delay. — [web.dev: INP](https://web.dev/articles/inp)

**Local-first sync (Linear)**
- Linear's sync engine (reverse-engineered, with Linear CTO Tuomas Artman calling the write-up "correct and more complete than what Linear publishes internally"):
  - Models are MobX-observable classes. Each workspace has an IndexedDB database.
  - Bootstrap can be full (stream all instant models), partial (by sync group), or local (from IndexedDB) into an in-memory object pool.
  - Related data (for example comments) is lazy-loaded through a batching loader. — [wzhudev/reverse-linear-sync-engine](https://github.com/wzhudev/reverse-linear-sync-engine)
- Optimistic updates: local edits mutate in-memory models immediately. They become transactions, batched by a TransactionQueue and persisted to IndexedDB so they survive restarts and offline periods, then sent as GraphQL mutations. Local IndexedDB tables are not changed until the server accepts, and rejection runs the transaction's rollback. — [reverse-linear-sync-engine](https://github.com/wzhudev/reverse-linear-sync-engine)
- The server broadcasts delta packets over WebSocket to all clients, including the originator. A transaction completes when its sync action comes back. A monotonically increasing `lastSyncId` gives a total order and detects missed packets. This differs from CRDTs, which typically need only a partial order. — [reverse-linear-sync-engine](https://github.com/wzhudev/reverse-linear-sync-engine)

**Local data and preloading (Superhuman)**
- Superhuman keeps a local database of email that renders quickly, including offline. It preloads and prerenders the threads the user is likely to open next and uses minimal animation. It adds local storage and caching on top of the Gmail and Outlook APIs, and measures performance continuously. — [Superhuman: built for speed](https://blog.superhuman.com/superhuman-is-built-for-speed/)

**Optimistic UI and loading states (Vercel)**
- Update the UI immediately when success is likely, then reconcile. On failure, show an error and roll back, or offer Undo. — [Vercel guidelines](https://vercel.com/design/guidelines)
- Spinners and skeletons get a show-delay of about 150–300 ms and a minimum visible time of about 300–500 ms to avoid flicker. React `<Suspense>` does this automatically. Skeletons must mirror the final layout to avoid shift. Loading buttons keep their label and add an indicator. — [Vercel guidelines](https://vercel.com/design/guidelines)
- Animations must be interruptible. Never use `transition: all`. Honour `prefers-reduced-motion`. — [Vercel guidelines](https://vercel.com/design/guidelines)
- Rauno: removing motion from core interactions made a tool feel "like I was moving much faster". Context menus appear instantly, flash the selected item, and fade out on close. — [Rauno Freiberg](https://rauno.me/craft/interaction-design)

### Inferences
- UIx owns perceived speed, not data sync. It can provide:
  - a `pending`/`optimistic` row state (subtle, not a spinner) and a rollback-highlight state for rejected mutations
  - a `SaveStatus` that reconciles (already exists in UIx)
  - an Undo toast primitive (Q5)
  - a `DelayedSpinner`/`Skeleton` that applies 150–300 ms show-delay and 300–500 ms minimum-visible by default
  - a keep-previous-data visual: dim the stale list or show a thin top progress bar instead of swapping in skeletons when filters or queues change
- For TENSOR, use a budget of under 100 ms from keypress to visual feedback, with a 50 ms target for list navigation and palette open. Server confirmation can arrive later. INP of 200 ms or less is the floor, not the goal.
- Per-component instrumentation hooks (for example `onInteractionTiming`) would let TENSOR attribute INP to UIx components using the web-vitals attribution build.

### Gaps
- [unverified] INP became a Core Web Vital, replacing FID, on 12 March 2024. web.dev's INP page does not state the date.
- [unverified] React 19 `useOptimistic`, TanStack Query `placeholderData: keepPreviousData` (v5), and Next.js `<Link>` prefetch on viewport or hover are standard implementations of these patterns. Not fetched this session.
- Linear's own engineering posts ("Scaling the Linear Sync Engine" and Tuomas Artman's talks) were not fetched. Details rely on the endorsed reverse-engineering write-up, which warns it may contain inaccuracies.
- No product publishes how it measures field INP or its p75 values. Superhuman says only that it measures "continuously".
- No source found for hover or intent prefetch timings (for example a ~100 ms hover delay before prefetch).

---

## 5. Undo instead of confirm; bulk actions from keyboard; multi-select semantics

### Takeaway
The guidance is to confirm destructive actions or provide undo within a safe time window. Best-in-class apps choose undo for frequent, reversible triage actions and keep confirmation for irreversible ones. Primary documentation of specific undo windows and multi-select keys was thin in this session.

### Cited Findings
- "Confirm destructive actions": require confirmation, or provide Undo within a safe time window. Optimistic failure paths should roll back or offer Undo. — [Vercel guidelines](https://vercel.com/design/guidelines)
- Linear's sync engine models create, update, delete and archive as transactions with rollback. Undo/redo is described as part of the engine (covered in later chapters of the write-up, which were not read). — [reverse-linear-sync-engine](https://github.com/wzhudev/reverse-linear-sync-engine)
- GitHub Projects: Shift+Space selects an item and `E` archives the selected items. This is a keyboard bulk action on the selection. — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)
- Raycast: the action panel applies to the selected item, Enter runs the primary action, and Cmd/Ctrl+K lists the rest. — [Raycast manual: Action Panel](https://manual.raycast.com/action-panel.md)

### Inferences
- UIx should ship an `UndoToast`, or an undo variant of the existing toast and feedback kit:
  - an action label plus an Undo button bound to Cmd/Ctrl+Z (and Z where single keys are enabled)
  - a visible countdown, pausing on hover or focus so keyboard and screen-reader users can reach it (WCAG 2.2.1 timing)
  - a polite `aria-live` announcement
  - stacking or collapsing for rapid repeated actions
- Use confirmation only for irreversible or wide-blast actions (bulk delete, closing more than N tickets, notifying the customer).
- Multi-select should follow one documented model:
  - X or Space toggles the active row.
  - Shift+X, Shift+Arrow or Shift+click extends a range from the anchor.
  - Cmd/Ctrl+A selects all visible rows.
  - Esc clears the selection.
  - When a selection exists, verbs (A, S, L, E) act on the selection, otherwise on the active row. The bulk bar shows the count and the verb shortcuts.

### Gaps
- [unverified] Gmail "Undo send" has a configurable cancellation window of 5, 10, 20 or 30 seconds. Gmail/Superhuman `Z` undoes the last action. Linear supports Cmd/Ctrl+Z to undo issue changes.
- [unverified] Linear: X selects, Shift extends, and Cmd+K on a selection applies bulk changes. Not confirmed from a primary page (docs URL 404).
- No source found for a recommended undo-toast duration.

---

## 6. Accessibility constraints of single-key shortcuts (WCAG 2.1.4) and compliance

### Takeaway
WCAG 2.1.4 (Level A) covers any shortcut made only of printable characters, including Shift+/ (`?`) and sequences like G then A. Such a shortcut must be turn-off-able, remappable to include a modifier, or active only while its component has focus. GitHub's documented compliance route is a settings toggle that disables character-key shortcuts while keeping modifier shortcuts.

### Cited Findings
- Requirement: if a shortcut uses only letters, punctuation, numbers or symbols, at least one of three conditions must hold:
  - **Turn off**: a mechanism lets users disable it.
  - **Remap**: a mechanism lets users reassign it to include a non-printable key (Ctrl, Alt).
  - **Active only on focus**: it works only when the relevant component has focus. — [W3C Understanding SC 2.1.4](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)
- Scope: Shift+/ (`?`) still counts as a character shortcut, and sequences like G then A are covered. Listbox and dropdown type-ahead, menus opened by a modifier and then a character key, and access keys are generally not affected. — [W3C](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)
- Intent: prevent accidental activation, especially by speech-input software that turns words into keystrokes (for example Talon Voice, which is not context-aware). It also helps users with dexterity challenges (remap) and some cognitive disabilities (map to familiar keys). — [W3C](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)
- The sufficient technique is G217 (let users remap or turn off character shortcuts). The failure is F99 (character shortcuts that cannot be turned off or remapped). A proposed ACT rule (ffbc54) reads "No keyboard shortcut uses only printable characters". — [W3C](https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html)
- GitHub: the Accessibility settings let users disable character-key shortcuts while keeping modifier shortcuts (for example Ctrl+B). — [GitHub Docs](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts)

### Inferences
- UIx compliance can be built into the registry:
  1. A global `characterKeyShortcuts: 'on' | 'off'` preference, persisted by the consumer. When off, the cheat sheet and palette hide single-key hints and show modifier alternatives.
  2. Every single-key verb also has a modifier path, at minimum through the Cmd/Ctrl+K palette and per-row action menu. Optionally an Alt-prefixed equivalent.
  3. Scope row verbs to "active only on focus" where possible: A, S, L fire only while the list or ticket component has focus, not page-wide. This alone can satisfy 2.1.4 for those keys.
  4. A remap API (`overrides: Record<commandId, KeyCombo>`) so TENSOR can offer remapping later.
  5. Single keys never fire inside inputs, textareas, contenteditable, or open combobox/listbox/menu, and never while IME composition is active.
- The `?` help overlay is itself a character shortcut. Keep it page-global but covered by the same off switch, with a modifier alternative (Linear's guides cite Cmd+/ as well).

### Gaps
- Linear's and Superhuman's 2.1.4 mechanisms were not found. [unverified] Linear has no documented switch to disable single-key shortcuts.
- No source found on handling IME composition (`event.isComposing`) or non-QWERTY `event.key` vs `event.code` choices. Vercel only says "support non-QWERTY layouts".
