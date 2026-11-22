/* The live demos on Patterns → Form errors: the real ErrorSummary + useFormErrors, useLeaveGuard
 * and ConflictNotice, bundled from source by build.mjs. docs.js imports this when the page opens and
 * calls `mount` on each [data-live-demo="form-errors-demo"] element; `data-demo` picks the part. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, ConflictNotice, Field, Input, SaveStatus, useLeaveGuard,
} from '../../../react/src/index.js';
import type { JsonValue, SaveStatusState } from '../../../react/src/index.js';
import { ErrorSummaryForm } from './shared/error-summary-form.js';

function SummaryDemo() {
  return <ErrorSummaryForm />;
}

const STATES: SaveStatusState[] = ['idle', 'saving', 'saved', 'failed'];

function LeaveDemo() {
  const [notes, setNotes] = useState('');
  const [saveState, setSaveState] = useState<SaveStatusState>('idle');
  const [left, setLeft] = useState(0);
  const leave = useLeaveGuard({ dirty: notes !== '', saveState, fields: notes ? ['Notes'] : [] });
  return (
    <div className="uix-form-stack" style={{ maxWidth: '32rem' }}>
      <Field label="Notes" hint="Type something, then try to leave.">
        <Input value={notes} onChange={(event) => setNotes(event.currentTarget.value)} autoComplete="off" />
      </Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uix-space-3)' }}>
        <a href="#form-errors" onClick={(event) => { event.preventDefault(); leave.confirm(() => { setLeft((n) => n + 1); setNotes(''); }); }}>Go to the incident list</a>
        <Button size="sm" onClick={() => setSaveState(STATES[(STATES.indexOf(saveState) + 1) % STATES.length])}>Next save state</Button>
        <SaveStatus state={saveState} delay={0} />
      </div>
      <p className="uix-docs__live-status" role="status">{leave.active ? 'The guard is on.' : 'The guard is off.'}{left ? ` Left the page ${left}×.` : ''}</p>
      {leave.dialog}
    </div>
  );
}

const BASE = { title: 'Mail relay down', priority: 'P3', assignee: 'Ana Kovač', notes: '' };
const THEIRS = { ...BASE, title: 'Mail relay down (EU)', priority: 'P1' };
const NAMES: Record<string, string> = { '$.title': 'Title', '$.priority': 'Priority', '$.assignee': 'Assignee', '$.notes': 'Notes' };

function ConflictDemo() {
  const [record, setRecord] = useState<{ base: JsonValue; yours: JsonValue }>({ base: BASE, yours: { ...BASE, priority: 'P2', notes: 'Restarted the relay' } });
  const [conflict, setConflict] = useState(false);
  const settle = (next: JsonValue | undefined) => { setRecord({ base: THEIRS, yours: next ?? THEIRS }); setConflict(false); };
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-3)' }}>
      {conflict ? (
        <ConflictNotice
          base={record.base} yours={record.yours} theirs={THEIRS} changedBy="Alex Novak" changedAt="14:02"
          labelFor={(path) => NAMES[path]}
          onReload={settle}
          onApply={settle}
          onDiscard={() => settle(THEIRS)}
        />
      ) : (
        <div><Button onClick={() => setConflict(true)}>Save (the server answers 409)</Button></div>
      )}
      <pre className="uix-docs__live-status">{JSON.stringify(record.yours, null, 2)}</pre>
    </div>
  );
}

const DEMOS = { summary: SummaryDemo, leave: LeaveDemo, conflict: ConflictDemo } as const;

export function mount(el: HTMLElement): () => void {
  const Demo = DEMOS[(el.dataset.demo as keyof typeof DEMOS) ?? 'summary'] ?? SummaryDemo;
  const root = createRoot(el);
  root.render(<StrictMode><div className="uix-docs__live-demo"><Demo /></div></StrictMode>);
  return () => root.unmount();
}
