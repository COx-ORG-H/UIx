"use client";

import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChartCore } from './ChartCore.js';
import type { ChartEngine, ChartEventHandler, ChartLabels, ChartTableRow } from './ChartCore.js';
import { useArrive, useArriveIndex } from './Arrive.js';
import { GLANCE_AT_REST, PAIRED_BARS_MAX_BUCKETS, glanceLineOption, pairedBarsOption } from '../chart-glance.js';
import type { GlanceLineInput, GlanceMotion, PairedBarsInput } from '../chart-glance.js';
import { tokenMs } from '../motion.js';

/** The props every glance chart shares with Chart. */
export interface GlanceChartBaseProps {
  /** What the chart shows, in a sentence: its accessible name ("Offener Rückstand der letzten 12 Wochen …"). */
  ariaLabel: string;
  /** The header of the first column of the hidden data table ("Woche"). Default "Period". */
  categoryLabel?: string;
  /** Plot height in px. Default 150 (a line) or 140 (paired bars). */
  height?: number;
  className?: string;
  style?: CSSProperties;
  loading?: boolean;
  empty?: ReactNode;
  labels?: Partial<ChartLabels>;
  /** Charts with the same group share one crosshair and tooltip. */
  group?: string;
  onEvents?: Record<string, ChartEventHandler>;
}

/** The arrival timing for a chart in card `index` of a playing stage, from the tokens. */
function useGlanceMotion(): GlanceMotion {
  const { playing } = useArrive();
  const index = useArriveIndex();
  return useMemo(() => {
    if (!playing) return GLANCE_AT_REST;
    return {
      play: true,
      delay: index * tokenMs('--uix-stagger-arrive', 45) + tokenMs('--uix-delay-arrive-trace', 150),
      trace: tokenMs('--uix-dur-arrive-trace', 700),
      grow: tokenMs('--uix-dur-arrive-grow', 500),
      stagger: tokenMs('--uix-stagger-arrive-grow', 25),
    };
  }, [playing, index]);
}

export interface GlanceLineChartProps extends GlanceLineInput, GlanceChartBaseProps {}

interface WithEngine { engine: ChartEngine }

/** Shared core: the line glance chart for a given ECharts build. */
export function GlanceLineChartCore({ engine, ariaLabel, categoryLabel = 'Period', height = 150, className, style, loading, empty, labels, group, onEvents, ...input }: GlanceLineChartProps & WithEngine) {
  const motion = useGlanceMotion();
  const { categories, values, name, forecast, endLabel, area, format, tooltipTitle } = input;
  const option = useMemo(
    () => (k: Parameters<typeof glanceLineOption>[0]) => glanceLineOption(k, { categories, values, name, forecast, endLabel, area, format, tooltipTitle }, motion),
    // a new array with the same numbers is the same chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(categories), JSON.stringify(values), name, JSON.stringify(forecast), endLabel, area, format, tooltipTitle, motion],
  );
  const headers = [categoryLabel, name, ...(forecast ? [forecast.name] : [])];
  const rows: ChartTableRow[] = [
    ...categories.map((c, i) => ({ [categoryLabel]: c, [name]: values[i] ?? '' })),
    ...(forecast ? forecast.categories.map((c, i) => ({ [categoryLabel]: c, [name]: '', [forecast.name]: forecast.values[i] ?? '' })) : []),
  ];
  return (
    <ChartCore
      engine={engine}
      option={option}
      ariaLabel={ariaLabel}
      tableHeaders={headers}
      tableData={rows}
      height={height}
      className={className}
      style={style}
      loading={loading}
      empty={empty}
      labels={labels}
      group={group}
      onEvents={onEvents}
    />
  );
}

export interface PairedBarChartProps extends PairedBarsInput, GlanceChartBaseProps {}

/** Shared core: the paired-bar glance chart for a given ECharts build. */
export function PairedBarChartCore({ engine, ariaLabel, categoryLabel = 'Period', height = 140, className, style, loading, empty, labels, group, onEvents, ...input }: PairedBarChartProps & WithEngine) {
  const motion = useGlanceMotion();
  const { categories, series, comparison, format, tooltipTitle } = input;
  if (categories.length > PAIRED_BARS_MAX_BUCKETS && typeof console !== 'undefined') {
    console.warn(`[uix] PairedBarChart reads at a glance up to ${PAIRED_BARS_MAX_BUCKETS} buckets; it has ${categories.length}. Use a line, or move it to a report.`);
  }
  const option = useMemo(
    () => (k: Parameters<typeof pairedBarsOption>[0]) => pairedBarsOption(k, { categories, series, comparison, format, tooltipTitle }, motion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(categories), JSON.stringify(series), JSON.stringify(comparison), format, tooltipTitle, motion],
  );
  const rows: ChartTableRow[] = categories.map((c, i) => ({ [categoryLabel]: c, [series.name]: series.values[i] ?? '', [comparison.name]: comparison.values[i] ?? '' }));
  return (
    <ChartCore
      engine={engine}
      option={option}
      ariaLabel={ariaLabel}
      tableHeaders={[categoryLabel, series.name, comparison.name]}
      tableData={rows}
      height={height}
      className={className}
      style={style}
      loading={loading}
      empty={empty}
      labels={labels}
      group={group}
      onEvents={onEvents}
    />
  );
}
