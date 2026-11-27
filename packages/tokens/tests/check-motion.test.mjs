import assert from "node:assert/strict";
import test from "node:test";
import { LOOP_ALLOW, OVERSHOOT_TOKENS, checkCss, checkTs, collectKeyframeProps, collectMotionContext, curveOvershoots } from "../scripts/check-motion.mjs";

/*
 * The motion gate (scripts/check-motion.mjs, HAR-2578) — every rule blocks a seeded violation,
 * and the shape the contract asks for passes. Wrapped in the same @layer the components use.
 */
const layer = (css) => `@layer uix.components { ${css} }`;
// rules 1-7 on their own: every selector counts as a loader here (rule 8 has its own tests below)
const ANY_LOOP = [{ file: "*", selector: /./, what: "any" }];
const rules = (css) => checkCss(layer(css), "seed.css", undefined, ANY_LOOP).problems.map((p) => p.match(/\[([a-z-]+)\]/)[1]);
/** Rule 8 with the real allowlist, for a seeded stylesheet of that name. */
const loops = (css, file) => checkCss(layer(css), `packages/tokens/styles/components/${file}`).problems.filter((p) => p.includes("[loop-not-loading]"));

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

test("loop-not-loading: only an indeterminate loader loops forever, by file and selector", () => {
  const spin = "animation: uix-spin var(--uix-loop-spin) linear infinite;";
  const pulse = "animation: uix-pulse var(--uix-loop-pulse) var(--uix-ease-in-out) infinite;";
  // the loaders pass, their reduced-motion pulse included
  assert.deepEqual(loops(`.uix-spinner { ${spin} } @media (prefers-reduced-motion: reduce) { .uix-spinner { ${pulse} } }`, "spinner.css"), []);
  assert.deepEqual(loops(`:root[data-motion="reduce"] .uix-skeleton { ${pulse} }`, "states.css"), []);
  // a status that pulses, a decoration that loops, and a loader's selector in the wrong file all fail
  assert.equal(loops(`.uix-status-dot--critical::before { ${pulse} }`, "status-pill.css").length, 1);
  assert.equal(loops(".uix-flow:hover .uix-flow__edge { animation: march var(--uix-dur-slow) linear infinite; }", "flow.css").length, 1);
  assert.equal(loops(`.uix-spinner { ${spin} }`, "badge.css").length, 1, "the allowlist is per file");
  assert.equal(loops(`.uix-spinner, .uix-badge { ${spin} }`, "spinner.css").length, 1, "every selector of the rule must be a loader");
  assert.equal(loops(".uix-badge { animation-iteration-count: infinite; }", "badge.css").length, 1);
  assert.deepEqual(loops(".uix-badge { animation: pop var(--uix-dur) var(--uix-ease-out) 1; }", "badge.css"), [], "a one-shot animation is fine");
  // motion-allow does not exempt it
  assert.equal(loops(`.uix-badge { /* motion-allow: looks alive */ ${pulse} }`, "badge.css").length, 1);
});

test("loop-not-loading: the allowlist stays short, and every entry says why it may loop", () => {
  assert.ok(LOOP_ALLOW.length <= 8, `${LOOP_ALLOW.length} loaders: a new one is a design decision, not a fix`);
  for (const entry of LOOP_ALLOW) assert.ok(entry.what && entry.why?.length > 10, `${entry.file}: a loader needs its reason`);
});

test("overshoot-effect: the overshooting token list comes from the token source", () => {
  // read from tokens/base/effect.json, so a new spring that passes 1 joins the rule by itself
  assert.deepEqual([...OVERSHOOT_TOKENS].sort(), ["--uix-ease-drawer", "--uix-ease-pop", "--uix-ease-spring"]);
  assert.equal(curveOvershoots("cubic-bezier(.23,1,.32,1)"), false);
  assert.equal(curveOvershoots("cubic-bezier(.34,1.56,.64,1)"), true);
  assert.equal(curveOvershoots("cubic-bezier(.5,-.2,.5,1)"), true, "an anticipation below 0 is an overshoot too");
  assert.equal(curveOvershoots("linear(0, 0.6 40%, 1)"), false);
  assert.equal(curveOvershoots("linear(0, 1.03, 1)"), true);
});

test("overshoot-effect: an overshooting curve moves geometry only", () => {
  // the shape the contract asks for: geometry on the spring, the fade on a curve that stops at 1
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur-pop) var(--uix-ease-pop), opacity var(--uix-dur-fast) var(--uix-ease-out); }"), []);
  assert.deepEqual(rules(".a { transition: scale var(--uix-dur-pop) var(--uix-ease-pop), translate var(--uix-dur-drawer) var(--uix-ease-drawer), rotate var(--uix-dur) var(--uix-ease-spring); }"), []);
  assert.deepEqual(rules(".a { transition: clip-path var(--uix-dur-pop) var(--uix-ease-pop); }"), [], "clip-path is a shape");
  assert.deepEqual(rules(".a { transition: opacity var(--uix-dur-glide) var(--uix-ease-glide); }"), [], "glide never passes 1");
  // opacity and every colour fail, on every overshooting token
  for (const p of ["opacity", "color", "background-color", "border-color", "fill", "stroke", "outline-color"]) {
    for (const ease of ["pop", "drawer", "spring"]) {
      assert.deepEqual(rules(`.a { transition: ${p} var(--uix-dur) var(--uix-ease-${ease}); }`), ["overshoot-effect"], `${p} on --uix-ease-${ease}`);
    }
  }
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur-pop) var(--uix-ease-pop), opacity var(--uix-dur-pop) var(--uix-ease-pop); }"), ["overshoot-effect"], "the 2.70 tooltip shape");
  assert.deepEqual(rules(".a { transition: all var(--uix-dur) var(--uix-ease-pop); }"), ["transition-all", "overshoot-effect"]);
  // literal curves and local aliases count
  assert.deepEqual(rules(".a { transition: opacity var(--uix-dur) cubic-bezier(.34,1.56,.64,1); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { transition: color var(--uix-dur) linear(0, 1.1, 1); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { --x-ease: var(--uix-ease-pop); --y-ease: var(--x-ease); transition: opacity var(--uix-dur) var(--y-ease); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { --x-ease: var(--uix-ease-pop); transition: transform var(--uix-dur) var(--x-ease); }"), []);
});

test("overshoot-effect: timing longhands repeat over their property list", () => {
  assert.deepEqual(rules(".a { transition-property: transform, opacity; transition-duration: var(--uix-dur); transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "one curve repeats onto opacity");
  assert.deepEqual(rules(".a { transition-property: transform, opacity; transition-duration: var(--uix-dur); transition-timing-function: var(--uix-ease-pop), var(--uix-ease-out); }"), []);
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur) var(--uix-ease-out), color var(--uix-dur) var(--uix-ease-out); transition-timing-function: var(--uix-ease-out), var(--uix-ease-pop); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "with no list in the rule it applies to all");
});

test("overshoot-effect: an animation is judged by what its @keyframes set", () => {
  const reduced = "@media (prefers-reduced-motion: reduce) { .a { animation: none; } }";
  assert.deepEqual(rules(`@keyframes grow { from { transform: scale(.9); } } .a { animation: grow var(--uix-dur-pop) var(--uix-ease-pop); } ${reduced}`), []);
  assert.deepEqual(rules(`@keyframes in { from { opacity: 0; transform: scale(.9); } } .a { animation: in var(--uix-dur-pop) var(--uix-ease-pop); } ${reduced}`), ["overshoot-effect"]);
  assert.deepEqual(rules(`@keyframes in { from { opacity: 0; transform: scale(.9); } } .a { animation: in var(--uix-dur-pop) var(--uix-ease-out); } ${reduced}`), []);
  assert.deepEqual(rules("@keyframes tint { from { background-color: var(--uix-bg-hover); } } .a { animation-name: tint; animation-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"]);
  assert.deepEqual(rules("@keyframes tint { from { background-color: var(--uix-bg-hover); animation-timing-function: var(--uix-ease-pop); } }"), ["overshoot-effect"], "a frame's own timing");
  assert.deepEqual(rules(".a { animation-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "no animation named, nothing to check it against");
});

test("overshoot-effect: declarations fold in order, as the cascade folds them", () => {
  // a later property list puts opacity on the spring; a later shorthand resets the spring timing
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur) var(--uix-ease-pop); transition-property: opacity; }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { transition-timing-function: var(--uix-ease-pop); transition: opacity var(--uix-dur) var(--uix-ease-out); }"), []);
  assert.deepEqual(rules(".a { animation-timing-function: var(--uix-ease-pop); animation: uix-x var(--uix-dur) var(--uix-ease-out); } @keyframes uix-x { from { opacity: 0; } }"), []);
});

test("overshoot-effect: an overshooting timing longhand names its list in the same rule", () => {
  // what the curve eases is decided in the rule that sets it, not looked up through the cascade
  assert.deepEqual(rules(".a { transition-property: transform; } .a:popover-open { transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a:popover-open { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), []);
  const reduced = "@media (prefers-reduced-motion: reduce) { .a { animation: none; } }";
  assert.deepEqual(rules(`@keyframes grow { from { transform: scale(.9); } } .a { animation-name: grow; } .a { animation-timing-function: var(--uix-ease-pop); } ${reduced}`), ["overshoot-effect"]);
  assert.deepEqual(rules(`@keyframes grow { from { transform: scale(.9); } } .a { animation-name: grow; animation-timing-function: var(--uix-ease-pop); } ${reduced}`), []);
});

test("overshoot-effect: every free longhand list in the kit meets the curve", () => {
  // the gate cannot know which rules meet on one element: another state, an overlapping selector,
  // a media query, !important, or another class on the same element can let a list win
  assert.deepEqual(rules(".a { transition-property: transform, opacity; } .a[open] { transition-property: transform, opacity; transition-timing-function: var(--uix-ease-pop), var(--uix-ease-out); }"), [], "paired by position");
  assert.deepEqual(rules(".a { transition-property: opacity, transform; } .a[open] { transition-property: transform, opacity; transition-timing-function: var(--uix-ease-pop), var(--uix-ease-out); }"), ["overshoot-effect"], "the base list puts opacity on the spring");
  assert.deepEqual(rules(".a { transition-property: opacity !important; } .a.special { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "an important broader list");
  assert.deepEqual(rules(".a.special { transition-property: transform; } .a:hover { transition-property: opacity; } .a.special:hover { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "an overlapping later state");
  assert.deepEqual(rules("@media (min-width: 40em) { .a { transition-property: opacity; } } .a { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "a list under a media query");
  assert.deepEqual(rules(".a { transition: transform var(--uix-dur) var(--uix-ease-pop); } .a[open] { transition-property: opacity; }"), ["overshoot-effect"], "a state that swaps the shorthand's properties");
  assert.deepEqual(rules(".b { transition-property: opacity !important; } .a { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "another class on the same element");
  assert.deepEqual(rules(".a { transition-property: opacity; } .a::before { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "a pseudo-element too");
  assert.deepEqual(rules(".a { transition-property: transform; } .a::before { transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"], "a timing longhand still names its own list");
  // a longhand list that brings its own timings is self-contained, as a shorthand is
  assert.deepEqual(rules(".b { transition-property: opacity; transition-timing-function: var(--uix-ease-out); } .a { transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), []);
  assert.deepEqual(rules(".b { transition-property: opacity !important; transition-timing-function: var(--uix-ease-out); } .a { transition: transform var(--uix-dur) var(--uix-ease-pop); }"), ["overshoot-effect"], "an important list with normal timings is not");
});

test("overshoot-effect: the reduced-motion policy brings its own curve", () => {
  // the policy swaps every element's property list, !important; a component's spring stays paired by position
  const policy = (timing) => `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-property: opacity, color !important; ${timing} } }`;
  const component = ".drawer[open] { transition: transform var(--uix-dur-drawer) var(--uix-ease-drawer), opacity var(--uix-dur-fade-in) var(--uix-ease-out); }";
  const check = (policyCss) => checkCss(layer(component), "drawer.css", undefined, ANY_LOOP, collectMotionContext([policyCss, component])).problems.filter((p) => p.includes("[overshoot-effect]"));
  assert.equal(check(policy("")).length, 1, "opacity would fade on the drawer's curve");
  assert.deepEqual(check(policy("transition-timing-function: var(--uix-ease-out) !important;")), []);
});

test("overshoot-effect: aliases resolve across files, and a rule's own redefinition wins", () => {
  const shared = ":root { --x-ease: var(--uix-ease-pop); }";
  const component = ".a { transition: opacity var(--uix-dur) var(--x-ease); }";
  const r = checkCss(layer(component), "component.css", undefined, ANY_LOOP, collectMotionContext([shared, component]));
  assert.equal(r.problems.filter((p) => p.includes("[overshoot-effect]")).length, 1, "an alias defined in another stylesheet");
  assert.deepEqual(rules(".a { --x-ease: var(--uix-ease-pop); --x-ease: var(--uix-ease-out); transition: opacity var(--uix-dur) var(--x-ease); }"), [], "the rule's last value wins");
  assert.deepEqual(rules(".a { --x-ease: var(--uix-ease-pop); } .b { --x-ease: var(--uix-ease-out); transition: opacity var(--uix-dur) var(--x-ease); }"), [], "the rule's own value, not another rule's");
  assert.deepEqual(rules(".a { --x-ease: var(--uix-ease-pop); } .b { transition: opacity var(--uix-dur) var(--x-ease); }"), ["overshoot-effect"], "inherited: any definition counts");
});

test("overshoot-effect: !important wins over a later normal declaration", () => {
  assert.deepEqual(rules(".a { transition-property: opacity !important; transition-property: transform; transition-timing-function: var(--uix-ease-pop); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { transition-timing-function: var(--uix-ease-pop) !important; transition: opacity var(--uix-dur) var(--uix-ease-out); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { --x: var(--uix-ease-pop) !important; --x: var(--uix-ease-out); transition: opacity var(--uix-dur) var(--x); }"), ["overshoot-effect"]);
  assert.deepEqual(rules(".a { --x: var(--uix-ease-pop); --x: var(--uix-ease-out) !important; transition: opacity var(--uix-dur) var(--x); }"), []);
});

test("overshoot-effect: a local inherit or unset keeps the inherited spring", () => {
  for (const keyword of ["inherit", "unset", "revert"]) {
    assert.deepEqual(rules(`:root { --x: var(--uix-ease-pop); } .a { --x: ${keyword}; transition: opacity var(--uix-dur) var(--x); }`), ["overshoot-effect"], keyword);
  }
  assert.deepEqual(rules(":root { --x: var(--uix-ease-pop); } .a { --x: initial; transition: opacity var(--uix-dur) var(--x); }"), [], "initial is no curve at all");
});

test("overshoot-effect: motion-allow exempts with its reason", () => {
  const r = checkCss(layer(".a { /* motion-allow: the operator picked it */ transition: opacity var(--uix-dur) var(--uix-ease-pop); }"), "seed.css");
  assert.deepEqual(r.problems, []);
  assert.match(r.exemptions[0], /overshoot-effect — the operator picked it/);
});

test("overshoot-effect: TS inline transitions and script-driven easing", () => {
  assert.equal(checkTs("const s = { transition: 'opacity var(--uix-dur) var(--uix-ease-pop)' };", "a.tsx").length, 1);
  assert.equal(checkTs("const s = { transition: 'transform var(--uix-dur-pop) var(--uix-ease-pop)' };", "a.tsx").length, 0);
  assert.equal(checkTs("blurIn([el], { from: 4, duration: 300, ease: tokenEase('--uix-ease-pop') });", "a.ts").length, 1);
  assert.equal(checkTs("blurIn([el], { from: 4, duration: 300, ease: tokenEase('--uix-ease-soft') });", "a.ts").length, 0);
  assert.equal(checkTs("const s = { ['transition']: 'opacity var(--uix-dur) cubic-bezier(.25,1.25,.25,1)' };", "a.tsx").length, 1, "a computed key");
  assert.equal(checkTs("el.style.setProperty('transition', 'opacity var(--uix-dur) var(--uix-ease-pop)');", "a.ts").length, 1, "setProperty");
  assert.equal(checkTs("el.style.setProperty('transition', 'transform var(--uix-dur) var(--uix-ease-pop)');", "a.ts").length, 0);
  const formatted = checkTs("const ease = tokenEase(\n  '--uix-ease-pop',\n);", "a.ts");
  assert.equal(formatted.length, 1, "a formatted tokenEase call");
  assert.match(formatted[0], /^a\.ts:1 \[overshoot-effect\]/);
  // read whole: a template literal may span lines; the report names the line it starts on
  const multi = checkTs("const x = 1;\nel.style.transition = `opacity var(--uix-dur)\n  var(--uix-ease-pop)`;", "a.ts");
  assert.equal(multi.length, 1);
  assert.match(multi[0], /^a\.ts:2 \[overshoot-effect\]/);
  // an inline animation, judged by its @keyframes
  const kf = collectKeyframeProps(["@keyframes uix-fade-in { from { opacity: 0; } } @keyframes uix-grow { from { transform: scale(.9); } }"]);
  assert.equal(checkTs("const s = { animation: 'uix-fade-in var(--uix-dur-pop) var(--uix-ease-pop)' };", "a.tsx", kf).length, 1);
  assert.equal(checkTs("const s = { animation: 'uix-grow var(--uix-dur-pop) var(--uix-ease-pop)' };", "a.tsx", kf).length, 0);
  assert.equal(checkTs("// motion-allow: a seeded demo\nconst s = { animation: 'uix-fade-in var(--uix-dur-pop) var(--uix-ease-pop)' };", "a.tsx", kf).length, 0);
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
