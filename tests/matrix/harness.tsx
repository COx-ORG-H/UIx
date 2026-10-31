/* Live harness for the two-axis grids and SaveStatus's long refusal, bundled by build.mjs for
 * tests/a11y/matrix.spec.mjs. window.__matrix records what was chosen and opened.
 *   - #bia: MatrixInput on TENSOR's business impact analysis: German, a "nicht bewertet" value,
 *     help on one cell, an error on another, one locked and one disabled cell;
 *   - #wide: twelve columns and a capped height in a narrow frame, with both headers sticky;
 *   - #shrink: a heatmap in a shrink-to-fit flex row;
 *   - #locked: the whole grid read-only, and #off the whole grid disabled;
 *   - #risk: MatrixHeatmap, buttons: every band, a zero, a hidden zero, empty cells;
 *   - #links: MatrixHeatmap whose cells are links through renderLink;
 *   - #refusal: SaveStatus with a long German refusal and a retry; #short: a short one with room;
 *   - #saved: Saved beside a button in a tight row, which must not paint over it;
 *   - #follow: help that follows the value. */
import { StrictMode, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { MatrixHeatmap, MatrixInput, SaveStatus } from '../../packages/react/src/index.js';
import type { MatrixCellState, MatrixHeatmapCell, MatrixOption, MatrixValue } from '../../packages/react/src/index.js';

declare global { interface Window { __matrix: { changes: string[]; opened: string[] } } }
window.__matrix = { changes: [], opened: [] };

const CRITERIA = [
  { id: 'finance', label: 'Finanzieller Schaden', description: 'Direkte Kosten' },
  { id: 'reputation', label: 'Reputation' },
  { id: 'legal', label: 'Rechtliche Folgen und vertragliche Verpflichtungen' },
];
const HORIZONS = [
  { id: 'h4', label: '4 Stunden' },
  { id: 'd1', label: '1 Tag' },
  { id: 'd3', label: '3 Tage' },
  { id: 'w1', label: '1 Woche' },
];
const LEVELS: MatrixOption[] = [
  { value: 'na', label: 'nicht bewertet', unrated: true },
  { value: 'low', label: 'Gering', tone: 'success' },
  { value: 'mid', label: 'Mittel', tone: 'warning', description: 'Spürbar, aber tragbar' },
  { value: 'high', label: 'Hoch', tone: 'attention' },
  { value: 'crit', label: 'Kritisch', tone: 'danger' },
];

function Bia() {
  const [value, setValue] = useState<MatrixValue>({ finance: { h4: 'low', d1: 'mid', d3: 'high', w1: 'crit' }, reputation: { h4: 'na' } });
  const getCell = (rowId: string, columnId: string): MatrixCellState | undefined => {
    if (rowId === 'reputation' && columnId === 'd1') return { help: 'Bewerten Sie die Wirkung auf Kunden und Presse.' };
    if (rowId === 'reputation' && columnId === 'd3') return { error: 'Bitte einen Wert wählen.' };
    if (rowId === 'legal' && columnId === 'h4') return { readOnly: true };
    if (rowId === 'legal' && columnId === 'd1') return { disabled: true };
    return undefined;
  };
  return (
    <MatrixInput
      id="bia"
      aria-label="Auswirkung je Kriterium"
      rows={CRITERIA}
      columns={HORIZONS}
      options={LEVELS}
      value={value}
      rowAxisLabel="Kriterium"
      columnAxisLabel="Ausfalldauer"
      labels={{ empty: 'Wählen' }}
      getCell={getCell}
      onChange={(next, change) => {
        window.__matrix.changes.push(`${change.rowId}/${change.columnId}=${change.value}`);
        setValue(next);
      }}
    />
  );
}

function Wide() {
  const columns = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, label: `Monat ${i + 1}` })), []);
  const rows = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, label: `Kriterium ${i + 1}` })), []);
  const [value, setValue] = useState<MatrixValue>({});
  return (
    <div style={{ maxWidth: 420, '--uix-matrix-max-height': '14rem' } as CSSProperties}>
      <MatrixInput id="wide" aria-label="Breites Raster" rows={rows} columns={columns} options={LEVELS} value={value} rowAxisLabel="Kriterium" labels={{ empty: 'Wählen' }} onChange={setValue} />
    </div>
  );
}

const PROBABILITY = [
  { id: 'rare', label: 'Selten' },
  { id: 'possible', label: 'Möglich' },
  { id: 'likely', label: 'Wahrscheinlich' },
  { id: 'certain', label: 'Fast sicher' },
];
const IMPACT = [{ id: 'severe', label: 'Schwer' }, { id: 'moderate', label: 'Mittel' }, { id: 'minor', label: 'Gering' }];
const band = {
  low: { label: 'Niedrig', tone: 'success' },
  mid: { label: 'Mittel', tone: 'warning' },
  high: { label: 'Hoch', tone: 'attention' },
  top: { label: 'Kritisch', tone: 'danger' },
  info: { label: 'Beobachten', tone: 'info' },
  none: { label: 'Keine', tone: 'neutral' },
} as const;
const CELLS: MatrixHeatmapCell[] = [
  { rowId: 'severe', columnId: 'rare', count: 2, band: band.mid },
  { rowId: 'severe', columnId: 'possible', count: 5, band: band.high },
  { rowId: 'severe', columnId: 'likely', count: 12, band: band.top },
  { rowId: 'severe', columnId: 'certain', count: 1284, band: band.top },
  { rowId: 'moderate', columnId: 'rare', count: 0, band: band.low },
  { rowId: 'moderate', columnId: 'possible', count: 3, band: band.mid },
  { rowId: 'moderate', columnId: 'likely', count: 7, band: band.high },
  { rowId: 'minor', columnId: 'rare', count: 0, band: band.none, hideCount: true },
  { rowId: 'minor', columnId: 'possible', count: 4, band: band.info },
];

function Follow() {
  const [value, setValue] = useState<MatrixValue>({ finance: { h4: 'low' } });
  return (
    <MatrixInput
      id="follow"
      aria-label="Hilfe folgt dem Wert"
      rows={CRITERIA.slice(0, 1)}
      columns={HORIZONS.slice(0, 2)}
      options={LEVELS}
      value={value}
      rowAxisLabel="Kriterium"
      labels={{ empty: 'Wählen' }}
      getCell={(rowId, columnId) => ({ help: `Hilfe zu ${value[rowId]?.[columnId] ?? 'leer'}` })}
      onChange={setValue}
    />
  );
}

function App() {
  return (
    <>
      <section><h2>Business impact</h2><Bia /></section>
      <section><h2>Wide grid</h2><Wide /></section>
      <section>
        <h2>Read-only</h2>
        <MatrixInput id="locked" aria-label="Nur lesen" rows={CRITERIA.slice(0, 2)} columns={HORIZONS.slice(0, 3)} options={LEVELS} value={{ finance: { h4: 'crit', d1: 'low' } }} rowAxisLabel="Kriterium" labels={{ empty: '—' }} readOnly onChange={() => {}} />
      </section>
      <section>
        <h2>Disabled</h2>
        <MatrixInput id="off" aria-label="Gesperrt" rows={CRITERIA.slice(0, 2)} columns={HORIZONS.slice(0, 3)} options={LEVELS} value={{ finance: { h4: 'crit', d1: 'low' } }} rowAxisLabel="Kriterium" labels={{ empty: '—' }} disabled onChange={() => {}} />
      </section>
      <section>
        <h2>Risk heatmap</h2>
        <MatrixHeatmap id="risk" aria-label="Risikolage" rows={IMPACT} columns={PROBABILITY} cells={CELLS} rowAxisLabel="Auswirkung" columnAxisLabel="Eintritt" labels={{ empty: 'Keine Daten' }} onOpenCell={(cell) => window.__matrix.opened.push(`${cell.rowId}/${cell.columnId}`)} />
      </section>
      <section>
        <h2>Links</h2>
        <MatrixHeatmap id="links" aria-label="Risikolage als Links" rows={IMPACT.slice(0, 1)} columns={PROBABILITY.slice(0, 2)} cells={CELLS.slice(0, 2).map((c) => ({ ...c, href: `#${c.columnId}` }))} rowAxisLabel="Auswirkung" labels={{ empty: 'Keine Daten' }} />
      </section>
      <section>
        <h2>Save refusal</h2>
        <div id="refusal" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 8, border: '1px solid var(--uix-border)' }}>
          <SaveStatus state="failed" onRetry={() => {}} labels={{ failed: 'Nicht gespeichert: Das Ende muss nach dem Beginn liegen.', retry: 'Erneut versuchen' }} />
        </div>
        <div id="short" style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
          <SaveStatus state="failed" onRetry={() => {}} />
        </div>
        <div id="saved" style={{ display: 'flex', width: 120, gap: 8 }}>
          <SaveStatus state="saved" labels={{ saved: 'Alle Änderungen gespeichert' }} />
          <button type="button" style={{ flex: 'none' }}>Schließen</button>
        </div>
      </section>
      <section><h2>Help follows the value</h2><Follow /></section>
      <section>
        <h2>Shrink to fit</h2>
        <div id="shrink-row" style={{ display: 'flex' }}>
          <MatrixHeatmap id="shrink" aria-label="Im Flex" rows={IMPACT.slice(0, 1)} columns={PROBABILITY.slice(0, 2)} cells={CELLS.slice(0, 2)} rowAxisLabel="Auswirkung" labels={{ empty: 'Keine Daten' }} onOpenCell={() => {}} />
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
