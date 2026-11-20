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
