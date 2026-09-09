import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThreeWayDiff, summarizeDiff } from './diff-model.ts';

test('three-way diff groups added, removed, changed, and conflicted leaves', () => {
  const entries = buildThreeWayDiff(
    { kept: 1, removed: true, changed: 'base', conflict: 'base' },
    { kept: 1, removed: true, changed: 'base', conflict: 'current' },
    { kept: 1, added: true, changed: 'incoming', conflict: 'incoming' },
  );
  assert.deepEqual(entries.map(({ path, kind }) => [path, kind]), [
    ['$.added', 'added'],
    ['$.changed', 'changed'],
    ['$.conflict', 'conflicted'],
    ['$.removed', 'removed'],
  ]);
  assert.deepEqual(summarizeDiff(entries, { '$.added': 'accept' }), {
    added: 1, removed: 1, changed: 1, conflicted: 1, resolved: 1, pending: 3,
  });
});
