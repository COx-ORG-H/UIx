/* R4 AC5: every zone test runs under TZ=UTC, TZ=Europe/Berlin and TZ=America/New_York.
 * CI runs one `node --test`, so this file re-runs the zone suites in a child process per
 * zone. Each child also checks that its TZ really took effect (the January offset), so a
 * platform that ignores TZ fails here instead of passing three identical runs.
 * Run: node --test (from packages/react). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const suites = ['calendar-model.test.mjs', 'calendar-model-formatters.test.mjs'];
const zones = [['UTC', '0'], ['Europe/Berlin', '-60'], ['America/New_York', '300']];

for (const [zone, offset] of zones) {
  test(`calendar model suites pass under TZ=${zone}`, () => {
    // A fresh runner: without NODE_TEST_CONTEXT the child does not report to this one.
    const env = { ...process.env, TZ: zone, UIX_EXPECT_TZ_OFFSET: offset };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', ...suites.map((file) => join(here, file))], {
      cwd: here, encoding: 'utf8', env,
    });
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.match(result.stdout, /^# fail 0$/m, output);
    assert.match(result.stdout, /^# pass [1-9]\d*$/m, output);
  });
}
