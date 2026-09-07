// Smoke consumer source — type-checked against the PACKED tarballs (not the
// workspace), so it catches packaging bugs (missing files, wrong exports, bad
// types) that a symlinked workspace would hide. ADR-0016 Decision 6.
//
// Only the main @tensor_1/react entry + @tensor_1/tokens/ts are imported here; the ./chart
// entry pulls in echarts types, so its packaging is checked via require.resolve
// in run.mjs instead of a typed import (keeps the smoke lean).
import {
  BrandProfiles,
  BuilderCanvas,
  Button,
  Card,
  ColorPicker,
  DateRangePicker,
  DiffViewer,
  Flow,
  LicensePositionBar,
  MatchReview,
  MetricInput,
  Modal,
  Pipeline,
  PipelineStage,
  RelationshipGraph,
  RuleBuilder,
  SchedulingCalendar,
  StatusPill,
  buildThreeWayDiff,
  layoutRelationshipGraph,
  normalizeHex,
  stepMetricValue,
} from '@tensor_1/react';
import type { BrandProfile, ButtonProps, RuleDefinition } from '@tensor_1/react';
import { Chart, ChartMetric } from '@tensor_1/react/chart';
import { Chart as PresetChart, ChartLegend } from '@tensor_1/react/chart/preset';
import { cssVar, light, dark, num } from '@tensor_1/tokens/ts';

// cssVar/light are Record<UixTokenName,string>; dark/num are Partial<Record<…>>.
const accent: string = cssVar.accent;
const body: string = light['text-body'];
const space4: number | undefined = num['space-4'];
const darkBg: string | undefined = dark['bg-app'];

// Exercise an exported prop type.
const renderButton = (props: ButtonProps) => props;
const rule: RuleDefinition = {
  when: { id: 'root', combinator: 'and', conditions: [] },
  then: [],
};
const brand: BrandProfile = {
  id: 'default', name: 'Default', brand: '#1447E6', brandForeground: '#FFFFFF',
};

export default {
  BrandProfiles, BuilderCanvas, Button, Card, ColorPicker, DateRangePicker,
  DiffViewer, Flow, LicensePositionBar, MatchReview, MetricInput, Modal, Pipeline, PipelineStage,
  RelationshipGraph, RuleBuilder, SchedulingCalendar, StatusPill, Chart,
  PresetChart, ChartMetric, ChartLegend, buildThreeWayDiff, layoutRelationshipGraph, normalizeHex,
  stepMetricValue, accent, body, space4, darkBg, renderButton, rule, brand,
};
