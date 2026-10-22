/* Live harness for the CommandPalette items mode (HAR-1378; MOTUS C-10, TENSOR B2), bundled by
 * build.mjs for tests/a11y/command-palette-items.spec.mjs. German labels.
 * window.__palette records every chosen item and every navigation.
 *   - #launch (and Ctrl/⌘+K) opens the palette in its dialog, with recent items;
 *   - #inline: the same palette in place, for the screenshots, inside a Card;
 *   - #many: 1 200 generated records, to show the cap (100 rows) and the true count. */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card, CommandPalette, UixLabelsProvider } from '../../packages/react/src/index.js';
import type { CommandPaletteItem } from '../../packages/react/src/index.js';

declare global { interface Window { __palette: { chosen: string[]; navigated: string[] } } }

const icon = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const ITEMS: CommandPaletteItem[] = [
  { id: 'new-incident', label: 'Neuen Vorfall anlegen', group: 'Aktionen', keywords: ['incident', 'ticket'], shortcut: ['Mod', 'I'], icon: icon('M12 5v14M5 12h14') },
  { id: 'assign', label: 'Mir zuweisen', group: 'Aktionen', shortcut: ['A'], icon: icon('M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8') },
  { id: 'escalate', label: 'An die Bereitschaftsdienstverantwortliche eskalieren', group: 'Aktionen', icon: icon('M12 19V5M5 12l7-7 7 7') },
  { id: 'overview', label: 'Übersicht', group: 'Seiten', href: '/de/uebersicht', description: 'Start' },
  { id: 'strasse', label: 'Straßenverzeichnis', group: 'Seiten', href: '/de/strassen', description: 'Stammdaten › Adressen' },
  { id: 'reports', label: 'Berichte', group: 'Seiten', description: 'Monatsberichte und Exporte', href: '/de/berichte' },
  { id: 'archived', label: 'Archiv (nur Lesen)', group: 'Seiten', disabled: true, description: 'Nur für Administratoren' },
];
const MANY: CommandPaletteItem[] = Array.from({ length: 1200 }, (_, i) => ({ id: `rec-${i}`, label: `Datensatz ${String(i + 1).padStart(4, '0')}`, group: 'Datensätze' }));

function Harness() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<CommandPaletteItem[]>([ITEMS[3]]);
  const items = useMemo(() => ITEMS.map((item) => ({ ...item, onSelect: () => window.__palette.chosen.push(item.id) })), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const common = {
    inputLabel: 'Befehle', placeholder: 'Befehl oder Seite suchen…',
    onNavigate: (href: string) => window.__palette.navigated.push(href),
    onItemSelect: (item: CommandPaletteItem) => setRecent((r) => [item, ...r.filter((x) => x.id !== item.id)].slice(0, 3)),
  };
  return (
    <UixLabelsProvider labels={{ commandPalette: { empty: 'Keine Treffer', recent: 'Zuletzt verwendet', resultsOne: '{count} Ergebnis', resultsMany: '{count} Ergebnisse' } }}>
      <h1>Befehle</h1>
      <Button id="launch" shortcut={['Mod', 'K']} onClick={() => setOpen(true)}>Befehle öffnen</Button>
      <CommandPalette id="dialog-palette" items={items} recent={recent} open={open} onOpenChange={setOpen} {...common} />
      <section>
        <h2>Eingebettet</h2>
        <Card id="inline">
          <CommandPalette items={items} recent={recent} {...common} />
        </Card>
      </section>
      <section>
        <h2>Viele</h2>
        <div id="many"><CommandPalette items={MANY} inputLabel="Datensätze" placeholder="Datensatz suchen…" /></div>
      </section>
    </UixLabelsProvider>
  );
}

window.__palette = { chosen: [], navigated: [] };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
