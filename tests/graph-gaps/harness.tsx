/* Live harness for RelationshipGraph gaps (HAR-1639) and CMDB topology sizes (HAR-1387), bundled
 * by build.mjs from source for tests/a11y/relationship-graph-gaps.spec.mjs.
 *   ?case=k3   TENSOR's K3 gaps map: a control, the CIs it covers, expected relations that are
 *              missing (dashed danger edges), toned nodes and a matching legend, several starting
 *              points (no root), a dense column with every label shown, a table beside it whose
 *              rows reveal their node without taking focus;
 *   ?case=cmdb a topology at CMDB size: ?nodes=N (default 300) over 6 levels with cross links,
 *              lateral and back edges and a few cycles; window.__graphTimings records how long the
 *              first render took;
 *   ?case=clinical a hospital's clinical-service dependencies (the operator's demo, 2026-10-23): 25
 *              nodes, toned and dashed edges, a node and edge legend, Bosnian labels, compact
 *              controls, fit; edge-label readability, legend alignment and pan-without-drag;
 *   ?case=radial the default ring layout with its toolbar, for the footer-gutter screenshots (it has
 *              no map footer, so the gutter must leave it as it was). */
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

/** The operator's demo graph ("Zavisnosti kliničkih usluga"), copied from the demo app. */
function Clinical() {
  const nodes: RelationshipGraphNode[] = [
    { id: 'bis', label: 'Bolnički informacioni sistem', type: 'Usluga', depth: 0 },
    { id: 'pacs', label: 'PACS i radiologija', type: 'Usluga', depth: 0, tone: 'danger', description: 'Prekid od 07:40' },
    { id: 'lis', label: 'Laboratorijski sistem', type: 'Usluga', depth: 0 },
    { id: 'erx', label: 'E-recept', type: 'Usluga', depth: 0 },
    { id: 'app-bis', label: 'BIS aplikacija', type: 'Aplikacija', depth: 1 },
    { id: 'app-ris', label: 'RIS', type: 'Aplikacija', depth: 1 },
    { id: 'app-gw', label: 'DICOM pristupnik', type: 'Aplikacija', depth: 1, tone: 'danger', description: 'Odbija C-STORE' },
    { id: 'app-lis', label: 'LIS aplikacija', type: 'Aplikacija', depth: 1 },
    { id: 'app-erx', label: 'E-recept API', type: 'Aplikacija', depth: 1 },
    { id: 'app-sign', label: 'Servis potpisa', type: 'Aplikacija', depth: 1 },
    { id: 'bis-app-01', label: 'bis-app-01', type: 'Server', depth: 2 },
    { id: 'bis-app-02', label: 'bis-app-02', type: 'Server', depth: 2 },
    { id: 'ris-app-01', label: 'ris-app-01', type: 'Server', depth: 2 },
    { id: 'pacs-gw-01', label: 'pacs-gw-01', type: 'Server', depth: 2, tone: 'danger' },
    { id: 'pacs-gw-02', label: 'pacs-gw-02', type: 'Server', depth: 2, tone: 'warning', description: 'Rezerva, ugašena' },
    { id: 'lis-app-01', label: 'lis-app-01', type: 'Server', depth: 2 },
    { id: 'erx-api-01', label: 'erx-api-01', type: 'Server', depth: 2 },
    { id: 'hsm-01', label: 'hsm-01', type: 'Uređaj', depth: 2 },
    { id: 'rtg-01', label: 'rtg-01', type: 'Modalitet', depth: 2, tone: 'success' },
    { id: 'rtg-02', label: 'rtg-02', type: 'Modalitet', depth: 2, tone: 'danger' },
    { id: 'db-bis', label: 'db-bis (SQL klaster)', type: 'Baza', depth: 3 },
    { id: 'db-lis', label: 'db-lis', type: 'Baza', depth: 3 },
    { id: 'pacs-arh', label: 'PACS arhiva', type: 'Skladište', depth: 3 },
    { id: 'vm-host-a', label: 'vm-host-a', type: 'Host', depth: 3 },
    { id: 'vm-host-b', label: 'vm-host-b', type: 'Host', depth: 3 },
  ];
  const e = (source: string, target: string, label: string, extra: Partial<RelationshipGraphEdge> = {}): RelationshipGraphEdge => ({ id: `${source}>${target}`, source, target, label, ...extra });
  const edges: RelationshipGraphEdge[] = [
    e('bis', 'app-bis', 'koristi'), e('pacs', 'app-ris', 'koristi'), e('pacs', 'app-gw', 'koristi', { tone: 'danger', emphasis: true }), e('lis', 'app-lis', 'koristi'),
    e('erx', 'app-erx', 'koristi'), e('erx', 'app-sign', 'koristi'), e('bis', 'app-ris', 'čita nalaze', { variant: 'dashed' }),
    e('app-bis', 'bis-app-01', 'radi na'), e('app-bis', 'bis-app-02', 'radi na'), e('app-ris', 'ris-app-01', 'radi na'),
    e('app-gw', 'pacs-gw-01', 'radi na', { tone: 'danger' }), e('app-gw', 'pacs-gw-02', 'rezerva', { variant: 'dashed', tone: 'warning', description: 'Rezerva nije uključena' }),
    e('app-gw', 'rtg-01', 'prima od'), e('app-gw', 'rtg-02', 'prima od', { variant: 'dashed', tone: 'danger', description: 'Veza prekinuta od 07:40' }),
    e('app-lis', 'lis-app-01', 'radi na'), e('app-erx', 'erx-api-01', 'radi na'), e('app-sign', 'hsm-01', 'potpisuje na'),
    e('bis-app-01', 'db-bis', 'piše u'), e('bis-app-02', 'db-bis', 'piše u'), e('lis-app-01', 'db-lis', 'piše u'), e('pacs-gw-01', 'pacs-arh', 'arhivira u', { tone: 'danger' }),
    e('ris-app-01', 'vm-host-a', 'virtualna mašina na'), e('pacs-gw-01', 'vm-host-a', 'virtualna mašina na'), e('lis-app-01', 'vm-host-b', 'virtualna mašina na'), e('erx-api-01', 'vm-host-b', 'virtualna mašina na'),
  ];
  return (
    <>
      <h1>Zavisnosti kliničkih usluga</h1>
      <div id="clinical">
        <RelationshipGraph
          layout="layered" nodes={nodes} edges={edges} height="clamp(26rem, 70vh, 40rem)" initialView="fit" showList={false} controls="compact" clusterThreshold={0}
          labels={{
            graph: 'Mapa zavisnosti', controls: 'Kontrole prikaza', legend: 'Vrste veza', fit: 'Uklopi',
            zoomLevel: (p: number) => `Uvećanje ${p}%`, navigationHint: (m: string) => `Povucite za pomjeranje · ${m} + kotačić za uvećanje`,
            relationTo: (relation: string, target: string) => `${relation} ${target}`, relationFrom: (relation: string, source: string) => `${relation}, od ${source}`,
          }}
          legend={[
            { id: 'down', label: 'Prekinuta veza', tone: 'danger', variant: 'dashed' },
            { id: 'spare', label: 'Rezerva', tone: 'warning', variant: 'dashed' },
            { id: 'hit', label: 'Pogođeno', tone: 'danger', shape: 'node' },
            { id: 'ok', label: 'Preuzima rad', tone: 'success', shape: 'node' },
          ]}
        />
      </div>
    </>
  );
}

function Radial() {
  const { nodes, edges } = topology(14);
  const [selected, setSelected] = useState('ci-0');
  return (
    <>
      <h1>CMDB-Ring</h1>
      <div id="radial">
        <RelationshipGraph nodes={nodes} edges={edges} selectedId={selected} onSelect={(node) => setSelected(node.id)} showList={false} />
      </div>
    </>
  );
}

const view = params.get('case') ?? 'k3';
createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'cmdb' ? <Cmdb /> : view === 'radial' ? <Radial /> : view === 'clinical' ? <Clinical /> : <K3 />}</StrictMode>);
