import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compareToBaseline, lowerBaseline, physicalOf, scanCss, total } from "../scripts/check-logical.mjs";

/*
 * The logical-properties gate (scripts/check-logical.mjs, roadmap #20): what counts as physical, the
 * allow comment, and the ratchet (a count may not rise, a fall must lower the baseline, --update only
 * lowers). The last test runs the gate on the real stylesheets, so a seeded `left` would turn it red.
 */
const keys = (css) => scanCss(`@layer uix.components { ${css} }`, "seed.css").counts;

test("physical properties and keywords count; their logical twins and custom properties do not", () => {
  assert.deepEqual(keys(".a { left: 0; margin-right: 4px; padding-left: 1em; border-left: 1px solid; border-top-right-radius: 2px; }"), {
    left: 1, "margin-right": 1, "padding-left": 1, "border-left": 1, "border-top-right-radius": 1,
  });
  assert.deepEqual(keys(".a { text-align: left; float: right; clear: left !important; }"), {
    "text-align: left": 1, "float: right": 1, "clear: left": 1,
  });
  assert.deepEqual(keys(".a { inset-inline-start: 0; margin-inline-end: 4px; padding-inline: 1em; border-inline-start: 1px solid; border-start-end-radius: 2px; text-align: start; float: inline-end; --x-left: 4px; text-align: center; }"), {});
  assert.deepEqual(keys(".a { margin: 0 4px 0 8px; inset: 0; }"), {}, "four-sided shorthands are not judged");
});

test("the logical twin is named for every physical key", () => {
  assert.equal(physicalOf("left", "0").twin, "inset-inline-start");
  assert.equal(physicalOf("border-bottom-left-radius", "4px").twin, "border-end-start-radius");
  assert.equal(physicalOf("text-align", "right").twin, "text-align: end");
  assert.equal(physicalOf("float", "left").twin, "float: inline-start");
  assert.equal(physicalOf("--foo-left", "0"), null);
  assert.equal(physicalOf("text-align", "constructor"), null, "a keyword is looked up as an own key, not on the prototype");
});

test("a logical-allow comment right before a declaration exempts it, with its reason", () => {
  const scan = scanCss(".a { /* logical-allow: centred with translateX(-50%) */ left: 50%; right: 0; }", "seed.css");
  assert.deepEqual(scan.counts, { right: 1 }, "only the declaration after the comment is exempt");
  assert.equal(scan.allowed.length, 1);
  assert.match(scan.allowed[0], /centred with translateX/);
  assert.deepEqual(scanCss(".a { /* logical-allow: */ left: 0; }", "seed.css").counts, { left: 1 }, "an allow without a reason does not count");
});

test("the ratchet: a rise fails with the declarations named; a fall fails until the baseline is lowered", () => {
  const scans = { "a.css": scanCss(".a { left: 0; } .b { left: 1px; padding-left: 0; }", "a.css") };
  const { grew, shrank } = compareToBaseline(scans, { files: { "a.css": { left: 1, "padding-left": 2 }, "gone.css": { right: 1 } } });
  assert.deepEqual(grew.map((g) => [g.file, g.key, g.now, g.baseline]), [["a.css", "left", 2, 1]]);
  assert.equal(grew[0].decls.length, 2, "the message lists every declaration of that key");
  assert.deepEqual(shrank.map((s) => [s.file, s.key, s.now, s.baseline]), [["a.css", "padding-left", 1, 2], ["gone.css", "right", 0, 1]]);
  assert.deepEqual(compareToBaseline(scans, { files: {} }).grew.map((g) => g.key), ["left", "padding-left"], "a file not in the baseline is held at 0");
});

test("--update only lowers: a rise is never written, a zero entry is dropped", () => {
  const scans = { "a.css": scanCss(".a { left: 0; left: 1px; left: 2px; }", "a.css") };
  const next = lowerBaseline(scans, { about: "x", files: { "a.css": { left: 2, right: 3 }, "gone.css": { right: 1 } } });
  assert.deepEqual(next, { about: "x", files: { "a.css": { left: 2 } } });
  assert.equal(total(next.files), 2);
});

test("the gate passes on the shipped stylesheets, and the baseline only lists what is there", () => {
  const script = fileURLToPath(new URL("../scripts/check-logical.mjs", import.meta.url));
  const out = execFileSync(process.execPath, [script], { encoding: "utf8" });
  assert.match(out, /✓ logical properties OK/);
  const baseline = JSON.parse(readFileSync(new URL("./logical-properties.baseline.json", import.meta.url), "utf8"));
  assert.ok(total(baseline.files) > 0 && total(baseline.files) < 335, "the debt the gate arrived with (335) has gone down");
});
