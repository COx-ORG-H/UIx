/* The zone tests of SchedulingCalendar (HAR-1506, U2) under TZ=UTC, Europe/Berlin and
 * America/New_York: day membership, spans and windows must not depend on the process time
 * zone (R4 AC3/AC5). CI runs one `node --test`, so each zone re-runs the suites in a child
 * process that also checks its TZ took effect (the January offset). Same wiring as U1's
 * calendar-model-zones.test.mjs. Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const suites = [
  'scheduling-calendar-model.test.mjs', 'scheduling-calendar-dom.test.mjs', 'scheduling-calendar-formatters-dom.test.mjs',
  // HAR-1509 (U3): the Week/Day time grid
  'scheduling-time-grid-model.test.mjs', 'scheduling-time-grid-dom.test.mjs',
];
const zones = [['UTC', '0'], ['Europe/Berlin', '-60'], ['America/New_York', '300']];

for (const [zone, offset] of zones) {
  test(`scheduling calendar suites pass under TZ=${zone}`, () => {
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
