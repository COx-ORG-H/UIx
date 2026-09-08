import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = JSON.parse(readFileSync(new URL("../themes/mission-control.tokens.json", import.meta.url), "utf8"));

test("Mission Control heat and absence roles are total in both themes", () => {
  for (const name of ["nodata", "stale", "heat-0", "heat-1", "heat-2", "heat-3"]) {
    assert.equal(typeof source[name]?.light, "string", `${name} light`);
    assert.equal(typeof source[name]?.dark, "string", `${name} dark`);
  }
});

test("the aura is a dark-only recipe", () => {
  assert.equal(source["aura-alpha"].light, "0");
  assert.equal(source["aura-blur"].light, "0");
  assert.equal(source["aura-spread"].light, "0");
  assert.notEqual(source["aura-alpha"].dark, "0");
});
