/* Live harness for Tabs overflow="scroll" (+ keepMounted), the toned / interactive Stat and
 * CopyButton, bundled by build.mjs from source for tests/a11y/operator-primitives.spec.mjs.
 * window.__op records what the tests need to observe. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CopyButton, Stat, Tab, TabPanel, Tabs } from '../../packages/react/src/index.js';

type Log = { activations: number; pending: { activations: number; clicks: number; keydowns: number } };
declare global { interface Window { __op: Log } }
window.__op = { activations: 0, pending: { activations: 0, clicks: 0, keydowns: 0 } };

const TAB_NAMES = [
  'Overview', 'Worklog', 'Linked configuration items', 'Regulatory reporting', 'Attachments',
  'Assignment history', 'Service level agreements', 'Related problems', 'Change requests', 'Audit trail',
];
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, '-');

function ScrollingTabs() {
  const [value, setValue] = useState('overview');
  return (
    <section aria-labelledby="tabs-title">
      <h2 id="tabs-title">Record tabs</h2>
      <div id="tabs-frame" style={{ width: '20rem', maxWidth: '100%' }}>
        <Tabs value={value} onChange={setValue} overflow="scroll">
          {TAB_NAMES.map((name) => <Tab key={name} value={slug(name)}>{name}</Tab>)}
          {TAB_NAMES.map((name) => (
            <TabPanel key={name} value={slug(name)} keepMounted={name === 'Worklog'}>
              {name === 'Worklog'
                ? <label>Draft note <input id="worklog-draft" /></label>
                : <p>{name} content</p>}
            </TabPanel>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function Tiles() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="stats-title">
      <h2 id="stats-title">Key facts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: 'var(--uix-space-3)' }}>
        <Stat id="stat-sla" label="SLA" value="14 min left" tone="danger" size="compact" meta="Resolution target 16:30" />
        <Stat id="stat-queue" label="Waiting" value="3" tone="warning" size="compact" />
        <Stat
          id="stat-priority"
          label="Priority"
          value="P1"
          meta="Impact high · urgency high"
          size="compact"
          onActivate={() => { window.__op.activations += 1; setOpen((o) => !o); }}
          activateLabel="change"
          expanded={open}
        />
      </div>
      {open && <div id="priority-editor" role="dialog" aria-label="Change priority"><p>Editor</p></div>}
    </section>
  );
}

/* HAR-1753: tiles of unequal content height in one row. The row stretches every tile to the
 * tallest one, and each label and value must still start at the same offset from its tile's top
 * edge, whether the tile is a <div>, a <button> or an <a>. The last tile is pending until
 * "Finish saving" is pressed. */
function StretchedRow({ id, size, layout }: { id: string; size: 'hero' | 'compact'; layout: 'grid' | 'flex' }) {
  const [saving, setSaving] = useState(true);
  // grid: the kit's StatRow (.uix-stat-row), which reflows; flex: a wrapping flex row whose
  // tiles keep the same floor (8.5rem compact, 12rem hero), so a phone gets fewer tiles per row
  const row = layout === 'grid' ? undefined : { display: 'flex', flexWrap: 'wrap' as const, gap: 'var(--uix-space-3)' };
  const cell = layout === 'flex' ? { flex: `1 1 ${size === 'hero' ? 12 : 8.5}rem`, minWidth: 0 } : undefined;
  const noop = () => {};
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{`Facts in one ${layout} row (${size})`}</h2>
      <div id={id} className={layout === 'grid' ? 'uix-stat-row' : undefined} style={row}>
        <Stat style={cell} data-tile="read-only" size={size} label="Opened" value="12 Oct" />
        <Stat style={cell} data-tile="read-only-meta" size={size} label="Reporter" value="Ada" meta="Service desk" />
        <Stat style={cell} data-tile="three-lines" size={size} label="Assignee" value="Network operations" meta="Second line, on call until 18:00 today and again tomorrow from 08:00" onActivate={noop} activateLabel={`change (${id})`} />
        <Stat style={cell} data-tile="no-meta" size={size} label="Category" value="Network" onActivate={noop} activateLabel={`change (${id})`} />
        <Stat style={cell} data-tile="link" size={size} label="Related" value="3" href="#related" />
        <Stat
          style={cell}
          data-tile="pending"
          size={size}
          label="State"
          value="In progress"
          pending={saving}
          haspopup={false}
          activateLabel={`set (${id})`}
          onActivate={() => { window.__op.pending.activations += 1; }}
          onClick={() => { window.__op.pending.clicks += 1; }}
          onKeyDown={() => { window.__op.pending.keydowns += 1; }}
        />
      </div>
      <p><button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={() => setSaving(false)}>{`Finish saving (${id})`}</button></p>
    </section>
  );
}

function Copying() {
  return (
    <section aria-labelledby="copy-title">
      <h2 id="copy-title">Contact</h2>
      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--uix-space-2)' }}>
        <span>ada@example.com</span>
        <CopyButton value="ada@example.com" label="Copy email" copiedLabel="Copied" failedLabel="Could not copy" />
      </p>
    </section>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ScrollingTabs />
      <Tiles />
      <StretchedRow id="row-compact" size="compact" layout="grid" />
      <StretchedRow id="row-hero" size="hero" layout="flex" />
      <Copying />
    </StrictMode>,
  );
}
