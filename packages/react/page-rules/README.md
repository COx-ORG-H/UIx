# UIx page rules

`uix-page-rules` checks how a product's pages use UIx. UIx's own tests hold the kit-level rules (control edges at 3:1, the 24 px hit area, the calm palette, the motion tokens), so every product gets those by installing the kit. A page can still misuse the kit, and these rules catch that. They come from the TENSOR UI council climbs (HAR-2954) and the page audit (HAR-3101), and workspace `Docs/lessons/12` and `13` explain each one.

The tool ships inside `@tensor_1/react`, so a product already has it and the rules match the kit version it renders. It has no dependencies and reads files only.

## Rules

| Rule | What it stops | Inline ignore |
|---|---|---|
| `severity-through-status-tone` | A severity coloured through a generic tone helper (`statusTone('severity', …)`), or a hand map that sends "high" to a red tone. Use `severityTone()`. | yes |
| `label-break-anywhere` | `break-all`, `overflow-wrap: anywhere`, `wrap-anywhere`, `wordBreak: 'break-all'`, `overflowWrap: 'anywhere'`. Code in `font-mono`, `<code>` or `<pre>` is exempt. | yes |
| `heading-said-twice` | The `PageHeader` title said again as a heading, `title` or table `caption`. | yes |
| `row-menu-unnamed` | A row's ⋯ menu (`Menu`, `ActionMenu`) whose `label` and trigger `aria-label` do not name the row. | yes |
| `list-joined-in-cell` | A row's list joined with `", "` in a table cell. Use `ListSummary` or `OverflowRow`. | yes |
| `no-raw-button` | A raw `<button>`. The one allowed case is an invisible submitter (`type="submit" hidden aria-hidden`). | no |
| `no-raw-table` | A raw `<table>`. Use `DataWorkspace`, or `Table` in `TableWrap` for a matrix. | no |
| `no-raw-form-control` | A raw `<input>`, `<select>` or `<textarea>`. `<input type="hidden">` is allowed. | no |
| `no-arbitrary-font-size` | A literal font size, such as `text-[13px]` or `fontSize: 12`. Use the `--uix-text-*` tokens. | no |

`.css` files are checked against `label-break-anywhere` only. `.ts`, `.js` and `.mjs` files are checked against that rule and the severity rule. `.tsx` and `.jsx` files are checked against every rule. Tests, stories and `.d.ts` files are not read.

The kit-control rules (`no-raw-*`, `no-arbitrary-font-size`) accept no inline ignore. If the kit cannot serve a case, build the missing piece in UIx first (workspace ADR-0038). For a structural exception, such as a printed document, add an `exempt` entry with its reason.

One rule is held back: `no-hand-built-pill` (`rounded-full` plus horizontal padding). It misses a class split by a template interpolation (HAR-3817), so it waits for that fix.

## Adopting it in a product

1. Pin `@tensor_1/react` at a version that ships the tool: 2.65.0 or later.
2. Add `uix-page-rules.config.json` at the product root:

   ```json
   {
     "roots": ["src"],
     "baseline": "uix-page-rules-baseline.json"
   }
   ```

   Optional keys:

   - `skip`: path prefixes not to scan, each with its reason.
   - `exempt`: `{ "<rule>": { "<file>": "<reason>" } }`.
   - `genericToneHelpers`: default `["statusTone"]`.
   - `pageTitleComponents`: default `["PageHeader"]`.
   - `rowMenuComponents`: default `["Menu", "ActionMenu"]`.

   An unknown key is an error, so a typo can't switch a rule off.
3. Seed the baseline once, on purpose, and commit it: `npx uix-page-rules baseline --seed`.
4. Add a script, `"lint:uix-page-rules": "uix-page-rules"`, and run it as a required CI step.

## What fails

`uix-page-rules` (same as `uix-page-rules check`) exits:

- **0** when nothing is new;
- **1** on any of these:
  - a finding the baseline does not grandfather, in a new file or as one more in a grandfathered file;
  - a baseline entry the tree no longer reaches (`stale-baseline`);
  - a `skip` prefix or an `exempt` entry that matches nothing (`stale-exemption`);
- **2** when the config is missing or invalid, or when the roots hold no source files.

The baseline counts findings per rule, per file, and it only shrinks. After you fix a finding, run `npx uix-page-rules baseline` and commit the smaller file. That command refuses to write a baseline that grows. `--seed` writes it anyway, for the first baseline or a reviewed re-seed after files move. The PR diff then shows the growth.

`uix-page-rules rules` lists every rule and its fix, and `--json` prints the result for other tools. `import { scanSource, run } from '@tensor_1/react/page-rules'` gives the same functions to a product's own lint runner.
