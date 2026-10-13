/* guide/insight-examples.js — the data behind the decision-grade chart examples (HAR-1553/1554/1556).
   Plain data, no DOM: the styleguide page (guide/charts.js) and the React test harness
   (tests/insight/harness.tsx) render the SAME specs, so the docs and the tested component cannot
   drift apart. Domain: the "Delivery health" example, raised to level 2 — residence per checkpoint
   proves which checkpoint is the bottleneck, and the scatter shows where it breaks. */

const days = ['Aug 22', 'Aug 23', 'Aug 24', 'Aug 25', 'Aug 26', 'Aug 27', 'Aug 28', 'Aug 29', 'Aug 30', 'Aug 31', 'Sep 1', 'Sep 2', 'Sep 3', 'Sep 4', 'Today'];
const projected = ['Sep 6', 'Sep 7', 'Sep 8', 'Sep 9', 'Sep 10', 'Sep 11', 'Sep 12'];

/** Residence in Review rises past the 15 h budget on Sep 2 and keeps climbing. */
const review = [8.1, 8.6, 8.4, 9.2, 9.8, 10.4, 11.1, 12.3, 13.0, 13.9, 14.6, 15.7, 16.8, 17.6, 18.7];
const build = [4.2, 4.0, 4.4, 4.1, 4.6, 4.3, 4.5, 4.4, 4.2, 4.7, 4.5, 4.4, 4.8, 4.6, 4.5];
const deploy = [1.9, 2.1, 2.0, 1.8, 2.2, 2.0, 2.1, 1.9, 2.3, 2.0, 2.1, 2.2, 2.0, 2.1, 2.0];
const previousReview = [9.0, 8.7, 9.4, 9.1, 8.8, 9.6, 9.9, 9.3, 9.7, 10.1, 9.8, 10.4, 10.0, 10.3, 10.6];
const wip = [3, 3, 4, 4, 5, 5, 6, 7, 7, 8, 8, 9, 9, 10, 10];
const reviewers = [4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3];

export const BUDGET = { value: 15, kind: 'budget', tone: 'warning', label: '15 h budget', badSide: 'above' };

/** A 7-day linear projection with an 80 % band that widens with the horizon (computed upstream). */
const forecastPoints = projected.map((x, i) => {
  const y = 18.7 + 0.76 * (i + 1);
  const spread = 0.9 + 0.32 * (i + 1);
  return { x, y: Math.round(y * 10) / 10, lower: Math.round((y - spread) * 10) / 10, upper: Math.round((y + spread) * 10) / 10 };
});

export const DELIVERY_EVENTS = [
  { at: 'Aug 29', to: 'Sep 2', kind: 'Staffing', label: 'Reviewer on leave (Aug 29 – Sep 2)', tone: 'warning' },
  { at: 'Sep 1', kind: 'Release', label: 'Release freeze starts', tone: 'neutral' },
];

/** C2: one panel with every overlay — threshold zone, 3 events, a 4-point forecast with an 80 % band,
    a previous-period ghost, a partial last period and the crossing. */
export const ANALYTIC_EXAMPLE = {
  x: { type: 'category', values: days },
  partialLast: true,
  events: [
    ...DELIVERY_EVENTS,
    { at: 'Aug 25', kind: 'Deploy', label: 'Pipeline v4 deployed', tone: 'neutral' },
  ],
  panels: [{
    id: 'review',
    title: 'Residence in Review',
    unit: 'h',
    kind: 'line',
    height: 180,
    series: [{ id: 'review', label: 'Review', values: review }],
    thresholds: [BUDGET],
    comparison: { label: 'Previous 15 days', values: previousReview },
    forecast: { from: 'Today', level: 0.8, method: 'linear, 15 days', points: forecastPoints.slice(0, 4) },
  }],
};

/** C3 / C4: residence per checkpoint, WIP in Review and reviewer capacity on one axis. */
export const DELIVERY_PANELS = {
  x: { type: 'category', values: days },
  partialLast: true,
  events: DELIVERY_EVENTS,
  panels: [
    {
      id: 'residence',
      title: 'Residence per checkpoint',
      unit: 'h',
      kind: 'line',
      height: 150,
      series: [
        { id: 'review', label: 'Review', values: review },
        { id: 'build', label: 'Build', values: build },
        { id: 'deploy', label: 'Deploy', values: deploy },
      ],
      thresholds: [BUDGET],
      forecast: { from: 'Today', level: 0.8, method: 'linear, 15 days', points: forecastPoints },
    },
    { id: 'wip', title: 'Work in Review', unit: 'items', kind: 'bar', height: 84, series: [{ id: 'wip', label: 'Items in Review', values: wip }] },
    { id: 'reviewers', title: 'Reviewers available', kind: 'line', height: 72, series: [{ id: 'reviewers', label: 'Reviewers', values: reviewers }] },
  ],
};

/** WIP vs residence, one point per day over 30 days: flat until about 9 items, then steep. */
const scatterWip = [2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 4, 5, 6, 7, 8, 9];
const scatterResidence = [7.8, 8.1, 8.4, 8.2, 8.9, 8.7, 9.1, 9.0, 9.6, 8.8, 9.4, 9.9, 10.2, 10.1, 10.6, 11.0, 12.9, 14.1, 13.6, 16.4, 17.2, 18.1, 19.6, 21.0, 8.5, 9.3, 9.2, 10.0, 10.4, 13.2];
export const DELIVERY_SCATTER = {
  points: scatterWip.map((x, i) => ({
    x,
    y: scatterResidence[i],
    label: `Day ${i + 1}`,
    ...(scatterResidence[i] > 15 ? { emphasis: 'warning' } : {}),
  })),
  xLabel: 'Items in Review',
  yLabel: 'Residence (h)',
  trend: 'linear',
  percentiles: [50, 90],
  thresholds: { y: [BUDGET] },
  breakpoint: { x: 9, label: 'Knee ≈ 9 items' },
};

/** The same scatter with too little history: the component refuses to draw a trend. */
export const SPARSE_SCATTER = { ...DELIVERY_SCATTER, points: DELIVERY_SCATTER.points.slice(0, 5), breakpoint: undefined };

/** The level-2 card's words. A product writes these from its data (TENSOR uses templates). */
export const DELIVERY_CARD = {
  eyebrow: 'Delivery health · last 15 days',
  headline: 'Review is the bottleneck: 18.7 h, over budget for 3 days',
  sowhat: 'Review residence climbs once more than about 9 items wait. Cap work in Review at 8 or add a reviewer this week; at this pace it reaches 24 h on Sep 12.',
  status: { tone: 'warning', label: 'Over budget' },
  kpis: [
    { value: '18.7 h', label: 'Residence in Review', comparison: { text: '↑ 3.7 h over the 15 h budget', tone: 'negative' }, target: { actual: 18.7, target: 15, ranges: [[0, 10], [10, 15], [15, 24]], max: 24 } },
    { value: 'Sep 12', label: 'Projected to reach 24 h', comparison: { text: 'in 7 days at the current trend', tone: 'warning' } },
    { value: '10 items', label: 'Waiting in Review', comparison: { text: '↑ 7 vs 2 weeks ago', tone: 'negative' } },
  ],
  coverage: { covered: 412, total: 431, note: 'items timed', partialPeriod: 'Today is partial (until 14:00).' },
  source: 'Pipeline events',
  updated: '14:05',
  action: 'Open the 10 items waiting in Review',
};
