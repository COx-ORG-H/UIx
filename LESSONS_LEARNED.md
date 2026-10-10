# UIx engineering lessons

<!-- lesson-skip: 597cd33 rebased copy of fb709c3 (lesson recorded below under fb709c3) -->
<!-- lesson-skip: 5bee362 rebased copy of 069a9ec (already skipped: routine docs contrast fix) -->
<!-- lesson-skip: 069a9ec routine: docs contrast badge ignored alpha; caught by eyeballing the golden -->
<!-- lesson-skip: 5551372 not a fix from this session; arrived via git pull of master (PR #44, own session owns its lesson call) -->
<!-- lesson-skip: 7d2221d squash-merge of 8c831c1 (already skipped: routine CSS layout fixes) -->
<!-- lesson-skip: 8c831c1 routine CSS layout fixes; each cause shown by measuring the element -->
<!-- lesson-skip: 601d975 routine flex-wrap fix; nowrap bar is visible in the CSS, reflow gate already exists -->
<!-- lesson-skip: a7b5224 routine CSS scoping fix; the audit named the cause -->
<!-- lesson-skip: 1dafe90 routine: inputmode="numeric" has no separators on a phone keypad; pinned by a test -->
<!-- lesson-skip: 74a9cea already recorded: "An a11y scan only sees the states a specimen renders at load" (HAR-1630 paragraph) and settleOverlay under 5ddce2e -->
<!-- lesson-skip: 17a8271 routine CSS wrap fix; the brief measured the cause -->
<!-- lesson-skip: 9cbe96d routine: Escape handled on the popover only, not on the field; the CI failure named the handler that heard it -->
<!-- lesson-skip: 01ccebe same cause as the 3e0ff88 entry (StrictMode runs updaters and cleanups twice); pinned by a test -->
<!-- lesson-skip: f011459 routine: cp1252 write from a Python patch script; fixed by encoding='utf-8' and check-utf8 -->

### 2026-10-08 · jsdom vs browser · `3e0ff88`
- **Rule:** when an action replaces the element it was triggered from (a row re-keyed from "error" to "loading"), decide where focus goes and assert `document.activeElement` after it; in a browser focus falls to `<body>`, and a test that only reads the rows' text passes.  **Why:** `Tree` Retry lost focus; jsdom tests checked text only.
- **Rule:** a `useRef(true)` "mounted" flag cleared in a cleanup must also be set in the effect body. StrictMode runs the cleanup once before the real mount, so the flag stays `false` and every async result is dropped.  **Why:** `InlineEdit` stayed busy after any async save in a StrictMode app.
- **Rule:** look at a mark of 10 px or less in a `deviceScaleFactor: 4` screenshot before calling it done. The avatar's own `overflow: hidden` had clipped its status dot to a quarter since the first release; a normal-scale golden cannot show it.
- **Gate:** `tests/a11y/older-gaps.spec.mjs` (a StrictMode harness: focus after Retry, a failed async save, the avatar's computed `overflow`) and the StrictMode case in `inline-edit-dom.test.mjs`.  **Tag:** focus, StrictMode, visual

### 2026-10-08 · anchored overlays · `5ddce2e`
- **Rule:** no written inset value keeps a CSS-anchor-positioned box inside the viewport while the page scrolls. The browser moves the box with its anchor *after* it resolved `top` / `left`, so `max(8px, min(anchor(bottom), 248px))` clamps at layout time and then rides out with the scroll; with `position-anchor` set, even a plain `top: 248px` is offset. A box that must not leave the viewport gets fixed coordinates and no `position-anchor`; anchoring is for boxes with room to spare.  **Why:** the first HAR-1613 implementation wrote exactly that clamp. jsdom has no anchor positioning, so every unit test passed.  **Gate:** `tests/a11y/overlay-shift.spec.mjs` scrolls a 384 px panel at 320 × 640 in Chromium, with and without anchor positioning; 9 of its tests failed on the clamp. Model: Opus 5.5.  **Tag:** false-green, overlay-position, test-double-fidelity
- **Rule:** script reads an anchor-positioned box's rect one rendering update late after a scroll (the page paints it in place; `getBoundingClientRect` catches up a frame later). Measure such a box two frames after the scroll, and never position anything from that rect inside a scroll handler.
- **Rule:** `el.getAnimations().length === 0` is also true *before* an enter transition starts. `Popover` holds its first frame with `data-uix-placing` (`transition: none`), one `--uix-lift` off its place, and CI measured a panel there once (top 4 instead of 8). Wait with `settleOverlay()` from `tests/a11y/settle.mjs`: the hold released, nothing animating, no transform left.

### 2026-10-08 · echo events · `cbd5ebc`
- **Rule:** a handler for an event the browser also fires for the component's *own* DOM writes (`toggle` on `<details>`, `close` on `<dialog>`) must tell an echo from a user action before it persists anything. Compare with what the component last rendered, not with its latest state.  **Why:** `CollapsibleSection` mounted open (`defaultOpen`), the remembered state closed it, and the two `toggle` events that followed were stored as the person's choice: the first one wrote "open" over the remembered "closed". Same family as the stale `close` event of 2026-09-29.  **Gate:** "defaultOpen applies on a first visit…" in `tests/a11y/tensor-gaps.spec.mjs` reloads the page in Chromium and failed before the fix; `collapsible-steps-dom.test.mjs` dispatches the echo in jsdom.  **Tag:** false-green, test-double-fidelity, persistence

### 2026-10-08 · react build · `ded3c8f`
- **Rule:** when two tsup configs (or any two parallel build steps) write to one `outDir`, none of them may `clean` it. Remove the directory once, before the tool starts, and after the build check that every file `package.json` exports is there. A bare `npx tsup` skips both; use `npm run build -w @tensor_1/react`.
- **Why:** tsup runs the configs of an array under one `Promise.all`, and `clean` is per config: it lists `outDir`, then unlinks what it listed. The ESM config's clean ran 0.3 to 0.5 s before the CJS config wrote its bundles; when that order flipped, all seven `.cjs` files were deleted after the log had printed them, and tsup exited 0. tsup never checks its output.
- **Gate:** `packages/react/scripts/check-dist.mjs` fails on a missing or empty `exports` target. It ends `npm run build`, runs as `test:dist` in CI's `gates` job, and is the package's `prepublishOnly`, because release.yml publishes a second build that no gate reads. `src/dist-exports.test.mjs` fails if a config gets `clean` back. Seen red on a dist with the old order forced.
- **Tag:** false-green, build, race, generalizable

### 2026-10-07 · chart theme · `fb709c3`
- **Rule:** a theme merged into an ECharts option may only *style* components the consumer's option already has. Any component key in the option (`legend`, `title`, `xAxis`, `dataZoom`, `visualMap` …) makes ECharts draw that component, so a theme default for it must be dropped when the option lacks the key.  **Why:** `uixChartTheme()` carried a styled `legend`, and the docs residence chart, which asks for none, grew a "Residence" legend. Every theme test still passed.  **Gate:** `mergeChartTheme`'s `STYLED_ONLY` list plus a `chart-theme.test.mjs` case. `tests/a11y/chart-theme.spec.mjs` asserts the residence chart has no legend text, and it fails on the old merge.  **Tag:** false-green, echarts

### 2026-10-07 · parallel Playwright · `b775755`
- **Rule:** when several worktrees run on one machine, never trust a local Playwright result from the repo config. `playwright.config.mjs` uses port 4178 with `reuseExistingServer`, so it silently tests whichever worktree's `serve` already holds 4178. Run with an untracked config on a unique port and `reuseExistingServer: false`.  **Why:** two agents' a11y runs hit another worktree's server today. One noticed only because its new spec found nothing.  **Gate:** ⚠ TODO. Let the config take its port from an env var, or fail when the server's root isn't this checkout.  **Tag:** false-green, concurrency

### 2026-10-06 · CSS class hooks · `c595cdb`
- **Rule:** before giving a new component's block class (e.g. `.uix-file-upload`) its first CSS rule, look the class up in `HOOKS` in `packages/react/src/react-classes-defined.test.mjs`. Another component may already emit it as an unstyled hook (BrandProfiles' upload `<label>` did), and a bare rule silently restyles that component.  **Why:** when the class gains a rule, the gate says "drop from HOOKS". Doing exactly that ships the restyle, and no visual golden covers the other component.  **Gate:** the HOOKS stale-entry failure now names every component that emits the hook and says the new rule restyles it (HAR-1573). It cannot judge the restyle: scope the rule (`:not(label)`) or pick a new block name.  **Tag:** css-collision, false-green
- **Same cause, other direction (2026-10-07, HAR-1573):** `FilterPopover` put `.uix-label`, the Label tag pill, on its `<label>` field wrapper, so the select sat in an accent band with 1 px below it. A scoped `display: grid` rule fixed the layout and hid the paint, and no golden covered the route. PromptDialog had made the same mistake earlier.  **Gate:** `packages/react/src/no-label-tag-class.test.mjs` fails on any `<label>` carrying `uix-label` in the React sources, docs, guide, `tables.html` and `examples/`; the pill rule is now `.uix-label:not(label)`.

### 2026-10-07 · generated files · `claude/elated-bohr-4f0064`
- **Symptom:** merging #96 turned ten open PRs (#89–#99) DIRTY at once. Every conflict was in `build/css/styles.css`, `build/css/components.css` or `tests/css-size.baseline.json`, files no PR had authored, and each PR needed a rebase plus a rebuild after every further merge.  **Root cause:** each bundle is one minified line, so two branches that rebuilt it conflict whatever they changed. The size baseline stored the two bundle totals, which every CSS change rewrites.  **Fix:** the bundles are git-ignored and built where they are needed (the docs fall back to `styles/main.css`). The baseline has one entry per stylesheet, `--update` rewrites only entries that are out of tolerance, and a bundle is checked against the sum of its inputs.  **Gate:** `packages/tokens/tests/generated-bundles.test.mjs` fails when a bundle is tracked again or a docs page loses its fallback; `size-report.test.mjs` merges the baselines of two simulated PRs with `git merge-file` and shows that the old shape conflicts. Model: Opus 5.5.  **Tag:** merge-conflicts, generated-files, parallel-prs
- **Rule:** before committing a generated file, picture two branches that both regenerate it. If it is one line, or an aggregate of everything (a total, a hash, a count), every pair of branches conflicts on it. Commit a generated file only when it has a line per source item; otherwise build it where it is read.
- **Rule:** a script in `package.json` is not a gate until a workflow runs it. `test:size:css` was in no CI job, and its baseline was still updated by hand in 18 commits over 14 days. It runs in the `gates` job now.
- **Same cause, hand-kept lists (2026-10-08):** `tests/global-setup.mjs` named every harness on one `Promise.all` line and `.gitignore` had a line per harness, so #91, #94, #97 and #99 conflicted with each other on both. A registry that every new item appends to at the same spot is an aggregate written by hand. Global setup now discovers `tests/*/build.mjs`. A derived list can also be short without anyone seeing it, so discovery fails on a `harness.html` with no builder and on zero harnesses. Gate: `tests/a11y/harness-discovery.spec.mjs` (each check was removed in turn and its test went red).

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

Same cause, 2026-10-08 (HAR-1630): `FileUpload` rendered its rejection messages as
`<ul role="alert">`, which replaces the list role and leaves every `<li>` outside a list (axe
`listitem`, serious). It shipped in 2.31.0 unseen, because the list only exists after a file was
rejected. It was found the day a docs specimen rendered that state at load. A component's error,
empty and rejected states need a specimen or a harness scan of their own; the gate here is the
rejected-file test in `tests/a11y/tensor-gaps.spec.mjs`, which runs axe after the rejection.

## A green Release run can publish nothing

The `v2.16.0` tag passed every gate and the Release run went green, yet npm had no 2.16.0. The
`NPM_TOKEN` secret had been replaced the day after 2.15.0 and resolved blank, and the publish
step treated a missing token as "inert-safe" and exited 0 with a notice. Check the registry, not
the run colour, after every tag. Gate: the publish step now fails the run when the token is
missing or blank.
