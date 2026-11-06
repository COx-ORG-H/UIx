"use client";

import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, RefObject } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { DEFAULT_FILE_KIND_LABELS, FILE_KINDS, fileKind, fileMatchesAccept } from '../file-model.js';
import type { FileKind, FileKindLabels } from '../file-model.js';
import { UploadIcon } from '../icons/components.js';
import { useUixLabels } from '../labels-context.js';

/** The words of a `FileDrop`, German by default. */
export interface FileDropLabels {
  /** The resting sentence. `{choose}` is where the choose button sits. */
  prompt: string;
  /** The choose button's visible word. */
  choose: string;
  /** The choose button's full name (it contains `choose`, WCAG 2.5.3). */
  chooseLabel: string;
  /** One file being dragged. */
  fileOne: string;
  /** `{count}` files being dragged. */
  fileMany: string;
  /** While dragging, with known kinds. `{files}`: `fileOne`/`fileMany`; `{kinds}`: the kind names. */
  dragSummary: string;
  /** While dragging, when the browser says nothing about the files. */
  dragRelease: string;
}

export const DEFAULT_FILE_DROP_LABELS: FileDropLabels = {
  prompt: 'Dateien ablegen oder {choose}',
  choose: 'auswählen',
  chooseLabel: 'Dateien auswählen',
  fileOne: '1 Datei',
  fileMany: '{count} Dateien',
  dragSummary: '{files}: {kinds}',
  dragRelease: 'Loslassen zum Hochladen',
};

/** The English words, for `labels` or `UixLabelsProvider` (`fileDrop`). */
export const FILE_DROP_LABELS_EN: FileDropLabels = {
  prompt: 'Drop files or {choose}',
  choose: 'choose',
  chooseLabel: 'Choose files',
  fileOne: '1 file',
  fileMany: '{count} files',
  dragSummary: '{files}: {kinds}',
  dragRelease: 'Release to upload',
};

export interface FileDropProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onDrop'> {
  /** The chosen or dropped files that match `accept`. */
  onFiles: (files: File[]) => void;
  /** Dropped files that do not match `accept` (the chooser never offers them). */
  onReject?: (files: File[]) => void;
  /** Accepted types, as for `<input accept>`. */
  accept?: string;
  /** Default `true`. With `false`, the first file only. */
  multiple?: boolean;
  disabled?: boolean;
  /**
   * A larger element that takes the drop as well, such as the whole attachments panel. The row
   * still shows what is being dragged.
   */
  targetRef?: RefObject<HTMLElement | null>;
  labels?: Partial<FileDropLabels>;
  kindLabels?: Partial<FileKindLabels>;
}

/** The kinds being dragged, from the MIME types a drag exposes before the drop. */
function draggedKinds(data: DataTransfer | null): { count: number; kinds: FileKind[] } {
  if (!data) return { count: 0, kinds: [] };
  const seen = new Set<FileKind>();
  let count = 0;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== 'file') continue;
    count += 1;
    seen.add(fileKind('', item.type));
  }
  return { count, kinds: FILE_KINDS.filter((k) => seen.has(k)) };
}

const carriesFiles = (data: DataTransfer | null) => !!data && Array.from(data.types ?? []).includes('Files');

/** One radial tint per kind, around the pointer (`--file-drop-x`, `--file-drop-y`). */
function auraFor(kinds: readonly FileKind[]): string {
  const list = kinds.length ? kinds : (['other'] as const);
  const n = list.length;
  const r = 46;
  return list.map((k, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const dx = n > 1 ? Math.round(Math.cos(a) * r) : 0;
    const dy = n > 1 ? Math.round(Math.sin(a) * r) : 0;
    return `radial-gradient(circle at calc(var(--file-drop-x, 50%) + ${dx}px) calc(var(--file-drop-y, 50%) + ${dy}px), color-mix(in srgb, var(--uix-file-${k}) 30%, transparent), transparent 62%)`;
  }).join(', ');
}

/**
 * A one-line drop row (file kit 2.57, the slim `FileDrop`): "Dateien ablegen oder auswählen",
 * backed by a real file input. While files are dragged over it, before the drop, it names what
 * they are from their MIME types ("2 Dateien: Bild, Protokoll") and tints itself from the
 * pointer outwards, one kind colour per kind. The choose button is the keyboard path.
 */
export function FileDrop({
  onFiles, onReject, accept, multiple = true, disabled = false, targetRef, labels: labelsProp, kindLabels: kindLabelsProp,
  className, ...props
}: FileDropProps) {
  const provided = useUixLabels();
  const labels: FileDropLabels = { ...DEFAULT_FILE_DROP_LABELS, ...provided.fileDrop, ...labelsProp };
  const kindLabels: FileKindLabels = { ...DEFAULT_FILE_KIND_LABELS, ...provided.fileKinds, ...kindLabelsProp };
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState<{ count: number; kinds: FileKind[] } | null>(null);

  // Read through refs inside the native listeners, so they are attached once per target.
  const take = useRef<(list: FileList | null) => void>(() => {});
  take.current = (list) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const picked = multiple ? files : files.slice(0, 1);
    const accepted = picked.filter((f) => fileMatchesAccept(f, accept));
    const rejected = picked.filter((f) => !fileMatchesAccept(f, accept));
    if (accepted.length) onFiles(accepted);
    if (rejected.length) onReject?.(rejected);
  };

  useEffect(() => {
    const target = targetRef?.current ?? rootRef.current;
    if (!target || disabled) return undefined;
    let depth = 0;
    const point = (event: DragEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const box = root.getBoundingClientRect();
      root.style.setProperty('--file-drop-x', `${Math.round(event.clientX - box.left)}px`);
      root.style.setProperty('--file-drop-y', `${Math.round(event.clientY - box.top)}px`);
    };
    const enter = (event: DragEvent) => {
      if (!carriesFiles(event.dataTransfer)) return;
      event.preventDefault();
      depth += 1;
      if (depth === 1) setDrag(draggedKinds(event.dataTransfer));
      point(event);
    };
    const over = (event: DragEvent) => {
      if (!carriesFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      point(event);
    };
    const leave = () => {
      if (depth === 0) return;
      depth -= 1;
      if (depth === 0) setDrag(null);
    };
    const drop = (event: DragEvent) => {
      if (!carriesFiles(event.dataTransfer)) return;
      event.preventDefault();
      depth = 0;
      setDrag(null);
      take.current(event.dataTransfer?.files ?? null);
    };
    target.addEventListener('dragenter', enter);
    target.addEventListener('dragover', over);
    target.addEventListener('dragleave', leave);
    target.addEventListener('drop', drop);
    return () => {
      target.removeEventListener('dragenter', enter);
      target.removeEventListener('dragover', over);
      target.removeEventListener('dragleave', leave);
      target.removeEventListener('drop', drop);
      setDrag(null);
    };
  }, [targetRef, disabled]);

  const [before, after = ''] = labels.prompt.split('{choose}');
  let summary: string | null = null;
  if (drag) {
    const files = drag.count === 1 ? labels.fileOne : fillLabel(labels.fileMany, { count: drag.count });
    const named = drag.kinds.filter((k) => k !== 'other' || drag.kinds.length > 1);
    summary = drag.count === 0 ? labels.dragRelease
      : named.length ? fillLabel(labels.dragSummary, { files, kinds: named.map((k) => kindLabels[k]).join(', ') })
        : files;
  }

  return (
    <div
      ref={rootRef}
      className={cx('uix-file-drop', className)}
      data-dragging={drag ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-file-kind={drag ? (drag.kinds[0] ?? 'other') : undefined}
      onClick={(event) => {
        if (disabled || (event.target as Element).closest('button, a, input')) return;
        inputRef.current?.click();
      }}
      {...props}
    >
      <span className="uix-file-drop__aura" aria-hidden="true" style={drag ? { backgroundImage: auraFor(drag.kinds) } : undefined} />
      <UploadIcon size="sm" className="uix-file-drop__icon" />
      {/* Both lines stay mounted in one grid cell and cross-fade: the drag summary is for the
          pointer that holds the files, and the sentence (with the focusable button) never leaves
          the accessibility tree, so focus and context never change under a screen reader. */}
      <span className="uix-file-drop__line">
        <span className="uix-file-drop__text">
          {before}
          <button type="button" className="uix-file-drop__choose" aria-label={labels.chooseLabel} disabled={disabled} onClick={() => inputRef.current?.click()}>
            {labels.choose}
          </button>
          {after}
        </span>
        <span className="uix-file-drop__summary" aria-hidden="true">{summary}</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        className="uix-visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => { take.current(event.currentTarget.files); event.currentTarget.value = ''; }}
      />
    </div>
  );
}
