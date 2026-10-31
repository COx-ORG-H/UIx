import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

test('the shipped component inventory matches the public source exports', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/component-inventory.mjs', import.meta.url))], { stdio: 'inherit' });
  const inventory = JSON.parse(readFileSync(new URL('../component-inventory.json', import.meta.url), 'utf8'));
  for (const name of ['XIcon', 'XCircleIcon']) assert.ok(inventory.components.some((entry) => entry.name === name && entry.subpath === './icons'), name);
});
