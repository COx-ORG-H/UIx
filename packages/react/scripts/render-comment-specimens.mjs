// Regenerates packages/tokens/docs/comment-specimens.js: the docs specimens for comment threads as
// approved for TENSOR's worklog (HAR-4713, TENSOR ADR-0360) — audience badges and frames, the fold,
// the "Neu" chip, the new-since notice, the composer by audience, the draft marker, reactions and
// attachments — from the BUILT package under the German label pack, so the styleguide shows exactly
// the markup the components render.
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-comment-specimens.mjs
//
// packages/react/src/comment-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/comment-specimens.js');

const caption = (text) => `<div class="uix-guide__subhead" data-comment-specimen>${text}</div>`;

/** Render every specimen. Returns `{ [route]: html }`. */
export async function renderCommentSpecimens() {
  const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
  const { de } = await import(pathToFileURL(join(here, '../dist/locales/de.js')).href);
  const { ThumbsUpIcon, MoreHorizontalIcon } = await import(pathToFileURL(join(here, '../dist/icons.js')).href);
  const html = (el) => renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: de }, el));
  const noop = () => {};
  const specimens = {};
  const add = (route, block) => { specimens[route] = specimens[route] ? `${specimens[route]}\n${block}` : block; };
  const avatar = (name, size = 'sm') => h(ui.Avatar, { size, 'aria-hidden': true }, name.split(' ').map((part) => part[0]).join(''));
  const meta = (text) => text;
  const reactions = (count, pressed) => h(ui.CommentReaction, {
    label: `Daumen hoch, ${count}, Mia Koch`, glyph: h(ThumbsUpIcon, { size: 14 }), count, pressed,
  });
  const frame = (width, children) => h('div', {
    style: { boxSizing: 'border-box', width, maxWidth: '100%', padding: 'var(--uix-space-4)', border: '1px solid var(--uix-border)', borderRadius: 'var(--uix-radius-lg)', background: 'var(--uix-surface)' },
  }, children);

  // ── the worklog at its real width ────────────────────────────────────────────────────────
  const internal = { kind: 'internal' };
  const messageActions = [
    { id: 'quote', label: 'Zitieren in neuer Nachricht', keys: 'q', onSelect: noop },
    { id: 'link', label: 'Link kopieren', keys: 'l', onSelect: noop },
    { id: 'task', label: 'Als Aufgabe übernehmen', keys: 't', onSelect: noop },
  ];
  // The reply's `unread` / `own` reach its Comment through the thread: no second flag.
  const reply = (id, name, time, text, extra = {}, flags = {}) => ({
    id, ...flags,
    content: h(ui.Comment, { avatar: avatar(name), author: name, meta: meta(time), audience: internal, ...extra }, text),
  });
  const internalThread = h(ui.CommentThread, {
    root: h(ui.ActionPanelScope, { name: 'Notiz von Daniel Fischer', tabIndex: 0, role: 'group', 'aria-label': 'Notiz von Daniel Fischer', actions: messageActions },
      h(ui.Comment, {
        avatar: avatar('Daniel Fischer'), author: 'Daniel Fischer', meta: meta('16:10'),
        audience: internal,
        // the pointer and touch path to the same ActionPanel: a visible ⋯ button
        actions: [
          h('span', { key: 'r' }, reactions(1, false)),
          h(ui.Button, { key: 'more', variant: 'ghost', size: 'sm', icon: true, 'aria-label': 'Aktionen anzeigen', 'aria-haspopup': 'dialog' }, h(MoreHorizontalIcon, { size: 16, 'aria-hidden': true })),
          h(ui.ActionPanel, { key: 'panel', open: false, onOpenChange: noop, name: 'Notiz von Daniel Fischer', actions: messageActions }),
        ],
      }, 'Clearing-Gateway lehnt die Übertragung seit dem Zertifikatswechsel ab. Die DORA-Erstmeldung liegt bei ', h('span', { className: 'uix-mention' }, '@Compliance'), '.')),
    summary: '6 Antworten · alle intern',
    replies: [
      reply('cs-r1', 'Daniel Fischer', '16:12', 'Lena, kannst du heute noch freigeben?', {}, { own: true }),
      reply('cs-r2', 'Daniel Fischer', '16:15', 'Ich hänge die Vorlage gleich an.', {}, { own: true, unread: true }),
      reply('cs-r3', 'Lena Hoffmann', '16:20', 'Ich schaue es mir bis 16:30 an.', {}, { unread: true }),
      reply('cs-r4', 'Mia Koch', '16:24', 'Die Vorlage liegt im Ordner.'),
      reply('cs-r5', 'Daniel Fischer', '16:28', 'Danke, ich habe den Entwurf aktualisiert.', {}, { own: true }),
      reply('cs-r6', 'Lena Hoffmann', '16:31', 'Freigegeben. Ich reiche die Erstmeldung bis 18 Uhr ein.', {
        attachments: h('ul', { className: 'uix-file-rows' }, h(ui.FileRow, { as: 'li', name: 'DORA-Erstmeldung_INC-1174.pdf', size: 184_000, meta: 'L. Hoffmann, 16:31', density: 'compact', href: '#datei', onMoreActions: noop })),
      }, { unread: true }),
    ],
    draft: 'Danke, ich gebe dem Betreiber Bescheid.\nUnd ich melde mich bei der Meldenden.',
    onResumeDraft: noop,
  });
  const notice = h(ui.CommentNewNotice, { count: 3, current: 1, onShow: noop, onStep: noop, summary: '3 neue Antworten in 2 früheren Threads' });
  const outsideThread = h(ui.CommentThread, {
    root: h(ui.Comment, {
      avatar: avatar('Sophie Wagner'), author: 'Sophie Wagner', meta: meta('16:42'),
      audience: { kind: 'external', label: 'Von der Meldenden · per E-Mail' },
    }, 'Die Kommunen fragen nach einem Zeitpunkt. Können Sie heute bis 18 Uhr eine Einschätzung geben?'),
    summary: '2 Antworten · davon 1 intern',
    replies: [
      reply('cs-s1', 'Mia Koch', '16:50', 'Bitte noch keine Uhrzeit nennen. Der Betreiber hat den Rückruf noch nicht bestätigt.', {}, { unread: true }),
      reply('cs-s2', 'Daniel Fischer', '17:02', 'Eine verlässliche Uhrzeit können wir noch nicht nennen. Wir melden uns spätestens um 18 Uhr.', { audience: { kind: 'external', label: 'An Sophie Wagner · per E-Mail' } }, { own: true }),
    ],
    composer: h(ui.CommentComposer, { recipient: 'Sophie Wagner', external: true, audience: 'external', onAudienceChange: noop },
      h('label', { htmlFor: 'cs-reply', className: 'uix-visually-hidden' }, 'Antwort an Sophie Wagner'),
      h('textarea', { id: 'cs-reply', placeholder: 'Antwort schreiben …', defaultValue: '' })),
  });
  const log = (width) => frame(width, h(ui.Comments, { 'aria-label': 'Arbeitsprotokoll' },
    h(ui.Comment, { variant: 'system', avatar: false, meta: meta('15:56') }, 'Anna Berg hat dies als schwerwiegenden DORA-Vorfall eingestuft.'),
    internalThread, notice, outsideThread));
  add('examples-crm-itsm', [
    caption('Comment threads (React <code>Comments</code>, <code>CommentThread</code> with reply <code>unread</code> / <code>own</code>, <code>Comment</code> with <code>audience</code> and <code>attachments</code>; <code>ActionPanelScope</code> on the message; <code>CommentNewNotice</code>; <code>CommentComposer</code> with <code>recipient</code>; HAR-4713) — the incident worklog as approved (TENSOR ADR-0360), every word from the German pack. One level of replies on a rail; the latest three and every new reply stay, the rest fold behind "2 weitere Antworten". Lena Hoffmann\'s 16:20 reply is new and older than the last three, so it stays; Daniel Fischer\'s 16:15 reply is new to others but his own, so it folds and shows no "Neu". Internal is a hairline outline with a filled lock badge, outside a filled bubble with an outlined envelope badge — never colour alone, never amber or red. The message takes its actions from <code>ActionPanel</code> (Strg+K on it, or its ⋯ button) and its files from <code>FileRow</code>. One new-since notice: the divider, then the count and "Anzeigen ↑", with the stepper because there are three. The closed composer leaves an "Entwurf" marker with the start of the first line, which reopens it.'),
    '<div data-comment-example="worklog">',
    html(log('720px')),
    '</div>',
  ].join('\n'));

  // ── the composer by audience, and at 320 px ──────────────────────────────────────────────
  const composer = (audience) => h(ui.CommentComposer, { recipient: 'Sophie Wagner', external: true, audience, onAudienceChange: noop },
    h('label', { htmlFor: `cs-${audience}`, className: 'uix-visually-hidden' }, audience === 'internal' ? 'Interne Antwort' : 'Antwort an Sophie Wagner'),
    h('textarea', { id: `cs-${audience}`, defaultValue: 'Gateway-Betreiber hat Rückruf bis 17:30 zugesagt.' }));
  add('examples-crm-itsm', [
    caption('Composer by audience (React <code>CommentComposer recipient external</code>) — the same order every time, Intern first. The line under the choice says who will see the message, the commit button names the audience, and the frame restyles: a hairline outline while internal, filled while it goes to Sophie Wagner. Switching keeps the draft. Without <code>external</code> the thread stays internal: a lock label, no switch.'),
    '<div data-comment-example="composer" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--uix-space-4)">',
    html(composer('internal')),
    html(composer('external')),
    html(h(ui.CommentComposer, { recipient: 'Sophie Wagner' }, h('label', { htmlFor: 'cs-locked', className: 'uix-visually-hidden' }, 'Interne Notiz'), h('textarea', { id: 'cs-locked' }))),
    '</div>',
  ].join('\n'));

  add('examples-crm-itsm', [
    caption('New-since notice and thread at 320 px (React <code>CommentNewNotice count={1}</code>) — one new entry: no stepper, just the count and "Anzeigen ↑". Everything wraps; nothing needs hover.'),
    '<div data-comment-example="phone">',
    html(frame('320px', h(ui.Comments, { 'aria-label': 'Arbeitsprotokoll' },
      h(ui.CommentNewNotice, { count: 1, onShow: noop, summary: '1 neue Antwort weiter oben' }),
      h(ui.CommentThread, {
        root: h(ui.Comment, { avatar: false, author: 'Sophie Wagner', meta: meta('16:42'), audience: { kind: 'external', label: 'Von der Meldenden' } }, 'Können Sie heute bis 18 Uhr eine Einschätzung geben?'),
        replies: [{ id: 'cs-p1', unread: true, content: h(ui.Comment, { avatar: false, author: 'Mia Koch', meta: meta('16:50'), isNew: true, audience: { kind: 'internal' } }, 'Bitte noch keine Uhrzeit nennen.') }],
        summary: '1 Antwort · davon 1 intern',
      })))),
    '</div>',
  ].join('\n'));

  return specimens;
}

export const commentSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-comment-specimens.mjs — do not edit by hand.
 * The docs specimens for comment threads (HAR-4713): the markup the built React components render.
 * showcase-data.js appends each block to its route.
 * packages/react/src/comment-specimens.test.mjs fails when this file and the components differ. */
export const COMMENT_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, commentSpecimenModule(await renderCommentSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
