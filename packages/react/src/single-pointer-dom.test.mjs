/* WCAG 2.5.7 (roadmap #19): the markup of the single-pointer paths. A KanbanCard that can move gets
 * a Move menu button unless the product opts out; DashboardCanvas handles are disclosure buttons
 * for their step buttons; the words come from UixLabelsProvider. The clicks themselves are driven
 * in Chromium (tests/a11y/single-pointer.spec.mjs). Renders the BUILT dist — run `npm run build`
 * first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ui from '../dist/index.js';

const card = (props) => renderToStaticMarkup(h(ui.KanbanCard, { title: 'INC-0412', ...props }));

test('KanbanCard: no Move button without a move; one with onMove or onMoveTo; moveMenu={false} opts out', () => {
  assert.doesNotMatch(card({}), /uix-kanban__card-move/);
  const withMove = card({ onMove: () => {} });
  assert.match(withMove, /class="uix-kanban__card uix-kanban__card--movable"/);
  assert.match(withMove, /<button[^>]*aria-label="Move INC-0412"[^>]*aria-haspopup="menu"/);
  assert.match(card({ moveColumns: [{ id: 'a', label: 'A' }], onMoveTo: () => {} }), /aria-label="Move INC-0412"/);
  // columns without onMoveTo are not a move
  assert.doesNotMatch(card({ moveColumns: [{ id: 'a', label: 'A' }] }), /uix-kanban__card-move/);
  assert.doesNotMatch(card({ onMove: () => {}, moveMenu: false }), /uix-kanban__card-move/);
});

test('KanbanCard: moveLabel names the button when the title is not text; itemId is on the button', () => {
  const html = card({ title: h('a', { href: '/r/1' }, 'INC-0412'), moveLabel: 'INC-0412', itemId: 'c1', onMove: () => {} });
  assert.match(html, /aria-label="Move INC-0412"[^>]*data-uix-kanban-move="c1"|data-uix-kanban-move="c1"[^>]*aria-label="Move INC-0412"/);
});

test('UixLabelsProvider: kanban, dashboardCanvas and viewMenu words reach the components', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, {
    labels: { kanban: { moveMenu: '{label} verschieben' }, dashboardCanvas: { move: '{label} verschieben', resize: 'Größe von {label} ändern' }, viewMenu: { rowActions: 'Spaltenaktionen: {label}' } },
  },
  h(ui.KanbanCard, { title: 'INC-0412', onMove: () => {} }),
  h(ui.DashboardCanvas, { items: [{ id: 'a', col: 0, row: 0, w: 6, h: 2 }], editable: true, renderItem: () => 'A' }),
  h(ui.ViewMenu, { columns: [{ id: 'title', label: 'Titel', visible: true }], onReorder: () => {} })));
  assert.match(html, /aria-label="INC-0412 verschieben"/);
  assert.match(html, /aria-label="a verschieben"[^>]*aria-expanded="false"/);
  assert.match(html, /aria-label="Größe von a ändern"[^>]*aria-expanded="false"/);
  assert.match(html, /aria-label="Spaltenaktionen: Titel"/);
});

test('DashboardCanvas: the default instructions say a press shows step buttons', () => {
  assert.match(ui.DEFAULT_DASHBOARD_CANVAS_LABELS.instructions, /^Press for buttons/);
  for (const key of ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'narrower', 'wider', 'shorter', 'taller', 'closeSteps']) {
    assert.ok(ui.DEFAULT_DASHBOARD_CANVAS_LABELS[key], key);
  }
  assert.deepEqual(Object.keys(ui.DEFAULT_KANBAN_LABELS).sort(), ['moveDown', 'moveLeft', 'moveMenu', 'moveRight', 'moveTo', 'moveUp']);
});
