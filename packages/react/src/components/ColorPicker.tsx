"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { contrastRatio, hexToRgb, hsvToHex, normalizeHex, rgbToHsv } from '../color-model.js';

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  foreground: string;
  presets?: string[];
  recent?: string[];
  minimumContrast?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const EMPTY_COLORS: string[] = [];

/** Token-friendly HSV/hex picker with a fully keyboard-operable path and contrast feedback. */
export function ColorPicker({
  value, onChange, foreground, presets = EMPTY_COLORS, recent = EMPTY_COLORS, minimumContrast = 4.5,
  label = 'Choose color', disabled, className,
}: ColorPickerProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const normalized = normalizeHex(value) ?? '#000000';
  const [hexText, setHexText] = useState(normalized);
  const hsv = useMemo(() => rgbToHsv(hexToRgb(normalized)!), [normalized]);
  const ratio = contrastRatio(normalized, foreground) ?? 0;
  const passes = ratio >= minimumContrast;

  useEffect(() => setHexText(normalized), [normalized]);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('input,button')?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!dialog?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex="0"]') ?? []);
    if (!focusable.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const updateHsv = (part: Partial<typeof hsv>) => onChange(hsvToHex({ ...hsv, ...part }));
  const commitHex = () => {
    const next = normalizeHex(hexText);
    if (next) onChange(next);
  };
  const choose = (candidate: string) => {
    const next = normalizeHex(candidate);
    if (next) onChange(next);
  };
  const sampleStyle = { backgroundColor: normalized } as CSSProperties;

  return (
    <div className={cx('uix-color-picker', className)}>
      <button
        ref={triggerRef} type="button" className="uix-color-picker__trigger"
        aria-label={`${label}: ${normalized}`} aria-expanded={open} aria-controls={`${id}-dialog`}
        onClick={() => setOpen((current) => !current)} disabled={disabled}
      >
        <span className="uix-color-picker__swatch" style={sampleStyle} aria-hidden="true" />
        <span>{normalized}</span>
      </button>
      {open && <div
        ref={dialogRef} id={`${id}-dialog`} role="dialog" aria-modal="true" aria-label={label}
        className="uix-color-picker__popover" onKeyDown={onDialogKeyDown}
      >
        <div className="uix-color-picker__preview" style={sampleStyle}>
          <span style={{ color: foreground }}>Aa</span>
        </div>
        <label className="uix-color-picker__range">Hue <span>{Math.round(hsv.h)}°</span>
          <input type="range" min="0" max="359" value={Math.round(hsv.h)} onChange={(event) => updateHsv({ h: Number(event.currentTarget.value) })} />
        </label>
        <label className="uix-color-picker__range">Saturation <span>{Math.round(hsv.s * 100)}%</span>
          <input type="range" min="0" max="100" value={Math.round(hsv.s * 100)} onChange={(event) => updateHsv({ s: Number(event.currentTarget.value) / 100 })} />
        </label>
        <label className="uix-color-picker__range">Brightness <span>{Math.round(hsv.v * 100)}%</span>
          <input type="range" min="0" max="100" value={Math.round(hsv.v * 100)} onChange={(event) => updateHsv({ v: Number(event.currentTarget.value) / 100 })} />
        </label>
        <label className="uix-color-picker__hex">Hex
          <span className="uix-color-picker__hex-row">
            <input className="uix-input" value={hexText} onChange={(event) => setHexText(event.currentTarget.value)} onBlur={commitHex} onKeyDown={(event) => { if (event.key === 'Enter') commitHex(); }} aria-invalid={!normalizeHex(hexText)} />
            <button type="button" className="uix-btn uix-btn--secondary uix-btn--sm" onClick={commitHex} disabled={!normalizeHex(hexText)}>Set</button>
          </span>
        </label>
        {(presets.length > 0 || recent.length > 0) && <div className="uix-color-picker__palettes">
          {presets.length > 0 && <fieldset><legend>Presets</legend><div>{presets.map((color) => <button key={color} type="button" className="uix-color-picker__preset" style={{ backgroundColor: normalizeHex(color) ?? color }} onClick={() => choose(color)} aria-label={`Use preset ${color}`} />)}</div></fieldset>}
          {recent.length > 0 && <fieldset><legend>Recent</legend><div>{recent.map((color) => <button key={color} type="button" className="uix-color-picker__preset" style={{ backgroundColor: normalizeHex(color) ?? color }} onClick={() => choose(color)} aria-label={`Use recent color ${color}`} />)}</div></fieldset>}
        </div>}
        <p className={cx('uix-color-picker__contrast', passes ? 'uix-color-picker__contrast--pass' : 'uix-color-picker__contrast--fail')} role="status" aria-live="polite">
          Contrast {ratio.toFixed(2)}:1 — {passes ? `passes WCAG AA (${minimumContrast}:1)` : `does not meet WCAG AA (${minimumContrast}:1)`}
        </p>
        <button type="button" className="uix-btn uix-btn--primary uix-btn--sm" onClick={close}>Done</button>
      </div>}
    </div>
  );
}
