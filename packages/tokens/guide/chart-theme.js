/* guide/chart-theme.js — the UIx ECharts theme for the vanilla styleguide (HAR-1552).
   A 1:1 port of packages/react/src/chart-theme.ts (the shipped source of truth): same tokens, same
   option, same merge. packages/react/src/chart-theme.test.mjs asserts the two produce identical
   output, so edit both together. */

const reader = (source) => {
  if (typeof source === 'function') return source;
  if (typeof getComputedStyle === 'undefined' || typeof document === 'undefined') return () => '';
  const style = getComputedStyle(source ?? document.documentElement);
  return (token) => style.getPropertyValue(token).trim();
};

export function uixChartTokens(source) {
  const read = reader(source);
  const t = (name) => read(`--uix-${name}`);
  const unquote = (font) => font.replace(/"/g, '');
  return {
    palette: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => t(`chart-${i}`)),
    neutral: t('chart-neutral'),
    grid: t('chart-grid'),
    axis: t('chart-axis'),
    reference: t('chart-reference'),
    zoneWarning: t('chart-zone-warning'),
    zoneDanger: t('chart-zone-danger'),
    forecastBand: t('chart-forecast-band'),
    event: t('chart-event'),
    partial: t('chart-partial'),
    comparison: t('chart-comparison'),
    surface: t('surface'),
    text: t('text'),
    textMuted: t('text-muted'),
    border: t('border-strong'),
    fontSans: unquote(t('font-sans')),
    fontMono: unquote(t('font-mono')),
  };
}

export function uixChartTheme(source) {
  const k = uixChartTokens(source);
  const read = reader(source);
  const axis = {
    axisLine: { lineStyle: { color: k.axis } },
    axisTick: { show: false },
    axisLabel: { color: k.textMuted, fontFamily: k.fontMono, fontSize: 11 },
    splitLine: { lineStyle: { color: k.grid, type: 'solid', width: 1 } },
  };
  return {
    color: k.palette,
    backgroundColor: 'transparent',
    textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 12 },
    title: { textStyle: { color: k.text, fontFamily: k.fontSans }, subtextStyle: { color: k.textMuted, fontFamily: k.fontSans } },
    legend: { textStyle: { color: k.textMuted, fontFamily: k.fontSans, fontSize: 12 }, icon: 'roundRect', itemWidth: 10, itemHeight: 6, itemGap: 12 },
    tooltip: {
      backgroundColor: k.surface,
      borderColor: k.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: k.text, fontFamily: k.fontSans, fontSize: 12 },
      extraCssText: `border-radius:${read('--uix-radius-sm')};box-shadow:${read('--uix-shadow-popover')}`,
      axisPointer: { lineStyle: { color: k.reference, width: 1 }, crossStyle: { color: k.reference }, shadowStyle: { color: k.forecastBand } },
    },
    xAxis: axis,
    yAxis: axis,
  };
}

export function uixChartAreaGradient(color) {
  const alpha = (opacity) => {
    const hex = color.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
    const [r, g, b] = hex.match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
    return `rgba(${r},${g},${b},${opacity})`;
  };
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: alpha(0.28) }, { offset: 0.72, color: alpha(0.06) }, { offset: 1, color: alpha(0) }],
  };
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

function deepMerge(base, over) {
  if (over === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(over)) return over;
  const out = { ...base };
  for (const key of Object.keys(over)) out[key] = deepMerge(base[key], over[key]);
  return out;
}

const STYLED_ONLY = ['xAxis', 'yAxis', 'legend', 'title'];

export function mergeChartTheme(theme, option) {
  const merged = deepMerge(theme, option);
  for (const key of STYLED_ONLY) {
    if (Array.isArray(option[key])) merged[key] = option[key].map((axis) => deepMerge(theme[key], axis));
    else if (!(key in option)) delete merged[key];
  }
  return merged;
}
