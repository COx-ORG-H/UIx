/**
 * Scrolls `list` the least it must so `row` is in view, clear of the list's `scroll-padding`
 * (internal). The scroll edges (scroll-edge.css) fade a list's top and bottom rim while rows
 * are under it and set `scroll-padding-block` to the fade's size, so a row the arrow keys reach
 * stops beside the fade instead of half inside it. `row` is positioned against `list` (the list is
 * its offsetParent). Without scroll padding this is the plain nearest-edge scroll.
 */
export function keepRowInView(list: HTMLElement, row: HTMLElement): void {
  const style = list.ownerDocument.defaultView?.getComputedStyle(list);
  const padTop = parseFloat(style?.scrollPaddingTop ?? '') || 0;
  const padBottom = parseFloat(style?.scrollPaddingBottom ?? '') || 0;
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top - padTop < list.scrollTop) list.scrollTop = Math.max(0, top - padTop);
  else if (bottom + padBottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom + padBottom - list.clientHeight;
}
