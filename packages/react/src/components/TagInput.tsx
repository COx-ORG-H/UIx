"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AriaAttributes, ClipboardEvent, KeyboardEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useAnchoredPosition, zoomOf } from '../hooks/useAnchoredPosition.js';
import { XIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';
import { foldForSearch } from '../search-suggest-model.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** Every word `TagInput` renders or announces. */
export interface TagInputLabels {
  /** Name of a chip's × button; `{tag}`. */
  remove: string;
  /** Announced after a tag was added; `{tag}`. */
  added: string;
  /** Announced after a tag was removed; `{tag}`. */
  removed: string;
  /** Shown when the tag is already there; `{tag}`. */
  duplicate: string;
  /** Shown when `maxTags` are there; `{max}`. */
  max: string;
  /** Name of the suggestion list. */
  suggestions: string;
}

export const DEFAULT_TAG_INPUT_LABELS: TagInputLabels = {
  remove: 'Remove {tag}',
  added: '{tag} added.',
  removed: '{tag} removed.',
  duplicate: '{tag} is already added.',
  max: 'You can add up to {max}.',
  suggestions: 'Suggestions',
};

export interface TagInputProps {
  /** The tags, in order. */
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  /** Offered while typing (those already added are left out); ArrowDown reaches them. */
  suggestions?: readonly string[];
  /**
   * Check a tag before it is added: return a message to refuse it (shown under the field), or
   * `null` to accept it. Runs after the duplicate and `maxTags` checks.
   */
  validate?: (tag: string, value: readonly string[]) => string | null | undefined;
  /** The most tags; past it, adding is refused with the `max` message. */
  maxTags?: number;
  /** Keys that add the typed text. Default Enter and comma. */
  separators?: readonly string[];
  /** Submits each tag as its own value under this name (hidden inputs). */
  name?: string;
  /** Lands on the text input, so a `<label htmlFor>` or `<Field>` names it. */
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-required'?: AriaAttributes['aria-required'];
  /** Translatable words; English defaults in {@link DEFAULT_TAG_INPUT_LABELS}. */
  labels?: Partial<TagInputLabels>;
  className?: string;
}

const same = (a: string, b: string) => foldForSearch(a).text === foldForSearch(b).text;

/**
 * Several short tags in one field (HAR-1377): type and press Enter (or a comma) to add a chip;
 * pasting "a, b, c" adds three. A duplicate (ignoring case and accents), a refusal from `validate`
 * or one past `maxTags` keeps the text and says why. Suggestions open under the field as a
 * top-layer list once the person types (or presses ArrowDown): ArrowDown / ArrowUp move, Enter adds
 * the active one, Escape closes it. Backspace in the empty field
 * goes to the last chip; ArrowLeft / ArrowRight move between chips and back to the field;
 * Backspace or Delete on a chip removes it. Each change is announced politely. Works in `Field`
 * (the text input gets the label, hint and error) and submits each tag under `name`.
 */
export function TagInput({
  value, onValueChange, suggestions, validate, maxTags, separators = ['Enter', ','], name, id: idProp, placeholder, disabled,
  invalid, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid, 'aria-required': ariaRequired, labels: labelOverrides, className,
}: TagInputProps) {
  const labels: TagInputLabels = { ...DEFAULT_TAG_INPUT_LABELS, ...useUixLabels().tagInput, ...labelOverrides };
  const uid = useId();
  const id = idProp ?? `${uid}-input`;
  const listId = `${uid}-suggestions`;
  const messageId = `${uid}-message`;
  const optionId = (index: number) => `${listId}-${index}`;
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusChip, setFocusChip] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    if (!suggestions?.length) return [];
    const needle = foldForSearch(text.trim()).text;
    return suggestions.filter((s) => !value.some((v) => same(v, s)) && (!needle || foldForSearch(s).text.includes(needle))).slice(0, 50);
  }, [suggestions, text, value]);
  const showing = open && matches.length > 0 && !disabled;

  /** Add one or more tags; returns whether the field may be emptied. */
  const add = (raw: readonly string[]): boolean => {
    let next = [...value];
    const added: string[] = [];
    for (const piece of raw) {
      const tag = piece.trim();
      if (!tag) continue;
      if (next.some((v) => same(v, tag))) { setMessage(fillLabel(labels.duplicate, { tag })); return false; }
      if (maxTags != null && next.length >= maxTags) { setMessage(fillLabel(labels.max, { max: maxTags })); return false; }
      const refusal = validate?.(tag, next);
      if (refusal) { setMessage(refusal); return false; }
      next = [...next, tag];
      added.push(tag);
    }
    if (!added.length) return true;
    setMessage(null);
    setOpen(false);
    setAnnouncement(fillLabel(labels.added, { tag: added.join(', ') }));
    onValueChange(next);
    return true;
  };

  const remove = (index: number) => {
    const tag = value[index];
    if (tag == null || disabled) return;
    onValueChange(value.filter((_, i) => i !== index));
    setMessage(null);
    setAnnouncement(fillLabel(labels.removed, { tag }));
    // Focus stays with the tags: the one before, else the field.
    setFocusChip(index > 0 ? index - 1 : null);
    if (index === 0) inputRef.current?.focus();
  };

  // A removed or newly reached chip takes focus once it is rendered.
  useEffect(() => {
    if (focusChip == null) return;
    const chip = chipRefs.current[focusChip];
    if (chip) chip.focus();
    else inputRef.current?.focus();
    setFocusChip(null);
  }, [focusChip, value]);

  const commitText = (extra: readonly string[] = []) => {
    if (add([text, ...extra])) { setText(''); setActive(-1); }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const { key } = event;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (!matches.length) return;
      event.preventDefault();
      if (!showing) { setOpen(true); setActive(key === 'ArrowDown' ? 0 : matches.length - 1); return; }
      setActive((i) => (i < 0 ? (key === 'ArrowDown' ? 0 : matches.length - 1) : Math.max(0, Math.min(matches.length - 1, i + (key === 'ArrowDown' ? 1 : -1)))));
      return;
    }
    if (key === 'Escape' && showing) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
      return;
    }
    if (separators.includes(key)) {
      if (key === 'Enter' && showing && active >= 0) {
        event.preventDefault();
        if (add([matches[active]!])) { setText(''); setActive(-1); }
        return;
      }
      // Enter in an empty field is left to the form.
      if (key === 'Enter' && !text.trim()) return;
      event.preventDefault();
      commitText();
      return;
    }
    const caretAtStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    if ((key === 'Backspace' && !text) || (key === 'ArrowLeft' && caretAtStart)) {
      if (!value.length) return;
      event.preventDefault();
      setOpen(false);
      chipRefs.current[value.length - 1]?.focus();
    }
  };

  const onChipKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const { key } = event;
    if (key === 'Backspace' || key === 'Delete') { event.preventDefault(); remove(index); return; }
    if (key === 'ArrowLeft') { event.preventDefault(); chipRefs.current[Math.max(0, index - 1)]?.focus(); return; }
    if (key === 'ArrowRight') {
      event.preventDefault();
      if (index < value.length - 1) chipRefs.current[index + 1]?.focus();
      else inputRef.current?.focus();
      return;
    }
    if (key === 'Escape') { event.preventDefault(); inputRef.current?.focus(); }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!/[,\n;]/.test(pasted)) return;
    event.preventDefault();
    const pieces = pasted.split(/[,\n;]+/);
    // The text already typed joins the first piece.
    if (add([`${text}${pieces[0] ?? ''}`, ...pieces.slice(1)])) setText('');
  };

  /* ---- the suggestion popup: the top layer, sized to the field, placed by useAnchoredPosition */
  useIsomorphicLayoutEffect(() => {
    const popup = popupRef.current;
    const box = boxRef.current;
    if (!popup || !box) return;
    const isOpen = () => { try { return popup.matches(':popover-open'); } catch { return false; } };
    if (showing) {
      const zoom = zoomOf(box);
      popup.style.minWidth = `${Math.round(box.getBoundingClientRect().width / zoom)}px`;
      try { if (!isOpen()) popup.showPopover(); } catch { /* no Popover API: `hidden` drives it */ }
    } else {
      try { if (isOpen()) popup.hidePopover(); } catch { /* no Popover API */ }
    }
  }, [showing]);
  useAnchoredPosition(boxRef, popupRef, { open: showing, placement: 'bottom-start', offset: 4, padding: 8 });
  useIsomorphicLayoutEffect(() => {
    if (!showing || active < 0) return;
    popupRef.current?.ownerDocument.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [showing, active]);

  const isInvalid = !!invalid || ariaInvalid === true || ariaInvalid === 'true';
  const describedBy = [ariaDescribedBy, message ? messageId : undefined].filter(Boolean).join(' ') || undefined;
  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const popoverAttr = { popover: 'manual' } as Record<string, string>;

  return (
    <div className={cx('uix-taginput-field', className)}>
      <div
        ref={boxRef}
        className="uix-taginput"
        data-invalid={isInvalid || undefined}
        data-disabled={disabled || undefined}
        // A press on the box (not on a chip) puts the caret in the field.
        onMouseDown={(event) => { if (event.target === event.currentTarget) { event.preventDefault(); inputRef.current?.focus(); } }}
        onBlur={(event) => { if (!boxRef.current?.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(-1); } }}
      >
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="uix-tag">
            {tag}
            {!disabled && (
              <button
                ref={(el) => { chipRefs.current[index] = el; }}
                type="button"
                className="uix-tag__remove"
                tabIndex={-1}
                aria-label={fillLabel(labels.remove, { tag })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => remove(index)}
                onKeyDown={(event) => onChipKeyDown(event, index)}
              >
                <XIcon />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          className="uix-taginput__field"
          type="text"
          role={suggestions ? 'combobox' : undefined}
          aria-autocomplete={suggestions ? 'list' : undefined}
          aria-expanded={suggestions ? showing : undefined}
          aria-controls={suggestions ? listId : undefined}
          aria-activedescendant={showing && active >= 0 ? optionId(active) : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={describedBy}
          aria-invalid={isInvalid || !!message || undefined}
          aria-required={ariaRequired}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="enter"
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            // a comma typed (or a separator pasted on a phone keyboard) adds what came before it
            if (separators.includes(',') && next.includes(',')) {
              const pieces = next.split(',');
              if (add([pieces[0]!])) setText(pieces.slice(1).join(',').trimStart()); else setText(next.replace(/,/g, ''));
              return;
            }
            setText(next);
            if (message) setMessage(null);
            // the list follows the text; an emptied field closes it (ArrowDown opens it again)
            setOpen(next.trim().length > 0);
            setActive(-1);
          }}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
        />
      </div>
      {name && value.map((tag, index) => <input key={`${tag}-${index}`} type="hidden" name={name} value={tag} disabled={disabled} />)}
      {message && <span id={messageId} className="uix-field__warning uix-taginput__message" role="status">{message}</span>}
      <span className="uix-visually-hidden" role="status" aria-live="polite">{announcement}</span>
      {suggestions && (
        <div ref={popupRef} className="uix-select__popup uix-taginput__popup" hidden={!showing} {...popoverAttr} onMouseDown={(event) => event.preventDefault()}>
          <div id={listId} role="listbox" aria-label={labels.suggestions} className="uix-listbox uix-select__listbox">
            {matches.map((suggestion, index) => (
              <div
                key={suggestion}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className="uix-listbox__option"
                data-active={index === active || undefined}
                onPointerMove={() => { if (index !== active) setActive(index); }}
                onClick={() => { if (add([suggestion])) { setText(''); setActive(-1); inputRef.current?.focus(); } }}
              >
                <span className="uix-listbox__label">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
