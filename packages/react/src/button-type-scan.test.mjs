/* Every kit <button> that is not meant to submit says type="button" (HAR-1764).
 *
 * A <button> with no type is a submit button, so a kit control placed inside a consumer's <form>
 * sent the form: a Tabs strip in TENSOR's article editor submitted it on every click and on every
 * arrow key (automatic activation clicks the tab). This scans each React source for an opening
 * `<button` tag without `type=`. `Button` itself is the one exception: it is the generic button,
 * takes `type` from its props and keeps the HTML default, so `<Button type="submit">` and a plain
 * `<Button>` in a form behave as a <button> does. The scan is calibrated against known snippets so
 * a parser that finds nothing cannot pass. Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Opening `<button …>` tags (JSX, braces balanced) that carry no `type=`. Comments are skipped. */
export const untypedButtons = (code) => {
  const source = code.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1');
  const found = [];
  for (const match of source.matchAll(/<button\b/g)) {
    let i = match.index + match[0].length;
    let depth = 0;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) break;
    }
    const tag = source.slice(match.index, i + 1);
    if (!/\btype=/.test(tag) && !/\{\.\.\.\w+\(/.test(tag)) found.push({ line: source.slice(0, match.index).split('\n').length, tag: tag.replace(/\s+/g, ' ').slice(0, 100) });
  }
  return found;
};

/** The one component whose `type` is the consumer's: the generic Button (see the header). */
const isGenericButton = (file, tag) => file === 'components/Button.tsx' && tag.includes('ref={ref}');

test('the scan finds an untyped <button> and passes a typed one (calibration)', () => {
  assert.equal(untypedButtons('<button className="x" onClick={() => go({ a: 1 })}>Go</button>').length, 1);
  assert.equal(untypedButtons('<button\n  role="tab"\n  className={cx("a", b > c && "d")}\n>x</button>').length, 1);
  assert.equal(untypedButtons('<button type="button" onClick={go}>Go</button>').length, 0);
  assert.equal(untypedButtons('<button className="x" {...entryProps(entry)}>Go</button>').length, 0, 'props from a helper that sets type');
  assert.equal(untypedButtons('// a <button> in a comment\n/* or <button> here */').length, 0);
});

test('every kit <button> but the generic Button carries a type', () => {
  const files = readdirSync(here, { recursive: true }).map((f) => f.replaceAll('\\', '/')).filter((f) => f.endsWith('.tsx'));
  assert.ok(files.filter((f) => f.startsWith('components/')).length > 50, 'the components were found');
  const findings = [];
  for (const file of files) {
    for (const { line, tag } of untypedButtons(readFileSync(join(here, file), 'utf8'))) {
      if (!isGenericButton(file, tag)) findings.push(`${file}:${line} ${tag}`);
    }
  }
  assert.deepEqual(findings, [], 'add type="button" (or type={type} from props for a submit-capable control)');
});

test('the helper-spread exception holds: SchedulingCalendar entries get type="button" from entryProps', () => {
  const code = readFileSync(join(here, 'components/SchedulingCalendar.tsx'), 'utf8');
  assert.match(code, /const entryProps = \(entry: SchedulingCalendarEntry\) => \(\{\s*type: 'button' as const,/);
});
