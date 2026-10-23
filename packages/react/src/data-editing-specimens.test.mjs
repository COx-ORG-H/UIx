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
  // audit log: the filter bar with one set filter, three entries, a Details disclosure, older entries
  const crm = specimens['examples-crm-itsm'];
  assert.match(crm, /data-audit-log-example[\s\S]*<section class="uix-audit-log" aria-label="Access history">/);
  assert.equal((crm.match(/class="uix-audit__row uix-audit-log__row"/g) ?? []).length, 3);
  assert.match(crm, /What: Opened, Changed/);
  assert.match(crm, /<summary>Details<\/summary>/);
  assert.match(crm, />Show older entries</);
  // diff viewer for people and match review adopt mode
  const diff = specimens['examples-diff-viewer'];
  assert.match(diff, /<span class="uix-diff-viewer__name">Authors<\/span>/);
  assert.match(diff, /<div class="uix-diff-viewer__provenance">Registry import \(DNB\), 20 Oct 2026<\/div>/);
  const match = specimens['examples-match-review'];
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
