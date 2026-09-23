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
  DEFAULT_DIFF_VIEWER_LABELS,
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

const LAYERED_NODES = [
  { id: 'svc', label: 'Payments service', type: 'Service', depth: 0 },
  { id: 'app-a', label: 'Checkout app', type: 'Application', depth: 1 },
  { id: 'app-b', label: 'Ledger app', type: 'Application', depth: 1 },
  { id: 'db', label: 'Shared database', type: 'Database', depth: 2 },
  ...Array.from({ length: 7 }, (_, i) => ({ id: `vm${i}`, label: `VM ${i}`, type: 'Server', depth: 3 })),
];
const LAYERED_EDGES = [
  { id: 'e1', source: 'svc', target: 'app-a', type: 'depends_on' },
  { id: 'e2', source: 'svc', target: 'app-b', type: 'depends_on' },
  { id: 'e3', source: 'app-a', target: 'db', type: 'depends_on' },
  { id: 'e4', source: 'app-b', target: 'db', type: 'depends_on', arrow: 'backward', emphasis: true },
  ...Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, source: 'db', target: `vm${i}`, type: 'runs_on' })),
];

test('RelationshipGraph layered mode renders nodes as buttons, columns, a cluster and one tab stop', () => {
  const html = render(RelationshipGraph, { layout: 'layered', rootId: 'svc', nodes: LAYERED_NODES, edges: LAYERED_EDGES });
  assert.match(html, /uix-relationship-graph--layered/);
  assert.equal((html.match(/class="uix-relationship-graph__item"/g) ?? []).length, 5);
  assert.match(html, /aria-label="Shared database, Database, 9 relationships"/);
  assert.match(html, /7 × Server · runs_on, Show all/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /2 hops · 1/);
  assert.match(html, /3 hops · 7/);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  assert.match(html, /aria-roledescription="relationship map"/);
  assert.match(html, /aria-label="Accessible relationship list"/);
  assert.doesNotMatch(html, /…/);
});

test('RelationshipGraph layered mode is fully localisable and honours the render slots', () => {
  const de = {
    graph: 'Beziehungsgraph', controls: 'Ansichtssteuerung', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern',
    fit: 'Einpassen', reset: 'Ansicht zurücksetzen', panLeft: 'Nach links', panRight: 'Nach rechts',
    panUp: 'Nach oben', panDown: 'Nach unten', left: 'Links', right: 'Rechts', up: 'Oben', down: 'Unten',
    zoomLevel: (p) => `Zoom ${p} %`, graphSummary: (n, e) => `Graph mit ${n} Knoten und ${e} Beziehungen`,
    column: (d, c) => `${d === 0 ? 'Start' : `${d} Schritte`} · ${c}`,
    cluster: (c, t, l) => `${c} × ${t} · ${l}`, expandCluster: 'Alle anzeigen',
    roleDescription: 'Beziehungskarte', keyboardHint: 'Pfeiltasten bewegen den Fokus.',
    relationships: (c) => `${c} Beziehungen`, cycle: 'Zyklus',
  };
  const html = render(RelationshipGraph, {
    layout: 'layered', rootId: 'svc', nodes: LAYERED_NODES, edges: LAYERED_EDGES, labels: de, showList: false,
    renderNode: (node) => (node.id === 'db' ? h('strong', { 'data-slot': 'db' }, 'Kritisch') : null),
    nodeAriaLabel: (node) => `${node.label}, kritisch`,
  });
  for (const english of ['Zoom in', 'Zoom out', 'Reset view', 'relationship map', 'hops', 'Show all', 'Relationship list']) {
    assert.doesNotMatch(html, new RegExp(english), `English "${english}" leaked`);
  }
  assert.match(html, /data-slot="db"/);
  assert.match(html, /aria-label="Shared database, kritisch"/);
  // A nullish renderNode falls back to the default body.
  assert.match(html, /<span class="uix-relationship-graph__item-label">Checkout app<\/span>/);
  assert.doesNotMatch(html, /uix-relationship-graph__list/);
});

test('RelationshipGraph layered mode marks cycles and expanded clusters', () => {
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
  const edges = [{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }, { id: 'ca', source: 'c', target: 'b', type: 'depends_on' }];
  const cyclic = render(RelationshipGraph, { layout: 'layered', nodes, edges, edgeLabels: 'always' });
  assert.match(cyclic, /aria-label="C, 1 relationship, cycle"|aria-label="C, 2 relationships, cycle"/);
  assert.match(cyclic, /<tspan[^>]*>depends_on<\/tspan><tspan[^>]*>cycle<\/tspan>/);
  const expanded = render(RelationshipGraph, {
    layout: 'layered', rootId: 'svc', nodes: LAYERED_NODES, edges: LAYERED_EDGES,
    expandedClusterIds: new Set(['cluster:db:Server:runs_on']),
  });
  assert.equal((expanded.match(/class="uix-relationship-graph__item"/g) ?? []).length, 11);
  assert.match(expanded, /aria-expanded="true"[^>]*>Collapse 7 Server/);
});

test('RelationshipGraph radial mode keeps its English defaults and accepts labels', () => {
  const html = render(RelationshipGraph, {
    nodes: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
    edges: [{ id: 'ab', source: 'a', target: 'b' }],
    labels: { connectedTo: (names) => `Verbunden mit ${names}` },
  });
  assert.match(html, /Verbunden mit Beta/);
  assert.match(html, /aria-label="Pan left">Left</);
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

const CONFLICT = { base: { limit: 1 }, current: { limit: 2 }, incoming: { limit: 3 } };
const actionButtons = (html) => [...html.matchAll(/<button [^>]*>[^<]*<\/button>/g)].map(([markup]) => markup);

test('DiffViewer names each action for its entry and groups the actions', () => {
  const html = render(DiffViewer, CONFLICT);
  assert.match(html, /<div class="uix-diff-viewer__actions" role="group" aria-label="Resolve \$\.limit">/);
  assert.match(html, /<div class="uix-diff-viewer__summary" role="group" aria-label="Difference summary">/);
  const buttons = actionButtons(html);
  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /aria-label="Accept incoming for \$\.limit"[^>]*>Accept incoming</);
  assert.match(buttons[1], /aria-label="Keep current for \$\.limit"[^>]*>Keep current</);
  assert.match(buttons[2], /aria-label="Mark pending for \$\.limit"[^>]*>Mark pending</);
});

test('DiffViewer default action names contain their visible label (WCAG 2.5.3)', () => {
  for (const [visible, named] of [['acceptIncoming', 'acceptIncomingFor'], ['keepCurrent', 'keepCurrentFor'], ['markPending', 'markPendingFor']]) {
    assert.ok(DEFAULT_DIFF_VIEWER_LABELS[named].includes(DEFAULT_DIFF_VIEWER_LABELS[visible]), `${named} contains "${DEFAULT_DIFF_VIEWER_LABELS[visible]}"`);
    assert.ok(DEFAULT_DIFF_VIEWER_LABELS[named].includes('{path}'), `${named} names the entry`);
  }
});

test('DiffViewer renders localized action words and action names (MOTUS bs)', () => {
  const html = render(DiffViewer, {
    ...CONFLICT,
    labels: {
      acceptIncoming: 'Prihvati dolaznu', keepCurrent: 'Zadrži trenutnu', markPending: 'Označi na čekanju',
      acceptIncomingFor: 'Prihvati dolaznu za {path}', keepCurrentFor: 'Zadrži trenutnu za {path}',
      markPendingFor: 'Označi na čekanju za {path}', resolve: 'Razriješi {path}',
    },
  });
  const buttons = actionButtons(html);
  assert.match(buttons[0], /aria-label="Prihvati dolaznu za \$\.limit"[^>]*>Prihvati dolaznu</);
  assert.match(buttons[1], /aria-label="Zadrži trenutnu za \$\.limit"[^>]*>Zadrži trenutnu</);
  assert.match(buttons[2], /aria-label="Označi na čekanju za \$\.limit"[^>]*>Označi na čekanju</);
  assert.match(html, /aria-label="Razriješi \$\.limit"/);
  for (const english of ['Accept incoming', 'Keep current', 'Mark pending', 'Resolve ']) {
    assert.ok(!html.includes(english), `no English "${english}" once translated`);
  }
});

test('DiffViewer controlSize sets the action button size; sm stays the default', () => {
  const sizeOf = (props) => {
    const html = render(DiffViewer, { ...CONFLICT, ...props });
    return {
      root: html.match(/<section class="uix-diff-viewer"[^>]*data-control-size="([a-z]+)"/)?.[1],
      buttons: actionButtons(html).map((b) => b.match(/uix-btn--(sm|lg)\b/)?.[1] ?? 'md'),
    };
  };
  assert.deepEqual(sizeOf({}), { root: 'sm', buttons: ['sm', 'sm', 'sm'] });
  assert.deepEqual(sizeOf({ controlSize: 'md' }), { root: 'md', buttons: ['md', 'md', 'md'] });
  assert.deepEqual(sizeOf({ controlSize: 'lg' }), { root: 'lg', buttons: ['lg', 'lg', 'lg'] });
});

test('ColorPicker normalizes its swatch trigger and names the control', () => {
  const html = render(ColorPicker, { value: '#2563eb', foreground: '#ffffff', onChange: noop, label: 'Brand color' });
  assert.match(html, /aria-label="Brand color: #2563EB"/);
  assert.match(html, /background-color:#2563EB/);
  assert.match(html, /aria-expanded="false"/);
});
