import { createRoot } from 'react-dom/client';
import { useCallback, useState } from 'react';
import { DataWorkspace } from '../packages/react/src/components/DataWorkspace.js';

const rows = Array.from({ length: 10000 }, (_, i) => ({ id: String(i) }));
const columns = [{ id: 'id', header: 'ID', cell: (row: { id: string }) => { window.cells++; return row.id; } }];
const getRowId = (row: { id: string }) => row.id;
declare global { interface Window { calls: number; cells: number; acted: boolean; mode: string } }
window.calls = 0;
window.cells = 0;
window.acted = false;
const actions = (row: { id: string }) => {
  window.calls++;
  if (window.mode === 'all') return <button>Action {row.id}</button>;
  return row.id === '9999' && !['empty', 'declared-empty', 'paged', 'grouped', 'cards'].includes(window.mode) ? <button onClick={() => { window.acted = true; }}>Last action</button> : null;
};
function App() {
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [canAct, setCanAct] = useState(false);
  const dynamicActions = useCallback((row: { id: string }) => {
    if (canAct) return actions(row);
    window.calls++;
    return null;
  }, [canAct]);
  const shortRows = rows.slice(0, 20);
  const displayRows = ['paged', 'grouped', 'cards'].includes(window.mode) ? shortRows : rows;
  const pagination = window.mode === 'paged' ? { mode: 'offset' as const, page: 1, pageSize: 20, total: 20, onPageChange() {} } : undefined;
  const groups = window.mode === 'grouped' ? [{ id: 'group', label: 'Group', rows: shortRows }] : undefined;
  return <>
    {window.mode === 'dynamic' && <button onClick={() => setCanAct((value) => !value)}>Toggle permissions</button>}
    <DataWorkspace label="Items" rows={displayRows} columns={columns} getRowId={getRowId} rowActions={window.mode === 'dynamic' ? dynamicActions : actions}
      rowActionsColumn={window.mode === 'dynamic' ? canAct : window.mode !== 'legacy' && window.mode !== 'empty'} virtualize={{ maxHeight: 400, estimatedRowHeight: 40, overscan: 2 }}
      pagination={pagination} groups={groups} mobile={window.mode === 'cards' ? 'cards' : undefined} rowNavigation selection={selection} onSelectionChange={setSelection} />
  </>;
}
createRoot(document.getElementById('root')!).render(<App />);
