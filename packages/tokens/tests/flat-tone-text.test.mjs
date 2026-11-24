import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { contrast, evaluate, scopeFor, themes } from "./css-color.mjs";

/*
 * A tone's fill colour is not a text colour (HAR-3209, the HAR-2533 family). Flat --uix-accent
 * measured 3.65:1 as text on a dark card and flat --uix-warning failed on a white one; flat
 * --uix-success measured 3.48:1 in dark. Each tone has a -text token that reaches 4.5:1 on the
 * surfaces in both themes, and text uses it.
 *
 * This reads every component stylesheet and fails on a rule that sets `color:` to a flat tone,
 * unless the rule paints only a glyph (an icon, a star, a sort arrow), which needs 3:1 as a
 * graphic (WCAG 1.4.11) rather than 4.5:1. Those are listed below with what they paint. A new
 * rule that colours text with a flat tone fails here: give it the tone's -text token instead.
 */

const TONES = ["accent", "warning", "danger", "success", "info"];
const GLYPH_ONLY = new Map([
  [".uix-info-tip__button:hover", "the ? glyph"],
  [".uix-info-tip[data-open] .uix-info-tip__button", "the ? glyph"],
  [".uix-note--info .uix-note__icon", "the note's icon"],
  [".uix-note--success .uix-note__icon", "the note's icon"],
  [".uix-note--warning .uix-note__icon", "the note's icon"],
  [".uix-note--danger .uix-note__icon", "the note's icon"],
  [".uix-navitem__star[data-on]", "the pinned star"],
  ['.uix-table th[aria-sort="ascending"]::after', "the sort arrow (a mask)"],
  ['.uix-table th[aria-sort="descending"]::after', "the sort arrow (a mask)"],
  [".uix-table__pin[data-on]", "the pinned column's pin"],
  [".uix-icon--success", "an icon"],
  [".uix-empty__icon--danger", "the empty state's icon"],
  [".uix-cell-edit__ok", "the saved cell's check"],
  [".uix-toast--success .uix-toast__icon", "the toast's icon"],
  [".uix-toast--danger .uix-toast__icon", "the toast's icon"],
  [".uix-toast--info .uix-toast__icon", "the toast's icon"],
]);

/** A rule's selector list as single-spaced selectors. */
const selectorsOf = (selector) => selector.split(",").map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);

const dir = new URL("../styles/components/", import.meta.url);
const flatToneText = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(new URL(file, dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const flat = new RegExp(`(?:^|;)\\s*color:\\s*var\\(--uix-(${TONES.join("|")})\\)\\s*(?:;|$)`).exec(body);
    if (!flat) continue;
    for (const sel of selectorsOf(selector)) {
      if (!GLYPH_ONLY.has(sel)) flatToneText.push(`${file}: ${sel} { color: var(--uix-${flat[1]}) }`);
    }
  }
}

test("no component rule paints text in a flat tone (use the tone's -text token)", () => {
  assert.deepEqual(flatToneText, []);
});

test("the scan sees the glyph rules it allows, so a renamed one cannot hide a text rule", () => {
  const seen = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(new URL(file, dir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selector] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) for (const sel of selectorsOf(selector)) seen.add(sel);
  }
  assert.deepEqual([...GLYPH_ONLY.keys()].filter((sel) => !seen.has(sel)), []);
});

test("the scan finds a planted flat-tone text rule", () => {
  const planted = ".uix-demo__label { font-size: var(--uix-text-meta); color: var(--uix-accent); }";
  const [, , body] = /([^{}]+)\{([^{}]*)\}/.exec(planted);
  assert.match(body, new RegExp(`(?:^|;)\\s*color:\\s*var\\(--uix-(${TONES.join("|")})\\)\\s*(?:;|$)`));
});

for (const [theme, themeBlocks] of Object.entries(themes)) {
  for (const dark of [false, true]) {
    test(`${theme} ${dark ? "dark" : "light"}: every tone's -text token reads at 4.5:1 on the surfaces`, () => {
      const scope = scopeFor(themeBlocks, dark);
      for (const tone of TONES) {
        const text = evaluate(`var(--uix-${tone}-text)`, scope);
        for (const backdrop of ["surface", "bg-app"]) {
          const ratio = contrast(text, evaluate(`var(--uix-${backdrop})`, scope));
          assert.ok(ratio >= 4.5, `--uix-${tone}-text on --uix-${backdrop}: ${ratio.toFixed(2)}:1`);
        }
      }
    });
  }
}
