/* Live harness for the tag and chip remove "x" (HAR-1569), bundled by build.mjs from source for
 * tests/a11y/dismiss-control.spec.mjs.
 *   - #chips: <Chip onRemove> as a plain, a toggle (pressed: the tinted pill), a link and a
 *     disabled chip.
 *   - #tags: the CSS-only .uix-tag inside .uix-taginput, with XIcon as the docs specimen draws it,
 *     plus a tag without a remove button (it keeps its own trailing padding). */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chip, ChipGroup } from '../../packages/react/src/index.js';
import { XIcon } from '../../packages/react/src/icons.js';

function Chips() {
  const [mine, setMine] = useState(true);
  const [removed, setRemoved] = useState<string[]>([]);
  const remove = (name: string) => () => setRemoved((r) => [...r, name]);
  return (
    <section id="chips" aria-label="Chips">
      <ChipGroup label="Active filters">
        <Chip onRemove={remove('Open')} count={4}>Open</Chip>
        <Chip pressed={mine} onPressedChange={setMine} onRemove={remove('Mine')}>Mine</Chip>
        <Chip href="#linked" onRemove={remove('Linked')}>Linked</Chip>
        <Chip disabled onRemove={remove('Locked')}>Locked</Chip>
      </ChipGroup>
      <p role="status" data-removed>{removed.join(', ')}</p>
    </section>
  );
}

function Tags() {
  return (
    <section id="tags" aria-label="Tags">
      <div className="uix-taginput">
        <span className="uix-tag">network <button type="button" className="uix-tag__remove" aria-label="Remove network"><XIcon /></button></span>
        <span className="uix-tag">a much longer project label <button type="button" className="uix-tag__remove" aria-label="Remove a much longer project label"><XIcon /></button></span>
        <span className="uix-tag" data-static>read only</span>
        <input className="uix-taginput__field" aria-label="Add a label" placeholder="Add a label" />
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Chips />
    <Tags />
  </StrictMode>,
);
