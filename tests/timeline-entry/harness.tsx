/* Live harness for Timeline entry text (HAR-3086), bundled by build.mjs from source for
 * tests/a11y/timeline-entry.spec.mjs: a ten-entry incident feed in a drawer-like panel, through the
 * kit props (?case=kit, the default) or as products drew it before, each sentence a full-weight body
 * paragraph (?case=hand). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StatusPill, Timeline, TimelineItem } from '../../packages/react/src/index.js';

const FEED: Array<[string, string, string, string | null, string | null]> = [
  ['09:12', 'Daniel Fischer', 'hat den Status von Zugewiesen auf In Bearbeitung geändert.', null, null],
  ['09:05', 'Miriam Hahn', 'hat einen internen Kommentar geschrieben.', 'Die Firewall-Regel wird erst nach dem Wartungsfenster aktiv.', 'Intern'],
  ['08:58', 'System', 'hat die Priorität nach der SLA-Regel auf Hoch gesetzt.', null, 'Automatisch'],
  ['08:51', 'Elif Yılmaz', 'hat das betroffene CI „SRV-RZN-0107“ verknüpft.', null, null],
  ['08:47', 'Daniel Fischer', 'hat die Störung Julia Müller zugewiesen.', 'Von Servicedesk 1st Level an Netzwerkbetrieb', null],
  ['08:40', 'Julia Müller', 'hat eine Datei angehängt.', 'vpn-log-2026-11-13.txt, 48 KB', null],
  ['08:33', 'System', 'hat die Antwortfrist um 30 Minuten verlängert.', 'Grund: Kunde nicht erreichbar', 'Automatisch'],
  ['08:21', 'Miriam Hahn', 'hat die Kategorie auf Netzwerk geändert.', null, null],
  ['08:15', 'Julia Müller', 'hat die Störung über das Mitarbeiterportal gemeldet.', null, null],
  ['08:14', 'System', 'hat die Störung INC-0173 angelegt.', null, 'Automatisch'],
];
const hand = new URLSearchParams(location.search).get('case') === 'hand';

function Harness() {
  return (
    <section aria-label="Aktivität" data-case={hand ? 'hand' : 'kit'} className="uix-card" style={{ maxWidth: 440, padding: 'var(--uix-space-5)', background: 'var(--uix-surface-2)' }}>
      <Timeline>
        {FEED.map(([time, actor, text, detail, badge]) => (hand ? (
          <TimelineItem key={time + actor} meta={`13.11.2026 ${time}`}>
            <p style={{ margin: 0, fontSize: 'var(--uix-text-body)', color: 'var(--uix-text)' }}>{actor} {text}</p>
            {detail ? <p style={{ margin: 0, fontSize: 'var(--uix-text-meta)', fontStyle: 'italic', color: 'var(--uix-text-hushed)' }}>{detail}</p> : null}
          </TimelineItem>
        ) : (
          <TimelineItem
            key={time + actor}
            meta={`13.11.2026 ${time}`}
            title={<><strong>{actor}</strong> {text}</>}
            {...(detail ? { detail } : {})}
            {...(badge ? { badge: <StatusPill tone="neutral">{badge}</StatusPill> } : {})}
          />
        )))}
      </Timeline>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
