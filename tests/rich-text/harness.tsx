/* Live harness for the rich-text subpaths (RTE-01), bundled by build.mjs from source.
 * window.__rte records onChange/submit calls for tests/a11y/rich-text.spec.mjs. */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RichTextEditor } from '../../packages/react/src/rich-text.js';
import { Markdown } from '../../packages/react/src/markdown.js';
import { EmojiPicker, ReactionBar } from '../../packages/react/src/emoji.js';
import type { ReactionSummary } from '../../packages/react/src/emoji.js';
import { MARKDOWN_CORPUS } from '../../packages/react/src/fixtures/markdown-corpus.mjs';

type Log = { changes: Record<string, string[]>; submits: number; picked: string[]; toggled: string[] };
declare global { interface Window { __rte: Log } }
window.__rte = { changes: {}, submits: 0, picked: [], toggled: [] };
const log = (key: string) => (md: string) => { (window.__rte.changes[key] ??= []).push(md); };

const INITIAL = [
  '# Change plan',
  '',
  'Deploy the **ledger** fix during the maintenance window. ✅',
  '',
  '- [x] CAB approval',
  '- [ ] Rollback rehearsal',
  '',
  '| Step | Owner |',
  '| :--- | ----: |',
  '| Deploy | Ops |',
].join('\n');

const resolveImageSrc = (src: string) => (src.startsWith('/images/') ? src : null);

function Field() {
  const [value, setValue] = useState(INITIAL);
  return (
    <section>
      <h2 id="field-label">Description</h2>
      <p id="field-hint">Formatting is saved as markdown.</p>
      <RichTextEditor
        id="field"
        name="description"
        value={value}
        onChange={(md) => { log('field')(md); setValue(md); }}
        aria-labelledby="field-label"
        aria-describedby="field-hint"
        maxLength={400}
        placeholder="Describe the change"
        onUploadImage={async (file) => ({ src: `/images/${file.name}`, alt: file.name })}
        resolveImageSrc={resolveImageSrc}
      />
      <pre data-testid="field-value">{value}</pre>
    </section>
  );
}

function Note() {
  const [value, setValue] = useState('');
  return (
    <section>
      <h2>Work notes</h2>
      <RichTextEditor
        id="note"
        value={value}
        onChange={(md) => { log('note')(md); setValue(md); }}
        features="comment"
        variant="composer"
        aria-label="Work note"
        placeholder="Add a work note"
        onSubmitShortcut={() => { window.__rte.submits += 1; }}
        toolbarEnd={<button type="button" className="uix-btn uix-btn--primary uix-btn--sm">Add note</button>}
      />
    </section>
  );
}

function Template() {
  const [value, setValue] = useState('Hello {{customer.name}},\n\nyour ticket {{ticket.id}} is resolved.');
  return (
    <section>
      <h2 id="template-label">Notification template</h2>
      <RichTextEditor
        id="template"
        value={value}
        onChange={(md) => { log('template')(md); setValue(md); }}
        features="template"
        headingLevels={[3]}
        aria-labelledby="template-label"
      />
    </section>
  );
}

function Reactions() {
  const [reactions, setReactions] = useState<ReactionSummary[]>([
    { emoji: '👍', count: 2, reactedByMe: true, names: ['You', 'Ana Petrović'] },
    { emoji: '👀', count: 1, reactedByMe: false, names: ['Jonas Weber'] },
  ]);
  const toggle = (emoji: string) => {
    window.__rte.toggled.push(emoji);
    setReactions((list) => {
      const hit = list.find((r) => r.emoji === emoji);
      if (!hit) return [...list, { emoji, count: 1, reactedByMe: true, names: ['You'] }];
      return list
        .map((r) => (r.emoji !== emoji ? r : r.reactedByMe
          ? { ...r, count: r.count - 1, reactedByMe: false, names: r.names.filter((n) => n !== 'You') }
          : { ...r, count: r.count + 1, reactedByMe: true, names: ['You', ...r.names] }))
        .filter((r) => r.count > 0);
    });
  };
  return (
    <section>
      <h2>Reactions</h2>
      <ReactionBar reactions={reactions} onToggle={toggle} />
      <EmojiPicker
        locale="de"
        onSelect={(emoji) => window.__rte.picked.push(emoji)}
        labels={{ dialog: 'Emoji auswählen', search: 'Emoji suchen' }}
        trigger={<button type="button" className="uix-btn uix-btn--outline" id="standalone-picker">Emoji wählen</button>}
      />
    </section>
  );
}

function Viewer() {
  return (
    <section>
      <h2>Markdown viewer corpus</h2>
      {MARKDOWN_CORPUS.map((fixture: { name: string; markdown: string }) => (
        <article key={fixture.name} data-fixture={fixture.name}>
          <h3>{fixture.name}</h3>
          <Markdown resolveImageSrc={(src) => (src.startsWith('/api/knowledge/') ? src : null)}>{fixture.markdown}</Markdown>
        </article>
      ))}
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Rich text harness</h1>
    <Field />
    <Note />
    <Template />
    <Reactions />
    <Viewer />
  </StrictMode>,
);
