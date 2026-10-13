/*
 * Chart statistics (HAR-1554, charts C3). Pure: no DOM, no ECharts, no React — so a server can run
 * the same fit the chart draws (TENSOR's insight aggregates mirror it). Exported from the root entry.
 *
 * Honesty rules the components build on:
 * - a fit needs at least two points with different x; anything less is `null`, never a fake line;
 * - `r` is `null` when y does not vary (the correlation is undefined, not zero);
 * - a prediction band widens away from the mean of x, as an ordinary least-squares band does.
 */

/** One observation for {@link linearFit}. */
export interface ChartStatPoint {
  x: number;
  y: number;
}

/** An ordinary least-squares line through the points, with what a prediction band needs. */
export interface LinearFit {
  slope: number;
  intercept: number;
  /** Pearson correlation; `null` when y is constant (undefined, not zero). */
  r: number | null;
  /** Points used (non-finite x or y are skipped). */
  n: number;
  /** Mean of x. */
  xMean: number;
  /** Sum of squared deviations of x from its mean. */
  sxx: number;
  /** Residual standard error, √(SSE / (n − 2)); 0 when n = 2. */
  residualStdError: number;
}

/** A band around the fitted line at each requested x. */
export interface PredictionBandPoint {
  x: number;
  y: number;
  lower: number;
  upper: number;
}

const finite = (value: number) => typeof value === 'number' && Number.isFinite(value);

/** Least-squares line through `points`; `null` below two usable points or when every x is equal. */
export function linearFit(points: readonly ChartStatPoint[]): LinearFit | null {
  const usable = points.filter((p) => finite(p.x) && finite(p.y));
  const n = usable.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  for (const p of usable) {
    sumX += p.x;
    sumY += p.y;
  }
  const xMean = sumX / n;
  const yMean = sumY / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of usable) {
    const dx = p.x - xMean;
    const dy = p.y - yMean;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  let sse = 0;
  for (const p of usable) {
    const residual = p.y - (intercept + slope * p.x);
    sse += residual * residual;
  }
  const r = syy === 0 ? null : Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const residualStdError = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  return { slope, intercept, r, n, xMean, sxx, residualStdError };
}

/**
 * Quantiles by linear interpolation between order statistics (the "type 7" rule of R and NumPy).
 * `ps` are fractions in [0, 1]; non-finite values are skipped. An empty input gives `null`s.
 */
export function quantiles(values: readonly number[], ps: readonly number[]): (number | null)[] {
  const sorted = values.filter(finite).slice().sort((a, b) => a - b);
  return ps.map((p) => {
    if (!sorted.length || !finite(p)) return null;
    const clamped = Math.max(0, Math.min(1, p));
    const h = (sorted.length - 1) * clamped;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
  });
}

/** Inverse of the standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : Number.NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Student-t quantile by the Cornish–Fisher expansion around the normal (good to ~1e-3 from 3 df). */
export function studentTQuantile(p: number, df: number): number {
  const z = normalQuantile(p);
  if (!Number.isFinite(z) || !(df > 0)) return z;
  const z3 = z ** 3;
  const z5 = z ** 5;
  const z7 = z ** 7;
  return z
    + (z3 + z) / (4 * df)
    + (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2)
    + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3);
}

/**
 * A prediction band for new observations at `xs`: ŷ ± t·s·√(1 + 1/n + (x − x̄)² / Sxx), with `level`
 * the central coverage (0.8 = 80 %). With n = 2 there is no residual error to widen by, so the band
 * collapses onto the line.
 */
export function predictionBand(fit: LinearFit, xs: readonly number[], level = 0.8): PredictionBandPoint[] {
  const coverage = Math.max(0.01, Math.min(0.999, level));
  const t = fit.n > 2 ? studentTQuantile(1 - (1 - coverage) / 2, fit.n - 2) : 0;
  return xs.filter(finite).map((x) => {
    const y = fit.intercept + fit.slope * x;
    const spread = t * fit.residualStdError * Math.sqrt(1 + 1 / fit.n + (x - fit.xMean) ** 2 / fit.sxx);
    return { x, y, lower: y - spread, upper: y + spread };
  });
}
