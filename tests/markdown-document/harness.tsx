/* Live harness for Markdown as a document (HAR-3096), bundled by build.mjs from source for
 * tests/a11y/markdown-document.spec.mjs. A knowledge article as the portal shows it: the page <h1>,
 * the article body as a document, then a "Related articles" SectionHead; and the same text inline,
 * as a comment shows it. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SectionHead } from '../../packages/react/src/index.js';
import { Markdown } from '../../packages/react/src/markdown.js';

const ARTICLE = [
  'Wenn der VPN-Client nach einer Weile die Verbindung trennt, liegt es meist am Energiesparen.',
  '## Fehlerbild',
  'Die Verbindung bricht nach etwa 30 Minuten ab, und der Client meldet „Zeitüberschreitung“.',
  '## Ursache',
  'Das Notebook schaltet den WLAN-Adapter im Akkubetrieb ab.',
  '## Lösung',
  'Energiesparen für den WLAN-Adapter in den Geräteeinstellungen ausschalten.',
].join('\n\n');

function Harness() {
  return (
    <>
      <section aria-label="Artikel" data-case="document">
        <h1>VPN trennt nach 30 Minuten</h1>
        <Markdown variant="document">{ARTICLE}</Markdown>
        <SectionHead title="Ähnliche Artikel" />
      </section>
      <section aria-label="Kommentar" data-case="inline">
        <Markdown>{ARTICLE}</Markdown>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
