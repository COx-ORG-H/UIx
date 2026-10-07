# UIx engineering lessons

<!-- lesson-skip: 5551372 not a fix from this session; arrived via git pull of master (PR #44, own session owns its lesson call) -->
<!-- lesson-skip: 7d2221d squash-merge of 8c831c1 (already skipped: routine CSS layout fixes) -->
<!-- lesson-skip: 8c831c1 routine CSS layout fixes; each cause shown by measuring the element -->
<!-- lesson-skip: 601d975 routine flex-wrap fix; nowrap bar is visible in the CSS, reflow gate already exists -->
<!-- lesson-skip: a7b5224 routine CSS scoping fix; the audit named the cause -->

### 2026-10-07 · generated files · `claude/elated-bohr-4f0064`
- **Symptom:** merging #96 turned ten open PRs (#89–#99) DIRTY at once. Every conflict was in `build/css/styles.css`, `build/css/components.css` or `tests/css-size.baseline.json`, files no PR had authored, and each PR needed a rebase plus a rebuild after every further merge.  **Root cause:** each bundle is one minified line, so two branches that rebuilt it conflict whatever they changed. The size baseline stored the two bundle totals, which every CSS change rewrites.  **Fix:** the bundles are git-ignored and built where they are needed (the docs fall back to `styles/main.css`). The baseline has one entry per stylesheet, `--update` rewrites only entries that are out of tolerance, and a bundle is checked against the sum of its inputs.  **Gate:** `packages/tokens/tests/generated-bundles.test.mjs` fails when a bundle is tracked again or a docs page loses its fallback; `size-report.test.mjs` merges the baselines of two simulated PRs with `git merge-file` and shows that the old shape conflicts. Model: Opus 5.5.  **Tag:** merge-conflicts, generated-files, parallel-prs
- **Rule:** before committing a generated file, picture two branches that both regenerate it. If it is one line, or an aggregate of everything (a total, a hash, a count), every pair of branches conflicts on it. Commit a generated file only when it has a line per source item; otherwise build it where it is read.
- **Rule:** a script in `package.json` is not a gate until a workflow runs it. `test:size:css` was in no CI job, and its baseline was still updated by hand in 18 commits over 14 days. It runs in the `gates` job now.

### 2026-10-06 · CSS class hooks · `c595cdb`
- **Rule:** before giving a new component's block class (e.g. `.uix-file-upload`) its first CSS rule, look the class up in `HOOKS` in `packages/react/src/react-classes-defined.test.mjs`. Another component may already emit it as an unstyled hook (BrandProfiles' upload `<label>` did), and a bare rule silently restyles that component.  **Why:** when the class gains a rule, the gate says "drop from HOOKS". Doing exactly that ships the restyle, and no visual golden covers the other component.  **Gate:** ⚠ TODO. The HOOKS failure message should name the component that emits the hook. Until then, scope the rule (`:not(label)`) or pick a new block name.  **Tag:** css-collision, false-green

### 2026-10-06 · public API names · `feat/har-1365-filter-popover`
- **Symptom:** the API report for `FilterEditor` (HAR-1365) showed `FilterKind` changing from `'enum' | 'text' | 'number' | 'date' | 'boolean'` to a new union. That is a breaking change to `table-engine`'s exported type, and `tsc` and the build were both green.  **Root cause:** `index.ts` re-exports `table-engine` with `export * from`, and a named export of the same name in the entry silently wins over the star binding. No error, no warning; the old type just leaves the public API.  **Fix:** the new type is `FilterValueKind`.  **Gate:** `packages/react/src/export-names.test.mjs` fails when an entry's explicit export reuses a name from one of its `export *` modules (it fails with the original name). Model: Opus 5.5.  **Tag:** false-green, public-api
- **Rule:** read the `-` lines of an `.api.md` diff before calling a change additive. A "minor" whose report removes or narrows anything is a major in disguise.

### 2026-10-06 · composer layout · `b955d5e`
- **Symptom:** TENSOR's worklog composer had a 0 px tool row at 375 and 320 px: an audience toggle + Send in `toolbarEnd` took the whole bar, and a click on any tool hit the toggle (HAR-1125).  **Root cause:** a flex item with `contain: inline-size` has no content width, so in a `nowrap` row it gets only the leftover space and nothing gives it a floor. The composer opted out of `.uix-composer__bar`'s wrap in `601d975` because "its toolbar scrolls", but that scrolling happens inside the toolbar; the bar never had to stay one row. HAR-749 then wrapped one squeezing item (the status line) with `:has()` instead of adding the floor.  **Fix:** the bar wraps and the tool row has `min-width: min(5 * 32px, 100%)`.  **Gate:** "wide toolbarEnd" in `tests/a11y/rich-text.spec.mjs` measures the row and hit-tests every tool at 1280/768/375/320; 375 and 320 fail on the old CSS. Model: Opus 5.5.  **Tag:** false-green, reflow, containment
- **Rule:** an overflow gate must also assert each child's own usable width, and must cover every variant that overrides the bar. `reflow-320.spec.mjs` only checked the plain `.uix-composer__bar`, and only that nothing crosses its edge, which a child squeezed to 0 px passes.

### 2026-09-30 · anchored overlays · `e20cdc8`
- **Symptom:** TENSOR's emoji picker jumped from below its trigger to above it on the first category click near the bottom of the page (HAR-993).  **Root cause:** the overlay was placed once at open, before its content existed, and grew after the data loaded without being placed again. `useAnchoredPosition`'s capture-phase scroll listener then took the grid's own scroll as a page scroll and re-ran the flip from scratch. The geometry tests are pure and jsdom has no layout, so neither could see it.  **Fix:** the picker has one size in every state, an open overlay keeps its side until that side stops fitting (`stickySide`), scrolls inside the overlay are ignored, and a ResizeObserver re-places it.  **Gate:** `tests/a11y/emoji-picker-placement.spec.mjs` measures the box and page scroll in Chromium, with and without CSS anchor positioning. All 6 tests fail on the old sources. Model: Opus 5.5.  **Tag:** false-green, test-double-fidelity, overlay-position
- **Rule:** `toggle` is a discrete event for React. Each listener's `setState` renders in a microtask right after that listener returns, and a child's listener (registered first) runs before its parent's. Anything that must see what the consumer renders on toggle has to wait for the whole task (`setTimeout(0)`), not the first commit. Popover released its held first frame before EmojiPicker's content existed, so the enter slide started on the wrong side, and only a real-browser read of the transition's first keyframe showed it.
- **Rule:** Playwright's `toBeVisible()` passes at opacity 0. Before running axe on a popover, wait for `getAnimations().length === 0`, or axe measures colours mid-fade (4.49 against 4.5 on the dark link dialog).

### 2026-09-29 · dialog lifecycle · `d3f4d53`
- **Symptom:** Drawer/Modal/Peek mounted with `open` closed itself ~25 ms later in `next dev` (TENSOR HAR-882), releasing the scroll lock.  **Root cause:** browsers QUEUE a `<dialog>`'s `close` event; under StrictMode (or `open` true → false → true in one task) the effect cleanup's `close()` event arrived after the re-run's `showModal()` and reached the NEW listener. The jsdom test stubs dispatched `close` synchronously, so no test could see it.  **Fix:** `useDialog`'s `handleClose` ignores a `close` that finds its dialog open again.  **Gate:** `packages/react/src/dialog-stale-close-dom.test.mjs` queues `close` via `setTimeout(0)`, mounts under StrictMode, asserts the effect really ran twice; all 10 cases fail without the fix. Model: Opus 5.5.  **Tag:** false-green, test-double-fidelity, strictmode
- **Same cause, test side (2026-09-30):** `tests/a11y/drawer.spec.mjs` read the Escape `onClose` count right after `open` went false, so it failed ~1 run in 10 (red a11y on master `a8cd2b8`, with or without the fix). In a real browser, anything that rides the `close` event must be polled (`expect.poll`), never read once.

### 2026-09-24 · live-reorder drag · `feat/view-menu-columns-anatomy`
- **Rule:** a list that reorders *while* a row is dragged must follow the pointer on the window (not on the grip through pointer capture), and must compute the drop slot from the OTHER rows only.  **Why:** React re-keys by moving the dragged row's DOM node, and moving a node releases its pointer capture (and its focus), so SavedViewMenu's drag stalled after the first step down. Counting the dragged row's own midpoint pushed it one slot past the pointer. The jsdom test stubbed fixed rects and dispatched every event on the grip, so it passed on both bugs.  **Gate:** `tests/a11y/view-menu.spec.mjs` drags with a real mouse in Chromium (ViewMenu and SavedViewMenu); both drag tests fail when the dragged row is counted again.

### 2026-09-22 · docs specimens · `feat/saved-view-menu-sections`
- **Rule:** a list-based specimen (`ul.uix-menu` and similar) inside `.uix-docs__page` has to be looked at rendered, because the docs prose rules (`ul { padding-left }`, `li + li { margin-top }`) are unlayered and so beat every `@layer uix.components` rule.  **Why:** the saved-view specimen had been showing prose indents and gaps since it shipped, while contract, a11y and visual gates all stayed green (its route has no golden). The sectioned redesign made the rows look mis-indented against their section titles.  **Gate:** none general. `docs.css` now scopes its prose list rules with `:where()` to docs-authored lists only, so every kit list (`ul.uix-menu`, `.uix-prose ul`, `.uix-related-links__list`, `.uix-tree ul` …) is exempt; the workspace VR golden moved 44 px for exactly the two kit lists on that page and was re-baselined.  **Tag:** false-green, cascade-layers, docs

### 2026-09-18 · layout tests · `2f6e67a`
- **Rule:** measure an overrun against the parent's *content* box, and calibrate a self-sizing test against a property the fix does not touch.  **Why:** `.uix-composer`'s 8 px padding hid an 8 px `.uix-segmented` overrun that was measured against its border box, and a `min-content` calibration collapsed to one character as soon as `overflow-wrap: anywhere` landed, so the test narrowed the box to nonsense and failed for the wrong reason.  **Gate:** `tests/a11y/reflow-320.spec.mjs` measures against the bar's padding edge and forces `overflow-wrap: normal` on the options while calibrating.  **Tag:** false-green, reflow, test-calibration

### 2026-09-18 · layout tests · `8f4970d`
- **Rule:** an overflow or reflow test run against a docs specimen must first write in the longest real (localised) label the component will get; the specimen's short English copy fits even when the CSS is broken.  **Why:** the `1fr 1fr` + nowrap grid only overflowed with German portal labels, so a plain `scrollWidth === clientWidth` check passed on the broken CSS.  **Gate:** `tests/a11y/reflow-320.spec.mjs` injects a long label before measuring.  **Tag:** false-green, i18n, reflow

## Component documentation must verify the component route

Gallery-wide CSS selector coverage does not prove that a component reference shows the
component. Use explicit specimen mappings and check the rendered reference page, including
target visibility and meaningful interactions. Gate: `tests/docs/verify-components.mjs`,
run by the CI a11y job. The gate was observed failing for a missing editorial specimen and
a combobox that selected the wrong source fragment before both were corrected.

## Routed specimens need lifecycle cleanup

Legacy standalone initializers often attach document/window handlers and observers. Calling
them on each route retains detached dialogs and stale state. Dispose listeners, observers
and global nodes before replacing the article. Gate: repeated lightbox navigation and
interaction in the component browser verification; implementation: `disposeShowcase()`.

## A shared preview can still produce a non-portable example

Copying a whole family showcase around a component can pull documentation-only classes and local
assets into the product snippet even when the target component itself is valid. Overlay references
must select the matching trigger and surface as explicit specimen parts; extracted media must be
self-contained or use a consumer-owned URL. Gate: the 82-route browser verification rejects
`uix-docs__*`, `uix-guide__*`, and repository `assets/` URLs in copied component markup.

## Focus the element that actually scrolls

A focusable documentation wrapper does not make a nested overflow container keyboard-scrollable.
Detailed Pipeline rails scroll horizontally on narrow surfaces, so plain HTML needs `tabindex="0"`
on the rail and the React adapter must provide that default. Gate: the docs browser check focuses
the Pipeline element, the React render test asserts its default, and the full axe matrix must pass.

## An a11y scan only sees the states a specimen renders at load

The selected filter chip used the solid accent as text on a tint of that accent: 3.21:1 in dark
mode, and under 3:1 in light mode for bright brands. The axe matrix stayed green because every
specimen renders its chips unselected, and `data-on` is only set after a click. A consumer's axe
run found it (mission-control, 2026-09-10). Stateful colour pairs need a computed check, not a
page scan. Gate: `npm run test:tokens` evaluates the built CSS and every theme file in cascade
order and asserts the selected-chip text clears 4.5:1 in both modes. It was watched to fail with
the old rule restored.

## A green Release run can publish nothing

The `v2.16.0` tag passed every gate and the Release run went green, yet npm had no 2.16.0. The
`NPM_TOKEN` secret had been replaced the day after 2.15.0 and resolved blank, and the publish
step treated a missing token as "inert-safe" and exited 0 with a notice. Check the registry, not
the run colour, after every tag. Gate: the publish step now fails the run when the token is
missing or blank.
