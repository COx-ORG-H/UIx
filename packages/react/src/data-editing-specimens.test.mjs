/* The docs specimens for the data, editing and navigation batch are the React components' own
 * markup (packages/tokens/docs/data-editing-specimens.js, generated). This test renders them again
 * from the BUILT dist and fails when the committed module differs, so a change to a component's
 * markup cannot leave the docs behind.
 * To update: node packages/react/scripts/render-data-editing-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, dataEditingSpecimenModule, renderDataEditingSpecimens } from '../scripts/render-data-editing-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderDataEditingSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(dataEditingSpecimenModule(specimens), committed, 'packages/tokens/docs/data-editing-specimens.js is out of date — run node packages/react/scripts/render-data-editing-specimens.mjs');
});

test('the specimens do not depend on the time zone of the machine that renders them', async () => {
  // CI renders in UTC and an author maybe in Europe/Sarajevo: a time without a pinned zone differed
  // (the AuditLog specimen, first push of PR #168). Kiritimati is UTC+14, as far from both as it gets.
  const saved = process.env.TZ;
  process.env.TZ = 'Pacific/Kiritimati';
  try {
    assert.equal(dataEditingSpecimenModule(await renderDataEditingSpecimens()), committed);
  } finally {
    if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
  }
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-segmented', 'uix-segmented-x')]));
  assert.notEqual(dataEditingSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const nav = specimens['examples-navigation'];
  // language switcher: two named navs of links, one current link each, lang + hreflang
  assert.match(nav, /data-segmented-link-example/);
  assert.equal((nav.match(/<nav class="uix-segmented-nav" aria-label="/g) ?? []).length, 2);
  assert.equal((nav.match(/ aria-current="page">/g) ?? []).length, 2);
  assert.match(nav, /<a lang="de" href="#lang-de" hreflang="de" class="uix-segmented__option" aria-current="page">DE<\/a>/);
  // command palette items: two groups, the best match first and active, marks on the matches
  assert.match(nav, /data-command-palette-items-example/);
  assert.match(nav, /<div class="uix-cmdk" data-items="">/);
  assert.deepEqual([...nav.matchAll(/class="uix-cmdk__group"[^>]*>([^<]+)</g)].map((m) => m[1]), ['Pages', 'Actions']);
  assert.match(nav, /aria-activedescendant="(dex-[^"]+)"[\s\S]*id="\1" role="option" class="uix-cmdk__item" data-active="true"/);
  assert.match(nav, /<mark class="uix-cmdk__mark">Re<\/mark>ports/);
  // data workspace: toolbar, bulk bar, three rows with id cells, the footer
  const dataWs = specimens['examples-data-display'];
  assert.match(dataWs, /data-data-workspace-example[\s\S]*<section class="uix-data-workspace" aria-label="Incidents">/);
  assert.match(dataWs, /class="uix-bulkbar"[\s\S]*1 selected/);
  assert.equal((dataWs.match(/class="uix-id-cell__btn"/g) ?? []).length, 3);
  assert.match(dataWs, /<span class="uix-data-workspace__range">1–3 of 3<\/span>/);
  assert.match(dataWs, />Save changes</);
  // data workspace 2.50 (HAR-2622..2626): two sort badges, the id as the record's link, beforeBody,
  // three groups (one collapsed) with counts and the copies' sum, a tri-state group box, the empty action
  const gaps = dataWs.slice(dataWs.indexOf('data-data-workspace-gaps-example'));
  assert.deepEqual([...gaps.matchAll(/aria-label="(Sort priority \d)"/g)].map((m) => m[1]), ['Sort priority 1', 'Sort priority 2']);
  assert.match(gaps, /<a href="#book-BK-1001" class="uix-id-cell__btn uix-data-workspace__id-link"><span class="uix-data-workspace__id-text"><span class="uix-cell-strong">A Wizard of Earthsea<\/span>/);
  assert.match(gaps, /<div class="uix-data-workspace__before"><div class="uix-alert/);
  assert.equal((gaps.match(/<tbody class="uix-data-workspace__group"/g) ?? []).length, 3);
  assert.match(gaps, /aria-label="Expand group Lost"/);
  assert.match(gaps, /2 rows<\/span>/);
  assert.match(gaps, /class="uix-data-workspace__group-agg uix-col--num" data-label="Copies">5 copies</);
  assert.match(gaps, />Save as…</);
  assert.match(gaps, /Nothing here yet[\s\S]*>Add the first book</);
  assert.match(gaps, /data-data-workspace-cards-example[\s\S]*<table class="uix-table uix-table--cards uix-data-workspace__grid--select"[\s\S]*<td data-col="author" data-priority="mid" data-label="Author">Ursula K. Le Guin<\/td>/);
  // audit log: the filter bar with one set filter, three entries, a Details disclosure, older entries
  const crm = specimens['examples-crm-itsm'];
  assert.match(crm, /data-audit-log-example[\s\S]*<section class="uix-audit-log" aria-label="Access history">/);
  assert.equal((crm.match(/class="uix-audit__row uix-audit-log__row"/g) ?? []).length, 3);
  assert.match(crm, /What: Opened, Changed/);
  assert.match(crm, /<summary class="uix-audit-log__more-summary"><span>Details<\/span><span class="uix-collapsible__chevron"/);
  assert.match(crm, />Show older entries</);
  // diff viewer for people and match review adopt mode
  const diff = specimens['examples-workflows-pipelines'];
  assert.match(diff, /<span class="uix-diff-viewer__name">Authors<\/span>/);
  assert.match(diff, /<div class="uix-diff-viewer__provenance">Registry import \(DNB\), 20 Oct 2026<\/div>/);
  const match = specimens['examples-workflows-pipelines'];
  assert.match(match, /class="uix-match-review uix-match-review--adopt"/);
  assert.equal((match.match(/class="uix-match-review__adopt"/g) ?? []).length, 2, 'author and ISBN differ');
  assert.match(match, /<details class="uix-match-review__provenance">/);
  // sortable list: three rows, Move up disabled on the first and Move down on the last
  const formsSortable = specimens['examples-form-controls'];
  assert.match(formsSortable, /data-sortable-list-example[\s\S]*<ul class="uix-sortable" aria-label="Approval steps">/);
  assert.equal((formsSortable.match(/class="uix-sortable__row"/g) ?? []).length, 3);
  assert.match(formsSortable, /aria-label="Move Review the request up" disabled=""/);
  assert.match(formsSortable, /aria-label="Move Notify the requester down" disabled=""/);
  // inline edit as a record field: an object value, the icon trigger, a read-only reason, a failed save
  const forms = specimens['examples-form-controls'];
  assert.match(forms, /data-inline-edit-record-example/);
  assert.match(forms, /<span class="uix-inline-edit__value">Jonas Weber<\/span>/);
  assert.match(forms, /<button type="button" class="uix-inline-edit__trigger" aria-label="Edit Ticket">/);
  assert.match(forms, /aria-describedby="dex-\d+-reason">Imported from ServiceNow<\/span><span id="dex-\d+-reason" class="uix-inline-edit__reason">/);
  assert.match(forms, /role="alert"><span class="uix-cluster"[^>]*><span>The server did not answer in time\.<\/span><button[^>]*>Try again<\/button>/);
  assert.match(forms, /value="Printer offline on the 3rd floor" aria-invalid="true"/);
  // filter editor kinds: two tags with remove buttons and a field; a "before" date with one input
  const data = specimens['examples-data-display'];
  assert.match(data, /data-filter-editor-kinds-example/);
  assert.equal((data.match(/<span class="uix-tag">/g) ?? []).length, 2);
  assert.match(data, /class="uix-taginput__field" aria-label="Add a value"/);
  assert.match(data, /data-kind="date"/);
  assert.equal((data.split('data-kind="date"')[1].match(/type="date"/g) ?? []).length, 1);
  for (const html of Object.values(specimens)) assert.doesNotMatch(html, /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r/);
});
