import assert from "node:assert/strict";
import test from "node:test";
import { contrast, evaluate, over, scopeFor } from "./css-color.mjs";

/*
 * The file kinds (file kit 2.57; office kinds 2.59): one hue per kind of attachment, read by
 * FileIcon, FileRow and FileDrop. Checked on what ships, in both modes:
 *   - the kind as an icon stroke clears 3:1 on --uix-surface and --uix-bg-app (WCAG 1.4.11);
 *   - the type label's text (--uix-file-label-fg) clears 4.5:1 on its fill (--uix-file-*-label);
 *   - the kind's name in the meta line (the kind colour as text) is not required to reach 4.5:1
 *     because the name always repeats as words; FileRow sets it in the kind's label colour,
 *     which does, and that is held here too;
 *   - the office kinds keep the colour people know from the program (operator decision
 *     2026-11-07): Word blue (doc), Excel green (sheet), PowerPoint orange (slides), PDF red
 *     (pdf), as an OKLCH hue band per kind;
 *   - no kind drifts into the danger red (red stays for broken) or the brand blue (blue stays for
 *     actions): OKLab distance of at least 8 from --uix-danger-text and --uix-chart-1 (the brand
 *     blue), and of at least 7 from --uix-danger-solid (the red dot). The tight pairs are the
 *     reason for the guard: in light the PDF crimson to the danger text (8.7) and the PowerPoint
 *     orange to the danger dot (7.5); in dark the Word blue to the brand blue (9.1). A kind that
 *     turns red or brand blue lands under 5;
 *   - no kind reads as the attention orange (SLA at risk): distance of at least 7 from
 *     --uix-attention. The PowerPoint orange is the closest (7.6 light, 10.1 dark);
 *   - in light, the four kinds that equal a calm chart slot alias it.
 */

export const KINDS = ["img", "doc", "sheet", "slides", "pdf", "mail", "code", "log", "archive", "text", "other"];
const MODES = { light: scopeFor([], false), dark: scopeFor([], true) };

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function lab(rgb) {
  const [r, g, b] = rgb.slice(0, 3).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dE = (a, b) => { const [x, y] = [lab(a), lab(b)]; return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const hue = (c) => { const [, a, b] = lab(c); return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360; };
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

for (const [mode, scope] of Object.entries(MODES)) {
  const surface = evaluate("var(--uix-surface)", scope);
  const app = evaluate("var(--uix-bg-app)", scope);
  const solid = (name) => over(evaluate(`var(--uix-${name})`, scope), surface);

  test(`${mode}: every file kind clears 3:1 as an icon stroke on the surface and the app background`, () => {
    for (const k of KINDS) {
      const c = solid(`file-${k}`);
      for (const [where, bg] of [["surface", surface], ["bg-app", app]]) {
        const ratio = contrast(c, bg);
        assert.ok(ratio >= 3, `--uix-file-${k} ${hex(c)} on ${where}: ${ratio.toFixed(2)}:1`);
      }
    }
  });

  test(`${mode}: the type label's text clears 4.5:1 on every label fill`, () => {
    const fg = solid("file-label-fg");
    for (const k of KINDS) {
      const fill = solid(`file-${k}-label`);
      const ratio = contrast(fg, fill);
      assert.ok(ratio >= 4.5, `--uix-file-label-fg on --uix-file-${k}-label ${hex(fill)}: ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${mode}: the kind's name as text (its label colour) clears 4.5:1 on the surface`, () => {
    for (const k of KINDS) {
      const c = solid(`file-${k}-label`);
      // dark uses the kind itself; light the deepened fill
      const ratio = contrast(c, surface);
      assert.ok(ratio >= 4.5, `--uix-file-${k}-label ${hex(c)} on surface: ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${mode}: no file kind reads as red, the attention orange or the brand blue`, () => {
    const floors = [["danger-text", 8], ["chart-1", 8], ["danger-solid", 7], ["attention", 7]];
    for (const k of KINDS) {
      const c = solid(`file-${k}`);
      for (const [role, floor] of floors) {
        const ref = solid(role);
        assert.ok(dE(c, ref) >= floor, `--uix-file-${k} ${hex(c)} vs --uix-${role} ${hex(ref)}: dE ${dE(c, ref).toFixed(1)} (floor ${floor})`);
      }
    }
  });

  test(`${mode}: the office kinds keep the colour people know from the program`, () => {
    // OKLCH hue bands: Word blue, Excel green, PowerPoint orange, PDF red (wraps through 0).
    const bands = { doc: [235, 268], sheet: [135, 165], slides: [45, 70], pdf: [345, 25] };
    for (const [k, [from, to]] of Object.entries(bands)) {
      const h = hue(solid(`file-${k}`));
      const inside = from <= to ? h >= from && h <= to : h >= from || h <= to;
      assert.ok(inside, `--uix-file-${k} hue ${h.toFixed(0)} outside ${from}-${to}`);
    }
  });
}

test("light: the four kinds equal to a calm chart slot alias it", () => {
  const light = MODES.light;
  const aliases = { img: "chart-3", mail: "chart-7", code: "chart-2", log: "chart-6" };
  for (const [k, slot] of Object.entries(aliases)) assert.equal(light[`file-${k}`], `var(--uix-${slot})`, `--uix-file-${k}`);
});

test("Text is the neutral of Datei in both modes", () => {
  for (const scope of Object.values(MODES)) assert.equal(scope["file-text"], "var(--uix-file-other)");
});
