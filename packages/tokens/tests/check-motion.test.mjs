import assert from "node:assert/strict";
import test from "node:test";
import { checkCss, checkTs } from "../scripts/check-motion.mjs";

/*
 * The motion gate (scripts/check-motion.mjs, HAR-2578) — every rule blocks a seeded violation,
 * and the shape the contract asks for passes. Wrapped in the same @layer the components use.
 */
const layer = (css) => `@layer uix.components { ${css} }`;
const rules = (css) => checkCss(layer(css), "seed.css").problems.map((p) => p.match(/\[([a-z-]+)\]/)[1]);

test("raw-time: a literal duration fails, a token or 0s passes", () => {
  assert.deepEqual(rules(".a { transition: opacity 200ms ease-out; }"), ["raw-time"]);
  assert.deepEqual(rules(".a { animation: x .6s linear; }"), ["raw-time"]);
  assert.deepEqual(rules(".a { --local-dur: 1.2s; }"), ["raw-time"], "a local custom property is still a raw time");
  assert.deepEqual(rules(".a { transition: opacity var(--uix-dur) var(--uix-ease-out); transition-delay: 0s; }"), []);
  assert.deepEqual(rules('.a { content: "2s ago"; }'), [], "text in a string is not a time");
});

test("transition-all fails", () => {
  assert.deepEqual(rules(".a { transition: all var(--uix-dur) var(--uix-ease-out); }"), ["transition-all"]);
  assert.deepEqual(rules(".a { transition-property: all; }"), ["transition-all"]);
});

test("ease-in fails on transitions and animations; ease-in-out passes", () => {
  assert.deepEqual(rules(".a { transition: opacity var(--uix-dur-exit) var(--uix-ease-in); }"), ["ease-in"]);
  assert.deepEqual(rules(".a { animation-timing-function: ease-in; }"), ["ease-in"]);
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur) var(--uix-ease-in-out); }"), []);
});

test("layout: width, grid tracks, margin and box-shadow never animate", () => {
  assert.deepEqual(rules(".a { transition: width var(--uix-dur) var(--uix-ease-out); }"), ["layout"]);
  assert.deepEqual(rules(".a { transition: grid-template-columns var(--uix-dur) var(--uix-ease-out); }"), ["layout"]);
  assert.deepEqual(rules(".a { transition: opacity var(--uix-dur) var(--uix-ease-out), box-shadow var(--uix-dur) var(--uix-ease-out); }"), ["layout"]);
  assert.deepEqual(rules("@keyframes grow { to { height: 40px; } }"), ["layout"]);
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur) var(--uix-ease-out), opacity var(--uix-dur) var(--uix-ease-out); }"), []);
});

test("loop-no-reduced: an infinite animation needs a reduced-motion rule for its selector", () => {
  assert.deepEqual(rules(".spin { animation: uix-spin var(--uix-loop-spin) linear infinite; }"), ["loop-no-reduced"]);
  assert.deepEqual(rules(`.spin { animation: uix-spin var(--uix-loop-spin) linear infinite; }
    @media (prefers-reduced-motion: reduce) { .other { animation: none; } }`), ["loop-no-reduced"], "a branch for another selector does not count");
  assert.deepEqual(rules(`.spin { animation: uix-spin var(--uix-loop-spin) linear infinite; }
    @media (prefers-reduced-motion: reduce) { .spin { animation: uix-pulse var(--uix-loop-pulse) var(--uix-ease-in-out) infinite !important; } }`), []);
  assert.deepEqual(rules("@media (prefers-reduced-motion: no-preference) { .spin { animation: uix-spin var(--uix-loop-spin) linear infinite; } }"), [], "motion only when allowed");
});

test("moving-no-reduced: a one-shot animation that moves needs a reduced-motion rule", () => {
  const keyframes = "@keyframes slide { from { transform: translateY(8px); } }";
  assert.deepEqual(rules(`${keyframes} .a { animation: slide var(--uix-dur) var(--uix-ease-out); }`), ["moving-no-reduced"]);
  assert.deepEqual(rules(`${keyframes} .a { animation: slide var(--uix-dur) var(--uix-ease-out); }
    @media (prefers-reduced-motion: reduce) { .a { animation: uix-fade-in var(--uix-dur) var(--uix-ease-out); } }`), []);
  assert.deepEqual(rules("@keyframes fade { from { opacity: 0; } } .a { animation: fade var(--uix-dur) var(--uix-ease-out); }"), [], "a fade needs no branch");
});

test("hover-ungated: :hover may move or reveal only inside the hover media query", () => {
  assert.deepEqual(rules(".card:hover { transform: translateY(-1px); }"), ["hover-ungated"]);
  assert.deepEqual(rules("tr:hover .act, tr:focus-within .act { opacity: 1; }"), ["hover-ungated"]);
  assert.deepEqual(rules(`tr:focus-within .act { opacity: 1; }
    @media (hover: hover) and (pointer: fine) { .act { opacity: 0; } tr:hover .act { opacity: 1; } }`), []);
  assert.deepEqual(rules(".btn:hover { background: var(--uix-bg-hover); color: var(--uix-text); }"), [], "a colour change on hover is fine");
});

test("motion-allow: a reasoned exemption passes and is reported", () => {
  const r = checkCss(layer(".a { /* motion-allow: ends product keyframes at once */ animation-duration: .001ms; }"), "seed.css");
  assert.deepEqual(r.problems, []);
  assert.equal(r.exemptions.length, 1);
  assert.match(r.exemptions[0], /ends product keyframes at once/);
  assert.equal(checkCss(layer(".a { /* motion-allow: */ animation-duration: .001ms; }"), "seed.css").problems.length, 1, "an empty reason does not exempt");
});

test("TS: an inline transition with a literal time fails", () => {
  assert.equal(checkTs("const s = { transition: 'opacity 200ms ease-out' };", "a.tsx").length, 1);
  assert.equal(checkTs("el.style.transition = `transform 0.3s`;", "a.ts").length, 1);
  assert.equal(checkTs("const ms = 200; // animation length", "a.ts").length, 0);
});
