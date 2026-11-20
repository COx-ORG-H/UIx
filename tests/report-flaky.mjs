/* Names the browser tests that passed only on their retry. CI retries a failed test once
 * (playwright.config.mjs), so a race that fails one run in three still shows a green check, and
 * nobody hears of it until two PRs in a row fail on it. This reads the run's JSON report and lists
 * every such test as a warning on the run and in the job summary. It never fails the job: the
 * retry already decided pass or fail; this only makes the flake visible so it gets fixed.
 *
 *   node tests/report-flaky.mjs test-results/playwright-results.json */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'test-results/playwright-results.json';
if (!existsSync(file)) {
  console.log(`report-flaky: no report at ${file} (the run did not finish); nothing to say`);
  process.exit(0);
}

/** Every test that ended `flaky` (failed, then passed on a retry), with its first error line. */
export function flakyTests(report) {
  const found = [];
  const visit = (suite, trail) => {
    for (const child of suite.suites ?? []) visit(child, child.title ? [...trail, child.title] : trail);
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (t.status !== 'flaky') continue;
        const failed = (t.results ?? []).find((r) => r.status !== 'passed');
        const message = failed?.error?.message ?? failed?.errors?.[0]?.message ?? '';
        found.push({
          file: spec.file, line: spec.line, project: t.projectName,
          title: [...trail.filter((s) => !s.endsWith('.spec.mjs')), spec.title].join(' › '),
          // strip ANSI colours; the first line is the assertion
          error: message.replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) ?? '',
        });
      }
    }
  };
  for (const suite of report.suites ?? []) visit(suite, [suite.title]);
  return found;
}

const flaky = flakyTests(JSON.parse(readFileSync(file, 'utf8')));
if (!flaky.length) {
  console.log('report-flaky: no test needed its retry');
  process.exit(0);
}
const escape = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
for (const f of flaky) {
  console.log(`::warning file=tests/${f.file},line=${f.line},title=Flaky: passed only on retry (${f.project})::${escape(`${f.title}\n${f.error}`)}`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = flaky.map((f) => `| \`tests/${f.file}:${f.line}\` | ${f.project} | ${f.title.replace(/\|/g, '\\|')} | ${f.error.replace(/\|/g, '\\|').slice(0, 160)} |`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    `### ${flaky.length} test(s) passed only on retry`,
    '',
    'Green, but a race: it failed once in this run. Fix the wait (poll for the value you expect; let overlays settle) rather than leaning on the retry.',
    '',
    '| Spec | Project | Test | First failure |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'));
}
console.log(`report-flaky: ${flaky.length} test(s) passed only on retry`);
