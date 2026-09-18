/* RelationshipGraph at real CMDB scale (RX-22 / HAR-365; findings LD-16, CM-48) in jsdom.
 *
 * The model is unit-tested in relationship-graph-layered.test.mjs. This is the RENDERED
 * claim, which the model cannot make: a layout with no overlaps is worthless if the
 * renderer then truncates the labels, drops items, or loses the keyboard model. The
 * fixture is the one the acceptance names — 5 levels, 120 nodes, a diamond and a cycle.
 *
 * It also pins the two radial-mode defects the finding cites: a label cut to 15 characters
 * with no way to read the rest, and a fixed `viewBox` that silently clips anything a
 * consumer positions outside 600×400 (invalid geometry fails to INVISIBLE, not to an error).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 * Run: node --test (from packages/react), or npm test -w @tensor_1/react.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let RelationshipGraph;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no layout engine, so the graph's ResizeObserver never fires on its own
  if (!dom.window.ResizeObserver) {
    expose('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    dom.window.ResizeObserver = globalThis.ResizeObserver;
  }
  // Radial focus and layered auto-pan call the BARE global `requestAnimationFrame`. jsdom
  // puts one on its window, not on globalThis, so without this the call throws inside
  // React's commit phase, jsdom prints a lone ReferenceError, and the test still passes.
  expose('requestAnimationFrame', dom.window.requestAnimationFrame?.bind(dom.window)
    ?? ((fn) => dom.window.setTimeout(() => fn(Date.now()), 0)));
  expose('cancelAnimationFrame', dom.window.cancelAnimationFrame?.bind(dom.window)
    ?? ((id) => dom.window.clearTimeout(id)));
  ({ createRoot } = await import('react-dom/client'));
  ({ RelationshipGraph } = await import('../dist/index.js'));
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame']) delete globalThis[name];
});

/* ── the fixture the acceptance names ──────────────────────────────────────────────
 * 120 nodes over 5 levels, with names long enough to be cut by any truncation rule:
 *   · a DIAMOND — two paths out of the root rejoin at one shared node, which must be
 *     drawn once rather than duplicated per path;
 *   · a CYCLE — level 4 points back at level 1.
 */
function fixture() {
  const nodes = [{ id: 'root', label: 'Payment gateway cluster eu-central-1', type: 'Service' }];
  const edges = [];
  const perLevel = [8, 22, 34, 36, 19]; // 119 + root = 120
  let previous = ['root'];

  perLevel.forEach((count, index) => {
    const level = index + 1;
    const current = [];
    for (let i = 0; i < count; i++) {
      const id = `l${level}-${i}`;
      current.push(id);
      nodes.push({ id, label: `Configuration item ${level}.${i} — application server node`, type: 'Server' });
      const parent = previous[i % previous.length];
      edges.push({ id: `e-${parent}-${id}`, source: parent, target: id, type: 'depends_on' });
    }
    previous = current;
  });

  // diamond: a second parent for one level-2 node, so two paths from the root rejoin
  edges.push({ id: 'e-diamond', source: 'l1-1', target: 'l2-0', type: 'depends_on' });
  // cycle: level 4 back to level 1
  edges.push({ id: 'e-cycle', source: 'l4-0', target: 'l1-0', type: 'depends_on' });

  return { nodes, edges };
}

function mount(props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => { root.render(h(RelationshipGraph, props)); });
  return { host, root, cleanup: () => act(() => root.unmount()) };
}

const boxes = (host) => Array.from(host.querySelectorAll('.uix-relationship-graph__item'), (el) => ({
  id: el.dataset.nodeId,
  left: Number.parseFloat(el.style.left),
  top: Number.parseFloat(el.style.top),
  width: Number.parseFloat(el.style.width),
  height: Number.parseFloat(el.style.height),
}));

/* ── layered mode at scale ─────────────────────────────────────────────────────── */

test('layered: 120 nodes over 5 levels render with full labels — no label is cut', () => {
  const { nodes, edges } = fixture();
  const ui = mount({ nodes, edges, layout: 'layered', rootId: 'root', maxNodes: 400, clusterThreshold: 0 });

  const region = ui.host.querySelector('[aria-roledescription]');
  assert.ok(region, 'the graph region did not render');

  const items = ui.host.querySelectorAll('.uix-relationship-graph__item');
  assert.equal(items.length, nodes.length, `rendered ${items.length} items for ${nodes.length} nodes`);

  const cut = Array.from(items).filter((el) => el.textContent.includes('…'));
  assert.deepEqual(cut.map((el) => el.dataset.nodeId), [], 'a node label was truncated with an ellipsis');

  // and the label is really the WHOLE label, not a shorter string that happens to lack '…'
  const first = ui.host.querySelector('[data-node-id="root"] .uix-relationship-graph__item-label');
  assert.equal(first.textContent, 'Payment gateway cluster eu-central-1');
  const deep = ui.host.querySelector('[data-node-id="l5-18"] .uix-relationship-graph__item-label');
  assert.equal(deep.textContent, 'Configuration item 5.18 — application server node');

  ui.cleanup();
});

test('layered: the shared node of a diamond is drawn once, and the cycle is flagged', () => {
  const { nodes, edges } = fixture();
  const ui = mount({ nodes, edges, layout: 'layered', rootId: 'root', maxNodes: 400, clusterThreshold: 0 });

  assert.equal(ui.host.querySelectorAll('[data-node-id="l2-0"]').length, 1, 'the diamond\'s shared node was drawn twice');

  const flagged = ui.host.querySelectorAll('.uix-relationship-graph__item-flag');
  assert.ok(flagged.length > 0, 'the cycle is not marked on any node');

  ui.cleanup();
});

test('layered: no two node boxes overlap at 120 nodes', () => {
  const { nodes, edges } = fixture();
  const ui = mount({ nodes, edges, layout: 'layered', rootId: 'root', maxNodes: 400, clusterThreshold: 0 });

  const placed = boxes(ui.host);
  assert.equal(placed.length, nodes.length);
  for (const box of placed) {
    assert.ok(Number.isFinite(box.left) && Number.isFinite(box.top), `${box.id} has no position`);
    assert.ok(box.width > 0 && box.height > 0, `${box.id} has no size`);
  }

  const overlaps = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.left < b.left + b.width && b.left < a.left + a.width
        && a.top < b.top + b.height && b.top < a.top + a.height) overlaps.push(`${a.id}/${b.id}`);
    }
  }
  console.log(`layered: ${placed.length} node boxes compared pairwise (${(placed.length * (placed.length - 1)) / 2} pairs), ${overlaps.length} overlapping`);
  assert.deepEqual(overlaps.slice(0, 5), [], 'node boxes overlap');

  ui.cleanup();
});

test('layered: arrow keys move focus along edges', () => {
  const { nodes, edges } = fixture();
  const moves = [];
  const ui = mount({
    nodes, edges, layout: 'layered', rootId: 'root', maxNodes: 400, clusterThreshold: 0,
    focusId: 'root', onFocusChange: (id) => moves.push(id),
  });

  const press = (id, key) => {
    const el = ui.host.querySelector(`[data-node-id="${id}"]`);
    assert.ok(el, `${id} is not rendered`);
    act(() => {
      el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
  };

  // → follows a forward edge out of the root, into the next column
  press('root', 'ArrowRight');
  assert.ok(moves.length > 0, 'ArrowRight did not move focus');
  const forward = moves.at(-1);
  assert.ok(edges.some((e) => e.source === 'root' && e.target === forward), `focus went to ${forward}, which the root has no edge to`);

  // ↓ stays inside the column it landed in
  press(forward, 'ArrowDown');
  const sibling = moves.at(-1);
  assert.notEqual(sibling, forward, 'ArrowDown did not move focus');
  assert.ok(sibling.startsWith('l1-'), `ArrowDown left the column: ${sibling}`);

  // Home returns to the root
  press(sibling, 'Home');
  assert.equal(moves.at(-1), 'root', 'Home did not return to the root');

  console.log(`layered keyboard: ${moves.length} focus moves recorded (${moves.slice(0, 4).join(' → ')} …)`);
  ui.cleanup();
});

/* ── radial mode: the full label and a viewBox that fits ───────────────────────── */

test('radial: a long label is readable in full through <title>', () => {
  const nodes = [
    { id: 'a', label: 'Payment gateway cluster eu-central-1', type: 'Service' },
    { id: 'b', label: 'Configuration item 1.0 — application server node', type: 'Server' },
  ];
  const edges = [{ id: 'e', source: 'a', target: 'b', type: 'depends_on' }];
  const ui = mount({ nodes, edges });

  for (const node of nodes) {
    const group = ui.host.querySelector(`[data-node-id="${node.id}"]`);
    assert.ok(group, `${node.id} is not rendered`);
    const title = group.querySelector('title');
    assert.ok(title, `${node.id} has no <title>, so a cut label cannot be read at all`);
    assert.equal(title.textContent, node.label, `${node.id}'s <title> must carry the whole label`);
  }

  ui.cleanup();
});

test('radial: the viewBox contains every node box, including consumer-positioned ones', () => {
  // A consumer that supplies its own coordinates is honoured by the layout model, and the
  // fixed 600×400 viewBox then clipped those nodes out of sight with no error anywhere.
  const nodes = [
    { id: 'a', label: 'Root', x: 50, y: 50 },
    { id: 'far', label: 'Far right', x: 140, y: 118 },
    { id: 'neg', label: 'Off the left edge', x: -30, y: -12 },
  ];
  const edges = [
    { id: 'e1', source: 'a', target: 'far' },
    { id: 'e2', source: 'a', target: 'neg' },
  ];
  const ui = mount({ nodes, edges });

  const svg = ui.host.querySelector('svg');
  const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  console.log(`radial viewBox: ${vx} ${vy} ${vw} ${vh}`);

  const groups = Array.from(ui.host.querySelectorAll('[data-node-id]'));
  assert.equal(groups.length, nodes.length);
  for (const group of groups) {
    const [, tx, ty] = group.getAttribute('transform').match(/translate\((-?[\d.]+) (-?[\d.]+)\)/).map(Number);
    const rect = group.querySelector('rect');
    const left = tx + Number(rect.getAttribute('x'));
    const top = ty + Number(rect.getAttribute('y'));
    const right = left + Number(rect.getAttribute('width'));
    const bottom = top + Number(rect.getAttribute('height'));
    const id = group.dataset.nodeId;
    assert.ok(left >= vx, `${id} starts at ${left}, left of the viewBox (${vx})`);
    assert.ok(top >= vy, `${id} starts at ${top}, above the viewBox (${vy})`);
    assert.ok(right <= vx + vw, `${id} ends at ${right}, right of the viewBox (${vx + vw})`);
    assert.ok(bottom <= vy + vh, `${id} ends at ${bottom}, below the viewBox (${vy + vh})`);
  }

  ui.cleanup();
});
