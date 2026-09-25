/* Live specimen for Tabs overflow="scroll", the toned / compact / interactive Stat and
 * CopyButton, bundled by build.mjs from source. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CopyButton, Stat, Tab, TabPanel, Tabs } from '../../packages/react/src/index.js';
import type { TabsProps } from '../../packages/react/src/index.js';

const ACCENTS: Record<string, string> = { a: 'à', e: 'é', i: 'î', o: 'ō', u: 'ü', c: 'ç', n: 'ñ', s: 'š', t: 'ţ', A: 'Å', C: 'Ç', K: 'Ķ', P: 'Þ', R: 'Ŕ' };
const FILLER = ['ōñé', 'ţŵō', 'ţĥŕéé', 'ƒōüŕ', 'ƒîvé', 'šîx', 'šévéñ'];

/** 2.5× pseudo-localisation: accented, bracketed, padded with filler words. */
export const pseudo = (label: string) => {
  const target = Math.ceil(label.length * 2.5);
  let out = label.replace(/[A-Za-z]/g, (ch) => ACCENTS[ch] ?? ch);
  for (let i = 0; out.length + 2 < target; i++) out += ` ${FILLER[i % FILLER.length]}`;
  return `[${out}]`;
};

const TABS = ['Related incidents', 'Problems', 'Changes', 'Requests', 'Knowledge articles', 'Configuration items', 'Child incidents', 'Attachments'];

function ScrollingTabs({ variant }: { variant: NonNullable<TabsProps['variant']> }) {
  const [value, setValue] = useState('tab-0');
  return (
    <div data-specimen={`tabs-${variant}`}>
      <Tabs variant={variant} overflow="scroll" value={value} onChange={setValue}>
        {TABS.map((label, i) => (
          <Tab key={label} value={`tab-${i}`}>{pseudo(label)}</Tab>
        ))}
        {TABS.map((label, i) => (
          <TabPanel key={label} value={`tab-${i}`} className="ops-panel">{`${label} for INC-2043.`}</TabPanel>
        ))}
      </Tabs>
    </div>
  );
}

const FACTS = [
  { label: 'Status', value: 'In progress', meta: 'Since 17.09.2026 14:32' },
  { label: 'Priority', value: 'P2', meta: 'Impact high × urgency medium' },
  { label: 'SLA', value: 'configuration-item-ams-core-router-01.example.internal', meta: 'Resolution due in 2 h 10 min' },
];
const TONES = ['neutral', 'warning', 'danger'] as const;
const SIZES = ['hero', 'compact'] as const;

function InteractiveStat(props: { label: string; value: string; meta: string; tone: (typeof TONES)[number]; size: (typeof SIZES)[number] }) {
  const [open, setOpen] = useState(false);
  return <Stat {...props} onActivate={() => setOpen((v) => !v)} activateLabel="change" expanded={open} />;
}

function Stats() {
  return (
    <>
      {SIZES.map((size) => (
        <div key={size} className="ops-stats" data-specimen={`stats-${size}`}>
          {TONES.flatMap((tone, t) => {
            const fact = FACTS[t]!;
            return [
              <Stat key={`${tone}-static`} {...fact} tone={tone} size={size} data-tone={tone} />,
              <InteractiveStat key={`${tone}-button`} {...fact} tone={tone} size={size} />,
            ];
          })}
        </div>
      ))}
    </>
  );
}

function App() {
  return (
    <>
      <h1>Operator primitives</h1>
      <section id="tabs" aria-labelledby="tabs-title">
        <h2 id="tabs-title">Scrolling tabs</h2>
        <ScrollingTabs variant="line" />
        <ScrollingTabs variant="enclosed" />
        <ScrollingTabs variant="pill" />
      </section>
      <section id="stats" aria-labelledby="stats-title">
        <h2 id="stats-title">Stat tiles: tone × size × interactive</h2>
        <Stats />
      </section>
      <section id="copy" aria-labelledby="copy-title">
        <h2 id="copy-title">Copy button</h2>
        <div className="ops-copy" data-specimen="copy">
          <span>ada.lovelace@example.com</span>
          <CopyButton value="ada.lovelace@example.com" label="Copy email" copiedLabel="Copied" />
        </div>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
