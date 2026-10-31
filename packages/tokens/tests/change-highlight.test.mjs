/* The change highlight's room and strength, pinned because missing CSS fails to nothing.
 * Run: npm run test:tokens */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles/components/change-highlight.css', import.meta.url), 'utf8');

const percent = (source, label) => {
  const match = source.match(/--uix-change-strength: (\d+)%/);
  assert.ok(match, `${label} sets --uix-change-strength`);
  return Number(match[1]);
};

test('a dark surface gets a stronger tint than a light one', () => {
  const light = percent(css, 'the base rule');
  const dark = css.match(/:root:where\(\.dark,\[data-theme="dark"\]\)[^{]*\{([^}]*)\}/);
  assert.ok(dark, 'there is a dark rule');
  assert.ok(percent(dark[1], 'the dark rule') > light);
});

test('the tint has room round the value, and the same margin given back moves nothing', () => {
  const rule = css.match(/span\.uix-change-highlight[^{]*\{([^}]*)\}/);
  assert.ok(rule, 'the inline wrapper has its own rule');
  const padding = rule[1].match(/padding: ([^;]+);/);
  const margin = rule[1].match(/margin: ([^;]+);/);
  assert.ok(padding && margin, 'padding and margin are both set');
  const tokens = (value) => value.match(/var\(--uix-space-\d+\)/g);
  assert.deepEqual(tokens(margin[1]), tokens(padding[1]));
  assert.equal(margin[1].match(/calc\(-1 \*/g)?.length, tokens(padding[1]).length);
});

test('rows and rings are left alone: they have their own edges', () => {
  assert.match(css, /span\.uix-change-highlight:not\(\.uix-change-highlight--ring\)/);
});
