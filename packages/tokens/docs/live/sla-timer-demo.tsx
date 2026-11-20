/* The live SlaTimer on its component page (Enterprise patterns → SLA → "Try it").
 *
 * Mounts the real @tensor_1/react SlaTimer, bundled from source by build.mjs: a small queue sorted by
 * slaSortValue on the page's real clock, and the open ticket's record header. "Skip 10 minutes" moves
 * every deadline ten minutes closer (the clock itself is real), so thresholds and the breach can be seen
 * without waiting; "Request info" pauses the open ticket's clock with a reason, as Halo's action does.
 * docs.js imports this when the page opens and calls `mount`, which returns the unmount it calls when the
 * page changes. */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, DataWorkspace, SlaTimer, slaSortValue } from '../../../react/src/index.js';
import type { DataWorkspaceColumn, SlaInput } from '../../../react/src/index.js';

const MIN = 60_000;
const HOUR = 3_600_000;

type Ticket = SlaInput & { id: string; title: string };

function Demo() {
  const [opened] = useState(() => Date.now());
  const [skipped, setSkipped] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [frozen, setFrozen] = useState(0); // time spent paused: the deadline moves on by it when the clock resumes
  const shift = (t: number) => t - skipped + frozen;

  const tickets = useMemo<Ticket[]>(() => [
    { id: 'INC-0419', title: 'VPN disconnects every 10 minutes', startedAt: shift(opened - 3 * HOUR), dueAt: shift(opened + 21 * MIN) },
    { id: 'INC-0420', title: 'Printer queue stuck on floor 3', startedAt: shift(opened - 6 * HOUR), dueAt: shift(opened + 80 * MIN), paused: pausedAt != null, pausedAt: pausedAt == null ? null : shift(pausedAt) },
    { id: 'INC-0423', title: 'Laptop for a new starter', startedAt: shift(opened - 5 * HOUR), dueAt: shift(opened + 4 * HOUR) },
    { id: 'INC-0412', title: 'E-mail outage, Sarajevo office', startedAt: shift(opened - 4 * HOUR), dueAt: shift(opened + 2 * MIN + 30_000) },
    { id: 'INC-0401', title: 'Password reset', dueAt: opened - HOUR, completedAt: opened - 3 * HOUR },
  ], [opened, skipped, pausedAt, frozen]);
  const rows = [...tickets].sort((a, b) => slaSortValue(a) - slaSortValue(b));
  const open = tickets[1];

  const columns = useMemo<DataWorkspaceColumn<Ticket>[]>(() => [
    { id: 'title', header: 'Title', cell: (r) => r.title },
    { id: 'sla', header: 'Resolution SLA', width: '10rem', cell: (r) => <SlaTimer {...r} pausedReason={r.paused ? 'Waiting for the requester' : undefined} /> },
  ], []);

  const togglePause = () => {
    if (pausedAt == null) setPausedAt(Date.now());
    else {
      setFrozen((f) => f + Date.now() - pausedAt);
      setPausedAt(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-4)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
        <Button size="sm" onClick={() => setSkipped((s) => s + 10 * MIN)}>Skip 10 minutes</Button>
        <Button size="sm" onClick={togglePause}>{pausedAt == null ? 'Request info on INC-0420' : 'The requester replied'}</Button>
      </div>
      <section aria-label="INC-0420" className="uix-card" style={{ padding: 'var(--uix-space-4)', display: 'grid', gap: 'var(--uix-space-3)' }}>
        <strong>{open.id} {open.title}</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-6)' }}>
          <SlaTimer {...open} variant="header" label="Resolution" pausedReason={open.paused ? 'Waiting for the requester' : undefined} announce />
          <SlaTimer variant="header" label="First response" dueAt={opened - 5 * HOUR} completedAt={opened - 5.5 * HOUR} />
        </div>
      </section>
      <DataWorkspace<Ticket>
        label="Incidents, most urgent first" rows={rows} getRowId={(r) => r.id} columns={columns}
        idColumn={{ header: 'ID', id: 'id', text: (r: Ticket) => r.id }} status="ready"
      />
    </div>
  );
}

export function mount(host: HTMLElement) {
  const root = createRoot(host);
  root.render(<StrictMode><Demo /></StrictMode>);
  return () => root.unmount();
}
