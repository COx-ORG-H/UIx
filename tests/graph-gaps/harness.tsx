/* Live harness for RelationshipGraph gaps (HAR-1639) and CMDB topology sizes (HAR-1387), bundled
 * by build.mjs from source for tests/a11y/relationship-graph-gaps.spec.mjs.
 *   ?case=k3   TENSOR's K3 gaps map: a control, the CIs it covers, expected relations that are
 *              missing (dashed danger edges), toned nodes and a matching legend, several starting
 *              points (no root), a dense column with every label shown, a table beside it whose
 *              rows reveal their node without taking focus;
 *   ?case=cmdb a topology at CMDB size: ?nodes=N (default 300) over 6 levels with cross links,
 *              lateral and back edges and a few cycles; window.__graphTimings records how long the
 *              first render took. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RelationshipGraph } from '../../packages/react/src/index.js';
import type { RelationshipGraphEdge, RelationshipGraphNode } from '../../packages/react/src/index.js';

declare global { interface Window { __graphTimings: { firstRender?: number } } }
window.__graphTimings = {};

const params = new URLSearchParams(location.search);

function K3() {
  const controls = ['K3.1', 'K3.2'];
  const nodes: RelationshipGraphNode[] = [
    // several starting points: the controls are column 0, so there is no one root
    ...controls.map((id) => ({ id, label: `Kontrolle ${id}`, type: 'Control', depth: 0 })),
    { id: 'pay', label: 'Zahlungs-API', type: 'Application', tone: 'success' as const, description: 'Nachweis vorhanden', depth: 1 },
    { id: 'ledger', label: 'Hauptbuch-Datenbank', type: 'Database', tone: 'danger' as const, description: 'Nachweis fehlt', depth: 2 },
    { id: 'audit', label: 'Revisionsprotokoll', type: 'Service', depth: 3 },
    ...Array.from({ length: 6 }, (_, i) => ({ id: `vm${i}`, label: `srv-ledger-prod-0${i}`, type: 'Server', depth: 3 })),
  ];
  const edges: RelationshipGraphEdge[] = [
    { id: 'k1-pay', source: 'K3.1', target: 'pay', label: 'deckt ab' },
    { id: 'k2-ledger', source: 'K3.2', target: 'ledger', label: 'deckt ab', variant: 'dashed', tone: 'danger', description: 'erwartet, fehlt' },
    { id: 'pay-ledger', source: 'pay', target: 'ledger', label: 'schreibt in' },
    { id: 'k1-audit', source: 'K3.1', target: 'audit', label: 'deckt ab' },
    ...Array.from({ length: 6 }, (_, i) => ({ id: `ledger-vm${i}`, source: 'ledger', target: `vm${i}`, label: i % 2 ? 'läuft auf' : 'repliziert nach' })),
  ];
  const [reveal, setReveal] = useState<string | undefined>(undefined);
  return (
    <>
      <h1>K3-Lücken</h1>
      <div id="k3" style={{ width: 'min(100%, 44rem)' }}>
        <RelationshipGraph
          layout="layered" nodes={nodes} edges={edges} controls="none" edgeLabels="always" height="20rem" clusterThreshold={0} showList={false}
          revealId={reveal}
          legend={[
            { id: 'missing', label: 'Erwartet, fehlt', tone: 'danger', variant: 'dashed' },
            { id: 'present', label: 'Nachweis vorhanden', tone: 'success', shape: 'node' },
            { id: 'absent', label: 'Nachweis fehlt', tone: 'danger', shape: 'node' },
          ]}
          labels={{ relationTo: (relation, target) => `${relation} ${target}`, relationFrom: (relation, source) => `${relation}, von ${source}` }}
        />
      </div>
      <table className="uix-table" id="k3-table">
        <thead><tr><th>CI</th></tr></thead>
        <tbody>{nodes.slice(2).map((node) => <tr key={node.id}><td><button type="button" className="uix-btn uix-btn--ghost uix-btn--sm" data-reveal={node.id} onClick={() => setReveal(node.id)}>{node.label}</button></td></tr>)}</tbody>
      </table>
    </>
  );
}

/** A deterministic CMDB-like topology: services → applications → hosts → clusters → racks → sites. */
function topology(count: number) {
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const levels = ['Business Service', 'Application', 'Host', 'Cluster', 'Rack', 'Site'];
  const nodes: RelationshipGraphNode[] = [];
  const byLevel: string[][] = levels.map(() => []);
  for (let i = 0; i < count; i += 1) {
    const level = i === 0 ? 0 : 1 + Math.floor(random() * (levels.length - 1));
    const id = `ci-${i}`;
    nodes.push({ id, label: `${levels[level]} ${i} · srv-${String(i).padStart(4, '0')}.prod.example`, type: levels[level] });
    byLevel[level]!.push(id);
  }
  const edges: RelationshipGraphEdge[] = [];
  for (let level = 1; level < levels.length; level += 1) {
    for (const id of byLevel[level]!) {
      const parents = byLevel[level - 1]!.length ? byLevel[level - 1]! : byLevel[0]!;
      const parent = parents[Math.floor(random() * parents.length)]!;
      edges.push({ id: `${parent}->${id}`, source: parent, target: id, label: 'depends on' });
      if (random() < 0.15) {
        const other = byLevel[level]![Math.floor(random() * byLevel[level]!.length)]!;
        if (other !== id) edges.push({ id: `${id}~${other}`, source: id, target: other, label: 'peers with' });
      }
      if (random() < 0.03 && level > 1) {
        const back = byLevel[level - 2]![Math.floor(random() * byLevel[level - 2]!.length)];
        if (back) edges.push({ id: `${id}<-${back}`, source: id, target: back, label: 'reports to' });
      }
    }
  }
  return { nodes, edges };
}

function Cmdb() {
  const count = Number(params.get('nodes') ?? 300);
  const { nodes, edges } = topology(count);
  const started = performance.now();
  requestAnimationFrame(() => { window.__graphTimings.firstRender = performance.now() - started; });
  return (
    <>
      <h1>CMDB-Topologie ({count})</h1>
      <div id="cmdb">
        <RelationshipGraph layout="layered" rootId="ci-0" nodes={nodes} edges={edges} controls="compact" height="clamp(22rem, 62vh, 44rem)" maxNodes={count} />
      </div>
    </>
  );
}

const view = params.get('case') ?? 'k3';
createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'cmdb' ? <Cmdb /> : <K3 />}</StrictMode>);
