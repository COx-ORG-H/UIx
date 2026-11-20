#!/usr/bin/env node
/* The performance lanes (roadmap #22). Run after the token CSS and the harness are built:
 *     npm run build && node tests/perf/build.mjs
 *
 *   node tests/perf/bench.mjs workspace    PR lane: a 10,000-row DataWorkspace in Chromium at 4× CPU
 *                                          throttling — mount, scroll 1,000 rows, sort, select all, three
 *                                          search keystrokes. Fails when a median passes its budget.
 *   node tests/perf/bench.mjs no-gpu       Nightly lane: Chromium with the GPU off (software compositing
 *                                          and raster) at 4×: Modal and Drawer opening over a blurred
 *                                          scrim, a soft-edged list scrolling, the TaskTray expanding —
 *                                          each with the default blur and with data-transparency="reduce".
 *                                          Fails only on a gross regression.
 *   node tests/perf/bench.mjs adopt <report.json>   write a report's medians into budgets.json as the
 *                                          baselines (take the report from CI, never from a laptop).
 *
 * Options: --runs N (measured runs after one warm-up; default from budgets.json), --cpu N (CPU
 * throttling rate; a rate other than the budgeted one only reports), --rows N (workspace rows),
 * --out DIR (default perf-report), --report-only (print, never fail).
 *
 * How a number is taken (see Docs/performance-lanes.md):
 *   • an interaction is what INP would count: the longest Event Timing entry of its interactionId,
 *     from the input event to the next paint. Under the 16 ms reporting threshold there is no entry,
 *     and the harness's own clock (event.timeStamp → the first paint after the handlers) stands in.
 *   • mount: from the render call to the first paint after the first commit.
 *   • frames: rAF-to-rAF intervals; p95 and the longest.
 * Each metric is the median of the runs. A median over its limit (baseline + max(ratio × baseline,
 * floor)) gets one more set of runs before the lane fails, on all the samples together. */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { failing, frameStats, interactionLatency, judge, round1 } from './stats.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const BUDGETS_PATH = join(HERE, 'budgets.json');
const GPU_OFF = ['--disable-gpu', '--disable-gpu-compositing', '--disable-gpu-rasterization'];

const argv = process.argv.slice(2);
const lane = argv[0];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const flag = (name) => argv.includes(`--${name}`);

// ── a static server at the repository root, on a free port (never the docs' 4178) ────────────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
function serve() {
  const server = createServer((req, res) => {
    const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!path.startsWith(ROOT + sep) || !existsSync(path)) { res.writeHead(404).end(); return; }
    try {
      const body = readFileSync(path);
      res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// ── one page, throttled ──────────────────────────────────────────────────────────────────────────
async function openPage(browser, url, cpu) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  const cdp = await context.newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(url);
  await page.waitForFunction(() => window.__perf?.ready === true);
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

/** One interaction, timed the way INP times it; `type` is the event that starts the fallback clock. */
async function interaction(page, type, act) {
  const since = await page.evaluate((t) => { window.__perf.arm(t); return performance.now(); }, type);
  await act();
  const scripted = await page.evaluate(() => window.__perf.armed);
  // Event Timing entries reach the observer in a task after the paint: let two frames pass.
  await page.evaluate(async () => { await window.__perf.afterNextPaint(); await window.__perf.afterNextPaint(); });
  const measured = interactionLatency(await page.evaluate(() => window.__perf.events), since);
  return round1(measured ?? scripted);
}

/** Long-animation-frame blocking time (the lab's TBT stand-in) of the frames that ended after `since`. */
async function blockingSince(page, since) {
  // LoAF entries are delivered after their frame; wait two more frames and a task for the observer.
  await page.evaluate(async () => { await window.__perf.afterNextPaint(); await window.__perf.afterNextPaint(); await new Promise((r) => setTimeout(r, 50)); });
  return round1(await page.evaluate((t) => window.__perf.loafs.filter((l) => l.startTime + l.duration > t).reduce((sum, l) => sum + l.blockingDuration, 0), since));
}

async function workspaceRun(page, rows) {
  const out = {};
  const ws = page.locator('#bench');
  out.calibration = round1(await page.evaluate(() => window.__perf.calibrate()));
  const t0 = await page.evaluate(() => performance.now());
  out.mount = round1(await page.evaluate(() => window.__perf.mount()));
  out['mount: long-frame blocking'] = await blockingSince(page, t0);
  const rendered = await ws.locator('tbody tr').count();
  // fail closed: a workspace that stopped windowing would still produce numbers, of something else
  if (!(rendered > 0 && rendered < 200)) throw new Error(`expected a window of rows, found ${rendered} <tr> for ${rows} rows — is virtualize still on?`);

  const pitch = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('#bench tbody tr')].filter((tr) => tr.getBoundingClientRect().height > 0 && tr.querySelector('td'));
    return trs[2].getBoundingClientRect().top - trs[1].getBoundingClientRect().top;
  });
  if (!(pitch > 0)) throw new Error(`could not measure the row pitch (${pitch})`);
  // 1,000 rows in 30 equal steps, one per frame: a fling. Each step lands on rows not yet rendered.
  const scroll = await page.evaluate((px) => window.__perf.scrollBy('#bench .uix-table-wrap', px, 30), 1000 * pitch);
  if (rows >= 1100) {
    await page.waitForFunction(() => /INC-1010\d\d/.test(document.querySelector('#bench tbody')?.textContent ?? ''), null, { timeout: 5000 })
      .catch(() => { throw new Error('after scrolling 1,000 rows, rows ~1,000–1,099 are not rendered'); });
  }
  out['scroll 1,000 rows: p95 frame'] = frameStats(scroll.intervals).p95;
  out['scroll 1,000 rows: total'] = round1(scroll.total);

  const title = ws.getByRole('button', { name: /^Title/ });
  out.sort = await interaction(page, 'click', () => title.click());
  const sorted = await ws.locator('th[aria-sort="ascending"]').count();
  if (sorted !== 1) throw new Error('the Title header did not sort ascending');

  const all = ws.getByRole('checkbox').first();
  out['select all'] = await interaction(page, 'click', () => all.click());
  if (!(await all.isChecked())) throw new Error('select all did not check');

  const search = ws.getByRole('searchbox');
  await search.focus();
  let worst = 0;
  for (const ch of 'vpn') worst = Math.max(worst, await interaction(page, 'keydown', () => page.keyboard.type(ch)));
  out['search keystroke (worst of 3)'] = worst;
  await page.waitForFunction(() => {
    const cells = [...document.querySelectorAll('#bench tbody td')].map((td) => td.textContent ?? '');
    return cells.some((t) => t.includes('VPN')) && !cells.some((t) => t.includes('Printer'));
  }, null, { timeout: 5000 }).catch(() => { throw new Error('the search for "vpn" did not narrow the rows'); });
  return out;
}

async function overlaysRun(page, suffix) {
  const out = {};
  if (!suffix) out.calibration = round1(await page.evaluate(() => window.__perf.calibrate()));
  const frames = async (name, act, check) => {
    await page.evaluate(() => window.__perf.startFrames());
    out[`${name}${suffix}: latency`] = await interaction(page, 'click', act);
    const stats = frameStats(await page.evaluate(() => window.__perf.stopFramesAfter(800)));
    await check();
    out[`${name}${suffix}: p95 frame`] = stats.p95;
    out[`${name}${suffix}: longest frame`] = stats.max;
  };
  for (const [name, trigger] of [['modal open', '#open-modal'], ['drawer open', '#open-drawer']]) {
    await frames(name, () => page.click(trigger), async () => {
      if (!(await page.locator('dialog[open]').count())) throw new Error(`${name}: no open dialog`);
    });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
    await page.waitForTimeout(400);
  }
  const scroll = await page.evaluate(() => window.__perf.scrollBy('#edge-list', 4000, 60));
  if (!(await page.evaluate(() => document.querySelector('#edge-list').scrollTop > 1000))) throw new Error('the soft-edged list did not scroll');
  const s = frameStats(scroll.intervals);
  out[`scroll edges${suffix}: p95 frame`] = s.p95;
  out[`scroll edges${suffix}: longest frame`] = s.max;
  const pill = page.locator('.uix-task-tray__pill');
  await frames('task tray open', () => pill.click(), async () => {
    if ((await pill.getAttribute('aria-expanded')) !== 'true') throw new Error('the task tray did not expand');
  });
  return out;
}

const LANES = {
  workspace: {
    // medians are divided by the runner's speed (calibration ÷ the baseline run's calibration)
    normalize: true,
    launch: {},
    pages: (base, rows) => [{ url: `${base}/tests/perf/harness.html?scene=workspace&rows=${rows}`, run: (page) => workspaceRun(page, rows) }],
  },
  'no-gpu': {
    // frame intervals come in whole vsyncs, so they are not scaled; calibration is reported only
    normalize: false,
    // the full Chromium (new headless), not the headless shell, so the compositor is the one Chrome ships
    launch: { channel: 'chromium', args: GPU_OFF },
    pages: (base) => [
      { url: `${base}/tests/perf/harness.html?scene=overlays`, run: (page) => overlaysRun(page, '') },
      { url: `${base}/tests/perf/harness.html?scene=overlays&transparency=reduce`, run: (page) => overlaysRun(page, ' (no blur)') },
    ],
  },
};

async function measure(browser, base, spec, cpu, rows, runs) {
  const records = [];
  for (let i = 0; i <= runs; i += 1) {
    const record = {};
    for (const { url, run } of LANES[spec].pages(base, rows)) {
      const { context, page, errors } = await openPage(browser, url, cpu);
      try {
        Object.assign(record, await run(page));
        if (errors.length) throw errors[0];
      } finally {
        await context.close();
      }
    }
    if (i === 0) { console.log('  warm-up run done (not counted)'); continue; }
    records.push(record);
    console.log(`  run ${i}/${runs}: ${Object.entries(record).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  }
  return records;
}

const fmt = (n) => (n == null ? '—' : `${n} ms`);
function markdown(report) {
  const lines = [
    `### Performance lane \`${report.lane}\` — ${report.status}`,
    '',
    `${report.browser}, CPU throttling ${report.cpu}×, ${report.runs} runs after a warm-up${report.rowCount ? `, ${report.rowCount.toLocaleString('en-US')} rows` : ''}. Each figure is the median of the runs; the limit is baseline + max(${report.tolerance.ratio * 100}%, ${report.tolerance.floorMs} ms).`,
    '',
  ];
  const c = report.calibration;
  if (c?.median != null) {
    lines.push(c.normalized
      ? `Runner speed: calibration ${c.median} ms against ${c.baseline} ms on the baseline runner, so this runner reads ${c.factor}× — the medians below are divided by ${c.factor} before the gate (raw median alongside).`
      : `Calibration: ${c.median} ms${c.baseline != null ? ` (baseline runner ${c.baseline} ms)` : ''}${report.lane === 'no-gpu' ? '; frame times are not scaled' : ''}.`, '');
  }
  lines.push('| metric | median | raw median | p75 | min – max | baseline | limit | |', '|---|---:|---:|---:|---:|---:|---:|---|');
  for (const row of report.rows) {
    const s = report.summaries[row.metric];
    const mark = { ok: '✓', over: '✗ over', unbudgeted: '✗ no baseline', unmeasured: '✗ not measured', report: '' }[row.status];
    lines.push(`| ${row.metric} | ${fmt(row.median)} | ${fmt(report.raw?.[row.metric]?.median)} | ${fmt(s?.p75)} | ${s ? `${s.min} – ${s.max}` : '—'} | ${fmt(row.baseline)} | ${fmt(row.limit)} | ${mark} |`);
  }
  if (report.lane === 'no-gpu') {
    lines.push('', 'Blur cost (default − `data-transparency="reduce"`, median p95 frame):', '');
    for (const metric of Object.keys(report.summaries).filter((m) => m.endsWith(': p95 frame') && !m.includes('(no blur)'))) {
      const reduced = report.summaries[metric.replace(':', ' (no blur):')];
      if (reduced) lines.push(`- ${metric.replace(': p95 frame', '')}: ${round1(report.summaries[metric].median - reduced.median)} ms`);
    }
  }
  if (report.lane === 'workspace') {
    const interactions = ['sort', 'select all', 'search keystroke (worst of 3)'];
    const worst = Math.max(...interactions.map((m) => report.summaries[m]?.p75 ?? 0));
    lines.push('', `INP field target: ≤ 200 ms at p75. The slowest interaction here reads ${worst} ms at p75 (lab, ${report.cpu}× throttled — a proxy, not field INP).`);
  }
  return lines.join('\n') + '\n';
}

async function runLane(spec) {
  const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));
  const laneBudget = budgets.lanes[spec];
  const cpu = Number(opt('cpu', laneBudget.cpu));
  const runs = Number(opt('runs', laneBudget.runs));
  const rows = Number(opt('rows', 10_000));
  const out = resolve(opt('out', 'perf-report'));
  let reportOnly = flag('report-only');
  if (cpu !== laneBudget.cpu || (spec === 'workspace' && rows !== 10_000)) {
    console.warn(`! the budgets were taken at ${laneBudget.cpu}× and 10,000 rows; this run reports only.`);
    reportOnly = true;
  }
  if (!existsSync(join(HERE, 'dist', 'harness.js'))) throw new Error('tests/perf/dist/harness.js is missing — run `node tests/perf/build.mjs` (and `npm run build` for the CSS).');

  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(LANES[spec].launch);
  try {
    console.log(`lane ${spec}: ${browser.version()}, CPU ${cpu}×, ${runs} runs + 1 warm-up`);
    let records = await measure(browser, base, spec, cpu, rows, runs);
    let judged = judge(records, laneBudget, LANES[spec].normalize);
    if (!reportOnly && judged.rows.some((r) => r.status === 'over')) {
      console.log(`  ${judged.rows.filter((r) => r.status === 'over').map((r) => r.metric).join(', ')} over the limit — measuring ${runs} more runs before deciding`);
      records = records.concat(await measure(browser, base, spec, cpu, rows, runs));
      judged = judge(records, laneBudget, LANES[spec].normalize);
    }
    const { summaries, raw, calibration } = judged;
    const rowsOut = judged.rows;
    const failed = reportOnly ? [] : failing(rowsOut);
    const report = {
      lane: spec, date: new Date().toISOString(), browser: `Chromium ${browser.version()}${spec === 'no-gpu' ? ' (GPU off)' : ''}`, cpu, runs: records.length,
      rowCount: spec === 'workspace' ? rows : undefined, tolerance: laneBudget.tolerance,
      status: reportOnly ? 'report only' : failed.length ? 'FAILED' : 'passed',
      calibration, raw, summaries, rows: rowsOut.map((r) => (reportOnly && r.status !== 'ok' ? { ...r, status: 'report' } : r)),
    };
    mkdirSync(out, { recursive: true });
    const md = markdown(report);
    writeFileSync(join(out, `${spec}.json`), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(out, `${spec}.md`), md);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
    console.log(`\n${md}\nreport: ${join(out, `${spec}.json`)}`);
    if (failed.length) {
      console.error(`✗ ${spec}: ${failed.map((r) => `${r.metric} (${r.status})`).join(', ')}`);
      if (failed.some((r) => r.status !== 'over')) console.error('  A metric without a baseline, or a baseline without a metric: adopt a CI report (node tests/perf/bench.mjs adopt <report.json>).');
      return 1;
    }
    return 0;
  } finally {
    await browser.close();
    server.close();
  }
}

function adopt(file) {
  const report = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const budgets = JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));
  const laneBudget = budgets.lanes[report.lane];
  if (!laneBudget) throw new Error(`unknown lane ${report.lane}`);
  if (report.cpu !== laneBudget.cpu) throw new Error(`the report ran at ${report.cpu}×; the lane budgets ${laneBudget.cpu}×`);
  // the run's own (unscaled) medians and its calibration: together they define the baseline runner
  laneBudget.metrics = Object.fromEntries(Object.entries(report.raw).map(([metric, s]) => [metric, { baseline: s.median }]));
  if (report.calibration?.median != null) laneBudget.calibration = report.calibration.median;
  laneBudget.adoptedFrom = { date: report.date, browser: report.browser, runs: report.runs };
  writeFileSync(BUDGETS_PATH, JSON.stringify(budgets, null, 2) + '\n');
  console.log(`✓ ${report.lane}: ${Object.keys(laneBudget.metrics).length} baselines from ${file}`);
  return 0;
}

if (lane === 'adopt') process.exitCode = adopt(argv[1]);
else if (lane in LANES) process.exitCode = await runLane(lane);
else {
  console.error('usage: node tests/perf/bench.mjs <workspace | no-gpu | adopt report.json> [--runs N] [--cpu N] [--rows N] [--out DIR] [--report-only]');
  process.exitCode = 2;
}
