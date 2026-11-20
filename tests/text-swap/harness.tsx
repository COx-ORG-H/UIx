/* Live harness for the in-place text swaps (One UI's rule: text goes fully out before the new text
 * comes in; icons and images may overlap), bundled by build.mjs from source for
 * tests/a11y/text-swap.spec.mjs and tests/text-swap/frames.mjs:
 *   - #btn: a Button with `result` (Save → Saved / Couldn't save → Save);
 *   - #team: a Select (the trigger's value swap);
 *   - #toolbar: two icon buttons whose tooltips hand over to each other;
 *   - #count: a Count; #save-status: a SaveStatus; #copy: a CopyButton; #drop: a FileDrop.
 * window.__swap drives each one from the test, without pointer timing. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, CopyButton, Count, FileDrop, SaveStatus, Select, Tooltip,
} from '../../packages/react/src/index.js';
import { CopyIcon, LinkIcon } from '../../packages/react/src/icons/components.js';
import type { ButtonResult, SaveStatusState } from '../../packages/react/src/index.js';

interface Swap {
  result: (kind: ButtonResult | null) => void;
  select: (value: string) => void;
  count: (value: number) => void;
  save: (state: SaveStatusState) => void;
}
declare global { interface Window { __swap: Swap } }

const TEAMS = ['Service Desk', 'Arbeitsplatz', 'Netzwerk', 'Rechenzentrum'].map((t) => ({ value: t, label: t }));

function App() {
  const [result, setResult] = useState<ButtonResult | null>(null);
  const [team, setTeam] = useState('Service Desk');
  const [count, setCount] = useState(8);
  const [save, setSave] = useState<SaveStatusState>('idle');
  window.__swap = { result: setResult, select: setTeam, count: setCount, save: setSave };
  return (
    <>
      <section>
        <h2>Button result</h2>
        <div><Button id="btn" variant="secondary" result={result} resultLabels={{ success: 'Saved', error: 'Couldn’t save' }}>Save changes</Button></div>
      </section>
      <section>
        <h2>Select value</h2>
        <div style={{ width: 240 }}><Select id="team" aria-label="Team" options={TEAMS} value={team} onValueChange={(v) => setTeam(String(v))} /></div>
      </section>
      <section>
        <h2>Tooltip hand-over</h2>
        <div id="toolbar" role="toolbar" aria-label="Werkzeuge" style={{ display: 'flex', gap: 4, marginTop: 48 }}>
          <Tooltip label="Link einfügen"><Button icon variant="ghost" aria-label="Link einfügen"><LinkIcon /></Button></Tooltip>
          <Tooltip label="Kopieren"><Button icon variant="ghost" aria-label="Kopieren"><CopyIcon /></Button></Tooltip>
        </div>
      </section>
      <section>
        <h2>Count, SaveStatus, CopyButton</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span id="count" style={{ fontSize: 24 }}><Count value={count} /></span>
          <span id="save-status"><SaveStatus state={save} /></span>
          <span id="copy"><CopyButton value="INC-4711" label="Copy ticket number" copiedLabel="Copied" /></span>
        </div>
      </section>
      <section>
        <h2>FileDrop</h2>
        <div id="drop" style={{ width: 420 }}><FileDrop onFiles={() => {}} /></div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
