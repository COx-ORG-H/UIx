/* The geometry check of the pseudo-locale lane, run in the page (page.evaluate(probeCase, name)).
 * Self-contained: Playwright serialises the function, so it may not close over anything.
 *
 * For one <section data-case>, three ways longer words break a layout:
 *   - beyond:  a visible box reaches past the case's own box (the component outgrew the width the
 *              product gave it), unless it sits in a scroll container (a table wrap scrolls on purpose);
 *   - clipped: an element that clips its overflow (overflow hidden/clip) cuts its own text, and shows no
 *              truncation affordance (text-overflow: ellipsis or a line clamp) — the words just stop;
 *   - spill:   text runs past the box of the block that holds it (a fixed-width button, a pill) while that
 *              block does not clip, so letters paint over the next control.
 * Returns the problems (empty when the case holds) and the case's size. */
export function probeCase(name) {
  const root = document.querySelector(`[data-case="${name}"]`);
  if (!root) return { missing: true, problems: [] };
  const box = root.getBoundingClientRect();
  const problems = [];
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls} "${text}"`;
  };
  const hidden = (el, s) => s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0
    || s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)' || el.closest('[hidden], .uix-visually-hidden');
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
    }
    return false;
  };
  const clips = (s) => /(hidden|clip)/.test(s.overflowX);
  const affordance = (s) => s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none');
  const blockOf = (el) => {
    for (let p = el; p && p !== root.parentElement; p = p.parentElement) {
      if (getComputedStyle(p).display !== 'inline') return p;
    }
    return root;
  };

  for (const el of root.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (hidden(el, s) || s.position === 'fixed' || el.closest('[popover], dialog')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    if ((r.left < box.left - 1 || r.right > box.right + 1) && !inScroller(el)) {
      problems.push({ kind: 'beyond', el: describe(el), by: Math.round(Math.max(box.left - r.left, r.right - box.right)) });
    }
    if (ownText && clips(s) && el.scrollWidth > el.clientWidth + 1 && !affordance(s)) {
      problems.push({ kind: 'clipped', el: describe(el), by: el.scrollWidth - el.clientWidth });
    }
    if (ownText && !inScroller(el)) {
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const tr = range.getBoundingClientRect();
        // the nearest box around the text that the text runs out of: any block ancestor, up to the case
        for (let holder = blockOf(el); holder && holder !== root.parentElement; holder = blockOf(holder.parentElement)) {
          const hs = getComputedStyle(holder);
          if (clips(hs)) break;
          const hr = holder.getBoundingClientRect();
          const by = Math.max(tr.right - hr.right, hr.left - tr.left);
          if (by > 1) { problems.push({ kind: 'spill', el: describe(el), by: Math.round(by), out: describe(holder) }); break; }
          if (holder === root) break;
        }
      }
    }
  }
  return { missing: false, width: Math.round(box.width), height: Math.round(box.height), problems };
}
