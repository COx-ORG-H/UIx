/* Live harness for Drawer and Peek light-dismiss (TENSOR HAR-547), bundled by build.mjs from
 * source for tests/a11y/drawer.spec.mjs. window.__drawer counts onClose calls per panel.
 *   - #open-drawer: a Drawer that closes on a backdrop click (the default);
 *   - #open-form: a Drawer with a form and dismissOnBackdrop={false};
 *   - #open-peek: a Peek (same shared handler). */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Drawer, Field, Input, Peek } from '../../packages/react/src/index.js';

declare global { interface Window { __drawer: Record<string, number> } }
window.__drawer = { drawer: 0, form: 0, peek: 0 };

function Harness() {
  const [open, setOpen] = useState<'drawer' | 'form' | 'peek' | null>(null);
  const close = (key: 'drawer' | 'form' | 'peek') => () => { window.__drawer[key] += 1; setOpen(null); };
  return (
    <>
      <h1>Drawer and Peek</h1>
      <p>Open a panel, then click the dimmed area beside it.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
        <Button id="open-drawer" onClick={() => setOpen('drawer')}>Open drawer</Button>
        <Button id="open-form" onClick={() => setOpen('form')}>Open form drawer</Button>
        <Button id="open-peek" onClick={() => setOpen('peek')}>Open peek</Button>
      </div>

      <Drawer
        id="drawer"
        open={open === 'drawer'}
        onClose={close('drawer')}
        title="Change CHG-1042"
        footer={<Button variant="primary" onClick={close('drawer')}>Done</Button>}
      >
        <p>Deploy the ledger fix during the maintenance window. A click on the dimmed backdrop closes this drawer.</p>
      </Drawer>

      <Drawer
        id="form"
        open={open === 'form'}
        onClose={close('form')}
        dismissOnBackdrop={false}
        title="Edit user"
        footer={<><Button variant="primary" onClick={close('form')}>Save</Button><Button onClick={close('form')}>Cancel</Button></>}
      >
        <Field label="Display name" htmlFor="display-name"><Input id="display-name" defaultValue="Ana Petrović" /></Field>
      </Drawer>

      <Peek id="peek" open={open === 'peek'} onClose={close('peek')} title="INC-2041 · Ledger sync delayed" hint="Esc to close">
        <p>Peek shares the backdrop handler with Drawer.</p>
      </Peek>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
