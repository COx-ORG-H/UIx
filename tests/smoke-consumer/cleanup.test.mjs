import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { removeConsumer } from './cleanup.mjs';

test('smoke cleanup removes links without following them outside the consumer', () => {
  const outside = mkdtempSync(join(tmpdir(), 'uix-target-'));
  const consumer = mkdtempSync(join(tmpdir(), 'uix-smoke-'));
  const sentinel = join(outside, 'keep.txt');
  try {
    writeFileSync(sentinel, 'keep');
    mkdirSync(join(consumer, 'node_modules'));
    symlinkSync(outside, join(consumer, 'node_modules', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    removeConsumer(consumer);
    assert.equal(existsSync(consumer), false);
    assert.equal(existsSync(sentinel), true);
    assert.throws(() => removeConsumer(outside), /non-smoke/);
  } finally {
    if (existsSync(sentinel)) unlinkSync(sentinel);
    if (existsSync(outside)) rmdirSync(outside);
  }
});
