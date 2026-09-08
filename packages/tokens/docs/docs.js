/* UIx Docs — pure helpers plus a dependency-free documentation application. */

import { ADDITIONAL_EXAMPLES, SHOWCASE_PAGES } from './showcase-data.js';
import { initShowcase, disposeShowcase } from '../guide/app.js';
import { initAdvancedShowcase } from '../guide/phase-46-9.js';
import { COMPONENT_SPECIMENS } from './component-specimens.js';
import { initFormSpecimens } from './form-specimens.js';
import { COMPONENT_GUIDANCE as COMPONENT_INTENT } from './component-guidance.js';

export const slugify = (name) =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const componentNav = (list = []) =>
  list.map((item) => {
    const name = typeof item === 'string' ? item : item.name;
    const slug = slugify(name);
    return {
      name,
      slug,
      href: `#${slug}`,
      group: (typeof item === 'object' && item.group) || null,
    };
  });

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export const renderPropsTable = (props = []) => {
  if (!Array.isArray(props) || props.length === 0) {
    return '<p class="uix-docs__empty">No props documented.</p>';
  }
  const rows = props.map((prop) => {
    const required = prop.required ? ' <span class="uix-docs__req" aria-label="required">*</span>' : '';
    const type = prop.type == null || prop.type === '' ? '—' : `<code>${esc(prop.type)}</code>`;
    const defaultValue = prop.default == null || prop.default === '' ? '—' : `<code>${esc(prop.default)}</code>`;
    return `<tr><td><code>${esc(prop.name)}</code>${required}</td><td>${type}</td><td>${defaultValue}</td><td>${esc(prop.description || '')}</td></tr>`;
  }).join('');
  return `<div class="uix-docs__table-scroll" tabindex="0" role="region" aria-label="Reference table"><table class="uix-table"><thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">Description</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};

export const normalizeHash = (hash, fallback = 'introduction') => {
  const value = String(hash || '').replace(/^#/, '').split('?')[0].trim();
  return slugify(value) || fallback;
};

export const buildSearchIndex = (items = []) => items.map((item, order) => ({
  ...item,
  order,
  searchText: [item.name, item.group, item.summary, ...(item.keywords || [])].filter(Boolean).join(' ').toLowerCase(),
}));

export const matchDocs = (index = [], query = '', limit = 8) => {
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const scored = index.map((item) => {
    if (!terms.length) return { item, score: item.featured ? 25 : 1 };
    const name = item.name.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (!item.searchText.includes(term)) return null;
      if (name === term) score += 120;
      else if (name.startsWith(term)) score += 80;
      else if (name.includes(term)) score += 50;
      else if ((item.group || '').toLowerCase().includes(term)) score += 20;
      else score += 10;
    }
    return { item, score };
  }).filter(Boolean);
  return scored.sort((a, b) => b.score - a.score || a.item.order - b.item.order).slice(0, limit).map(({ item }) => item);
};

const NAV_ITEMS = [
  { name: 'Introduction', slug: 'introduction', group: 'Getting started', summary: 'What UIx is and how its packages fit together.', keywords: ['overview', 'quick start'], featured: true },
  { name: 'Installation', slug: 'installation', group: 'Getting started', summary: 'Install CSS, tokens, Tailwind, or React.', keywords: ['npm', 'imports', 'setup'], featured: true },
  { name: 'React', slug: 'react', group: 'Getting started', summary: 'Use UIx primitives in React applications.', keywords: ['tsx', 'components', 'package'] },
  { name: 'Build with UIx', slug: 'build-with-uix', group: 'Getting started', summary: 'Compose a complete interface with UIx layout, components, tokens and behavior.', keywords: ['style guide', 'system', 'composition', 'utilities'], featured: true },
  { name: 'Extend the system', slug: 'extend-the-system', group: 'Getting started', summary: 'Turn discoveries from each product into reusable components.', keywords: ['contribute', 'agent', 'new component', 'workflow'] },
  { name: 'Design tokens', slug: 'design-tokens', group: 'Foundations', summary: 'The stable --uix-* contract and generated outputs.', keywords: ['css variables', 'dtcg', 'style dictionary'], featured: true },
  { name: 'Theming', slug: 'theming', group: 'Foundations', summary: 'Light, dark, and product brand profiles.', keywords: ['color mode', 'brand', 'dark mode'] },
  { name: 'Motion', slug: 'motion', group: 'Foundations', summary: 'Duration, easing, transition, and reduced-motion contracts.', keywords: ['animation', 'transition', 'easing'] },
  { name: 'Icons & assets', slug: 'icons-assets', group: 'Foundations', summary: 'Icon, emoji, image, and media usage across UIx products.', keywords: ['icons', 'emoji', 'images', 'media'] },
  { name: 'Accessibility', slug: 'accessibility', group: 'Foundations', summary: 'Keyboard, focus, contrast, and motion expectations.', keywords: ['a11y', 'wcag', 'screen reader'] },
  { name: 'All components', slug: 'all-components', group: 'Components', summary: 'Browse the complete CSS component inventory.', keywords: ['catalog', 'inventory'], badge: '80', featured: true },
  { name: 'Component status', slug: 'component-status', group: 'Components', summary: 'Compare CSS, React, documentation, and example coverage.', keywords: ['coverage', 'support', 'adoption', 'matrix'], featured: true },
  { name: 'Button', slug: 'button', group: 'Components', summary: 'Actions, variants, sizing, loading, and disabled states.', keywords: ['primary', 'danger', 'icon'] },
  { name: 'Input & field', slug: 'input', group: 'Components', summary: 'Labels, hints, errors, and adornments.', keywords: ['form', 'validation', 'text field'] },
  { name: 'Status pill', slug: 'status-pill', group: 'Components', summary: 'Semantic status, priority, and SLA tones.', keywords: ['badge', 'chip', 'severity'] },
  { name: 'Alert', slug: 'alert', group: 'Components', summary: 'Inline informational and semantic messages.', keywords: ['banner', 'feedback', 'warning'] },
  { name: 'Tabs', slug: 'tabs', group: 'Components', summary: 'Line, enclosed, and pill navigation.', keywords: ['navigation', 'tabpanel'] },
  { name: 'Table', slug: 'table', group: 'Components', summary: 'Dense enterprise data display and table states.', keywords: ['grid', 'rows', 'data'] },
  { name: 'Chart', slug: 'chart', group: 'Components', summary: 'Accessible analytical cards, legends, metrics, and renderer slots.', keywords: ['graph', 'visualization', 'echarts', 'mission control'] },
  { name: 'App shell', slug: 'app-shell', group: 'Patterns', summary: 'Sidebar, top bar, and responsive workspace layout.', keywords: ['layout', 'navigation', 'sidebar'] },
  { name: 'Data workflows', slug: 'data-workflows', group: 'Patterns', summary: 'Filters, saved views, pinning, and record peek.', keywords: ['table', 'filters', 'peek', 'pin'] },
  { name: 'Pipeline', slug: 'pipeline', group: 'Patterns', summary: 'Compact and detailed stage rails for operational progress.', keywords: ['workflow', 'stage', 'approval', 'duration', 'mission control'] },
  { name: 'Flow', slug: 'flow', group: 'Patterns', summary: 'Presentational process graphs with explicit node state.', keywords: ['workflow', 'node', 'connector', 'graph', 'mission control'] },
  { name: 'Example gallery', slug: 'examples', group: 'Examples', summary: 'Browse every migrated component and pattern specimen inside the docs.', keywords: ['showcase', 'demos', 'style guide'], badge: '25', featured: true },
];

export const COMPONENT_GROUPS = {
  'Form controls': ['Button', 'Input', 'Textarea', 'Select', 'Checkbox', 'Radio', 'Switch', 'Slider', 'Segmented', 'Combobox', 'Tag input', 'File upload', 'Date range picker', 'Color picker', 'Metric input', 'Form'],
  'Navigation': ['App shell', 'Sidebar', 'Breadcrumbs', 'Tabs', 'Pagination', 'Steps', 'Stepper', 'Page header', 'Command palette', 'Menu', 'Nav favourites'],
  'Data display': ['Card', 'Table', 'Table toolbar', 'View menu', 'Filter popover', 'Saved view menu', 'List', 'Description list', 'Status pill', 'Avatar', 'Stat tile', 'Progress', 'Meter', 'Timeline', 'Tree', 'Calendar', 'Chart', 'Tooltip', 'States', 'Relative time'],
  'Feedback & overlays': ['Alert', 'Toast', 'Modal', 'Confirm dialog', 'Prompt dialog', 'Async operation status', 'Drawer', 'Popover', 'Peek', 'Spinner', 'Lightbox'],
  'Enterprise patterns': ['Inbox', 'Kanban', 'Detail layout', 'Detail page', 'Related links', 'Toggle row', 'Collapsible section', 'Comments', 'Composer', 'Contact card', 'Attachment', 'Audit log', 'Notification center', 'Pipeline', 'SLA', 'Heartbeat'],
  'Advanced workflows': ['Rule builder', 'Builder canvas', 'Relationship graph', 'Scheduling calendar', 'Diff viewer', 'Match review', 'License position bar', 'Brand profiles', 'Flow'],
  'Content & utilities': ['Typography', 'Prose', 'Editorial home', 'Labels', 'Reactions', 'Media', 'Kbd', 'Link', 'Utility bits', 'View menu'],
};

export const COMPOSITE_PATTERNS = ['Nav favourites', 'Composer', 'Filter popover', 'Saved view menu', 'Confirm dialog', 'Prompt dialog', 'Async operation status', 'Detail page', 'Related links', 'Toggle row', 'Collapsible section', 'Relative time'];

export const SHOWCASE_SECTION_MAP = {
  foundations: 'examples-foundations',
  motion: 'examples-motion',
  'form-controls': 'examples-form-controls',
  navigation: 'examples-navigation',
  'data-display': 'examples-data-display',
  overlays: 'examples-overlays',
  'crm-itsm': 'examples-crm-itsm',
  'workflows-pipelines': 'examples-workflows-pipelines',
  'editorial-home': 'examples-editorial-home',
  icons: 'examples-icons',
  emoji: 'examples-emoji',
  images: 'examples-images',
  prose: 'examples-prose',
  utility: 'examples-utility',
};

export const COMPONENT_ITEMS = Object.entries(COMPONENT_GROUPS).flatMap(([group, names]) =>
  names.map((name) => ({
    name,
    slug: slugify(name),
    group,
    composite: COMPOSITE_PATTERNS.includes(name),
  })));

export const REACT_COMPONENT_SLUGS = [
  'alert', 'app-shell', 'avatar', 'brand-profiles', 'builder-canvas', 'button', 'card', 'chart', 'checkbox',
  'color-picker', 'command-palette', 'comments', 'composer', 'date-range-picker', 'description-list',
  'detail-layout', 'diff-viewer', 'drawer', 'editorial-home', 'flow', 'form', 'inbox', 'input', 'kanban',
  'labels', 'license-position-bar', 'list', 'match-review', 'meter', 'metric-input', 'modal', 'nav-favourites',
  'page-header', 'pagination', 'peek', 'pipeline', 'popover', 'progress', 'prose', 'radio', 'relationship-graph',
  'rule-builder', 'scheduling-calendar', 'segmented', 'select', 'sidebar', 'spinner', 'stat-tile', 'states',
  'status-pill', 'switch', 'table', 'tabs', 'textarea', 'timeline', 'toast', 'tooltip', 'tree',
];

const CATALOG_SEARCH_ITEMS = COMPONENT_ITEMS
  .filter((component) => !NAV_ITEMS.some((item) => item.slug === component.slug))
  .map((component) => ({ ...component, summary: `Open the ${component.name} reference.`, keywords: ['component', component.slug], kind: 'Catalog' }));

const EXAMPLE_SEARCH_ITEMS = SHOWCASE_PAGES.map((page) => ({
  name: `${page.title} examples`,
  slug: page.slug,
  group: 'Examples',
  summary: page.summary,
  keywords: ['showcase', page.sectionId, page.source],
  kind: 'Example',
}));

const SEARCH_INDEX = buildSearchIndex([...NAV_ITEMS, ...CATALOG_SEARCH_ITEMS, ...EXAMPLE_SEARCH_ITEMS]);

let codeCounter = 0;
const codeBlock = (code, language = 'html') => {
  const id = `docs-code-${++codeCounter}`;
  return `<div class="uix-docs__code"><div class="uix-docs__code-head"><span>${esc(language)}</span><button class="uix-docs__copy" type="button" data-copy-target="${id}">Copy</button></div><pre id="${id}" tabindex="0"><code>${esc(code.trim())}</code></pre></div>`;
};

const demo = (markup, code = markup, options = {}) => {
  const id = `docs-demo-${++codeCounter}`;
  const stageClass = options.column ? ' uix-docs__demo-stage--column' : '';
  const previewMarkup = String(markup).replace(
    /<ol class="([^"]*\buix-pipeline--detailed\b[^"]*)"(?![^>]*\btabindex=)/g,
    '<ol class="$1" tabindex="0"',
  );
  const copiedCode = code === markup ? previewMarkup : code;
  return `<div class="uix-docs__demo" data-demo>
    <div class="uix-docs__demo-head" role="tablist" aria-label="Example view">
      <button class="uix-docs__demo-tab" type="button" role="tab" aria-selected="true" data-demo-tab="preview" aria-controls="${id}-preview">Preview</button>
      <button class="uix-docs__demo-tab" type="button" role="tab" aria-selected="false" data-demo-tab="code" aria-controls="${id}-code">Code</button>
    </div>
    <div class="uix-docs__demo-stage${stageClass}" id="${id}-preview" role="tabpanel" tabindex="0">${previewMarkup}</div>
    <div class="uix-docs__demo-code" id="${id}-code" role="tabpanel" tabindex="0" hidden>${codeBlock(copiedCode, options.language || 'html')}</div>
  </div>`;
};

const pageHeader = (eyebrow, title, lead, meta = []) => `<header>
  <p class="uix-docs__eyebrow">${esc(eyebrow)}</p>
  <h1>${esc(title)}</h1>
  <p class="uix-docs__lead">${esc(lead)}</p>
  ${meta.length ? `<div class="uix-docs__meta">${meta.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}
</header>`;

const section = (id, title, content) => `<section class="uix-docs__page-section" id="${id}"><h2>${esc(title)}</h2>${content}</section>`;

const callout = (title, body, tone = 'info') => `<div class="uix-docs__callout${tone === 'warning' ? ' uix-docs__callout--warning' : ''}"><strong>${esc(title)}</strong><p>${body}</p></div>`;

const compare = (doText, dontText) => `<div class="uix-docs__compare">
  <div class="uix-docs__compare-card uix-docs__compare-card--do"><strong>Do</strong><p>${esc(doText)}</p></div>
  <div class="uix-docs__compare-card uix-docs__compare-card--dont"><strong>Don’t</strong><p>${esc(dontText)}</p></div>
</div>`;

const COMPONENT_GUIDANCE = {
  'Form controls': ['Keep the visible label, current value, validation state, and recovery guidance available together.', 'Use the native control semantics first; add ARIA only for behavior the native element cannot express.'],
  Navigation: ['Use this pattern for wayfinding or switching context, never as a disguised action control.', 'Expose the current destination and preserve a predictable keyboard and focus order.'],
  'Data display': ['Choose a density that preserves comparison and scanning without hiding the meaning of the data.', 'Provide text alternatives for visual encoding and keep reading order meaningful without CSS.'],
  'Feedback & overlays': ['Match interruption level to urgency and always provide a clear dismissal or recovery path.', 'Manage focus for modal surfaces and announce asynchronous feedback at the least disruptive live-region level.'],
  'Enterprise patterns': ['Keep status, ownership, next action, and exceptional branches explicit in operational workflows.', 'Ensure every action is keyboard reachable and every loading, empty, error, and forbidden state has a useful next step.'],
  'Advanced workflows': ['Use progressive disclosure so complex authoring remains inspectable, reversible, and testable.', 'Represent connections and state with labels and structure as well as position, motion, or color.'],
  'Content & utilities': ['Use the shared primitive to reinforce hierarchy and avoid product-local visual dialects.', 'Preserve semantic HTML, readable zoom behavior, alternative text, and reduced-motion preferences.'],
};

export const exampleRouteFor = (item) => {
  const direct = {
    'brand-profiles': 'examples-brand-profiles',
    'builder-canvas': 'examples-builder-canvas',
    chart: 'examples-workflows-pipelines',
    'color-picker': 'examples-color-picker',
    'date-range-picker': 'examples-date-range-picker',
    'diff-viewer': 'examples-diff-viewer',
    'license-position-bar': 'examples-metrics',
    'match-review': 'examples-match-review',
    'metric-input': 'examples-metrics',
    flow: 'examples-workflows-pipelines',
    pipeline: 'examples-workflows-pipelines',
    'relationship-graph': 'examples-relationship-graph',
    'rule-builder': 'examples-rule-builder',
    'scheduling-calendar': 'examples-scheduling-calendar',
  }[item.slug];
  if (direct) return direct;
  if (item.slug === 'editorial-home') return 'examples-editorial-home';
  if (item.slug === 'prose') return 'examples-prose';
  if (item.slug === 'media') return 'examples-images';
  if (item.group === 'Form controls') return 'examples-form-controls';
  if (item.group === 'Navigation') return 'examples-navigation';
  if (item.group === 'Data display') return 'examples-data-display';
  if (item.group === 'Feedback & overlays') return 'examples-overlays';
  if (item.group === 'Enterprise patterns') return item.slug === 'pipeline' ? 'examples-workflows-pipelines' : 'examples-crm-itsm';
  if (item.group === 'Advanced workflows') return 'examples-workflows-pipelines';
  return 'examples-utility';
};

const renderComponentReference = (item) => {
  const [usage, accessibility] = COMPONENT_GUIDANCE[item.group];
  const exampleRoute = exampleRouteFor(item);
  const availability = item.composite
    ? callout('Composite example pattern', `${esc(item.name)} is assembled from existing UIx primitives. It does not have a standalone <code>@tensor_1/tokens/components/${esc(item.slug)}</code> export.`)
    : `${codeBlock(`@import "@tensor_1/tokens/components/${item.slug}";`, 'css')}<p>This stylesheet is independently exported by <code>@tensor_1/tokens</code>. Import the full bundle instead when the product uses many UIx components.</p>`;
  return `${pageHeader(item.group, item.name, COMPONENT_DETAILS[item.slug]?.[0] || COMPONENT_INTENT[item.slug][0], [item.composite ? 'composite pattern' : 'CSS module', REACT_COMPONENT_SLUGS.includes(item.slug) ? 'React adapter available' : 'CSS + application behavior', 'live preview'])}
    ${componentPreview(item)}
    ${section('availability', 'Availability', availability)}
    ${section('behavior-contract', 'Behavior and expected result', `<p>${esc(COMPONENT_DETAILS[item.slug]?.[1] || COMPONENT_INTENT[item.slug][1])}</p><p>${REACT_COMPONENT_SLUGS.includes(item.slug) ? 'A React adapter is available. See the <a href="#react">React integration guide</a> and the <a href="../../react/etc/uix-react.api.md">exported API</a> for its exact props. The preview here demonstrates HTML/CSS with docs behavior; it does not mount React.' : 'This is a CSS contract. Your application owns events, state, validation and persistence; importing CSS does not install those behaviors.'}</p><p>Start with <code>@import "@tensor_1/tokens/bundle";</code> to include tokens, base styles, components and layout utilities. A component-only import requires those shared layers separately. <a href="#installation">Installation</a> · <a href="#build-with-uix">Composition and styling</a></p>`)}
    ${section('usage-guidance', 'Usage guidance', `<p>${esc(usage)}</p>${compare(`Reuse the shared ${item.name} contract and verify it in the context where people complete the task.`, `Fork the visual language locally or infer unsupported behavior from the stylesheet alone.`)}`)}
    ${section('accessibility-notes', 'Accessibility notes', `<p>${esc(accessibility)}</p><p>Verify keyboard access, focus visibility, forced colors, 200% zoom, and both UIx themes in the consuming workflow.</p>`)}
    ${section('state-matrix', 'Examples and state matrix', `<p>Examples now live in the same documentation system as the component contract, so variants, combinations, and dense product context stay searchable and versioned together.</p><p><a class="uix-btn uix-btn--primary" href="#${esc(exampleRoute)}">Open ${esc(item.name)} examples</a> <a class="uix-btn uix-btn--outline" href="#all-components">Back to all components</a></p>`)}`;
};

const COMPONENT_DETAILS = {
  'color-picker': ['Choose an exact color for a brand, label or visual property. Keep semantic status colors tied to the theme rather than arbitrary user selections.', 'Open the swatch, edit a six-digit hex value or the HSV controls. Expect a normalized hex value, an updated swatch and contrast feedback. Escape closes the picker and returns focus. Your application stores the chosen value; contrast feedback is advisory, not a validation gate.'],
  'tag-input': ['Collect several short labels in one field. Use a select or combobox when values must come from a controlled vocabulary.', 'Type a label and press Enter to add it; use each Remove button to remove it. This example trims whitespace and rejects duplicates. The app owns the allowed vocabulary, maximum count and saved array.'],
  'file-upload': ['Let people choose attachments with a native file input. Show selected filenames before starting a transfer.', 'Choose files to see a local selection list. No bytes are uploaded by this documentation example. The app owns size/type validation, transfer progress, cancellation, server validation and retry. File selection alone is not upload success.'],
};

const componentPreview = (item) => section('component-preview', 'Preview and markup', `<div data-component-preview="${item.slug}"></div><p class="uix-text-muted">Uses the shared UIx stylesheet. The Code view shows the initial HTML; application behavior is separate.</p>`);

const PORTABLE_SPECIMEN_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 96'%3E%3Crect width='160' height='96' rx='12' fill='%23dbeafe'/%3E%3Cpath d='M18 70l32-32 24 24 18-18 50 50H18z' fill='%2360a5fa'/%3E%3Ccircle cx='118' cy='27' r='10' fill='%23f8fafc'/%3E%3C/svg%3E";
const portableSpecimenMarkup = (html) => String(html).replace(/(?:\.\.\/)?assets\/img\/[^"']+/g, PORTABLE_SPECIMEN_IMAGE);

// Resolve from the same maintained markup as composition pages: no second set of demos.
export const mountComponentPreview = (item, host) => {
  const spec = COMPONENT_SPECIMENS[item.slug];
  if (!spec) throw new Error(`Missing component specimen: ${item.slug}`);
  const page = SHOWCASE_PAGES.find((entry) => entry.slug === spec.route);
  const additional = ADDITIONAL_EXAMPLES.find((entry) => entry.module === item.slug);
  const template = document.createElement('template');
  template.innerHTML = additional?.html || page.html;
  const target = template.content.querySelector(spec.anchor || spec.selector);
  if (!target) throw new Error(`Missing specimen selector: ${item.slug} ${spec.selector}`);
  // Explicit parts keep native overlay triggers beside their top-layer content without
  // copying the surrounding docs-only family layout into a consumer example.
  const fragment = spec.parts
    ? spec.parts.map((selector) => template.content.querySelector(selector)?.outerHTML).filter(Boolean).join('\n')
    : page.source === 'advanced'
      ? stripShowcaseFrame(additional?.html || page.html)
    : (spec.container ? target.closest(spec.container).outerHTML : target.closest('[data-tag-example], [data-file-example]')?.outerHTML || target.closest('[data-uix-example]')?.querySelector('.uix-example__preview')?.innerHTML || target.outerHTML);
  if (!fragment) throw new Error(`Missing specimen parts: ${item.slug}`);
  const portableFragment = portableSpecimenMarkup(fragment);
  host.innerHTML = demo(portableFragment, portableFragment, { column: true });
  host.dataset.showcaseSource = page.source;
};

const renderCatalog = () => Object.entries(COMPONENT_GROUPS).map(([group, names]) => section(
  slugify(group),
  group,
  `<div class="uix-docs__component-grid">${names.map((name) => {
    const component = COMPONENT_ITEMS.find((item) => item.name === name);
    const route = NAV_ITEMS.find((item) => item.name === name || (name === 'Input' && item.slug === 'input'));
    const summary = route?.summary || (component.composite ? 'Composite pattern documented in the canonical showcase.' : 'Independently importable production CSS module.');
    return `<a class="uix-docs__component-card${component.composite ? ' uix-docs__component-card--catalog' : ''}" href="#${component.slug}"><strong>${esc(name)}</strong><span>${esc(summary)}</span><em>Open reference →</em></a>`;
  }).join('')}</div>`
)).join('');

const exampleCards = (source) => SHOWCASE_PAGES
  .filter((page) => page.source === source)
  .map((page) => `<a class="uix-docs__component-card" href="#${page.slug}"><strong>${esc(page.title)}</strong><span>${esc(page.summary)}</span><em>Open examples →</em></a>`)
  .join('');

const renderExamplesOverview = () => `${pageHeader('Examples', 'Example gallery', 'See how UIx components work together in forms, workspaces and operational workflows. Each composition connects back to the component contracts it uses.', ['25 compositions', '80 CSS modules', 'shared component specimens'])}
  ${section('product-example', 'Complete product composition', `<div class="uix-docs__component-grid">${exampleCards('workspace')}</div>`)}
  ${section('core-examples', 'Foundations and component families', `<div class="uix-docs__component-grid">${exampleCards('core')}</div>`)}
  ${section('advanced-examples', 'Advanced workflow examples', `<div class="uix-docs__component-grid">${exampleCards('advanced')}</div>`)}
  ${section('how-to-read', 'How to read an example', `<ul><li>The component reference owns availability, imports, guidance, and accessibility requirements.</li><li>The example route shows the component in realistic product context and exercises its interaction model.</li><li>The status matrix reports CSS, React, documentation, and demonstration coverage independently.</li></ul><p><a class="uix-btn uix-btn--primary" href="#component-status">Open component status</a></p>`)}`;

const stripShowcaseFrame = (html) => String(html)
  .replace(/^<section\b[^>]*>/i, '')
  .replace(/<\/section>\s*$/i, '')
  .replace(/^\s*<h2>[\s\S]*?<\/h2>\s*<p class="lead">[\s\S]*?<\/p>/i, '');

const renderShowcasePage = (page) => {
  const additional = ADDITIONAL_EXAMPLES
    .filter((example) => example.route === page.slug)
    .map((example) => section(`additional-${example.module}`, example.title, demo(example.html)))
    .join('');
  const related = COMPONENT_ITEMS.filter((item) => COMPONENT_SPECIMENS[item.slug]?.route === page.slug);
  const sourceLabel = page.source === 'advanced' ? 'advanced workflow' : page.source === 'workspace' ? 'product composition' : 'component composition';
  return `${pageHeader('Examples', page.title, page.summary, [sourceLabel, 'live UIx contract', 'integrated reference'])}
    ${section('live-example', 'Live example', `<div class="uix-docs__showcase" data-showcase-source="${page.source}">${stripShowcaseFrame(page.html)}</div>`)}
    ${additional}
    ${section('reference-links', 'Components in this composition', `<div class="uix-cluster">${related.map((item) => `<a class="uix-btn uix-btn--outline" href="#${item.slug}">${esc(item.name)}</a>`).join('')}</div><p><a href="#all-components">All component references</a> · <a href="#examples">Example gallery</a> · <a href="#build-with-uix">Composition guidance</a></p>`)}`;
};

const statusCell = (available, label = 'Available') => available
  ? `<span class="uix-docs__status" data-status="yes"><span aria-hidden="true">✓</span>${esc(label)}</span>`
  : '<span class="uix-docs__status" data-status="no"><span aria-hidden="true">—</span>Not available</span>';

const renderComponentStatus = () => {
  const rows = COMPONENT_ITEMS.map((item) => {
    const css = !item.composite;
    const react = REACT_COMPONENT_SLUGS.includes(item.slug);
    return `<tr><th scope="row"><a href="#${item.slug}">${esc(item.name)}</a><span>${esc(item.group)}</span></th><td>${statusCell(css, css ? 'CSS module' : 'Composed')}</td><td>${statusCell(react, 'React')}</td><td>${statusCell(true, 'Reference')}</td><td><a href="#${exampleRouteFor(item)}">Open example</a></td></tr>`;
  }).join('');
  return `${pageHeader('Components', 'Component status', 'Implementation layers are reported independently. A CSS module does not imply a React adapter, and a visual example does not imply a supported behavior API.', ['80 CSS modules', '58 mapped React components', '82 documented entries'])}
    ${callout('What “covered” means', 'Every row has a maintained reference and an integrated example. CSS and React availability remain explicit so product teams can choose the correct integration without guessing.')}
    ${section('coverage-matrix', 'Coverage matrix', `<div class="uix-docs__status-table"><table class="uix-table"><thead><tr><th scope="col">Component</th><th scope="col">CSS</th><th scope="col">React</th><th scope="col">Docs</th><th scope="col">Examples</th></tr></thead><tbody>${rows}</tbody></table></div>`)}
    ${section('coverage-policy', 'Coverage policy', `<ul><li>New public CSS modules must add a catalogue entry, reference route, and example in the same change.</li><li>React availability is verified from the package export surface, not inferred from a similarly named stylesheet.</li><li>Showcase-only classes must be declared in <code>guide/guide.css</code> and are never presented as product contracts.</li><li>Any class defined in neither production CSS nor the showcase stylesheet fails the documentation coverage test.</li></ul>`)}`;
};

const buttonProps = [
  { name: 'variant', type: "'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link'", default: 'secondary', description: 'Sets the visual action hierarchy.' },
  { name: 'size', type: "'sm' | 'md' | 'lg'", default: 'md', description: 'Sets the control height and horizontal padding.' },
  { name: 'icon', type: 'boolean', default: 'false', description: 'Creates a square icon-only control.' },
  { name: 'loading', type: 'boolean', default: 'false', description: 'Shows progress and disables interaction.' },
];

const PAGES = {
  'build-with-uix': () => `${pageHeader('Getting started', 'Build with UIx', 'The style guide is the system: foundations define the visual language, components implement it, and compositions show how the pieces work together.', ['UIx CSS', 'optional React', 'shared theme'])}
    ${section('start-with-the-system', 'Start with the system', `<p>Import the bundle once at the application entry. Use semantic HTML and UIx classes in any framework, or use the React adapters for their supported behavior. UIx does not require Tailwind.</p>${codeBlock('@import "@tensor_1/tokens/bundle";', 'css')}<p><a href="#installation">Installation paths</a> · <a href="#component-status">CSS and React availability</a></p>`)}
    ${section('compose-a-screen', 'Compose a screen', `<p>Use App shell for navigation and workspace structure, Page header for the task title and actions, Card for a related content group, and Field for each label/control/message pair. Use <code>uix-stack</code> for vertical rhythm and <code>uix-cluster</code> for wrapping actions.</p>${demo(`<section class="uix-card"><header class="uix-card__header"><h3 class="uix-card__title">Project settings</h3></header><div class="uix-card__body uix-stack"><label class="uix-field"><span class="uix-field__label">Project name</span><input class="uix-input" value="Customer portal"><span class="uix-field__hint">A name people recognize in navigation.</span></label><div class="uix-cluster"><span class="uix-pill uix-pill--info">Draft</span><span class="uix-text-muted">Changes stay local in this preview.</span></div></div></section>`)}<p>This composition needs no product-specific stylesheet. For a complete workspace, <a href="#examples-workspace">open the workspace composition</a>.</p>`)}
    ${section('choose-the-layer', 'Choose the right styling layer', renderPropsTable([
      {name:'Theme',type:'--uix-*',description:'Set supported brand slots once for the product; switch light/dark with data-theme on the root. See Theming.'},
      {name:'Component',type:'uix-* classes',description:'Use the documented structure, variants and state attributes. Do not override internal selectors per screen.'},
      {name:'Layout',type:'uix-stack / uix-cluster / App shell',description:'Compose existing primitives. For genuinely new layout needs, add a reusable primitive to UIx.'},
      {name:'Behavior',type:'React adapter or application code',description:'Own state, validation and persistence explicitly. CSS styles a state; it does not create a backend or event handler.'},
    ]))}
    ${section('expected-result', 'What to expect', `<p>Components inherit the same typography, spacing, surfaces, focus rings and semantic colors in both themes. A product-specific layout may still need CSS; use UIx tokens and contribute repeated patterns back to the system. UIx is an expanding library, not a promise that every possible interface already exists.</p><p><a href="#theming">Theme your product</a> · <a href="#design-tokens">Inspect tokens</a> · <a href="#accessibility">Verify accessibility</a> · <a href="#extend-the-system">Add missing patterns</a></p>`)}`,
  'extend-the-system': () => `${pageHeader('Getting started', 'Extend the system', 'Make each project improve the starting point for the next one. Promote reusable structure and behavior into UIx while keeping product data and policy in the application.')}
    ${section('reuse-first', 'Find the existing contract', `<p>Search the component catalogue and inspect its preview, markup and availability. Check whether a variant or composition solves the need before creating a component. <a href="#all-components">Browse components</a> · <a href="#examples">Explore compositions</a></p>`)}
    ${section('contribution-contract', 'Add a component as one complete change', `<ol><li>Define who needs it, when to use it, input/output, keyboard behavior, empty/loading/error/disabled states and expected appearance.</li><li>Add production styles in <code>packages/tokens/styles/components/&lt;slug&gt;.css</code>, using existing UIx tokens and the component cascade layer. Register the stylesheet in <code>styles/component-list.css</code>.</li><li>If stateful React behavior belongs in the system, add an adapter in <code>packages/react/src/components</code>, export it from <code>src/index.ts</code>, and document the public props. Keep network requests and product policy in the consumer.</li><li>Add a maintained specimen in <code>docs/showcase-data.js</code> and a selector in <code>docs/component-specimens.js</code>. Register the component and specific usage guidance in <code>docs/docs.js</code>. Its own page must visibly render the component.</li><li>Test appearance in both themes, narrow layout, keyboard operation, validation and state transitions. Copy the example into a consumer and confirm it uses published UIx exports.</li><li>Add a changeset for package changes, update the API report when needed, run the repository gates and release through the maintainer workflow. Upgrade consuming projects and verify the actual rendered component.</li></ol>`)}
    ${section('agent-handoff', 'Contract for humans and agents', `${codeBlock('Component: <name and slug>\nUse when: <user task>\nAvoid when: <better alternative>\nInputs and outputs: <values, events, ownership>\nVisual states: <default, focus, disabled, invalid, empty, loading>\nKeyboard: <tab order and shortcuts>\nPreview: <component route and specimen selector>\nIntegration: <CSS imports; React export if available>\nVerification: <behavior checks and screenshots>\nConsumer: <project that proves the contract>', 'text')}<p>Use <a href="../../../Docs/contract-change-process.md">the contract change process</a> and <a href="../../../Docs/maintainer-runbook.md">the maintainer runbook</a> for versioning and release rules.</p>`)}
    ${section('completion-gate', 'Completion means usable and documented', `<p>A stylesheet appearing somewhere in a gallery is insufficient. Every catalogue entry must resolve to a visible specimen on its own page. The component-to-specimen registry and browser coverage tests enforce this relationship. New behavior also needs its own interaction tests.</p>`)}`,
  introduction: () => `${pageHeader('Getting started', 'Build enterprise interfaces with less drift.', 'UIx is the shared visual and interaction contract for dense operational products—available as framework-neutral CSS, typed tokens, Tailwind bindings, and React primitives.', ['v2.13.0', '80 CSS modules', '58 React components'])}
    <div class="uix-docs__hero-grid">
      <div>
        <div class="uix-docs__hero-actions">
          <a class="uix-btn uix-btn--primary uix-btn--lg" href="#installation">Start building</a>
          <a class="uix-btn uix-btn--outline uix-btn--lg" href="#all-components">Browse components</a>
        </div>
        ${codeBlock(`npm install @tensor_1/tokens @tensor_1/react`, 'terminal')}
      </div>
      <div class="uix-docs__specimen" aria-label="UIx interface specimen">
        <div class="uix-docs__specimen-top"><span class="uix-docs__specimen-kicker">Service operations</span><span class="uix-pill uix-pill--success"><span class="uix-pill__dot"></span>Healthy</span></div>
        <div><div class="uix-docs__specimen-value">98.7%</div><span class="uix-docs__specimen-kicker">SLA attainment · last 30 days</span></div>
        <div class="uix-docs__spark" role="img" aria-label="SLA trend rising"><span style="height:35%"></span><span style="height:48%"></span><span style="height:44%"></span><span style="height:60%"></span><span style="height:56%"></span><span style="height:76%"></span><span style="height:82%"></span><span style="height:91%"></span></div>
        <div class="uix-docs__specimen-row"><label class="uix-field"><span class="uix-field__label">Queue</span><select class="uix-select"><option>Priority incidents</option></select></label><button class="uix-btn uix-btn--primary" type="button" data-demo-action="Queue opened">Open queue</button></div>
      </div>
    </div>
    ${section('why-uix', 'One contract, every product surface', `<p>UIx separates stable product semantics from framework choices. The <code>--uix-*</code> contract controls color, type, spacing, motion, and layout; CSS primitives consume that contract; React components add typed behavior without changing the visual language.</p><div class="uix-docs__principles"><div class="uix-docs__principle"><span class="uix-docs__principle-number">01</span><strong>Stack neutral</strong><p>Use the same system in plain HTML, React, Vue, Tailwind, or server-rendered applications.</p></div><div class="uix-docs__principle"><span class="uix-docs__principle-number">02</span><strong>Operational by default</strong><p>Dense tables, state models, overlays, shells, and domain patterns are first-class.</p></div><div class="uix-docs__principle"><span class="uix-docs__principle-number">03</span><strong>Governed change</strong><p>Generated outputs, parity checks, API reports, and accessibility gates keep consumers aligned.</p></div></div>`)}
    ${section('choose-a-path', 'Choose the smallest integration', `<div class="uix-docs__component-grid"><a class="uix-docs__component-card" href="#installation"><strong>CSS bundle</strong><span>Tokens, base styles, motion, utilities, and every component in one import.</span><em>Fastest start →</em></a><a class="uix-docs__component-card" href="#design-tokens"><strong>Tokens only</strong><span>Use the UIx contract with your own components, charts, or native renderer.</span><em>Explore outputs →</em></a><a class="uix-docs__component-card" href="#react"><strong>React primitives</strong><span>Typed components and hooks that render the same production classes.</span><em>Read React guide →</em></a></div>`)}
    ${section('design-position', 'Designed for serious product work', `<p>UIx favors clear hierarchy, compact information density, explicit state, and resilient interaction patterns. It is especially suited to CRM, ITSM, operations, compliance, administration, and internal platforms where a component library must cover more than a marketing surface.</p>${callout('Build-free reference', 'The documentation and style guide consume the shipped CSS directly. If the reference looks wrong, the contract is wrong—there is no parallel documentation theme hiding the problem.')}`)}`,

  installation: () => `${pageHeader('Getting started', 'Installation', 'Adopt the full interface layer or only the contract you need. UIx keeps each path explicit so consumers do not pay for unused layers.', ['npm workspaces', 'CSS exports', 'Tailwind v3/v4'])}
    ${section('bundle', 'Plain CSS', `<p>Use the bundle when UIx should own tokens, element defaults, utilities, motion, and component styling.</p>${codeBlock(`@import "@tensor_1/tokens/bundle";`, 'css')}<p>For tighter payload control, import the token contract and individual components.</p>${codeBlock(`@import "@tensor_1/tokens/css";
@import "@tensor_1/tokens/themes/tensor";
@import "@tensor_1/tokens/motion";
@import "@tensor_1/tokens/components/button";
@import "@tensor_1/tokens/components/table";`, 'css')}`)}
    ${section('tailwind', 'Tailwind', `<p>Tailwind v4 consumes UIx’s generated <code>@theme</code> layer. Declare the cascade order before imports when you also include UIx base or component styles.</p>${codeBlock(`@layer theme, base, uix.tokens, uix.base, uix.util, uix.motion,
  uix.components, components, utilities;

@import "@tensor_1/tokens/css";
@import "@tensor_1/tokens/themes/tensor";
@import "@tensor_1/tokens/tailwind";
@import "tailwindcss";`, 'css')}${callout('Why the layer line matters', 'Cascade layer order beats selector specificity. Declaring it first keeps Tailwind utilities above UIx element defaults.', 'warning')}`)}
    ${section('typed-tokens', 'TypeScript and charts', `<p>For ECharts, React Native, canvas renderers, or any non-CSS integration, use the typed output.</p>${codeBlock(`import { cssVar, light, dark, num } from "@tensor_1/tokens/ts";

const chartColor = cssVar.color.chart1; // respects the live brand/theme
const radius = num.radius.md;           // renderer-ready number`, 'ts')}`)}
    ${section('verify', 'Verify the integration', `<ol class="uix-docs__steps"><li><h3>Render a primitive</h3><p>Add a primary button and confirm the component class resolves.</p></li><li><h3>Switch color mode</h3><p>Set <code>data-theme="dark"</code> on <code>&lt;html&gt;</code> and confirm the same markup changes theme.</p></li><li><h3>Test keyboard focus</h3><p>Tab to the control and verify the visible UIx focus ring is not clipped.</p></li></ol>`)} `,

  react: () => `${pageHeader('Getting started', 'React integration', 'The React package adds typed primitives and interaction models while keeping the CSS contract canonical.', ['@tensor_1/react', 'RSC-aware build', 'typed exports'])}
    ${section('setup', 'Set up the package', `${codeBlock(`npm install @tensor_1/tokens @tensor_1/react`, 'terminal')}${codeBlock(`import "@tensor_1/tokens/bundle";
import { Button, Field, Input, StatusPill } from "@tensor_1/react";`, 'tsx')}`)}
    ${section('first-component', 'Build a validated field', `${demo(`<div class="uix-stack" style="width:min(100%,360px)"><label class="uix-field"><span class="uix-field__label" data-required>Email</span><input class="uix-input" type="email" value="maya@example.com" readonly><span class="uix-field__msg"><span class="uix-field__hint">Used for account notifications.</span></span></label><button class="uix-btn uix-btn--primary" type="button" data-demo-action="Changes saved">Save changes</button></div>`, `<Field label="Email" required hint="Used for account notifications.">
  <Input type="email" defaultValue="maya@example.com" />
</Field>
<Button variant="primary">Save changes</Button>`, { language: 'tsx' })}`)}
    ${section('composition', 'Composition rules', `<ul><li>Import the CSS once at the application boundary; components do not inject style at runtime.</li><li>Pass <code>className</code> for layout composition, not to recreate component states.</li><li>Prefer exported interaction models and hooks for tables, dialogs, anchored overlays, calendars, and builders.</li><li>Use the package API report as the exhaustive type reference.</li></ul><p><a href="../../react/etc/uix-react.api.md">Open the generated React API report →</a></p>`)}
    ${section('server-components', 'React Server Components', `<p>The package build preserves per-file client boundaries. Import server-safe modules normally and keep browser-dependent interactions at the client edge; do not mark an entire application layout as client code to host a single UIx control.</p>${callout('CSS remains canonical', 'React components render UIx class names. A version bump only changes a bespoke consumer if that consumer actually uses the shared contract.')}`)}`,

  'design-tokens': () => `${pageHeader('Foundations', 'Design tokens', 'One DTCG source generates the CSS variables, Tailwind theme, typed constants, and per-product brand profiles that keep UIx consumers swappable.', ['W3C DTCG source', 'Style Dictionary 4', 'parity gated'])}
    ${section('contract', 'The contract', `<p>Use existing <code>--uix-*</code> names instead of introducing local aliases for concepts UIx already owns. Values may change between compatible releases; semantic names and their meaning are the stable integration boundary.</p>${codeBlock(`.account-summary {
  padding: var(--uix-space-5);
  border: 1px solid var(--uix-border);
  border-radius: var(--uix-radius-lg);
  background: var(--uix-surface);
  color: var(--uix-text);
}`, 'css')}`)}
    ${section('core-families', 'Core families', `<table class="uix-docs__token-table"><thead><tr><th>Family</th><th>Examples</th><th>Use</th></tr></thead><tbody><tr><td>Surface</td><td><code>--uix-bg-app</code><br><code>--uix-surface</code></td><td>Application, panel, and elevated backgrounds</td></tr><tr><td>Text</td><td><code>--uix-text</code><br><code>--uix-text-muted</code></td><td>Primary, supporting, and reverse text roles</td></tr><tr><td>Semantic</td><td><code>--uix-success</code><br><code>--uix-danger-bg</code></td><td>Status, validation, and feedback</td></tr><tr><td>Shape</td><td><code>--uix-radius-md</code><br><code>--uix-shadow-popover</code></td><td>Corner and elevation hierarchy</td></tr><tr><td>Rhythm</td><td><code>--uix-space-4</code><br><code>--uix-control-h</code></td><td>Spacing and control density</td></tr><tr><td>Motion</td><td><code>--uix-dur-fast</code><br><code>--uix-ease-out</code></td><td>State and spatial transitions</td></tr></tbody></table>`)}
    ${section('semantic-color', 'Semantic color', `<div class="uix-docs__swatches"><div class="uix-docs__swatch"><div class="uix-docs__swatch-color" style="--swatch:var(--uix-accent)"></div><div class="uix-docs__swatch-meta"><strong>Accent</strong><code>--uix-accent</code></div></div><div class="uix-docs__swatch"><div class="uix-docs__swatch-color" style="--swatch:var(--uix-success)"></div><div class="uix-docs__swatch-meta"><strong>Success</strong><code>--uix-success</code></div></div><div class="uix-docs__swatch"><div class="uix-docs__swatch-color" style="--swatch:var(--uix-warning)"></div><div class="uix-docs__swatch-meta"><strong>Warning</strong><code>--uix-warning</code></div></div><div class="uix-docs__swatch"><div class="uix-docs__swatch-color" style="--swatch:var(--uix-danger)"></div><div class="uix-docs__swatch-meta"><strong>Danger</strong><code>--uix-danger</code></div></div></div>`)}
    ${section('outputs', 'Generated outputs', `${codeBlock(`tokens/base/*.json + tokens/dark/*.json
  ├─ build/css/tokens.css
  ├─ build/tailwind/theme.css
  ├─ build/tailwind/preset.cjs
  └─ build/ts/tokens.{js,d.ts}`, 'text')}<p>Edit DTCG source files, then run the token build. Do not hand-edit generated files: parity and contract checks treat source-to-output agreement as a release gate.</p>`)}`,

  theming: () => `${pageHeader('Foundations', 'Theming', 'UIx ships light and dark modes from the same semantic contract, with two write-only brand slots for product identity.', ['light + dark', 'no-flash', 'brand profiles'])}
    ${section('color-mode', 'Set the color mode', `<p>Apply the theme to the document root. Components inherit the correct semantic values without variant-specific markup.</p>${codeBlock(`<html data-theme="dark">`, 'html')}${codeBlock(`document.documentElement.dataset.theme = "dark";`, 'js')}`)}
    ${section('no-flash', 'Avoid a theme flash', `<p>Resolve the saved preference before styles paint. If no explicit preference exists, follow the operating system.</p>${codeBlock(`const saved = localStorage.getItem("uix-theme");
const theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light");
document.documentElement.dataset.theme = theme;`, 'js')}`)}
    ${section('brand', 'Brand a product', `<p>Override only the write slots. Accent, links, rings, and muted brand surfaces re-chain automatically.</p>${codeBlock(`:root {
  --uix-brand: #16a34a;
  --uix-brand-fg: #ffffff;
}

:root:where(.dark, [data-theme="dark"]) {
  --uix-brand: #22c55e;
}`, 'css')}${callout('Prefer a shipped profile', 'Tensor, POSx, SHOPx, and Mission Control profiles are available as package exports. Use a profile before adding a new product override.')}`)}
    ${section('preview', 'Theme-safe composition', `${demo(`<div class="uix-stack"><div class="uix-alert uix-alert--info"><div><div class="uix-alert__title">Semantic by construction</div><div class="uix-alert__body">This surface follows both theme and brand overrides.</div></div></div><div class="uix-cluster"><button class="uix-btn uix-btn--primary" type="button" data-demo-action="Primary action completed">Primary action</button><button class="uix-btn uix-btn--secondary" type="button" data-demo-action="Secondary action completed">Secondary</button></div></div>`, `<div class="uix-alert uix-alert--info">…</div>
<button class="uix-btn uix-btn--primary">Primary action</button>`, { column: true })}`)}`,

  motion: () => `${pageHeader('Foundations', 'Motion', 'Purposeful, subtle motion explains change without delaying work. Entrances decelerate, exits accelerate, and non-essential movement yields to user preference.', ['4 duration tokens', '4 easing tokens', 'reduced-motion aware'])}
    ${section('tokens', 'Duration and easing', `${codeBlock(`.surface {
  transition:
    transform var(--uix-dur) var(--uix-ease-out),
    opacity var(--uix-dur-fast) var(--uix-ease-in);
}`, 'css')}<table class="uix-docs__token-table"><thead><tr><th>Contract</th><th>Use</th></tr></thead><tbody><tr><td><code>--uix-dur-fast</code> / <code>--uix-dur</code></td><td>Micro feedback and standard transitions</td></tr><tr><td><code>--uix-dur-slow</code> / <code>--uix-dur-slower</code></td><td>Overlays and large surfaces</td></tr><tr><td><code>--uix-ease-out</code></td><td>Entrances</td></tr><tr><td><code>--uix-ease-in</code></td><td>Exits</td></tr><tr><td><code>--uix-ease-in-out</code></td><td>Movement already on screen</td></tr><tr><td><code>--uix-ease-spring</code></td><td>Rare, non-critical emphasis</td></tr></tbody></table>`)}
    ${section('reduced-motion', 'Respect reduced motion', `<p>UIx’s motion layer removes non-essential animation when <code>prefers-reduced-motion: reduce</code> is active. Product-specific animation must honor the same preference and preserve the final state without relying on movement to explain it.</p>${compare('Use motion to connect cause and effect, orient spatial change, or confirm a completed action.', 'Animate routine navigation, loop decoration indefinitely, or make progress wait for a transition.')}`)}
    ${section('showcase', 'Motion specimens', `<p><a class="uix-btn uix-btn--primary" href="#examples-motion">Open the interactive motion examples</a></p>`)}`,

  'icons-assets': () => `${pageHeader('Foundations', 'Icons & assets', 'UIx uses a restrained Lucide icon set plus explicit patterns for emoji, avatars, product imagery, attachments, and zoomable media.', ['Lucide SVG', '16 / 20 / 24 px', 'alternative text required'])}
    ${section('icons', 'Icons', `<p>Render Lucide glyphs as inline SVG using <code>currentColor</code>, a stroke width of 2, and round caps. Use the shared small, medium, and large icon sizes instead of drawing product-local glyphs.</p>${codeBlock(`<button class="uix-btn uix-btn--icon" type="button" aria-label="Search">
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">…</svg>
</button>`, 'html')}<p><a href="#examples-icons">Browse and copy the icon inventory →</a></p>`)}
    ${section('emoji', 'Emoji and reactions', `<p>Use the curated work-appropriate set for warmth or acknowledgement, never as the only carrier of meaning and never as the status model for formal or destructive workflows.</p><p><a href="#examples-emoji">Open emoji and reaction examples →</a></p>`)}
    ${section('images', 'Images and media', `<ul><li>Write alternative text for the image’s purpose in context; use empty alt text when the image is decorative.</li><li>Keep avatar upload, empty, failure, and replacement states available without pointer-only interaction.</li><li>Open detail imagery with a real button and a focus-managed dialog; retain the source image’s description.</li><li>Use optimized product assets and reserve layout space to avoid content shift.</li></ul><p><a href="#examples-images">Open avatar, asset-card, and lightbox examples →</a></p>`)}`,

  accessibility: () => `${pageHeader('Foundations', 'Accessibility', 'UIx provides the visual and structural baseline; product code remains responsible for correct names, relationships, state, and workflow recovery.', ['WCAG 2.1 A/AA gate', 'keyboard first', 'reduced motion'])}
    ${section('baseline', 'The UIx baseline', `<ul><li>Visible <code>:focus-visible</code> treatment on interactive primitives.</li><li>Semantic foreground/background token pairs calibrated for contrast.</li><li>Reduced-motion overrides for non-essential transitions.</li><li>Native elements and ARIA patterns for dialogs, tabs, menus, comboboxes, and trees.</li><li>Serious and critical axe findings gated in both light and dark mode.</li></ul>`)}
    ${section('product-responsibility', 'What the product must add', `<div class="uix-docs__principles"><div class="uix-docs__principle"><span class="uix-docs__principle-number">NAME</span><strong>Clear purpose</strong><p>Every icon-only control needs an accessible name; every field needs a visible label.</p></div><div class="uix-docs__principle"><span class="uix-docs__principle-number">STATE</span><strong>Announced change</strong><p>Expose selected, expanded, invalid, busy, and live-update state through semantics.</p></div><div class="uix-docs__principle"><span class="uix-docs__principle-number">PATH</span><strong>A way forward</strong><p>Empty, error, forbidden, and not-found states need a focusable next action.</p></div></div>`)}
    ${section('keyboard', 'Keyboard behavior', `<table class="uix-docs__token-table"><thead><tr><th>Pattern</th><th>Expected behavior</th></tr></thead><tbody><tr><td>Global</td><td>Tab and Shift+Tab follow visual order; focus is never trapped accidentally.</td></tr><tr><td>Dialog / drawer</td><td>Focus enters the overlay, remains contained, closes on Escape, then returns to the trigger.</td></tr><tr><td>Tabs</td><td>Arrow keys move between tabs; the selected tab owns the active panel.</td></tr><tr><td>Menu / listbox</td><td>Arrow keys move active choice; Enter or Space commits; Escape dismisses.</td></tr><tr><td>Dense table</td><td>High-frequency actions remain keyboard-reachable without turning every cell into a tab stop.</td></tr></tbody></table>`)}
    ${section('review', 'Before shipping', `${compare('Test the real journey with a keyboard, zoom, both themes, and at least the required screen-reader matrix.', 'Assume that using a UIx class automatically makes the surrounding workflow accessible.')}`)}`,

  'all-components': () => `${pageHeader('Components', 'Component catalogue', 'A production-oriented inventory spanning primitives, navigation, dense data, feedback, CRM and ITSM patterns, and advanced authoring workflows.', ['80 CSS modules', '2 composite patterns', '58 React mappings'])}${callout('Coverage is enforced', 'Every independently importable component stylesheet has a reference route and an integrated example. Composite patterns are labeled separately so availability is never ambiguous.')}${renderCatalog()}${section('examples', 'See components in context', `<p>Examples, state matrices, and advanced workflow specimens now live inside this documentation system.</p><p><a class="uix-btn uix-btn--primary" href="#examples">Browse example gallery</a> <a class="uix-btn uix-btn--outline" href="#component-status">Compare component status</a></p>`)}`,

  'component-status': renderComponentStatus,

  examples: renderExamplesOverview,

  button: () => `${pageHeader('Components', 'Button', 'Buttons communicate action hierarchy and preserve clear states across mouse, touch, and keyboard input.', ['CSS primitive', 'React component', '6 variants'])}
    ${section('example', 'Example', demo(`<button class="uix-btn uix-btn--primary" type="button" data-demo-action="Primary action completed">Primary</button><button class="uix-btn uix-btn--secondary" type="button" data-demo-action="Secondary action completed">Secondary</button><button class="uix-btn uix-btn--outline" type="button" data-demo-action="Outline action completed">Outline</button><button class="uix-btn uix-btn--ghost" type="button" data-demo-action="Ghost action completed">Ghost</button><button class="uix-btn uix-btn--danger" type="button" data-demo-action="Danger example selected">Danger</button>`, `<button class="uix-btn uix-btn--primary">Primary</button>
<button class="uix-btn uix-btn--secondary">Secondary</button>
<button class="uix-btn uix-btn--outline">Outline</button>
<button class="uix-btn uix-btn--ghost">Ghost</button>
<button class="uix-btn uix-btn--danger">Danger</button>`))}
    ${section('hierarchy', 'Action hierarchy', `<ul><li><strong>Primary:</strong> the single strongest action in a local decision area.</li><li><strong>Secondary:</strong> the default for supporting actions.</li><li><strong>Outline and ghost:</strong> lower-emphasis controls in toolbars and compact surfaces.</li><li><strong>Danger:</strong> destructive intent that has an explicit confirmation or compensation path.</li><li><strong>Link:</strong> navigation-like action inside prose; use an anchor when the destination has a URL.</li></ul>${compare('Use one primary action per clear decision area and label it with a specific verb.', 'Use several primary buttons together or use color as the only indication of destructive intent.')}`)}
    ${section('states', 'Sizes and states', demo(`<button class="uix-btn uix-btn--primary uix-btn--sm" type="button" data-demo-action="Small action completed">Small</button><button class="uix-btn uix-btn--primary" type="button" data-demo-action="Standard action completed">Standard</button><button class="uix-btn uix-btn--primary uix-btn--lg" type="button" data-demo-action="Large action completed">Large</button><button class="uix-btn uix-btn--secondary" type="button" disabled>Disabled</button><button class="uix-btn uix-btn--primary" type="button" data-loading aria-label="Saving" disabled>Saving</button>`))}
    ${section('react-api', 'React API', renderPropsTable(buttonProps))}
    ${section('accessibility-notes', 'Accessibility notes', `<ul><li>Use a native <code>&lt;button&gt;</code> for actions and an anchor for navigation.</li><li>Icon-only buttons require an accessible name.</li><li>Loading controls expose a busy label and prevent duplicate submission.</li><li>Do not disable a control without explaining what makes it available.</li></ul>`)}`,

  input: () => `${pageHeader('Components', 'Input & field', 'Fields pair a stable label, control, and message slot so guidance and validation remain understandable without layout shift.', ['CSS primitive', 'React Field + Input', 'validation states'])}
    ${section('example', 'Example', demo(`<div style="width:min(100%,380px)"><label class="uix-field"><span class="uix-field__label" data-required>Work email</span><input class="uix-input" type="email" placeholder="name@company.com" aria-describedby="email-hint"><span class="uix-field__msg"><span class="uix-field__hint" id="email-hint">We’ll only use this for account notifications.</span></span></label></div>`, `<label class="uix-field">
  <span class="uix-field__label" data-required>Work email</span>
  <input class="uix-input" type="email" aria-describedby="email-hint">
  <span class="uix-field__msg">
    <span class="uix-field__hint" id="email-hint">Account notifications only.</span>
  </span>
</label>`))}
    ${section('validation', 'Validation', demo(`<div class="uix-stack" style="width:min(100%,380px)"><label class="uix-field"><span class="uix-field__label">Workspace slug</span><input class="uix-input" value="operations-eu" data-valid aria-describedby="slug-ok"><span class="uix-field__msg"><span class="uix-field__success" id="slug-ok">Available</span></span></label><label class="uix-field"><span class="uix-field__label">Cost center</span><input class="uix-input" value="EU-" aria-invalid="true" aria-describedby="cost-error"><span class="uix-field__msg"><span class="uix-field__error" id="cost-error">Enter a six-character cost center.</span></span></label></div>`, `<input class="uix-input" data-valid aria-describedby="slug-ok">
<span class="uix-field__success" id="slug-ok">Available</span>

<input class="uix-input" aria-invalid="true" aria-describedby="cost-error">
<span class="uix-field__error" id="cost-error">Enter a valid cost center.</span>`, { column: true }))}
    ${section('guidance', 'Usage guidance', `${compare('Keep the label visible, reserve the message slot, and explain how to recover from invalid input.', 'Use placeholder text as the only label or show validation only in a page-level banner.')}<p>Prefer native input types and autocomplete tokens. For prefix, suffix, and icons, use the input-group pattern without removing the programmatic label.</p>`)}
    ${section('accessibility-notes', 'Accessibility notes', `<ul><li>Associate every message with the control through <code>aria-describedby</code>.</li><li>Set <code>aria-invalid="true"</code> only after validation has run.</li><li>Move focus to the first invalid field after a failed submit; keep typed values intact.</li><li>A required marker supplements—not replaces—the required programmatic state.</li></ul>`)}`,

  'status-pill': () => `${pageHeader('Components', 'Status pill', 'Compact labels communicate workflow, severity, priority, and time pressure with text, shape, and color together.', ['semantic tones', 'priority P1–P5', 'SLA states'])}
    ${section('status', 'Workflow status', demo(`<span class="uix-pill uix-pill--neutral"><span class="uix-pill__dot"></span>Draft</span><span class="uix-pill uix-pill--info"><span class="uix-pill__dot"></span>In progress</span><span class="uix-pill uix-pill--success"><span class="uix-pill__dot"></span>Resolved</span><span class="uix-pill uix-pill--warning"><span class="uix-pill__dot"></span>Waiting</span><span class="uix-pill uix-pill--danger"><span class="uix-pill__dot"></span>Blocked</span>`))}
    ${section('priority', 'Priority and SLA', demo(`<span class="uix-pill uix-pill--p1"><span class="uix-pill__dot"></span>P1 Critical</span><span class="uix-pill uix-pill--p3"><span class="uix-pill__dot"></span>P3 Medium</span><span class="uix-pill uix-pill--sla-ok"><span class="uix-pill__dot"></span>SLA healthy</span><span class="uix-pill uix-pill--sla-at-risk"><span class="uix-pill__dot"></span>32m remaining</span><span class="uix-pill uix-pill--sla-breached"><span class="uix-pill__dot"></span>Breached 14m</span>`))}
    ${section('semantics', 'Choose one semantic axis', `<p>A pill instance should describe one thing: workflow status, priority, severity, or time pressure. Do not overload a single tone so “warning” means both medium priority and approaching SLA.</p>${compare('Pair a recognizable label with the right semantic family and keep terminology consistent across views.', 'Render an unlabeled colored dot or invent a one-off tone inside a product.')}`)}
    ${section('accessibility-notes', 'Accessibility notes', `<p>Color is redundant: every pill includes text and may include a dot. When status changes asynchronously, announce the surrounding workflow update—not every decorative pill repaint.</p>`)}`,

  alert: () => `${pageHeader('Components', 'Alert', 'Alerts place concise, contextual feedback inside the surface where a user can act on it.', ['4 semantic tones', 'inline feedback', 'non-modal'])}
    ${section('example', 'Example', demo(`<div class="uix-stack" style="width:min(100%,560px)"><div class="uix-alert uix-alert--info"><div><div class="uix-alert__title">Policy update available</div><div class="uix-alert__body">Review two changed rules before publishing this policy.</div></div></div><div class="uix-alert uix-alert--success"><div><div class="uix-alert__title">Import complete</div><div class="uix-alert__body">248 records were validated and added.</div></div></div><div class="uix-alert uix-alert--warning"><div><div class="uix-alert__title">Approval required</div><div class="uix-alert__body">This change affects all European workspaces.</div></div></div><div class="uix-alert uix-alert--danger"><div><div class="uix-alert__title">Connection failed</div><div class="uix-alert__body">Check the endpoint and try again.</div></div></div></div>`, undefined, { column: true }))}
    ${section('when-to-use', 'When to use an alert', `<ul><li>Place validation summaries before the relevant form and link them to invalid fields.</li><li>Use an alert for persistent page or section context; use a toast for transient confirmation.</li><li>Keep titles specific and make recovery instructions concrete.</li><li>Reserve danger for blocked progress, destructive consequences, or serious failure.</li></ul>`)}
    ${section('accessibility-notes', 'Accessibility notes', `<p>Static informational alerts need no live-region role. For a message inserted after an action, choose <code>role="status"</code> for routine updates or <code>role="alert"</code> only when immediate interruption is necessary.</p>`)}`,

  tabs: () => `${pageHeader('Components', 'Tabs', 'Tabs switch between peer views while preserving context. UIx provides line, enclosed, and pill presentations over the same semantic pattern.', ['3 variants', 'arrow-key navigation', 'tabpanel relationship'])}
    ${section('line-tabs', 'Line tabs', demo(`<div style="width:min(100%,520px)" data-docs-tabs><div class="uix-tabs uix-tabs--line" role="tablist"><button class="uix-tab" role="tab" aria-selected="true" aria-controls="tab-overview">Overview</button><button class="uix-tab" role="tab" aria-selected="false" aria-controls="tab-activity">Activity</button><button class="uix-tab" role="tab" aria-selected="false" aria-controls="tab-automation">Automation</button></div><div id="tab-overview" role="tabpanel" style="padding:20px 12px">Service health and ownership at a glance.</div><div id="tab-activity" role="tabpanel" style="padding:20px 12px" hidden>Recent changes across this service.</div><div id="tab-automation" role="tabpanel" style="padding:20px 12px" hidden>Rules and scheduled actions.</div></div>`, `<div class="uix-tabs uix-tabs--line" role="tablist">
  <button class="uix-tab" role="tab" aria-selected="true" aria-controls="overview">Overview</button>
  <button class="uix-tab" role="tab" aria-selected="false" aria-controls="activity">Activity</button>
</div>
<div id="overview" role="tabpanel">…</div>`))}
    ${section('variants', 'Variants', demo(`<div class="uix-stack"><div class="uix-tabs uix-tabs--enclosed" role="tablist" aria-label="Enclosed example"><button class="uix-tab" role="tab" aria-selected="true">Details</button><button class="uix-tab" role="tab" aria-selected="false">History</button></div><div class="uix-tabs uix-tabs--pill" role="tablist" aria-label="Pill example"><button class="uix-tab" role="tab" aria-selected="true">Week</button><button class="uix-tab" role="tab" aria-selected="false">Month</button><button class="uix-tab" role="tab" aria-selected="false">Quarter</button></div></div>`, undefined, { column: true }))}
    ${section('guidance', 'Usage guidance', `${compare('Use tabs for a small set of peer views whose content can change without changing the task context.', 'Use tabs as a substitute for primary navigation or for steps that must be completed in order.')}<p>Keep labels short, use sentence case, and avoid more tabs than fit at the narrowest supported width.</p>`)}
    ${section('accessibility-notes', 'Accessibility notes', `<p>Each tab owns one panel through <code>aria-controls</code>; each panel points back with <code>aria-labelledby</code>. Arrow keys move focus inside the tab list, Home and End jump to boundaries, and only the active tab is in the page tab order.</p>`)}`,

  table: () => `${pageHeader('Components', 'Table', 'Tables support dense operational decisions with explicit sorting, selection, status, ownership, and view controls.', ['sticky headers', '3 density tiers', 'pin + peek patterns'])}
    ${section('example', 'Example', demo(`<div style="width:100%;overflow:auto"><table class="uix-table"><thead><tr><th scope="col">Incident</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">SLA</th></tr></thead><tbody><tr><td><strong>VPN disconnects randomly</strong><br><span class="uix-text-muted">INC-2048</span></td><td><span class="uix-pill uix-pill--info"><span class="uix-pill__dot"></span>In progress</span></td><td>Maya Chen</td><td><span class="uix-pill uix-pill--sla-at-risk">32m</span></td></tr><tr><td><strong>Payroll export timing out</strong><br><span class="uix-text-muted">INC-2047</span></td><td><span class="uix-pill uix-pill--warning"><span class="uix-pill__dot"></span>Waiting</span></td><td>Omar Diallo</td><td><span class="uix-pill uix-pill--sla-ok">2h 14m</span></td></tr><tr><td><strong>New starter access</strong><br><span class="uix-text-muted">REQ-8831</span></td><td><span class="uix-pill uix-pill--success"><span class="uix-pill__dot"></span>Resolved</span></td><td>Priya Shah</td><td>—</td></tr></tbody></table></div>`, `<table class="uix-table">
  <thead><tr><th scope="col">Incident</th><th scope="col">Status</th>…</tr></thead>
  <tbody>
    <tr><td>VPN disconnects randomly</td><td><span class="uix-pill uix-pill--info">In progress</span></td>…</tr>
  </tbody>
</table>`))}
    ${section('view-model', 'Separate data from the view', `<p>Filters change which records belong in the result. View controls change how those records are presented. UIx keeps density, zebra striping, frozen columns, and column visibility in one View menu so content filters remain easy to scan.</p><ul><li>Use a bounded query with total count and truncation feedback.</li><li>Apply filters in the query, not after a limited fetch.</li><li>Persist saved-view preferences per table and workspace.</li><li>Keep pinned rows visible by design and label that exception to active filters.</li></ul>`)}
    ${section('row-actions', 'Rows, selection, and actions', `<p>The record title opens the full record. Peek previews it without navigation. Selection enables bulk action and must report partial failure per item. Avoid making an entire complex row a button when the row already contains links, checkboxes, or menus.</p>${compare('Give every column a clear purpose and keep the primary record link visually dominant.', 'Place unrelated actions in every cell or hide critical state behind hover-only controls.')}`)}
    ${section('accessibility-notes', 'Accessibility notes', `<ul><li>Use native table semantics for tabular data; do not add grid roles unless spreadsheet-style keyboard editing is implemented.</li><li>Provide accessible sort names and expose the active direction with <code>aria-sort</code>.</li><li>Associate select-all and row-selection controls with their scope.</li><li>At narrow widths, preserve meaning through horizontal scrolling or a deliberate alternate layout—not arbitrary column loss.</li></ul>`)}`,

  chart: () => `${pageHeader('Components', 'Chart', 'Chart provides reusable analytical card chrome around a consumer-owned renderer, with first-class metrics, legends, annotations, freshness, loading, empty, and accessible table states.', ['@tensor_1/react/chart', 'renderer optional', 'Mission Control ready'])}
    ${section('anatomy', 'Anatomy', `<table class="uix-docs__token-table"><thead><tr><th>Part</th><th>Purpose</th></tr></thead><tbody><tr><td>Header</td><td>Eyebrow, title, subtitle, primary metric, delta, and optional action.</td></tr><tr><td>Plot</td><td>A stable renderer slot for ECharts or another chart engine.</td></tr><tr><td>Legend</td><td>Named color, line, dashed-line, or threshold keys outside the plot.</td></tr><tr><td>Annotation</td><td>A concise explanation of an operationally meaningful change.</td></tr><tr><td>Footer</td><td>Source, freshness, time range, or other provenance.</td></tr><tr><td>Data table</td><td>The equivalent values for screen readers and non-visual inspection.</td></tr></tbody></table>`)}
    ${section('css-example', 'CSS and HTML', `${demo(`<article class="uix-chart"><header class="uix-chart__header"><div class="uix-chart__heading"><span class="uix-chart__eyebrow">Delivery health</span><h3 class="uix-chart__title">Checkpoint residence</h3><p class="uix-chart__subtitle">Median hours by checkpoint · last 14 days</p></div><div class="uix-chart__metric"><strong>18.4h</strong><span class="uix-chart__delta uix-chart__delta--good">↓ 12%</span></div></header><div class="uix-chart__tick-strip" role="img" aria-label="Checkpoint residence improved across fourteen daily samples"><span style="--uix-chart-value:42%"></span><span style="--uix-chart-value:58%"></span><span style="--uix-chart-value:50%"></span><span style="--uix-chart-value:71%"></span><span style="--uix-chart-value:64%"></span><span style="--uix-chart-value:82%"></span><span style="--uix-chart-value:76%"></span><span style="--uix-chart-value:91%"></span></div><footer class="uix-chart__footer"><span>Mission Control telemetry</span><span>Updated 2m ago</span></footer></article>`, `<article class="uix-chart">
  <header class="uix-chart__header">…metric and context…</header>
  <div class="uix-chart__plot" data-uix-chart="residence"></div>
  <div class="uix-chart__legend">…</div>
  <footer class="uix-chart__footer">…source and freshness…</footer>
  <table class="uix-chart__table uix-visually-hidden">…equivalent values…</table>
</article>`)}`)}
    ${section('react-api', 'React composition', `${codeBlock(`import { Chart, ChartLegend, ChartLegendItem, ChartMetric } from "@tensor_1/react/chart";

<Chart
  option={option}
  title="Checkpoint residence"
  subtitle="Median hours by checkpoint · last 14 days"
  headerAction={<ChartMetric value="18.4h" delta="↑ 3.4h over budget" deltaTone="warning" />}
  footer={<ChartLegend><ChartLegendItem label="Residence" color="var(--uix-chart-1)" /></ChartLegend>}
  tableHeaders={["Date", "Hours"]}
  tableData={rows}
/>`, 'tsx')}<p>Use the lean <code>@tensor_1/react/chart-preset</code> entry when a consumer needs the bundled ECharts adapter. The main entry remains runtime-free.</p>`)}
    ${section('states', 'Loading, empty, and failure', `<p>Use <code>loading</code> while the first meaningful dataset is unresolved and <code>empty</code> when the resolved query has no plottable values. Keep retry and failure handling in the consumer so it can explain the real data source and recovery path.</p>${callout('Freshness is part of the data', 'Operational charts should identify their source and last successful refresh. Never let an old chart look current after ingestion stalls.', 'warning')}`)}
    ${section('accessibility-notes', 'Accessibility notes', `<ul><li>Pass a captioned data table with the same values shown by the renderer.</li><li>Do not rely on color alone; legend labels and annotation text carry the meaning.</li><li>Use discrete ticks for low-volume throughput instead of implying continuous activity.</li><li>Keep tooltips supplemental—the underlying values must remain available without hover.</li></ul><p><a class="uix-btn uix-btn--primary" href="#examples-data-display">Open the complete chart set</a></p>`)}`,

  pipeline: () => `${pageHeader('Patterns', 'Pipeline', 'Pipeline turns a simple progress bar into an operational stage rail with current state, ownership, duration, blockers, and the next decision kept visible.', ['compact + detailed', 'ordered semantics', 'explicit state'])}
    ${section('choose-a-density', 'Choose a density', `<table class="uix-docs__token-table"><thead><tr><th>Variant</th><th>Use when</th></tr></thead><tbody><tr><td>Compact</td><td>Only stage names and progress are needed in a table row, card, or summary.</td></tr><tr><td>Detailed</td><td>Operators need owner, timing, explanation, exception state, or a decision point.</td></tr></tbody></table>`)}
    ${section('example', 'Detailed operational rail', `${demo(`<ol class="uix-pipeline uix-pipeline--detailed" aria-label="Release 1842 progress"><li class="uix-pipeline__stage" data-state="done"><span class="uix-pipeline__marker">1</span><div class="uix-pipeline__content"><span class="uix-pipeline__eyebrow">Build</span><span class="uix-pipeline__state">Complete</span><strong class="uix-pipeline__title">Package artifacts</strong><span class="uix-pipeline__description">Checksums and provenance attached.</span><span class="uix-pipeline__meta">Automation · 4m 12s</span></div></li><li class="uix-pipeline__stage" data-state="blocked" aria-current="step"><span class="uix-pipeline__marker">2</span><div class="uix-pipeline__content"><span class="uix-pipeline__eyebrow">Review</span><span class="uix-pipeline__state">Blocked</span><strong class="uix-pipeline__title">Production approval</strong><span class="uix-pipeline__description">Waiting for the release manager.</span><span class="uix-pipeline__meta">Maya Chen · 18m</span></div></li><li class="uix-pipeline__stage" data-state="pending"><span class="uix-pipeline__marker">3</span><div class="uix-pipeline__content"><span class="uix-pipeline__eyebrow">Deploy</span><span class="uix-pipeline__state">Pending</span><strong class="uix-pipeline__title">Production rollout</strong><span class="uix-pipeline__description">Progressive deployment across regions.</span><span class="uix-pipeline__meta">Automation · est. 12m</span></div></li></ol>`, `<Pipeline aria-label="Release 1842 progress" detailed>
  <PipelineStage state="done" stateLabel="Complete" label="Package artifacts" description="Checksums attached." meta="Automation · 4m 12s" marker="1" />
  <PipelineStage state="blocked" current label="Production approval" description="Waiting for release manager." meta="Maya Chen · 18m" marker="2" />
  <PipelineStage state="pending" label="Production rollout" description="Progressive regional deploy." meta="Automation · est. 12m" marker="3" />
</Pipeline>`, { language: 'tsx' })}`)}
    ${section('state-model', 'State model', `<p>Use <code>pending</code>, <code>active</code>, <code>done</code>, <code>blocked</code>, or <code>failed</code> as the shared visual vocabulary. Products own the domain transition, permissions, audit trail, and approval action; UIx owns only the presentation.</p>${compare('Show a visible state word and use aria-current="step" for the current stage.', 'Encode progress only with connector color, animation, or icon shape.')}`)}
    ${section('responsive', 'Responsive behavior', `<p>The detailed rail preserves its readable stage width and scrolls horizontally on narrow surfaces. Plain HTML must put <code>tabindex="0"</code> on that scroll container; the React <code>Pipeline</code> adapter does this by default when <code>detailed</code> is true. Keep the active stage in view when application logic advances the workflow; do not compress titles and metadata into illegible columns.</p><p><a class="uix-btn uix-btn--primary" href="#examples-workflows-pipelines">Open workflow specimens</a></p>`)}`,

  flow: () => `${pageHeader('Patterns', 'Flow', 'Flow is a presentational process-graph shell for readable nodes and connectors. Consumers retain layout, graph traversal, selection, and domain behavior.', ['renderer free', 'explicit node state', 'consumer-owned geometry'])}
    ${section('boundary', 'What UIx owns', `<table class="uix-docs__token-table"><thead><tr><th>UIx owns</th><th>The consumer owns</th></tr></thead><tbody><tr><td>Node surface, typography, ports, connector states, focus, and visible status.</td><td>Graph data, positioning, routing, zoom, persistence, permissions, and execution.</td></tr></tbody></table>`)}
    ${section('react-api', 'React composition', `${codeBlock(`import { Flow, FlowNode } from "@tensor_1/react";

<Flow aria-label="Release automation">
  <FlowNode eyebrow="Trigger" title="Commit received" state="done" />
  <span className="uix-flow__connector" data-running aria-hidden="true" />
  <FlowNode eyebrow="Decision" title="Policy check" state="active" />
</Flow>`, 'tsx')}<p>Use <code>aria-label</code> on the graph and retain a meaningful DOM order. A visual edge must not be the only place a relationship is described.</p>`)}
    ${section('usage-guidance', 'Usage guidance', `${compare('Use Flow for branching or connected process structure where node relationships matter.', 'Use a graph when an ordered Pipeline would communicate the same process more simply.')}<p>Keep node titles concise, label exceptional states in text, and reserve motion for genuinely running connectors.</p>`)}
    ${section('accessibility-notes', 'Accessibility notes', `<p>DOM order should provide a coherent linear reading of the graph. Interactive nodes must be keyboard reachable, show focus, and expose their action. For complex branching, pair the visual canvas with an outline, table, or other structured representation.</p><p><a class="uix-btn uix-btn--primary" href="#examples-workflows-pipelines">Open workflow specimens</a></p>`)}`,

  'app-shell': () => `${pageHeader('Patterns', 'App shell', 'The shell establishes persistent wayfinding, global action, and a predictable working area for dense products.', ['sidebar + top bar', 'responsive rail', 'persistent navigation'])}
    ${section('anatomy', 'Anatomy', `<ol class="uix-docs__steps"><li><h3>Global sidebar</h3><p>One canonical home, grouped primary destinations, favorites, and visible active state.</p></li><li><h3>Top bar</h3><p>Page context, global search, cross-product actions, theme, and account access.</p></li><li><h3>Working canvas</h3><p>Page header, task controls, feedback, and content sized for the job rather than the browser.</p></li></ol>`)}
    ${section('preview', 'In context', `<div class="uix-docs__demo"><div class="uix-docs__demo-stage" style="padding:16px;display:block"><div class="uix-card" style="overflow:hidden"><div style="display:grid;grid-template-columns:150px 1fr;min-height:280px"><nav style="padding:16px;background:var(--uix-bg-subtle);border-right:1px solid var(--uix-border)" aria-label="Example navigation"><strong style="display:block;margin-bottom:18px">Operations</strong><a class="uix-navitem" href="#app-shell" aria-current="page">Overview</a><a class="uix-navitem" href="#table">Incidents</a><a class="uix-navitem" href="#data-workflows">Changes</a></nav><div><div style="height:52px;padding:0 18px;display:flex;align-items:center;border-bottom:1px solid var(--uix-border)"><strong>Service workspace</strong></div><div style="padding:24px"><p class="uix-docs__eyebrow">Today</p><h3 style="margin-top:0">Good morning, Maya</h3><p class="uix-text-muted">Three incidents need attention before the handover.</p><button class="uix-btn uix-btn--primary" type="button" data-demo-action="Queue opened">Open my queue</button></div></div></div></div></div></div>`)}
    ${section('wayfinding', 'Wayfinding rules', `<ul><li>Every primary surface gets a persistent visible entry; a command palette is a shortcut, not the only route.</li><li>Personal actions live under the person or account, not tenant administration.</li><li>Use one canonical start surface per persona.</li><li>Collapse to an icon rail only when icons have clear accessible names and a discoverable expansion path.</li></ul>`)}
    ${section('responsive', 'Responsive behavior', `<p>On narrow screens the sidebar becomes a modal navigation drawer, the top bar preserves the current context, and the working canvas owns the viewport. Do not shrink a desktop rail until labels become unreadable.</p>`)}`,

  'data-workflows': () => `${pageHeader('Patterns', 'Data workflows', 'UIx connects filtering, saved views, row pinning, record peek, operational pipelines, and analytical feedback into one predictable loop for high-volume operators.', ['filter → inspect → act', 'pipeline visibility', 'recoverable states'])}
    ${section('model', 'The working loop', `<ol class="uix-docs__steps"><li><h3>Shape the queue</h3><p>Search and filters change the real query; active criteria remain visible and removable.</p></li><li><h3>Preserve a useful view</h3><p>Saved views capture query and presentation preferences with a clear scope.</p></li><li><h3>Inspect without losing place</h3><p>Peek opens a record preview while keeping the queue, scroll position, and selection intact.</p></li><li><h3>Act with feedback</h3><p>Mutations confirm the outcome, update the row, and expose partial failures.</p></li></ol>`)}
    ${section('pin-peek-favorite', 'Pin, peek, and favorite are different', `<table class="uix-docs__token-table"><thead><tr><th>Pattern</th><th>Meaning</th><th>Scope</th></tr></thead><tbody><tr><td>Pin</td><td>Keep a record visible above sort or filter results.</td><td>Table + saved view</td></tr><tr><td>Peek</td><td>Inspect a record without navigating away.</td><td>Current list context</td></tr><tr><td>Favorite</td><td>Promote a destination into persistent navigation.</td><td>User navigation</td></tr></tbody></table>`)}
    ${section('states', 'Every branch has a next action', `<p>Loading, empty, filtered-empty, error, forbidden, and end-of-results are different states. Each one should explain what happened and provide the most likely recovery action.</p>${callout('Empty is not one state', '“No records exist” may lead to Create. “No matches” should lead to Clear filters. “No access” should lead to Request access or Return. The control must match the actual branch.')}`)}
    ${section('operational-feedback', 'Make progress and evidence reusable', `<p>Use <a href="#pipeline">Pipeline</a> for ordered stage progress, <a href="#flow">Flow</a> for branching process structure, and <a href="#chart">Chart</a> for outcome, throughput, residence-time, and health evidence. These primitives keep presentation consistent while Mission Control owns telemetry, workflow rules, permissions, and actions.</p>`)}
    ${section('journey-budget', 'Set a journey budget', `<p>For a frequent queue workflow, define an observable budget: for example, reach the assigned queue in one navigation action, inspect a record in one more, and complete the common transition without leaving the keyboard. Measure the real journey—not only component render speed.</p>`)}`,
};

export const getPage = (slug) => (
  PAGES[slug]
  || COMPONENT_ITEMS.some((item) => item.slug === slug)
  || SHOWCASE_PAGES.some((page) => page.slug === slug)
) ? slug : 'introduction';

const renderNav = (activeSlug) => {
  const host = document.querySelector('[data-uix-docs-nav]');
  if (!host) return;
  const groups = [];
  for (const item of [...NAV_ITEMS, ...CATALOG_SEARCH_ITEMS]) {
    let group = groups.find((entry) => entry.name === item.group);
    if (!group) { group = { name: item.group, items: [] }; groups.push(group); }
    group.items.push(item);
  }
  host.innerHTML = groups.map((group) => `<div class="uix-docs__navgroup"><p class="uix-docs__navgroup-title">${esc(group.name)}</p>${group.items.map((item) => `<a class="uix-docs__navlink" href="#${item.slug}"${item.slug === activeSlug ? ' aria-current="page"' : ''}>${esc(item.name)}${item.badge ? `<span class="uix-docs__navlink-badge">${esc(item.badge)}</span>` : ''}</a>`).join('')}</div>`).join('');
};

const renderToc = () => {
  const host = document.querySelector('[data-docs-toc]');
  const headings = [...document.querySelectorAll('[data-docs-page] .uix-docs__page-section > h2')];
  if (!host) return;
  host.innerHTML = headings.map((heading) => `<a href="#${esc(heading.parentElement.id)}" data-toc-link>${esc(heading.textContent)}</a>`).join('');
};

const renderPager = (slug) => {
  const index = NAV_ITEMS.findIndex((item) => item.slug === slug);
  if (index < 0) {
    const isExample = SHOWCASE_PAGES.some((page) => page.slug === slug);
    const target = isExample ? ['examples', 'Example gallery'] : ['all-components', 'All components'];
    return `<nav class="uix-docs__pager" aria-label="Documentation pages"><a href="#${target[0]}"><span>Back to index</span><strong>← ${target[1]}</strong></a><span></span></nav>`;
  }
  const previous = index > 0 ? NAV_ITEMS[index - 1] : null;
  const next = index < NAV_ITEMS.length - 1 ? NAV_ITEMS[index + 1] : null;
  return `<nav class="uix-docs__pager" aria-label="Documentation pages">${previous ? `<a href="#${previous.slug}"><span>Previous</span><strong>← ${esc(previous.name)}</strong></a>` : '<span></span>'}${next ? `<a href="#${next.slug}"><span>Next</span><strong>${esc(next.name)} →</strong></a>` : ''}</nav>`;
};

const renderPage = () => {
  codeCounter = 0;
  const requested = normalizeHash(location.hash);
  const slug = getPage(requested);
  const host = document.querySelector('[data-docs-page]');
  if (!host) return;
  const component = COMPONENT_ITEMS.find((item) => item.slug === slug);
  const example = SHOWCASE_PAGES.find((item) => item.slug === slug);
  const content = PAGES[slug]
    ? PAGES[slug]()
    : component
      ? renderComponentReference(component)
      : renderShowcasePage(example);
  disposeShowcase();
  host.innerHTML = `${content}${component && !content.includes('data-component-preview=') ? componentPreview(component) : ''}${renderPager(slug)}`;
  if (component) mountComponentPreview(component, host.querySelector('[data-component-preview]'));
  renderNav(slug);
  renderToc();
  const source = example?.source || host.querySelector('[data-component-preview]')?.dataset.showcaseSource;
  if (source === 'core' || source === 'workspace') initShowcase({ manageTheme: false });
  if (source === 'advanced') initAdvancedShowcase();
  initFormSpecimens(host);
  const item = NAV_ITEMS.find((entry) => entry.slug === slug) || component || example;
  document.title = `${item?.name || item?.title || 'UIx'} · UIx Docs`;
  if (requested !== slug) history.replaceState(null, '', `#${slug}`);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'auto' });
};

let toastTimer;
const showToast = (message) => {
  const toast = document.querySelector('[data-docs-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
};

const copyCode = async (button) => {
  const target = document.getElementById(button.dataset.copyTarget);
  if (!target) return;
  try {
    await navigator.clipboard.writeText(target.textContent);
    button.textContent = 'Copied';
    showToast('Code copied to clipboard');
    setTimeout(() => { button.textContent = 'Copy'; }, 1500);
  } catch (error) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    showToast('Code selected — press Ctrl/Cmd+C');
  }
};

const switchDemoTab = (button) => {
  const root = button.closest('[data-demo]');
  if (!root) return;
  const mode = button.dataset.demoTab;
  root.querySelectorAll('[data-demo-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab === button)));
  root.querySelector('.uix-docs__demo-stage').hidden = mode !== 'preview';
  root.querySelector('.uix-docs__demo-code').hidden = mode !== 'code';
};

const selectDocsTab = (tab, focus = false) => {
  const root = tab.closest('[data-docs-tabs]');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  tabs.forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(candidate.getAttribute('aria-controls'));
    if (panel) panel.hidden = !selected;
  });
  if (focus) tab.focus();
};

const openMobileMenu = () => {
  const trigger = document.querySelector('[data-docs-menu]');
  const backdrop = document.querySelector('[data-docs-backdrop]');
  document.body.setAttribute('data-docs-menu-open', '');
  trigger?.setAttribute('aria-expanded', 'true');
  if (backdrop) backdrop.hidden = false;
  document.querySelector('[data-docs-menu-close]')?.focus();
};

function closeMobileMenu() {
  const wasOpen = document.body.hasAttribute('data-docs-menu-open');
  const trigger = document.querySelector('[data-docs-menu]');
  const backdrop = document.querySelector('[data-docs-backdrop]');
  document.body.removeAttribute('data-docs-menu-open');
  trigger?.setAttribute('aria-expanded', 'false');
  if (backdrop) backdrop.hidden = true;
  return wasOpen;
}

let activeSearchIndex = 0;
let currentSearchResults = [];

const paintSearchResults = (query = '') => {
  const host = document.querySelector('[data-docs-search-results]');
  if (!host) return;
  currentSearchResults = matchDocs(SEARCH_INDEX, query);
  activeSearchIndex = Math.min(activeSearchIndex, Math.max(0, currentSearchResults.length - 1));
  if (!currentSearchResults.length) {
    host.innerHTML = `<div class="uix-docs__search-empty"><div><strong>No results for “${esc(query)}”</strong><br><span>Try a component name, token, or guide.</span></div></div>`;
    return;
  }
  host.innerHTML = currentSearchResults.map((item, index) => `<button class="uix-docs__search-result" type="button" role="option" aria-selected="${index === activeSearchIndex}" data-search-result="${index}"><span class="uix-docs__search-result-icon">${item.kind === 'Catalog' ? 'UI' : '→'}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.summary)}</small></span><small>${esc(item.kind || item.group)}</small></button>`).join('');
  host.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
};

const openSearch = () => {
  const dialog = document.querySelector('[data-docs-search]');
  if (!dialog) return;
  activeSearchIndex = 0;
  paintSearchResults('');
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => document.querySelector('[data-docs-search-input]')?.focus());
};

const openSearchResult = (index) => {
  const item = currentSearchResults[index];
  if (!item) return;
  document.querySelector('[data-docs-search]')?.close();
  location.hash = item.slug;
};

const toggleTheme = () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('uix-theme', next); } catch (error) {}
  document.querySelector('[data-uix-theme-toggle]')?.setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target;
    const copy = target.closest('[data-copy-target]');
    const demoTab = target.closest('[data-demo-tab]');
    const docsTab = target.closest('[data-docs-tabs] [role="tab"]');
    const searchResult = target.closest('[data-search-result]');
    if (copy) copyCode(copy);
    else if (demoTab) switchDemoTab(demoTab);
    else if (docsTab) selectDocsTab(docsTab);
    else if (searchResult) openSearchResult(Number(searchResult.dataset.searchResult));
    else if (target.closest('[data-docs-search-open]')) openSearch();
    else if (target.closest('[data-uix-theme-toggle]')) toggleTheme();
    else if (target.closest('[data-docs-menu]')) openMobileMenu();
    else if (target.closest('[data-docs-menu-close], [data-docs-backdrop]')) {
      const wasOpen = closeMobileMenu();
      if (wasOpen) document.querySelector('[data-docs-menu]')?.focus();
    } else if (target.closest('[data-demo-action]')) showToast(target.closest('[data-demo-action]').dataset.demoAction);
    else if (target.closest('[data-toc-link]')) {
      event.preventDefault();
      document.getElementById(target.closest('[data-toc-link]').hash.slice(1))?.scrollIntoView();
    }
  });

  document.addEventListener('keydown', (event) => {
    const searchDialog = document.querySelector('[data-docs-search]');
    const searchInput = document.querySelector('[data-docs-search-input]');
    const docsTab = event.target.closest?.('[data-docs-tabs] [role="tab"]');
    if (docsTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const tabs = [...docsTab.closest('[data-docs-tabs]').querySelectorAll('[role="tab"]')];
      let index = tabs.indexOf(docsTab);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectDocsTab(tabs[index], true);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); return; }
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); openSearch(); return; }
    if (searchDialog?.open && document.activeElement === searchInput) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentSearchResults.length) {
          activeSearchIndex = (activeSearchIndex + (event.key === 'ArrowDown' ? 1 : -1) + currentSearchResults.length) % currentSearchResults.length;
          paintSearchResults(searchInput.value);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openSearchResult(activeSearchIndex);
      }
    }
    if (event.key === 'Escape' && closeMobileMenu()) document.querySelector('[data-docs-menu]')?.focus();
  });

  document.querySelector('[data-docs-search-input]')?.addEventListener('input', (event) => {
    activeSearchIndex = 0;
    paintSearchResults(event.target.value);
  });

  document.querySelector('[data-docs-search]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });

  window.addEventListener('hashchange', renderPage);
  renderPage();
}
