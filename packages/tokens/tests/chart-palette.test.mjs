import assert from "node:assert/strict";
import test from "node:test";
import { contrast, evaluate, oklch, scopeFor } from "./css-color.mjs";

/*
 * The categorical chart palette passes the dataviz palette checks in both modes (HAR-1552), on the
 * adjacent pairlist (lines, bars, stacks). Before: light failed the normal-vision floor
 * (#E11D48<->#EA580C dE 10.8) and dark had 7 of 8 slots outside the lightness band.
 *   - lightness band: OKLCH L 0.43-0.77 light, 0.48-0.67 dark
 *   - chroma floor:   C >= 0.10
 *   - CVD separation: adjacent dE >= 8 under protanopia and deuteranopia (Machado 2009, severity 1.0)
 *   - normal vision:  adjacent dE >= 15
 *   - contrast:       >= 3:1 on --uix-surface and --uix-bg-app
 * dE is Euclidean distance in OKLab x100, the dataviz method's unit.
 */

const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function simulate(rgb, kind) {
  const lin = rgb.slice(0, 3).map(linear);
  const M = MACHADO[kind];
  return M.map((row) => encode(Math.max(0, Math.min(1, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])))).concat(1);
}
function lab(rgb) {
  const [r, g, b] = rgb.slice(0, 3).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dE = (a, b) => { const [x, y] = [lab(a), lab(b)]; return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

const MODES = { light: { band: [0.43, 0.77], scope: scopeFor([], false) }, dark: { band: [0.48, 0.67], scope: scopeFor([], true) } };

for (const [mode, { band, scope }] of Object.entries(MODES)) {
  const palette = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => evaluate(`var(--uix-chart-${i})`, scope));
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

  test(`${mode}: every chart slot sits in the lightness band with chroma >= 0.10`, () => {
    for (const [i, c] of palette.entries()) {
      const { L, C } = oklch(c);
      assert.ok(L >= band[0] && L <= band[1], `chart-${i + 1} ${hex(c)} L ${L.toFixed(3)}`);
      assert.ok(C >= 0.1, `chart-${i + 1} ${hex(c)} C ${C.toFixed(3)}`);
    }
  });

  test(`${mode}: adjacent slots stay apart for full colour vision (dE >= 15) and CVD (dE >= 8)`, () => {
    for (let i = 0; i < palette.length - 1; i++) {
      const [a, b] = [palette[i], palette[i + 1]];
      const pair = `chart-${i + 1} ${hex(a)} / chart-${i + 2} ${hex(b)}`;
      assert.ok(dE(a, b) >= 15, `${pair}: normal dE ${dE(a, b).toFixed(1)}`);
      for (const kind of ["protan", "deutan"]) {
        const d = dE(simulate(a, kind), simulate(b, kind));
        assert.ok(d >= 8, `${pair}: ${kind} dE ${d.toFixed(1)}`);
      }
    }
  });

  test(`${mode}: every chart slot is >= 3:1 on --uix-surface and --uix-bg-app`, () => {
    for (const backdrop of ["surface", "bg-app"]) {
      const bg = evaluate(`var(--uix-${backdrop})`, scope);
      for (const [i, c] of palette.entries()) {
        assert.ok(contrast(c, bg) >= 3, `chart-${i + 1} ${hex(c)} ${contrast(c, bg).toFixed(2)}:1 on --uix-${backdrop}`);
      }
    }
  });
}

test("chart reference and event ink clear 3:1 (non-text) on the surface in both modes", () => {
  for (const { scope } of Object.values(MODES)) {
    const surface = evaluate("var(--uix-surface)", scope);
    for (const role of ["chart-reference", "chart-event"]) {
      const ratio = contrast(evaluate(`var(--uix-${role})`, scope), surface);
      assert.ok(ratio >= 3, `--uix-${role} ${ratio.toFixed(2)}:1`);
    }
  }
});

test("the checks reproduce the defect they guard: old light chart-5/6 normal dE 10.8", () => {
  assert.equal(dE(evaluate("#EA580C", {}), evaluate("#E11D48", {})).toFixed(1), "10.8");
});
