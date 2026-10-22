/* Live harness for the annotating Lightbox (HAR-1826; TENSOR C12 capture viewer), bundled by
 * build.mjs from source for tests/a11y/lightbox-annotate.spec.mjs.
 * One screenshot (an inline 1200 × 800 SVG, so the harness stays offline) in a viewer with
 * "Bereich ausblenden" (opens a draft rectangle the arrow keys move) and "Rückgängig" in the
 * toolbar, and the hidden areas drawn in the overlay. Escape cancels an open draft and closes
 * the viewer only when none is open. Pointer: drag on the overlay draws a new area.
 * window.__lightbox records closes and the overlay size the viewer reported. */
import { StrictMode, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Lightbox, UixLabelsProvider } from '../../packages/react/src/index.js';

type Rect = { x: number; y: number; w: number; h: number };
declare global { interface Window { __lightbox: { closes: number; overlay: { width: number; height: number } | null; natural: { width: number; height: number } | null } } }

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e8edf5"/><rect x="60" y="60" width="1080" height="80" rx="12" fill="#2d4f8a"/><text x="100" y="114" font-family="sans-serif" font-size="36" fill="#fff">Ticket INC-20418 · Drucker im 3. OG</text><rect x="60" y="180" width="520" height="560" rx="12" fill="#fff"/><rect x="620" y="180" width="520" height="560" rx="12" fill="#fff"/><text x="100" y="240" font-family="sans-serif" font-size="28" fill="#333">Kundin: Jasmina Hadžić</text><text x="100" y="290" font-family="sans-serif" font-size="28" fill="#333">Telefon: +387 33 555 0199</text></svg>`;
const SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVG)}`;
const items = [{ src: SRC, alt: 'Bildschirmfoto des Ticketformulars', width: 1200, height: 800 }];

function Harness() {
  const [open, setOpen] = useState(false);
  const [areas, setAreas] = useState<Rect[]>([{ x: 0.08, y: 0.27, w: 0.36, h: 0.1 }]);
  const [draft, setDraft] = useState<Rect | null>(null);
  const focusDraft = useRef(false);
  const drawing = useRef<{ x: number; y: number; box: DOMRect } | null>(null);
  const percent = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
  const point = (event: ReactPointerEvent<HTMLDivElement>, box: DOMRect) => ({
    x: Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1),
    y: Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1),
  });
  return (
    <>
      <h1>Erfassung</h1>
      <Button id="open" onClick={() => setOpen(true)}>Bildschirmfoto ansehen</Button>
      <UixLabelsProvider labels={{ lightbox: { close: 'Schließen', zoomIn: 'Originalgröße', zoomOut: 'Einpassen' } }}>
        <Lightbox
          items={items}
          index={0}
          onIndexChange={() => {}}
          open={open}
          onClose={() => { window.__lightbox.closes += 1; setDraft(null); setOpen(false); }}
          actions={(
            <>
              <Button id="hide" variant="secondary" disabled={draft != null} onClick={() => { focusDraft.current = true; setDraft({ x: 0.55, y: 0.3, w: 0.2, h: 0.12 }); }}>Bereich ausblenden</Button>
              {draft && <Button id="apply" variant="primary" onClick={() => { setAreas((a) => [...a, draft]); setDraft(null); }}>Übernehmen</Button>}
              <Button id="undo" variant="secondary" disabled={areas.length === 0} onClick={() => setAreas((a) => a.slice(0, -1))}>Rückgängig</Button>
            </>
          )}
          onKeyDown={(event) => {
            if (!draft) return;
            const step = event.shiftKey ? 0.05 : 0.01;
            const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (event.key === 'Escape') { event.preventDefault(); setDraft(null); setTimeout(() => document.getElementById('hide')?.focus()); }
            else if (move[event.key]) {
              event.preventDefault();
              const [dx, dy] = move[event.key];
              setDraft({ ...draft, x: Math.min(Math.max(draft.x + dx, 0), 1 - draft.w), y: Math.min(Math.max(draft.y + dy, 0), 1 - draft.h) });
            }
          }}
          renderOverlay={({ width, height, media }) => {
            window.__lightbox.overlay = { width, height };
            window.__lightbox.natural = media && 'naturalWidth' in media ? { width: media.naturalWidth, height: media.naturalHeight } : null;
            return (
              <div
                className="harness-draw"
                style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
                onPointerDown={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const p = point(event, box);
                  drawing.current = { ...p, box };
                  setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
                }}
                onPointerMove={(event) => {
                  const start = drawing.current;
                  if (!start) return;
                  const p = point(event, start.box);
                  setDraft({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
                }}
                onPointerUp={() => { drawing.current = null; }}
              >
                {areas.map((area, i) => <div key={i} className="harness-area" style={{ position: 'absolute', ...percent(area), background: 'black' }} />)}
                {/* The draft takes focus, so the arrow keys it claims are visibly its own. */}
                {draft && (
                  <div
                    className="harness-draft"
                    role="img"
                    aria-label="Neuer Bereich: Pfeiltasten verschieben, Escape bricht ab"
                    tabIndex={0}
                    ref={(el) => { if (el && focusDraft.current) { focusDraft.current = false; el.focus({ preventScroll: true }); } }}
                    style={{ position: 'absolute', ...percent(draft), outline: '2px dashed var(--uix-accent)', background: 'color-mix(in srgb, black 40%, transparent)' }}
                  />
                )}
              </div>
            );
          }}
        />
      </UixLabelsProvider>
    </>
  );
}

window.__lightbox = { closes: 0, overlay: null, natural: null };
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
