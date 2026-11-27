import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { spring as builtSpring } from "../build/ts/tokens.js";

/*
 * Spring parameters (motion contract, native consumers). Every spring-sampled `linear()` easing
 * publishes the spring it was sampled from in `$extensions["uix.spring"]` (and the `spring` export
 * of @tensor_1/tokens/ts), so React Native, SwiftUI or Compose can run a real spring instead of
 * replaying 20 samples. These tests hold the published numbers to the curve the web ships: the
 * spring must reproduce every sample, its overshoot must be the one the token documents, and the
 * cubic-bezier fallback must land the same peak.
 */
const effect = JSON.parse(readFileSync(new URL("../tokens/base/effect.json", import.meta.url), "utf8"));
const springs = Object.entries(effect).filter(([, t]) => t.$extensions?.["uix.spring"]);

/** Position of a unit-mass-normalised spring from rest at 0 toward 1, at `t` seconds (closed form). */
function springAt({ stiffness: k, damping: c, mass: m }) {
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/** cubic-bezier(x1, y1, x2, y2) as a function of progress (bisection on x). */
function bezierAt([x1, y1, x2, y2]) {
  const at = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (at(x1, x2, mid) < x) lo = mid; else hi = mid; }
    return at(y1, y2, (lo + hi) / 2);
  };
}

const samples = (value) => /^linear\(([^)]+)\)$/.exec(value)[1].split(",").map(Number);
const ms = (name) => Number(/^(\d+)ms$/.exec(effect[name].$value)[1]);
const peakOf = (f, n = 400) => Math.max(...Array.from({ length: n + 1 }, (_, i) => f(i / n)));

test("every spring-sampled linear() easing publishes its spring", () => {
  const sampled = Object.entries(effect).filter(([name, t]) => name.startsWith("ease-") && /^linear\(/.test(t.$value)).map(([name]) => name);
  assert.deepEqual(springs.map(([name]) => name).sort(), [...sampled].sort());
  assert.deepEqual(sampled.sort(), ["ease-glide", "ease-pop", "ease-tooltip"]);
  for (const [name, t] of springs) {
    const s = t.$extensions["uix.spring"];
    for (const key of ["stiffness", "damping", "mass"]) assert.ok(s[key] > 0, `${name}.${key}`);
    assert.ok(effect[s.durationToken]?.$type === "duration", `${name}: durationToken names a duration token`);
    assert.equal(s.cubicBezier.length, 4, `${name}: cubicBezier is [x1, y1, x2, y2]`);
    assert.ok(s.cubicBezier[0] >= 0 && s.cubicBezier[0] <= 1 && s.cubicBezier[2] >= 0 && s.cubicBezier[2] <= 1, `${name}: bezier x in 0..1`);
    // the description's parameters are the published ones
    assert.match(t.$description, new RegExp(`stiffness ${s.stiffness}, damping ${s.damping}`), `${name}: description and $extensions agree`);
  }
});

for (const [name, t] of springs) {
  const s = t.$extensions["uix.spring"];
  const duration = ms(s.durationToken) / 1000;
  const f = springAt(s);
  const overDuration = (x) => f(x * duration);

  test(`${name}: the spring reproduces every linear() sample`, () => {
    const pts = samples(t.$value);
    // the last point is pinned to 1 (the settle); every other is the spring at i/(n-1) of the duration
    pts.slice(0, -1).forEach((p, i) => {
      const at = overDuration(i / (pts.length - 1));
      assert.ok(Math.abs(at - p) <= 0.015, `${name} sample ${i}: spring ${at.toFixed(4)} vs token ${p}`);
    });
    assert.equal(pts.at(-1), 1);
  });

  test(`${name}: the published overshoot is the spring's and the token's`, () => {
    const springPeak = peakOf(overDuration) - 1;
    const samplePeak = Math.max(...samples(t.$value)) - 1;
    assert.ok(Math.abs(springPeak - s.overshoot) <= 0.001, `spring overshoot ${springPeak.toFixed(4)} vs published ${s.overshoot}`);
    assert.ok(Math.abs(Math.max(samplePeak, 0) - s.overshoot) <= 0.001, `linear() peak ${samplePeak.toFixed(4)} vs published ${s.overshoot}`);
    const documented = /(\d+(?:\.\d+)?) % overshoot/.exec(t.$description);
    if (s.overshoot === 0) assert.match(t.$description, /no overshoot/, `${name}: says it does not overshoot`);
    else {
      assert.ok(documented, `${name}: the description states its overshoot`);
      const decimals = documented[1].split(".")[1]?.length ?? 0;
      assert.equal((s.overshoot * 100).toFixed(decimals), documented[1], `${name}: ${documented[0]} vs published ${s.overshoot}`);
    }
  });

  test(`${name}: the cubic-bezier fallback lands the same peak`, () => {
    const g = bezierAt(s.cubicBezier);
    const peak = peakOf(g) - 1;
    if (s.overshoot === 0) assert.ok(peak <= 0, `${name}: the fallback must not overshoot either (peak ${peak})`);
    else assert.ok(Math.abs(peak - s.overshoot) <= 0.005, `${name}: fallback peak ${peak.toFixed(4)} vs ${s.overshoot}`);
    // close to the spring overall; a bezier cannot wobble, so the bounce gets the most room
    const n = 200;
    const rms = Math.sqrt(Array.from({ length: n + 1 }, (_, i) => (g(i / n) - overDuration(i / n)) ** 2).reduce((a, b) => a + b, 0) / (n + 1));
    assert.ok(rms <= 0.03, `${name}: fallback RMS error ${rms.toFixed(4)}`);
  });
}

test("the built TS output carries the same springs, with the duration resolved", () => {
  assert.deepEqual(Object.keys(builtSpring).sort(), springs.map(([name]) => name).sort(), "run npm run build:tokens");
  for (const [name, t] of springs) {
    const s = t.$extensions["uix.spring"];
    assert.deepEqual(builtSpring[name], { ...s, durationMs: ms(s.durationToken) }, `${name}: build/ts/tokens.js is stale — run npm run build:tokens`);
  }
});
