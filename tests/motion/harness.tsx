/* Live harness for the motion policy (HAR-2578), bundled by build.mjs from source for
 * tests/a11y/motion-policy.spec.mjs.
 *   - #open-modal: a plain Modal (enter at --uix-dur-slow, exit at --uix-dur-exit-slow);
 *   - #open-instant: a Modal with `instant`;
 *   - #open-palette: a plain Modal holding a CommandPalette, which marks its dialog instant itself;
 *   - #legacy-cmdk: a bare <dialog data-uix-cmdk-dialog> (the attribute is still honoured);
 *   - the looping indicators: Spinner, Button loading, Skeleton, indeterminate Progress, SaveStatus, Heartbeat;
 *   - a Meter whose value changes on #meter-step;
 *   - a table row with row actions (visible on coarse pointers, hover-revealed on fine ones).
 * window.__reduced mirrors useReducedMotion(). */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, CommandItem, CommandPalette, Heartbeat, Meter, Modal, Progress, SaveStatus, Skeleton, Spinner, useReducedMotion,
} from '../../packages/react/src/index.js';

declare global { interface Window { __reduced: boolean } }

function Harness() {
  const [open, setOpen] = useState<'modal' | 'instant' | 'palette' | null>(null);
  const [meter, setMeter] = useState(30);
  const reduced = useReducedMotion();
  window.__reduced = reduced;
  const close = () => setOpen(null);
  return (
    <>
      <h1>Motion policy</h1>
      <p id="reduced-state">Reduced motion: {reduced ? 'on' : 'off'}</p>

      <section aria-label="Overlays">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
          <Button id="open-modal" onClick={() => setOpen('modal')}>Open modal</Button>
          <Button id="open-instant" onClick={() => setOpen('instant')}>Open instant modal</Button>
          <Button id="open-palette" onClick={() => setOpen('palette')}>Open command palette</Button>
          <Button id="open-legacy" onClick={() => (document.getElementById('legacy-cmdk') as HTMLDialogElement).showModal()}>Open legacy palette</Button>
        </div>
      </section>

      <section aria-label="Looping indicators">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--uix-space-4)' }}>
          <Spinner id="spinner" />
          <Button id="loading-button" variant="primary" loading>Saving</Button>
          <span id="heartbeat"><Heartbeat state="live" /></span>
          <span id="save-status"><SaveStatus state="saving" /></span>
        </div>
        <div id="skeleton"><Skeleton variant="text" /></div>
        <Progress id="progress" indeterminate label="Importing" />
      </section>

      <section aria-label="A value that moves">
        <Meter id="meter" value={meter} label="Capacity" />
        <Button id="meter-step" onClick={() => setMeter((v) => (v === 30 ? 80 : 30))}>Change value</Button>
      </section>

      <section aria-label="Row actions">
        <table className="uix-table">
          <thead><tr><th>Incident</th><th className="uix-table__actions"><span className="uix-visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            <tr>
              <td>INC-1042 Ledger sync stalled</td>
              <td className="uix-table__actions"><button id="rowact" type="button" className="uix-rowact" aria-label="More actions">⋯</button></td>
            </tr>
          </tbody>
        </table>
      </section>

      <Modal id="modal" open={open === 'modal'} onClose={close} title="Change CHG-1042">
        <p>Deploy the ledger fix during the maintenance window.</p>
      </Modal>
      <Modal id="instant" open={open === 'instant'} onClose={close} title="Quick note" instant>
        <p>Opened from the keyboard.</p>
      </Modal>
      <Modal id="palette" open={open === 'palette'} onClose={close} aria-label="Command palette">
        <CommandPalette>
          <CommandItem>Create incident</CommandItem>
          <CommandItem>Open settings</CommandItem>
        </CommandPalette>
      </Modal>
      <dialog id="legacy-cmdk" className="uix-dialog" data-uix-cmdk-dialog aria-label="Legacy palette">
        <form method="dialog"><button type="submit">Close</button></form>
      </dialog>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
