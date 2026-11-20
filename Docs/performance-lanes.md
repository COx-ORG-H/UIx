# Performance lanes

UIx has three performance gates on top of the older table-engine guard
(`packages/react/scripts/table-performance.mjs`, a 50,000-row sort and search with no React).
They came from roadmap item #22 of the enterprise UX study. The field target they stand in for is
**INP ≤ 200 ms at the 75th percentile**. A lab run cannot measure INP itself, so the lanes time
scripted interactions the way INP does, and they gate bundle size.

| Lane | Where | What fails it | Cost |
|---|---|---|---|
| **Main-entry bundle budget** | CI `gates` job, step "Bundle budgets" (`npm run test:size`) | a metric of the main entry grows past max(2%, 512 B) of `packages/react/etc/entry-size.baseline.json` | ~10 s |
| **DataWorkspace render benchmark** | CI `perf` job, on every PR (`npm run test:perf:workspace`) | a median passes baseline + max(50%, 25 ms), still after one more set of runs | a few minutes, beside the other jobs |
| **No-GPU lane** | `perf-nightly.yml`: nightly, on demand, and on PRs that change `tests/perf/**` | a median passes baseline + max(150%, 50 ms): gross regressions only | a few minutes, not on PRs |

## The budgets today

These numbers were measured on a GitHub `ubuntu-latest` runner on 2026-11-20 (PR COx-ORG-H/UIx#308,
Chromium 149). `tests/perf/budgets.json` and `packages/react/etc/entry-size.baseline.json` are the
source of truth, and this table is a snapshot of them.

| Lane | Metric | Baseline (CI median) | Fails above |
|---|---|---:|---:|
| bundle | main (everything): min / gzip / brotli | 676.3 / 220.1 / 184.3 kB | +2% each |
| bundle | main → Button only: min / gzip / brotli | 25.6 / 9.3 / 8.4 kB | +512 B each |
| workspace | calibration (the baseline runner) | 109 ms | (not gated: divides the rest) |
| workspace | mount (10,000 rows, windowed) | 168 ms | 252 ms |
| workspace | mount: long-frame blocking | 99 ms | 149 ms |
| workspace | scroll 1,000 rows: p95 frame | 67 ms | 100 ms |
| workspace | scroll 1,000 rows: total | 1,659 ms | 2,488 ms |
| workspace | sort | 240 ms | 360 ms |
| workspace | select all | 120 ms | 180 ms |
| workspace | search keystroke (worst of 3) | 168 ms | 252 ms |
| no-gpu | modal open: latency / p95 frame | 96 / 50 ms | 240 / 125 ms |
| no-gpu | drawer open: latency / p95 frame | 64 / 50 ms | 160 / 125 ms |
| no-gpu | scroll edges: p95 frame | 16.7 ms | 66.7 ms |
| no-gpu | task tray open: latency / p95 frame | 40 / 16.7 ms | 100 / 66.7 ms |

The workspace figures are in milliseconds of the baseline runner. A run on another runner is
scaled to that runner before the gate. Two calibrated CI runs were taken on runners 1.17× apart. Once
scaled, their medians agreed within 9% (mount 167.7 against 167.6 ms, sort 240 against 225 ms).
Before calibration, two runs of one commit had read 1.4× apart. Select all and the search keystroke are under the
200 ms INP target at 4× throttling. Sort is not: it reads 240 ms on a 10,000-row client-side sort,
and that is the first thing to look at if TENSOR sorts large unpaged lists in the browser. In the no-GPU lane the scrim blur costs about 14 ms of p95 frame on a modal
open and about 17 ms on a drawer open (50 ms with the blur against 36 and 33 ms without). Scroll
edges and the task tray cost nothing measurable. The `(no blur)` rows have baselines of their own
in `budgets.json`.

## Main-entry bundle budget

`packages/react/scripts/entry-size.mjs` bundles the built `dist/` with esbuild (minified, browser,
every peer dependency external, as a product's bundler sees it). It measures two entries:

- **main (everything)**: `dist/index.js` with every export kept. This is the ceiling a product pays
  for the whole surface, and the number that moves when a component is added.
- **main → Button only**: `export { Button } from 'dist/index.js'`. This is a tree-shaking probe.
  Button pulls in Tooltip, ShortcutHint and anchored positioning (about 8 kB brotli). A module with a
  top-level side effect, or a lost `sideEffects: false`, would drag most of the kit into this import,
  and it would show up here first.

Each entry is recorded as minified bytes, gzip (level 9) and brotli (quality 11). The compression
levels are pinned so the numbers match on every machine. Like the CSS budget, the check passes
while each metric is within max(2%, 512 B) of its baseline.

- **It failed and the growth is deliberate** (a new component): run `npm run build:react`, then
  `npm run size:update -w @tensor_1/react`, and commit `etc/entry-size.baseline.json` with the change.
  `--update` rewrites only the entries that moved past the tolerance.
- **"Button only" grew and you did not touch Button**: look for a module-level side effect or a new
  import from a small module into a large one.
  `node packages/react/scripts/entry-size.mjs` prints the table without checking.
- **Two PRs both updated the baseline**: the JSON conflicts. Take either side, rebuild, and run
  `size:update` again.

The chart entries keep their hard limits in `check-chart-preset-size.mjs`, which runs in the same step.

## DataWorkspace render benchmark (PR lane)

`tests/perf/harness.tsx` (built in **production** mode by `tests/perf/build.mjs`) renders a
DataWorkspace over 10,000 tickets. The workspace is windowed (`virtualize`) and has search, a
sortable title and selection. Sorting and search run synchronously in the page with the kit's own
`multiSort` and `searchRows`, as a product without a server would run them. `tests/perf/bench.mjs
workspace` opens it in Chromium with **4× CPU throttling** (CDP `Emulation.setCPUThrottlingRate`).
It does one warm-up run and five measured runs, each on a fresh page, and measures:

| Metric | How |
|---|---|
| `mount` | from the `root.render` call to the first paint after the first commit |
| `mount: long-frame blocking` | the sum of `blockingDuration` of the long-animation-frame entries during the mount: the lab's TBT stand-in. Reported, budgeted loosely. |
| `scroll 1,000 rows: p95 frame` / `total` | the body scrolls 1,000 rows in 30 equal steps, one per frame; the 95th-percentile rAF-to-rAF interval, and the time until the last step has painted |
| `sort` | a click on the Title header |
| `select all` | a click on the header checkbox (10,000 rows selected) |
| `search keystroke (worst of 3)` | typing `v`, `p`, `n` into the search field; the slowest of the three |

An **interaction** is timed the way INP times it. Its latency is the longest Event Timing entry of
its `interactionId`, from the input event to the next paint, rounded to 8 ms by the browser. Event
Timing reports nothing under 16 ms. In that case the harness's own clock stands in: the event's
`timeStamp`, then the first paint after its handlers (a message posted from a rAF callback). The
run fails closed rather than reporting numbers of the wrong thing. It throws when the workspace
stops windowing (200 or more `<tr>` mounted), when the scroll does not reach rows 1,000 to 1,099,
when the sort, the selection or the search did not happen, and on any page error.

**Runner speed.** GitHub's hosted runners are not all equally fast. Two runs of the same commit
read about 1.4× apart on every metric, with a tight spread inside each run. Each run therefore
starts with a fixed **calibration** in the same throttled page. It does script work (sorting
50,000 numbers, a Map, JSON) and DOM work (building, laying out and removing 1,000 plain nodes),
and it uses no kit code or kit CSS, so a kit regression cannot move it. The lane divides every
median by the runner's speed factor before the gate. The factor is the calibration median of this
run ÷ the calibration median of the run the baselines came from. The report shows the factor,
the scaled median and the raw median side by side.

**The gate.** Each metric is the median of the runs, scaled as above. The limit is
`baseline + max(ratio × baseline, floorMs)`, with the baseline, ratio and floor in
`tests/perf/budgets.json`. A median over its limit gets one more set of runs, and the lane then
decides on all the samples together. A metric with no baseline fails, and so does a baseline with
no metric, so a renamed metric cannot pass unchecked. The workspace lane also fails without a
calibration baseline, rather than compare unscaled numbers. A run at another `--cpu` rate or row
count only reports, because the baselines were taken at 4× and 10,000 rows.

The PR lane runs on GitHub's hosted runners. They have no GPU, so this lane already composites in
software. What it watches is main-thread work: React rendering, the kit's effects and layout.

## No-GPU lane (nightly)

`tests/perf/bench.mjs no-gpu` launches the full Chromium (`channel: 'chromium'`, new headless) with
`--disable-gpu --disable-gpu-compositing --disable-gpu-rasterization` and 4× CPU throttling. This is
a stand-in for the GPU-less VDI desktops some TENSOR agents work on. Google's guidance for Chrome on
virtual desktops is about 1 GB RAM and 2 to 4 vCPU, and Login VSI measured CPU-only rendering
peaking at 100% CPU. The harness's `overlays` scene opens these over a busy page of cards:

- **modal open** and **drawer open**: the `::backdrop` scrim with `backdrop-filter: blur(var(--uix-scrim-blur))`;
- **scroll edges**: a 300-row list with `.uix-scroll-edge` (mask on a scroll timeline);
- **task tray open**: the TaskTray with five tasks, expanding.

Each scene runs twice: with the default blur, and with `data-transparency="reduce"` (no blur, firmer
scrim), labelled **(no blur)**. Per scene the lane reports the click's latency (as above) and the p95
and longest rAF-to-rAF interval over the 800 ms after the click. Frame intervals come in whole
vsyncs (16.7, 33.4, 50 ms), so this lane is not scaled by runner speed. It prints the calibration
for context only. The report ends with the **blur
cost**: the default p95 frame minus the no-blur one. The tolerance is wide (150%, 50 ms floor)
because the lane exists to catch a gross regression, such as an animated filter or a blur on every
row. It is not meant to track a few milliseconds.

**Run it on demand:** Actions → "Perf (nightly, no GPU)" → Run workflow. You can change the CPU rate
and the run count, but a rate other than 4 only reports.

**Caveats.** 4× is a convention, not a validated mapping to a VDI client. No primary source maps
throttling multipliers to VDI. A runner with software compositing is not a Citrix or AVD session
either: Citrix warns that the browser may not use the GPU in a remote session, so benchmarks run
there can mislead. Keep the quarterly manual run on a customer-like VDI image (no GPU, 2 vCPU,
150 to 200% scaling).

## Reading a report

Every run prints a table and writes `perf-report/<lane>.json` and `<lane>.md`. In CI the table is
also the job summary, and the folder is the `perf-report` artifact (`perf-no-gpu` for the nightly
lane), kept for 30 days.

| Column | Meaning |
|---|---|
| median | what the gate compares: the middle of the runs, divided by the runner speed factor (workspace lane) |
| raw median | the same before scaling: the milliseconds this runner actually took |
| p75 | the 75th percentile of the runs (INP's percentile, but across runs, not field interactions) |
| min – max | the spread. A wide spread means a noisy runner, not a regression. |
| baseline | the CI median recorded in `budgets.json` |
| limit | baseline + max(ratio × baseline, floor) |
| ✓ / ✗ | ✗ over, ✗ no baseline, ✗ not measured |

The workspace report ends with the slowest interaction's p75 against the 200 ms INP target. That
line is informational: a 4× throttled lab run on a shared runner is a proxy, not field INP.

## When a lane fails

1. **Read which metric.** The log lists the per-run samples, so you can tell a slow outlier from a
   shifted median. The lane has already measured a second set of runs before failing.
2. **Reproduce locally**, comparing against `master` rather than against the CI numbers:
   `npm run build && node tests/perf/build.mjs && node tests/perf/bench.mjs workspace --report-only`.
   A laptop running other work reads slower and noisier than CI. Compare branch with master on the
   same machine, and use `--cpu 1` to see the unthrottled cost.
3. **The cost is deliberate** (a feature that has to do more work): let CI run the lane on the PR,
   download its `perf-report` artifact, and run `node tests/perf/bench.mjs adopt perf-report/workspace.json`.
   This writes the run's raw medians and its calibration as the new baselines: together they
   define the baseline runner. Commit `tests/perf/budgets.json` and say why in the
   PR. Never adopt a laptop's report.

## Files

| Path | What |
|---|---|
| `packages/react/scripts/entry-size.mjs`, `etc/entry-size.baseline.json` | main-entry bundle budget |
| `tests/perf/harness.html`, `harness.tsx`, `build.mjs` | the harness (also discovered and built by Playwright's global setup, like every harness) |
| `tests/perf/bench.mjs` | the runner: its own static server on a free port, the lanes, the report, `adopt` |
| `tests/perf/stats.mjs`, `stats.test.mjs` | median, limits, the gate's verdicts, and their tests |
| `tests/perf/budgets.json` | baselines and tolerances per lane |
| `.github/workflows/ci.yml` (`perf` job), `perf-nightly.yml` | where they run |
