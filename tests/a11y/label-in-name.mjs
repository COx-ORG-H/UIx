/* Label in name (WCAG 2.5.3, level A): a control's accessible name contains the text it shows.
 *
 * Voice-control users (Dragon, Windows Voice Access, Voice Control) say what they see: "click
 * Assign". If the name is "Reassign ticket" or "Owner", the command finds nothing.
 *
 * axe ships this check as `label-content-name-mismatch`, but marks it experimental and it is too
 * noisy to gate on here: it joins the text of block children without a space ("Hold" + "Quarter
 * close" reads "holdquarter close"), and it counts every word inside a rich item (the reports
 * of an org-chart person, the help line of a search option) as label. This check keeps axe's
 * scope and changes what counts as the visible label:
 *
 *   - only controls whose name the author wrote (aria-label or aria-labelledby) are checked; a
 *     name computed from the content contains it by construction;
 *   - the visible label is the control's rendered text with a space at every element edge,
 *     WITHOUT text that is visually hidden (a screen-reader-only clip), text inside an element
 *     the control's aria-describedby points at (that text is its description, read after the
 *     name), text of a nested control or item (a treeitem's children, a button inside a card),
 *     and aria-hidden decoration (avatar initials, glyph text);
 *   - both strings are compared as words: lower case, punctuation and symbols removed, so
 *     "Hold, Quarter close" contains "Hold Quarter close".
 *
 * The fix is never to hide visible text from this check. Put the visible words in the name, in
 * the order they are shown, or move secondary text into the description (aria-describedby).
 *
 * `labelInNameViolations` runs in the page (page.evaluate(labelInNameViolations, rootSelector)).
 */
export function labelInNameViolations(rootSelector) {
  const root = document.querySelector(rootSelector) ?? document.body;
  const CONTROL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="treeitem"], [role="checkbox"], [role="radio"], [role="switch"], [role="gridcell"], [role="row"]';
  const NESTED = `${CONTROL}, [role="group"], [role="tree"], [role="listbox"], [role="menu"], [role="grid"]`;
  const words = (s) => s.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const visuallyHidden = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return true;
    if (s.position === 'absolute' || s.position === 'fixed') {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return true;
      if (/rect\(0(px)?,? ?0(px)?,? ?0(px)?,? ?0(px)?\)/.test(s.clip) || s.clipPath === 'inset(50%)') return true;
    }
    return false;
  };
  const idsOf = (el, attr) => (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
  const textById = (id) => document.getElementById(id);

  const visibleLabel = (control) => {
    const skip = new Set(idsOf(control, 'aria-describedby').map(textById).filter(Boolean));
    let out = '';
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) { out += child.textContent; continue; }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        if (skip.has(child) || child.getAttribute('aria-hidden') === 'true') continue;
        if (child.matches('svg, img, input, select, textarea, script, style, template')) continue;
        if (child.matches(NESTED)) continue;
        if (visuallyHidden(child)) continue;
        out += ' '; walk(child); out += ' ';
      }
    };
    walk(control);
    return out;
  };

  const nameOf = (el) => {
    const ids = idsOf(el, 'aria-labelledby');
    if (ids.length) return ids.map((id) => textById(id)?.textContent ?? '').join(' ');
    return el.getAttribute('aria-label') ?? '';
  };

  // A field's text is its value, not its label: its label is the <label> that names it.
  const FIELD = 'input, select, textarea, [role="combobox"], [role="textbox"], [role="searchbox"], [role="spinbutton"], [role="slider"]';
  const fieldLabel = (el) => {
    const labels = [...(el.labels ?? [])];
    if (!labels.length && el.id) labels.push(...document.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`));
    return labels.filter((l) => !visuallyHidden(l)).map(visibleLabel).join(' ');
  };

  const found = [];
  for (const el of root.querySelectorAll(CONTROL)) {
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) continue;
    if (el.closest('[aria-hidden="true"], [inert]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || visuallyHidden(el)) continue;
    const label = words(el.matches(FIELD) ? fieldLabel(el) : visibleLabel(el));
    // nothing to say: an icon-only control, or a single character (×, ⋯, a stepper's +)
    if (label.replace(/\s/g, '').length < 2) continue;
    const name = words(nameOf(el));
    if (` ${name} `.includes(` ${label} `)) continue;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
    found.push({ control: `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}`, label, name });
  }
  return found;
}
