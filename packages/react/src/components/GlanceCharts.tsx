"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ECharts, EChartsOption } from 'echarts';
import { ChartCore } from './ChartCore.js';
import type { ChartEngine, ChartEventHandler, ChartLabels, ChartTableRow } from './ChartCore.js';
import { useArrive, useArriveIndex } from './Arrive.js';
import { GLANCE_AT_REST, PAIRED_BARS_MAX_BUCKETS, glanceLineOption, pairedBarsOption } from '../chart-glance.js';
import type { GlanceLineInput, GlanceMotion, PairedBarsInput } from '../chart-glance.js';
import { tokenMs } from '../motion.js';
import { mergeChartTheme, uixChartTheme, uixChartTokens } from '../chart-theme.js';
import type { UixChartTokens } from '../chart-theme.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';

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

/**
 * The arrival timing for a chart in card `index` of a playing stage, from the tokens. Sticky: once
 * the stage has played, the chart keeps that motion, so the stage coming to rest never re-applies
 * an option in the middle of a draw-in (updates stay instant: animationDurationUpdate is 0).
 */
function useGlanceMotion(): GlanceMotion {
  const { playing } = useArrive();
  const index = useArriveIndex();
  const played = useRef<GlanceMotion | null>(null);
  if (playing && !played.current) {
    played.current = {
      play: true,
      delay: index * tokenMs('--uix-stagger-arrive', 45) + tokenMs('--uix-delay-arrive-trace', 150),
      trace: tokenMs('--uix-dur-arrive-trace', 700),
      grow: tokenMs('--uix-dur-arrive-grow', 500),
      stagger: tokenMs('--uix-stagger-arrive-grow', 25),
    };
  }
  return played.current ?? GLANCE_AT_REST;
}

/**
 * A chart drawn at rest before its stage started (the stage waited for `ready`) draws in when the
 * stage plays: clear it and set the playing option again. Returns the `onReady` for ChartCore.
 */
function useDrawInWhenPlayed(motion: GlanceMotion, build: (tokens: UixChartTokens, motion: GlanceMotion) => EChartsOption) {
  const chart = useRef<ECharts | null>(null);
  const atRestWhenDrawn = useRef(false);
  const motionNow = useRef(motion);
  motionNow.current = motion;
  const buildNow = useRef(build);
  buildNow.current = build;
  const onReady = useCallback((instance: ECharts) => {
    chart.current = instance;
    atRestWhenDrawn.current = !motionNow.current.play;
  }, []);
  useEffect(() => {
    const instance = chart.current;
    if (!motion.play || !instance || instance.isDisposed() || !atRestWhenDrawn.current) return;
    atRestWhenDrawn.current = false;
    if (prefersReducedMotion()) return;
    const element = instance.getDom();
    instance.clear();
    instance.setOption(mergeChartTheme(uixChartTheme(element), buildNow.current(uixChartTokens(element), motion)));
  }, [motion]);
  return onReady;
}

export interface GlanceLineChartProps extends GlanceLineInput, GlanceChartBaseProps {}

interface WithEngine { engine: ChartEngine }

/** Shared core: the line glance chart for a given ECharts build. */
export function GlanceLineChartCore({ engine, ariaLabel, categoryLabel = 'Period', height = 150, className, style, loading, empty, labels, group, onEvents, ...input }: GlanceLineChartProps & WithEngine) {
  const motion = useGlanceMotion();
  const { categories, values, name, forecast, endLabel, area, format, tooltipTitle } = input;
  const build = (k: UixChartTokens, m: GlanceMotion) => glanceLineOption(k, { categories, values, name, forecast, endLabel, area, format, tooltipTitle }, m);
  const onReady = useDrawInWhenPlayed(motion, build);
  const option = useMemo(
    () => (k: UixChartTokens) => build(k, motion),
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
      onReady={onReady}
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
  const build = (k: UixChartTokens, m: GlanceMotion) => pairedBarsOption(k, { categories, series, comparison, format, tooltipTitle }, m);
  const onReady = useDrawInWhenPlayed(motion, build);
  const option = useMemo(
    () => (k: UixChartTokens) => build(k, motion),
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
      onReady={onReady}
    />
  );
}
