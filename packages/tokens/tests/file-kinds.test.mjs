import assert from "node:assert/strict";
import test from "node:test";
import { contrast, evaluate, over, scopeFor } from "./css-color.mjs";

/*
 * The file kinds (file kit 2.57): one hue per kind of attachment, read by FileIcon, FileRow and
 * FileDrop. Checked on what ships, in both modes:
 *   - the kind as an icon stroke clears 3:1 on --uix-surface and --uix-bg-app (WCAG 1.4.11);
 *   - the type label's text (--uix-file-label-fg) clears 4.5:1 on its fill (--uix-file-*-label);
 *   - the kind's name in the meta line (the kind colour as text) is not required to reach 4.5:1
 *     because the name always repeats as words; FileRow sets it in the kind's label colour,
 *     which does, and that is held here too;
 *   - no kind drifts into red (red stays for broken) or the brand blue (blue stays for actions):
 *     OKLab distance of at least 9 from --uix-danger-text and --uix-chart-1 (the brand blue). This
 *     is a drift guard, not a design target: the closest pairs are the plum doc to the danger text
 *     in dark (9.9) and in light (13.0, it is chart-5), and the violet img to the brand blue in
 *     dark (14.7). A kind that turns red or blue lands under 5;
 *   - in light, the five kinds that equal a calm chart slot alias it.
 */

export const KINDS = ["img", "doc", "sheet", "mail", "code", "log", "archive", "other"];
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

  test(`${mode}: no file kind reads as red or as the brand blue`, () => {
    const red = solid("danger-text");
    const blue = solid("chart-1");
    for (const k of KINDS) {
      const c = solid(`file-${k}`);
      assert.ok(dE(c, red) >= 9, `--uix-file-${k} ${hex(c)} vs danger ${hex(red)}: dE ${dE(c, red).toFixed(1)}`);
      assert.ok(dE(c, blue) >= 9, `--uix-file-${k} ${hex(c)} vs brand blue ${hex(blue)}: dE ${dE(c, blue).toFixed(1)}`);
    }
  });
}

test("light: the five kinds equal to a calm chart slot alias it", () => {
  const light = MODES.light;
  const aliases = { img: "chart-3", doc: "chart-5", mail: "chart-7", code: "chart-2", log: "chart-6" };
  for (const [k, slot] of Object.entries(aliases)) assert.equal(light[`file-${k}`], `var(--uix-${slot})`, `--uix-file-${k}`);
});
