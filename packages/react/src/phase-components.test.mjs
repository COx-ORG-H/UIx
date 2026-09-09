/* Contract-focused render tests for the Phase 46.9 React surfaces. Pure model
 * behavior lives in the adjacent *-model.test.mjs suites; these lock the CSS
 * class and accessible-markup boundary emitted by the built package. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BrandProfiles,
  BuilderCanvas,
  ColorPicker,
  DateRangePicker,
  DiffViewer,
  LicensePositionBar,
  MatchReview,
  MetricInput,
  RelationshipGraph,
  RuleBuilder,
  SchedulingCalendar,
} from '../dist/index.js';

const render = (component, props) => renderToStaticMarkup(h(component, props));
const noop = () => {};

test('RuleBuilder emits a readable JSON-backed summary', () => {
  const html = render(RuleBuilder, {
    value: {
      when: { id: 'root', combinator: 'and', conditions: [{ id: 'c1', field: 'amount', operator: 'gt', value: 100 }] },
      then: [{ id: 'a1', type: 'notify', parameters: { channel: 'email' } }],
    },
    fields: [{ id: 'amount', label: 'Amount' }],
    operators: [{ id: 'gt', label: 'is greater than' }],
    actions: [{ id: 'notify', label: 'Notify' }],
    onChange: noop,
    readOnly: true,
  });
  assert.match(html, /class="uix-rule-builder uix-rule-builder--summary"/);
  assert.match(html, /Amount is greater than 100/);
  assert.match(html, /Notify/);
});

test('BuilderCanvas exposes palette, empty action, and properties region', () => {
  const html = render(BuilderCanvas, {
    items: [],
    palette: [{ id: 'text', label: 'Text', create: () => ({ id: 'one', type: 'text', label: 'Text' }) }],
    onItemsChange: noop,
  });
  assert.match(html, /aria-label="Item palette"/);
  assert.match(html, /Add Text/);
  assert.match(html, /aria-label="Item properties"/);
});

test('SchedulingCalendar agenda is the named accessible fallback', () => {
  const html = render(SchedulingCalendar, {
    anchorDate: '2026-09-01', timeZone: 'Europe/Berlin', view: 'agenda',
    entries: [{ id: 'e1', title: 'Window', start: '2026-09-03T08:00:00Z', end: '2026-09-03T09:00:00Z' }],
  });
  assert.match(html, /aria-label="Schedule agenda"/);
  assert.match(html, /Window/);
  assert.match(html, /Scheduled/);
});

test('DateRangePicker marks edges and in-range dates', () => {
  const html = render(DateRangePicker, {
    value: { start: '2026-09-03', end: '2026-09-05' }, visibleMonth: '2026-09-01', months: 1, onChange: noop,
  });
  assert.match(html, /data-range-edge="start"/);
  assert.match(html, /data-in-range="true"/);
  assert.match(html, /aria-live="polite"/);
});

test('RelationshipGraph pairs its bounded SVG with an equivalent named list', () => {
  const html = render(RelationshipGraph, {
    nodes: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
    edges: [{ id: 'ab', source: 'a', target: 'b', type: 'depends-on' }],
  });
  assert.match(html, /Graph with 2 nodes and 1 relationships/);
  assert.match(html, /aria-label="Accessible relationship list"/);
  assert.match(html, /Connected to Beta/);
});

test('MatchReview renders descriptor-driven fields and keyboard actions', () => {
  const html = render(MatchReview, {
    incoming: { name: 'Incoming' }, fields: [{ id: 'name', label: 'Name' }],
    candidates: [{ id: 'c1', confidence: 0.94, record: { name: 'Candidate' } }],
    onDecision: noop,
  });
  assert.match(html, /Candidate matches and available decisions/);
  assert.match(html, /94%/);
  assert.match(html, /Pick other/);
});

test('MetricInput describes bounded invalid numeric input independently of color', () => {
  const html = render(MetricInput, {
    value: 12, onValueChange: noop, min: 0, max: 10, unit: 'ms', label: 'Latency', invalid: true, errorMessage: 'Outside range',
  });
  assert.match(html, /role="spinbutton"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /Outside range/);
  assert.match(html, /Unit: ms/);
});

test('LicensePositionBar keeps overflow visible and textual', () => {
  const html = render(LicensePositionBar, { consumed: 128, entitled: 100, unit: 'seats' });
  assert.match(html, /uix-license-position--over/);
  assert.match(html, /28 seats over limit/);
  assert.match(html, /aria-valuetext="Consumed: 128 seats/);
});

test('BrandProfiles renders serializable values through existing brand slots', () => {
  const html = render(BrandProfiles, {
    value: { id: 'north', name: 'North', brand: '#2563eb', brandForeground: '#ffffff' },
    onChange: noop,
  });
  assert.match(html, /aria-label="Brand profile editor"/);
  assert.match(html, /--uix-brand:#2563EB/);
  assert.match(html, /Live preview of North/);
});

test('DiffViewer groups conflicts and labels all three versions', () => {
  const html = render(DiffViewer, { base: { limit: 1 }, current: { limit: 2 }, incoming: { limit: 3 } });
  assert.match(html, /Conflicted/);
  assert.match(html, /Base value for \$\.limit/);
  assert.match(html, /Current value for \$\.limit/);
  assert.match(html, /Incoming value for \$\.limit/);
});

test('ColorPicker normalizes its swatch trigger and names the control', () => {
  const html = render(ColorPicker, { value: '#2563eb', foreground: '#ffffff', onChange: noop, label: 'Brand color' });
  assert.match(html, /aria-label="Brand color: #2563EB"/);
  assert.match(html, /background-color:#2563EB/);
  assert.match(html, /aria-expanded="false"/);
});
