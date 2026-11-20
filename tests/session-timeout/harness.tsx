/* Live harness for SessionTimeout, bundled by build.mjs from source for
 * tests/a11y/session-timeout.spec.mjs. The spec installs Playwright's clock before the page
 * loads, so "3 minutes" passes in one fastForward.
 *   - #note: a draft the person is writing. onPersistDrafts writes it to localStorage
 *     ('uix-session-draft') and the page reads it back on load.
 *   - The session expires 3 minutes after load; the warning opens 2 minutes before that.
 *   - window.__session.calls logs every callback; set window.__session.failNext = true to make the
 *     next renewal fail, window.__session.slow = ms to delay it.
 *   - ?locale=de (with German labels) for the language check. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Field, SessionTimeout, Textarea, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { UixLabels } from '../../packages/react/src/index.js';

declare global {
  interface Window { __session: { calls: string[]; failNext: boolean; slow: number } }
}
window.__session = { calls: [], failNext: false, slow: 0 };
const DRAFT_KEY = 'uix-session-draft';
const MIN = 60_000;

const readDraft = () => { try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; } };
const german = new URLSearchParams(location.search).get('locale') === 'de';
const GERMAN: UixLabels = {
  dateFormat: { locale: 'de' },
  sessionTimeout: {
    title: 'Ihre Sitzung läuft gleich ab',
    description: 'Sie werden abgemeldet, wenn die Zeit abläuft. Wählen Sie „{stay}“, um weiterzuarbeiten.',
    timeLeft: 'Verbleibende Zeit',
    stay: 'Angemeldet bleiben',
    signOut: 'Abmelden',
    extendFailed: 'Die Sitzung konnte nicht verlängert werden. Versuchen Sie es erneut.',
    expiredTitle: 'Sie wurden abgemeldet',
    expiredDescription: 'Ihre Sitzung ist beendet. Melden Sie sich erneut an, um weiterzuarbeiten.',
    draftsSaving: 'Ihre Entwürfe werden gesichert…',
    draftsKept: 'Ihre Entwürfe sind gesichert. Melden Sie sich erneut an, um dort weiterzumachen, wo Sie aufgehört haben.',
    draftsFailed: 'Ihre letzten Änderungen konnten nicht gesichert werden. Kopieren Sie, was Sie brauchen, bevor Sie die Seite verlassen.',
    signIn: 'Erneut anmelden',
    close: 'Schließen',
  },
};

function App() {
  const [expiresAt] = useState(() => Date.now() + 3 * MIN);
  const [note, setNote] = useState(readDraft);
  const noteRef = useRef(note);
  noteRef.current = note;
  const log = (entry: string) => { window.__session.calls.push(entry); };

  return (
    <>
      <h1>Session timeout harness</h1>
      <section aria-labelledby="draft-title">
        <h2 id="draft-title">Incident INC-2041</h2>
        <Field label="Work note" hint="Kept on this device if your session ends.">
          <Textarea id="note" rows={4} value={note} onChange={(event) => setNote(event.currentTarget.value)} />
        </Field>
      </section>
      <SessionTimeout
        expiresAt={expiresAt}
        onWarn={() => log('warn')}
        onExtend={async () => {
          log('extend');
          if (window.__session.slow) await new Promise((resolve) => setTimeout(resolve, window.__session.slow));
          if (window.__session.failNext) { window.__session.failNext = false; throw new Error('renewal failed'); }
          return Date.now() + 30 * MIN;
        }}
        onSignOut={() => log('signOut')}
        onSignIn={() => log('signIn')}
        onExpire={() => log('expire')}
        onPersistDrafts={(reason) => {
          log(`persist:${reason}`);
          try { localStorage.setItem(DRAFT_KEY, noteRef.current); } catch { /* private mode */ }
        }}
      />
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      {german ? <UixLabelsProvider labels={GERMAN}><App /></UixLabelsProvider> : <App />}
    </StrictMode>,
  );
}
