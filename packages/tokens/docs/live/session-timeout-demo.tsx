/* The live SessionTimeout on its pattern page (Patterns → Session timeout → "Try it").
 *
 * Mounts the real @tensor_1/react SessionTimeout, bundled from source by build.mjs, on a short
 * clock: "Start a session" makes one that ends in 40 seconds and warns 30 seconds before. The note
 * is the person's draft: onPersistDrafts keeps it in sessionStorage, so the "signed out" notice can
 * say it was kept, and it is still in the field after Close. Two switches make the next renewal
 * fail and pause the clock while the tab is hidden. docs.js imports this when the page opens and
 * calls `mount`, which returns the unmount it calls when the page changes. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Field, SessionTimeout, Switch, Textarea } from '../../../react/src/index.js';

const LENGTH = 40_000;
const WARN = 30_000;
const DRAFT_KEY = 'uix-docs-session-draft';

function Demo() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [fail, setFail] = useState(false);
  const [pause, setPause] = useState(false);
  const [note, setNote] = useState(() => { try { return sessionStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; } });
  const [log, setLog] = useState<string[]>([]);
  const noteRef = useRef(note);
  noteRef.current = note;
  const failRef = useRef(fail);
  failRef.current = fail;
  const say = (entry: string) => setLog((lines) => [...lines.slice(-4), entry]);
  const time = () => new Date().toLocaleTimeString('en-GB');

  return (
    <div className="uix-docs__live-demo" style={{ display: 'grid', gap: 'var(--uix-space-4)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-3)', alignItems: 'center' }}>
        <Button variant="primary" onClick={() => { setExpiresAt(Date.now() + LENGTH); say(`${time()} session started, ends in 40 s`); }}>
          {expiresAt ? 'Restart the session' : 'Start a session (40 s)'}
        </Button>
        <Switch checked={fail} onChange={(event) => setFail(event.currentTarget.checked)} label="Next renewal fails" />
        <Switch checked={pause} onChange={(event) => setPause(event.currentTarget.checked)} label="Pause while the tab is hidden" />
      </div>
      <Field label="Work note" hint="Your draft. It is kept if the session ends.">
        <Textarea rows={3} value={note} onChange={(event) => setNote(event.currentTarget.value)} />
      </Field>
      <ol aria-label="What happened" style={{ margin: 0, paddingInlineStart: 'var(--uix-space-5)', color: 'var(--uix-text-hushed)', fontSize: 'var(--uix-text-meta)' }}>
        {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
      </ol>
      <SessionTimeout
        expiresAt={expiresAt}
        warnBefore={WARN}
        pauseWhenHidden={pause}
        onWarn={() => say(`${time()} warning opened`)}
        onExtend={async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
          if (failRef.current) { say(`${time()} renewal failed`); throw new Error('renewal failed'); }
          say(`${time()} renewed for 40 s`);
          return Date.now() + LENGTH;
        }}
        onSignOut={() => { setExpiresAt(null); say(`${time()} signed out`); }}
        onSignIn={() => { setExpiresAt(Date.now() + LENGTH); say(`${time()} signed in again`); }}
        onExpire={() => say(`${time()} session ended`)}
        onPersistDrafts={(reason) => {
          try { sessionStorage.setItem(DRAFT_KEY, noteRef.current); } catch { /* private mode */ }
          say(`${time()} draft kept (${reason})`);
        }}
      />
    </div>
  );
}

export function mount(el: HTMLElement): () => void {
  const root = createRoot(el);
  root.render(<StrictMode><Demo /></StrictMode>);
  return () => root.unmount();
}
