function decimals(value: number): number {
  const text = String(value).toLowerCase();
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  return text.includes('.') ? text.split('.')[1]!.length : 0;
}

export function clampMetricValue(value: number, min?: number, max?: number): number {
  return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, value));
}

export function stepMetricValue(value: number | null, direction: -1 | 1, options: { min?: number; max?: number; step?: number } = {}): number {
  const step = options.step && options.step > 0 ? options.step : 1;
  const base = value ?? options.min ?? 0;
  const precision = Math.max(decimals(base), decimals(step), decimals(options.min ?? 0), decimals(options.max ?? 0));
  const next = Number((base + direction * step).toFixed(precision));
  return clampMetricValue(next, options.min, options.max);
}

export function parseMetricValue(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
