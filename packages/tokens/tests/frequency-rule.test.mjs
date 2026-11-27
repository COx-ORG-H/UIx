import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * The frequency rule (Foundations › Motion): the more often something is seen, the less it moves.
 * Daily controls settle in about 150 ms or less, and anything started from the keyboard is instant.
 * These hold the timings of the daily controls the 2.60 study had slowed down, read from the token
 * source and the component CSS; the motion itself is measured in Chromium by
 * tests/a11y/motion-policy.spec.mjs and tests/a11y/motion-glide.spec.mjs.
 */

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const effect = JSON.parse(read("../tokens/base/effect.json"));
const css = (name) => read(`../styles/components/${name}.css`);
const ms = (name) => {
  const token = effect[name];
  assert.ok(token, `--uix-${name} exists`);
  const m = /^(\d+)ms$/.exec(token.$value);
  assert.ok(m, `--uix-${name} is in ms`);
  return Number(m[1]);
};
const DAILY = 150;

test("a menu or select list settles within the daily budget", () => {
  assert.ok(ms("dur-menu") <= DAILY);
});

test("a checkbox is fully ticked within --uix-dur-check: the tick starts with the fill", () => {
  assert.ok(ms("dur-check") <= DAILY);
  const box = css("checkbox");
  assert.doesNotMatch(box, /--uix-delay-draw|--uix-dur-draw/, "no 2.60 draw timing, no delayed tick");
  const checked = /input:checked \+ \.uix-checkbox__box polyline \{([^}]*)\}/.exec(box)[1];
  assert.match(checked, /transition: stroke-dashoffset var\(--uix-dur-check\) var\(--uix-ease-leave\);/, "one duration, no delay");
});

test("a radio dot grows from .6 over --uix-dur-fast on --uix-ease-out, with no overshoot", () => {
  const radio = css("radio");
  const dot = /\.uix-radio__dot::after \{([^}]*)\}/.exec(radio)[1];
  assert.match(dot, /transform: scale\(\.6\)/);
  assert.match(dot, /transform var\(--uix-dur-fast\) var\(--uix-ease-out\)/);
  assert.equal(effect["ease-bounce"], undefined, "the 2.60 bounce spring is gone");
  assert.equal(effect["dur-bounce"], undefined);
});

test("the side peek slides in over --uix-dur-slow on --uix-ease-out, with no overshoot; the drawer keeps its own", () => {
  const drawer = css("drawer");
  const open = /\n  \.uix-peek\[open\] \{([^}]*)\}/.exec(drawer)[1];
  assert.match(open, /transform var\(--uix-dur-slow\) var\(--uix-ease-out\)/);
  assert.doesNotMatch(open, /--uix-ease-drawer|--uix-dur-drawer/);
  const closed = /\n  \.uix-peek \{([^}]*)\}/.exec(drawer)[1];
  assert.match(closed, /transform var\(--uix-dur-exit-slow\) var\(--uix-ease-out\)/, "and leaves without speeding up");
  const shared = /:is\(\.uix-drawer, \.uix-peek\)\[open\] \{([^}]*)\}/.exec(drawer)[1];
  assert.match(shared, /transform var\(--uix-dur-drawer\) var\(--uix-ease-drawer\)/, "the drawer's slide is unchanged");
  assert.ok(ms("dur-slow") <= 240);
});

test("every opt-in icon motion ends within 400 ms", () => {
  const icons = Object.keys(effect).filter((name) => name.startsWith("dur-icon"));
  assert.ok(icons.length >= 5);
  for (const name of icons) assert.ok(ms(name) <= 400, `--uix-${name} is ${ms(name)} ms`);
});

test("numbers count up over 300 ms on arrival", () => {
  assert.equal(ms("dur-arrive-count"), 300);
});
