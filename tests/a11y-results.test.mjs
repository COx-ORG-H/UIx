/* The screen-reader evidence stays honest and machine-readable (Docs/a11y/manual-sr-protocol.md §3):
 * every result file's header has exactly the keys of its protocol with allowed values, names a real
 * component stylesheet, and the docs' status table (packages/tokens/docs/at-status.js) says what the
 * file says. A row claiming a pass that no result file records fails here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AT_AUTOMATED, AT_PAIRINGS, AT_STATUS } from '../packages/tokens/docs/at-status.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const A11Y = join(ROOT, 'Docs', 'a11y');
const RESULTS = join(A11Y, 'results');

const V1_KEYS = ['component', 'uix-version', 'tester', 'date', 'nvda-firefox', 'jaws-chrome', 'voiceover-safari'];
const V2_KEYS = ['component', 'protocol', 'uix-version', 'tester', 'date', ...AT_PAIRINGS.map((p) => p.key), ...AT_AUTOMATED.map((a) => a.key)];
const HUMAN = new Set(['pass', 'fail', 'na', 'not-run']);
/** A pairing's column in the checklist table and the words its transcript rows name it by. */
const COLUMN = {
  'nvda-chrome': 'NVDA+Chrome', 'jaws-chrome': 'JAWS+Chrome', 'jaws-edge': 'JAWS+Edge', 'voiceover-safari': 'VO macOS',
  'voiceover-ios': 'VO iOS', 'talkback-chrome': 'TalkBack', 'nvda-firefox': 'NVDA+FF', 'narrator-edge': 'Narrator',
};
const label = (key) => AT_PAIRINGS.find((p) => p.key === key).label;

/** The rows of the markdown table under `## <heading>`, as arrays of trimmed cells (header first). */
function tableUnder(markdown, heading) {
  const section = markdown.split(new RegExp(`^## ${heading}\\s*$`, 'm'))[1]?.split(/^## /m)[0] ?? '';
  return section.split(/\r?\n/).filter((line) => line.trim().startsWith('|') && !/^\|[\s|-]+\|$/.test(line.trim()))
    .map((line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) => cell.trim()));
}

/**
 * Problems with a protocol-2 file's evidence: a pairing a person ran (`pass` / `fail`) needs at
 * least one transcript row naming that pairing with something heard, and a pass, fail or na in
 * every checklist row of its column. A verdict in the header alone is not a run.
 */
function evidenceProblems(markdown) {
  const header = Object.fromEntries(readHeader(markdown));
  const problems = [];
  const transcript = tableUnder(markdown, 'Transcript').slice(1);
  const [checklistHead, ...checklist] = tableUnder(markdown, 'Checklist results');
  for (const { key } of AT_PAIRINGS) {
    if (!['pass', 'fail'].includes(header[key])) continue;
    const rows = transcript.filter(([, pairing, heard]) => pairing?.includes(label(key)) && heard && heard !== '—');
    if (!rows.length) problems.push(`${key} is ${header[key]} but no transcript row records what ${label(key)} said`);
    const col = checklistHead?.indexOf(COLUMN[key]) ?? -1;
    const blank = col < 0 ? checklist.length || 8 : checklist.filter((cells) => !/^(pass|fail|na)/.test(cells[col] ?? '')).length;
    if (blank) problems.push(`${key} is ${header[key]} but ${blank} checklist row(s) in its column have no pass, fail or na`);
  }
  return problems;
}
const AUTOMATED = new Set(['pass', 'fail', 'not-run']);

/** The first ```yaml block after "## Header", as ordered [key, value] pairs. */
function readHeader(markdown) {
  const block = markdown.split(/^## Header.*$/m)[1]?.match(/```yaml\r?\n([\s\S]*?)```/)?.[1];
  if (block == null) throw new Error('no ```yaml header block under "## Header"');
  return block.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const at = line.indexOf(':');
    if (at < 0) throw new Error(`not a key: value line: ${line}`);
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  });
}

const files = readdirSync(RESULTS).filter((name) => name.endsWith('.md')).sort();
const headers = new Map(files.map((name) => [name.replace(/\.md$/, ''), readHeader(readFileSync(join(RESULTS, name), 'utf8'))]));

test('the template header lists protocol 2\'s keys, in order', () => {
  const keys = readHeader(readFileSync(join(A11Y, 'result-template.md'), 'utf8')).map(([key]) => key);
  assert.deepEqual(keys, V2_KEYS);
});

test('every result file has its protocol\'s keys, in order, with allowed values, for a real component', () => {
  assert.ok(files.length >= 7, `expected the button file and the six widget files, found ${files.join(', ')}`);
  for (const [id, header] of headers) {
    const map = Object.fromEntries(header);
    const keys = header.map(([key]) => key);
    const protocol2 = map.protocol === '2';
    assert.deepEqual(keys, protocol2 ? V2_KEYS : V1_KEYS, `${id}.md header keys`);
    assert.equal(map.component, id, `${id}.md names component ${map.component}`);
    assert.ok(existsSync(join(ROOT, 'packages', 'tokens', 'styles', 'components', `${id}.css`)), `${id} is not a component stylesheet`);
    assert.match(map['uix-version'], /^\d+\.\d+\.\d+$/, `${id}.md uix-version`);
    assert.match(map.date, /^\d{4}-\d{2}-\d{2}$/, `${id}.md date`);
    for (const { key } of AT_PAIRINGS) if (key in map) assert.ok(HUMAN.has(map[key]), `${id}.md ${key}: ${map[key]}`);
    for (const { key } of AT_AUTOMATED) if (key in map) assert.ok(AUTOMATED.has(map[key]), `${id}.md ${key}: ${map[key]}`);
    if (protocol2) {
      const humanRun = AT_PAIRINGS.some(({ key }) => ['pass', 'fail'].includes(map[key]));
      assert.equal(map.tester === 'none', !humanRun, `${id}.md: tester "none" exactly when no pairing was run by a person`);
    }
  }
});

test('a pairing marked pass or fail has its transcript and checklist; a header-only claim is refused', () => {
  for (const [id] of headers) {
    const markdown = readFileSync(join(RESULTS, `${id}.md`), 'utf8');
    if (Object.fromEntries(headers.get(id)).protocol === '2') assert.deepEqual(evidenceProblems(markdown), [], `${id}.md evidence`);
  }
  // The claim this guards against: flip the header to pass and leave the sections as they are.
  const forged = readFileSync(join(RESULTS, 'command-palette.md'), 'utf8').replace('nvda-chrome: not-run', 'nvda-chrome: pass');
  const problems = evidenceProblems(forged);
  assert.equal(problems.length, 2, problems.join('; '));
  assert.match(problems[0], /no transcript row/);
  assert.match(problems[1], /checklist row\(s\)/);
});

test('the docs status table matches the result files, row for row', () => {
  assert.deepEqual(AT_STATUS.map((row) => row.id).sort(), [...headers.keys()].sort(), 'one status row per result file');
  for (const row of AT_STATUS) {
    const map = Object.fromEntries(headers.get(row.id));
    assert.equal(row.protocol, map.protocol === '2' ? 2 : 1, `${row.id} protocol`);
    assert.equal(row.version, map['uix-version'], `${row.id} version`);
    assert.equal(row.date, map.date, `${row.id} date`);
    assert.equal(row.tester, map.tester, `${row.id} tester`);
    for (const { key } of [...AT_PAIRINGS, ...AT_AUTOMATED]) {
      if (!(key in map)) { assert.ok(!['pass', 'fail'].includes(row.results[key]), `${row.id} ${key}: the table claims a run the file does not record`); continue; }
      // Protocol 1 wrote `na` for "not run" (protocol §1).
      const fileValue = map.protocol === '2' || map[key] !== 'na' ? map[key] : 'not-run';
      assert.equal(row.results[key] ?? 'not-run', fileValue, `${row.id} ${key}`);
    }
    assert.ok(row.knownIssues.length > 0 || AT_PAIRINGS.every(({ key }) => map[key] === 'pass'), `${row.id}: a row with no pass everywhere lists what is open`);
  }
});

test('every widget script has a result file and the other way round', () => {
  const scripts = readdirSync(join(A11Y, 'scripts')).filter((name) => name !== 'README.md' && name.endsWith('.md')).map((name) => name.replace(/\.md$/, ''));
  for (const id of scripts) assert.ok(headers.has(id), `scripts/${id}.md has no results/${id}.md`);
  for (const [id, header] of headers) {
    if (Object.fromEntries(header).protocol === '2') assert.ok(scripts.includes(id), `results/${id}.md has no scripts/${id}.md`);
  }
});
