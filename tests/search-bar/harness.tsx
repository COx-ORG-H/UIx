/* Live harness for SearchBar (HAR-2030), bundled by build.mjs from source for
 * tests/a11y/search-bar.spec.mjs. window.__searchBar records what each field reported.
 *   - #portal: size lg with a submit button (the public portal search, 44 px);
 *   - #header: size md, no button (a header or toolbar search), uncontrolled;
 *   - #in-form: inside a <form> whose submit must never fire from the field's Enter;
 *   - #in-drawer: inside a Drawer, where Escape on an empty field closes the drawer;
 *   - #toolbar: size md with a submit button, which stays beside the field on a phone. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Drawer, SearchBar } from '../../packages/react/src/index.js';

type Log = { submits: string[]; clears: number; formSubmits: number; drawerCloses: number };
declare global { interface Window { __searchBar: Record<string, Log> } }
const log = (key: string): Log => (window.__searchBar[key] ??= { submits: [], clears: 0, formSubmits: 0, drawerCloses: 0 });

function Harness() {
  const [portal, setPortal] = useState('');
  const [inForm, setInForm] = useState('');
  const [drawer, setDrawer] = useState(false);
  return (
    <>
      <h1>Suche</h1>
      <section>
        <h2>Portal</h2>
        <SearchBar
          id="portal"
          size="lg"
          submitButton
          label="Dienste durchsuchen"
          placeholder="Was brauchen Sie?"
          labels={{ clear: 'Suche leeren', submit: 'Suchen' }}
          value={portal}
          onValueChange={setPortal}
          onSubmit={(value) => log('portal').submits.push(value)}
          onClear={() => { log('portal').clears += 1; }}
        />
      </section>
      <section>
        <h2>Kopfzeile</h2>
        <SearchBar id="header" label="Portal durchsuchen" placeholder="Suchen" onSubmit={(value) => log('header').submits.push(value)} />
      </section>
      <section>
        <h2>Werkzeugleiste</h2>
        <SearchBar id="toolbar" label="Vorlagen filtern" landmark={false} submitButton submitVariant="outline" labels={{ submit: 'Filtern' }} />
      </section>
      <section>
        <h2>In einem Formular</h2>
        <form id="settings-form" onSubmit={(event) => { event.preventDefault(); log('in-form').formSubmits += 1; }}>
          <SearchBar id="in-form" label="Vorlagen durchsuchen" value={inForm} onValueChange={setInForm} onSubmit={(value) => log('in-form').submits.push(value)} />
          <Button type="submit">Speichern</Button>
        </form>
      </section>
      <section>
        <Button id="open-drawer" onClick={() => setDrawer(true)}>Hilfe öffnen</Button>
        <Drawer id="drawer" open={drawer} onClose={() => { log('in-drawer').drawerCloses += 1; setDrawer(false); }} title="Hilfe">
          <SearchBar id="in-drawer" label="Hilfe durchsuchen" onSubmit={(value) => log('in-drawer').submits.push(value)} />
        </Drawer>
      </section>
    </>
  );
}

window.__searchBar = {};
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
