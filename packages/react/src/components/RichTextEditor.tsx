"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Extension, InputRule, mergeAttributes } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Markdown as MarkdownExtension } from '@tiptap/markdown';
import { Placeholder } from '@tiptap/extensions';
import { Image } from '@tiptap/extension-image';
import { Emoji } from '@tiptap/extension-emoji';
import type { EmojiItem } from '@tiptap/extension-emoji';
import { Suggestion } from '@tiptap/suggestion';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { cx } from '../cx.js';
import { computePosition } from '../overlay-position.js';
import { formatLabel } from '../emoji-model.js';
import { canRenderEmoji, emojiImageSrc, emojiPattern, normalizeEmojiImageBaseUrl } from '../emoji-image.js';
import { OFFLINE_EMOJI_ITEMS } from '../rich-text/emoji-items.js';
import { useEmojiRenderer } from './EmojiGlyph.js';
import type { EmojiLocale } from '../emoji-model.js';
import {
  createMarked, createSchemaExtensions, defaultIsSafeUrl, patchManager, readMarkdown, writeMarkdown,
} from '../rich-text/pipeline.js';
import type { MarkdownSource } from '../rich-text/pipeline.js';
import { Composer, ComposerBar } from './Composer.js';
import { EditorIcon } from './EditorIcons.js';
import type { EditorIconName } from './EditorIcons.js';
import { EmojiPicker } from './EmojiPicker.js';
import type { EmojiPickerLabels } from './EmojiPicker.js';
import { Markdown } from './Markdown.js';
import { Popover } from './Popover.js';
import { Textarea } from './Textarea.js';

export type RichTextFeatures = 'full' | 'comment' | 'template';
export type RichTextHeadingLevel = 1 | 2 | 3;

/** Every visible and accessible string of the editor. Placeholders are filled by the editor. */
export interface RichTextLabels {
  toolbar: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bold: string;
  italic: string;
  strike: string;
  code: string;
  bulletList: string;
  orderedList: string;
  taskList: string;
  blockquote: string;
  codeBlock: string;
  horizontalRule: string;
  link: string;
  /** Label of the link address field. */
  linkUrl: string;
  linkApply: string;
  linkRemove: string;
  /** Shown when the link address is refused by `isSafeUrl`. */
  linkInvalid: string;
  table: string;
  tableAddRow: string;
  tableAddColumn: string;
  tableDeleteRow: string;
  tableDeleteColumn: string;
  tableDelete: string;
  image: string;
  imageUploading: string;
  imageFailed: string;
  /** Shown when an image is pasted or dropped where images are off (default for `imagesUnavailableReason`). */
  imagesUnsupported: string;
  emoji: string;
  /** Accessible name of the `:shortcode` suggestion list. */
  emojiSuggestions: string;
  undo: string;
  redo: string;
  /** Toggle to markdown source. */
  sourceMode: string;
  /** Toggle back to formatted editing. */
  richMode: string;
  /** Character counter. Placeholders: `{count}`, `{max}`. */
  characterCount: string;
}

export const DEFAULT_RICH_TEXT_LABELS: RichTextLabels = {
  toolbar: 'Formatting',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bold: 'Bold',
  italic: 'Italic',
  strike: 'Strikethrough',
  code: 'Inline code',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  taskList: 'Checklist',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  horizontalRule: 'Divider',
  link: 'Link',
  linkUrl: 'Link address',
  linkApply: 'Apply',
  linkRemove: 'Remove link',
  linkInvalid: 'Use a web, mail or in-app address.',
  table: 'Table',
  tableAddRow: 'Add row',
  tableAddColumn: 'Add column',
  tableDeleteRow: 'Delete row',
  tableDeleteColumn: 'Delete column',
  tableDelete: 'Delete table',
  image: 'Image',
  imageUploading: 'Uploading image…',
  imageFailed: 'The image could not be added.',
  imagesUnsupported: "Images can't be added here.",
  emoji: 'Emoji',
  emojiSuggestions: 'Emoji suggestions',
  undo: 'Undo',
  redo: 'Redo',
  sourceMode: 'Show markdown',
  richMode: 'Show formatted',
  characterCount: '{count} of {max} characters',
};

export interface RichTextEditorProps {
  /** Markdown. */
  value: string;
  /**
   * Fired only for user edits — never on mount or when `value` changes from outside.
   * Pass the emitted markdown back as `value` in the same update (as React state does):
   * a different `value` is treated as an outside change and replaces the content.
   */
  onChange: (markdown: string) => void;
  /** Toolbar preset. Default `'full'`. */
  features?: RichTextFeatures;
  /** Heading levels the toolbar and input rules offer. Default `[1, 2, 3]`. */
  headingLevels?: ReadonlyArray<RichTextHeadingLevel>;
  /** Enables image paste/drop and the toolbar image button, in every preset. */
  onUploadImage?: (file: File) => Promise<{ src: string; alt: string }>;
  /**
   * Shown in the status line when an image is pasted or dropped while images are off (no
   * `onUploadImage`), e.g. "Attach files to the incident instead.". Nothing is inserted.
   * Default: the `imagesUnsupported` label.
   */
  imagesUnavailableReason?: string;
  /** Link policy. Default: http(s), mailto and same-app paths. */
  isSafeUrl?: (url: string) => boolean;
  /** Image policy: the URL to display, or `null` to show the image as a link chip. */
  resolveImageSrc?: (src: string) => string | null;
  /** Ctrl/Cmd+Enter. */
  onSubmitShortcut?: () => void;
  /** Emoji button and `:shortcode` suggestions. Default `true`. */
  emoji?: boolean;
  /**
   * Same-origin folder of fallback emoji PNGs for devices without a colour emoji font
   * (e.g. `/static/emoji`). Emoji the device cannot draw show as
   * `<img src="{base}/{codepoints}.png">`; see `emojiImageFileName`. Values with a scheme or
   * `//` are ignored. Unset = native emoji only; UIx ships no image set.
   */
  emojiImageBaseUrl?: string;
  /** Shows a character counter (markdown characters); over the limit sets `aria-invalid`. */
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  labels?: Partial<RichTextLabels>;
  /** Labels of the emoji picker opened from the toolbar. */
  emojiPickerLabels?: Partial<EmojiPickerLabels>;
  /** Language of emoji names in the picker. Default `'en'`. */
  emojiLocale?: EmojiLocale;
  id?: string;
  /** Renders a hidden input with the markdown, for native form posts. */
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  /** `'composer'` renders inside Composer with the toolbar in ComposerBar. Default `'field'`. */
  variant?: 'field' | 'composer';
  /** Composer actions (visibility, send), placed at the end of the bar. */
  toolbarEnd?: ReactNode;
  /** Minimum visible lines. Default 4 (field) / 3 (composer). */
  minRows?: number;
  className?: string;
  onBlur?: () => void;
}

type Control =
  | 'heading' | 'bold' | 'italic' | 'strike' | 'code' | 'bulletList' | 'orderedList' | 'taskList'
  | 'blockquote' | 'codeBlock' | 'horizontalRule' | 'link' | 'table' | 'image' | 'emoji' | 'history' | 'source';

const COMMON: Control[] = ['bold', 'italic', 'strike', 'code', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'link', 'emoji', 'history', 'source'];
const PRESETS: Record<RichTextFeatures, ReadonlySet<Control>> = {
  full: new Set<Control>([...COMMON, 'heading', 'horizontalRule', 'table', 'image']),
  // Images in every preset once the consumer supplies onUploadImage (TENSOR HAR-749).
  comment: new Set<Control>([...COMMON, 'image']),
  template: new Set<Control>([...COMMON, 'heading', 'horizontalRule', 'table', 'image']),
};

const emojiSuggestionKey = new PluginKey('uixEmojiSuggestion');
const SHORTCODE_RE = /:([a-zA-Z0-9_+-]+):$/;

const emojiItems = OFFLINE_EMOJI_ITEMS;

const findShortcode = (name: string): EmojiItem | undefined =>
  emojiItems.find((item) => item.emoji && (item.name === name || item.shortcodes.includes(name)));

/** `:query` → up to eight emoji whose shortcodes or tags start with the query. */
export function suggestEmoji(query: string, limit = 8): EmojiItem[] {
  const q = query.toLowerCase();
  if (q.length < 2) return [];
  const starts: EmojiItem[] = [];
  const tagged: EmojiItem[] = [];
  for (const item of emojiItems) {
    if (!item.emoji) continue;
    if (item.shortcodes.some((s) => s.startsWith(q))) starts.push(item);
    else if (item.tags.some((t) => t.startsWith(q))) tagged.push(item);
    if (starts.length >= limit) break;
  }
  return [...starts, ...tagged].slice(0, limit);
}

interface SuggestState {
  query: string;
  items: EmojiItem[];
  command: (item: EmojiItem) => void;
  rect: DOMRect | null;
}

type SuggestBridge = {
  update: (props: SuggestionProps<EmojiItem, EmojiItem> | null) => void;
  keyDown: (props: SuggestionKeyDownProps) => boolean;
};

const htmlAttr = (value: string | boolean | undefined): string | undefined =>
  value === undefined || value === false || value === '' ? undefined : String(value);

const popoverOpen = (el: Element): boolean => {
  try { return el.matches(':popover-open'); } catch { return false; }
};

const isMac = (): boolean => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/** The loading/error stand-in: a plain Textarea with the same value and ARIA, and the composer bar. */
export function RichTextEditorFallback(props: RichTextEditorProps) {
  const {
    value, onChange, onSubmitShortcut, placeholder, disabled, readOnly, maxLength, id, name, variant = 'field',
    toolbarEnd, minRows, className, onBlur, labels: labelOverrides,
  } = props;
  const labels = { ...DEFAULT_RICH_TEXT_LABELS, ...labelOverrides };
  const counterId = useId();
  const over = maxLength !== undefined && value.length > maxLength;
  const counter = maxLength !== undefined ? (
    <span id={counterId} className="uix-rich-text__counter" data-over={over || undefined}>
      {formatLabel(labels.characterCount, { count: value.length, max: maxLength })}
    </span>
  ) : null;
  const textarea = (
    <Textarea
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (onSubmitShortcut && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          onSubmitShortcut();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      rows={minRows ?? (variant === 'composer' ? 3 : 4)}
      className="uix-rich-text__source"
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={[props['aria-describedby'], counter ? counterId : undefined].filter(Boolean).join(' ') || undefined}
      aria-invalid={props['aria-invalid'] || over || undefined}
      aria-required={props['aria-required'] || undefined}
      data-editor-fallback=""
    />
  );
  if (variant === 'composer') {
    return (
      <Composer className={cx('uix-rich-text', 'uix-rich-text--composer', className)}>
        {textarea}
        {counter || toolbarEnd ? <ComposerBar className="uix-rich-text__bar">{counter}{toolbarEnd}</ComposerBar> : null}
      </Composer>
    );
  }
  return (
    <div className={cx('uix-rich-text', 'uix-rich-text--fallback', className)} data-disabled={disabled || undefined}>
      {textarea}
      {counter ? <div className="uix-rich-text__footer">{counter}</div> : null}
    </div>
  );
}

/**
 * Markdown rich-text editor on Tiptap v3 (RTE-01). Markdown in, markdown out:
 * untouched blocks keep their exact source bytes, `onChange` fires only for user
 * edits, emoji are stored as Unicode, raw HTML is never interpreted, and links and
 * images pass the consumer's policy. The toolbar is one tab stop (arrow keys move
 * within it) and scrolls horizontally on narrow screens.
 */
export function RichTextEditor(props: RichTextEditorProps) {
  const {
    value, onChange, features = 'full', headingLevels = [1, 2, 3], onUploadImage, isSafeUrl = defaultIsSafeUrl,
    resolveImageSrc, onSubmitShortcut, emoji = true, maxLength, placeholder, disabled = false, readOnly = false,
    labels: labelOverrides, emojiPickerLabels, emojiLocale, id, name, variant = 'field', toolbarEnd, minRows,
    className, onBlur, emojiImageBaseUrl, imagesUnavailableReason,
  } = props;
  const emojiBase = useMemo(() => normalizeEmojiImageBaseUrl(emojiImageBaseUrl), [emojiImageBaseUrl]);
  const renderEmoji = useEmojiRenderer(emojiImageBaseUrl);
  const labels = useMemo(() => ({ ...DEFAULT_RICH_TEXT_LABELS, ...labelOverrides }), [labelOverrides]);
  const uid = useId();
  const counterId = `${uid}-counter`;
  const statusId = `${uid}-status`;
  const suggestId = `${uid}-emoji`;
  const linkPopoverId = `${uid}-link`;

  const controls = PRESETS[features];
  const has = (control: Control): boolean =>
    controls.has(control) && (control !== 'emoji' || emoji) && (control !== 'image' || !!onUploadImage);

  // Latest props for callbacks that the editor captured at creation.
  const latest = useRef({ onChange, onSubmitShortcut, onBlur, isSafeUrl, resolveImageSrc, onUploadImage, placeholder, imagesOn: false, imagesOffText: '' });
  latest.current = {
    onChange, onSubmitShortcut, onBlur, isSafeUrl, resolveImageSrc, onUploadImage, placeholder,
    imagesOn: controls.has('image') && !!onUploadImage,
    imagesOffText: imagesUnavailableReason?.trim() || labels.imagesUnsupported,
  };

  const lastValue = useRef(value);
  const origin = useRef<MarkdownSource | null>(null);
  const [markdown, setMarkdown] = useState(value);
  const [mode, setMode] = useState<'rich' | 'source'>('rich');
  // `notice` (images refused) clears on the next edit; `error` stays until the next upload.
  const [status, setStatus] = useState<{ kind: 'busy' | 'error' | 'notice'; text: string } | null>(null);
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState(false);
  const [rovingIndex, setRovingIndex] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const openLinkRef = useRef<() => void>(() => {});
  const suggestState = useRef({ suggest, suggestIndex });
  suggestState.current = { suggest, suggestIndex };

  const bridge = useRef<SuggestBridge>({ update: () => {}, keyDown: () => false });
  bridge.current = {
    update: (p) => {
      if (!p || p.items.length === 0) { setSuggest(null); return; }
      setSuggest({ query: p.query, items: p.items, command: p.command, rect: p.clientRect?.() ?? null });
      setSuggestIndex(0);
    },
    keyDown: ({ event }) => {
      const { suggest: open, suggestIndex: index } = suggestState.current;
      if (!open) return false;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setSuggestIndex((index + delta + open.items.length) % open.items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = open.items[index];
        if (item) open.command(item);
        return true;
      }
      if (event.key === 'Escape') {
        setSuggest(null);
        return true;
      }
      return false;
    },
  };

  const headingKey = [...headingLevels].sort().join(',');

  const extensions = useMemo(() => {
    const image = Image.extend({
      parseHTML() {
        return [{
          tag: 'img[src]',
          // Pasted images are kept only when the consumer allows images and can resolve them.
          getAttrs: (el) => {
            const src = (el as HTMLElement).getAttribute('src') ?? '';
            return latest.current.imagesOn && latest.current.resolveImageSrc?.(src) ? null : false;
          },
        }];
      },
      renderHTML({ node, HTMLAttributes }) {
        const src = String(node.attrs.src ?? '');
        const resolved = latest.current.resolveImageSrc?.(src) ?? null;
        if (resolved) return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: resolved })];
        return ['span', { class: 'uix-rich-text__image-link', 'data-src': src, title: src }, node.attrs.alt || src];
      },
    }).configure({ inline: true, allowBase64: false });

    const unicodeEmoji = Emoji.extend({
      addStorage() {
        return { emojis: this.options.emojis, isSupported: () => true };
      },
      // Emoji are inserted as text; the node type exists only because the extension defines it.
      // Unknown names (e.g. pasted from another editor) keep their shortcode rather than vanish.
      renderMarkdown: (node) => {
        const name = String(node.attrs?.name ?? '');
        return findShortcode(name)?.emoji ?? (name ? `:${name}:` : '');
      },
      addInputRules() {
        return [new InputRule({
          find: SHORTCODE_RE,
          handler: ({ range, match, chain }) => {
            const item = findShortcode(match[1] ?? '');
            if (item?.emoji) chain().insertContentAt(range, item.emoji).run();
          },
        })];
      },
      addPasteRules() {
        return [];
      },
      addProseMirrorPlugins() {
        return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
      },
    }).configure({
      // Offline list: no CDN fallbackImage, no GitHub image-only emoji (on-prem, CSP img-src 'self').
      emojis: [...emojiItems],
      enableEmoticons: false,
      forceFallbackImages: false,
      suggestion: {
        char: ':',
        pluginKey: emojiSuggestionKey,
        items: ({ query }: { query: string }) => suggestEmoji(query),
        command: ({ editor, range, props: item }: { editor: Editor; range: Range; props: EmojiItem }) => {
          if (item.emoji) editor.chain().focus().insertContentAt(range, item.emoji).run();
        },
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        render: () => ({
          onStart: (p: SuggestionProps<EmojiItem, EmojiItem>) => bridge.current.update(p),
          onUpdate: (p: SuggestionProps<EmojiItem, EmojiItem>) => bridge.current.update(p),
          onExit: () => bridge.current.update(null),
          onKeyDown: (p: SuggestionKeyDownProps) => bridge.current.keyDown(p),
        }),
      },
    });

    const shortcuts = Extension.create({
      name: 'uixRichTextShortcuts',
      addKeyboardShortcuts() {
        return {
          'Mod-Enter': () => {
            const submit = latest.current.onSubmitShortcut;
            if (!submit) return false;
            submit();
            return true;
          },
          'Mod-k': () => {
            openLinkRef.current();
            return true;
          },
          'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
        };
      },
    });

    // Same-origin fallback images for emoji the device cannot draw; only with emojiImageBaseUrl.
    const emojiImages = Extension.create({
      name: 'uixEmojiImages',
      addProseMirrorPlugins() {
        const key = new PluginKey<DecorationSet>('uixEmojiImages');
        const build = (doc: PMNode): DecorationSet => {
          if (!emojiBase) return DecorationSet.empty;
          const decorations: Decoration[] = [];
          doc.descendants((node, pos) => {
            if (node.type.spec.code) return false;
            if (!node.isText || !node.text) return true;
            for (const match of node.text.matchAll(emojiPattern())) {
              const glyph = match[0];
              if (canRenderEmoji(glyph)) continue;
              const from = pos + (match.index ?? 0);
              decorations.push(Decoration.inline(from, from + glyph.length, { class: 'uix-rich-text__emoji-text' }));
              decorations.push(Decoration.widget(from, () => {
                const img = document.createElement('img');
                img.className = 'uix-emoji-img';
                img.alt = glyph;
                img.draggable = false;
                img.src = emojiImageSrc(emojiBase, glyph);
                return img;
              }, { side: -1, key: `emoji-${glyph}`, ignoreSelection: true }));
            }
            return false;
          });
          return DecorationSet.create(doc, decorations);
        };
        return [new Plugin<DecorationSet>({
          key,
          state: {
            init: (_, state) => build(state.doc),
            apply: (tr, previous) => (tr.docChanged ? build(tr.doc) : previous),
          },
          props: { decorations: (state) => key.getState(state) },
        })];
      },
    });

    return [
      ...createSchemaExtensions({
        headingLevels: headingKey.split(',').map(Number) as RichTextHeadingLevel[],
        isSafeUrl: (url) => latest.current.isSafeUrl(url),
        image,
      }),
      MarkdownExtension.configure({ marked: createMarked() as never }),
      Placeholder.configure({ placeholder: () => latest.current.placeholder ?? '' }),
      shortcuts,
      ...(emoji ? [unicodeEmoji] : []),
      ...(emojiBase ? [emojiImages] : []),
    ];
  }, [headingKey, emoji, emojiBase]);

  const managerOf = (ed: Editor) => {
    const manager = (ed as Editor & { markdown?: Parameters<typeof patchManager>[0] }).markdown
      ?? (ed.storage as unknown as { markdown: { manager: Parameters<typeof patchManager>[0] } }).markdown.manager;
    return patchManager(manager);
  };

  const load = useCallback((ed: Editor, source: string) => {
    const read = readMarkdown(source, managerOf(ed), ed.schema);
    origin.current = read;
    ed.chain().setMeta('addToHistory', false).setContent(read.doc, { emitUpdate: false }).run();
  }, []);

  const emit = (next: string) => {
    if (next === lastValue.current) return;
    lastValue.current = next;
    setMarkdown(next);
    latest.current.onChange(next);
  };

  const uploadImage = async (ed: Editor, file: File) => {
    const upload = latest.current.onUploadImage;
    if (!upload || !file.type.startsWith('image/')) return;
    setStatus({ kind: 'busy', text: labels.imageUploading });
    try {
      const { src, alt } = await upload(file);
      ed.chain().focus().setImage({ src, alt }).run();
      setStatus(null);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : '';
      setStatus({ kind: 'error', text: message ? `${labels.imageFailed} ${message}` : labels.imageFailed });
    }
  };

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    // Styles ship in @tensor_1/tokens (rich-text.css); no runtime <style> injection under CSP.
    injectCSS: false,
    shouldRerenderOnTransaction: false,
    editable: !disabled && !readOnly,
    editorProps: {
      // An image file pasted or dropped where images are off used to vanish silently; now the
      // status line says so (TENSOR HAR-749). A paste that also carries text is a text paste:
      // Excel, Word and Docs add a PNG rendering of the copied cells or text, which must not
      // replace (or block) the text itself.
      handlePaste: (_view, event) => {
        const data = event.clipboardData;
        const files = Array.from(data?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (!files.length || !editorRef.current || data?.getData('text/plain').trim()) return false;
        event.preventDefault();
        if (!latest.current.imagesOn) setStatus({ kind: 'notice', text: latest.current.imagesOffText });
        else files.forEach((file) => void uploadImage(editorRef.current!, file));
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (!files.length || !editorRef.current) return false;
        event.preventDefault();
        if (!latest.current.imagesOn) setStatus({ kind: 'notice', text: latest.current.imagesOffText });
        else files.forEach((file) => void uploadImage(editorRef.current!, file));
        return true;
      },
    },
    onCreate: ({ editor: ed }) => load(ed, lastValue.current),
    onUpdate: ({ editor: ed }) => {
      setStatus((s) => (s?.kind === 'notice' ? null : s));
      if (!origin.current) return;
      emit(writeMarkdown(ed.getJSON(), origin.current, managerOf(ed)));
    },
    onBlur: () => latest.current.onBlur?.(),
  }, [extensions]);
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  // External value changes replace the content without emitting.
  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    setMarkdown(value);
    if (editor && !editor.isDestroyed) load(editor, value);
  }, [value, editor, load]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled && !readOnly, false);
  }, [editor, disabled, readOnly]);

  const over = maxLength !== undefined && markdown.length > maxLength;
  const invalid = props['aria-invalid'] || over;
  const describedBy = [props['aria-describedby'], maxLength !== undefined ? counterId : undefined, status ? statusId : undefined]
    .filter(Boolean).join(' ') || undefined;
  const suggestOpen = !!suggest && mode === 'rich';
  const rows = minRows ?? (variant === 'composer' ? 3 : 4);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: Object.fromEntries(Object.entries({
          id: mode === 'rich' ? id : undefined,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': props['aria-label'],
          'aria-labelledby': props['aria-labelledby'],
          'aria-describedby': describedBy,
          'aria-invalid': htmlAttr(invalid),
          'aria-required': htmlAttr(props['aria-required']),
          'aria-disabled': htmlAttr(disabled),
          'aria-readonly': htmlAttr(readOnly),
          'aria-autocomplete': emoji ? 'list' : undefined,
          'aria-controls': suggestOpen ? suggestId : undefined,
          'aria-activedescendant': suggestOpen ? `${suggestId}-${suggestIndex}` : undefined,
          class: 'uix-rich-text__content uix-prose',
          style: `min-height: calc(${rows} * 1lh + 2 * var(--uix-space-3))`,
        }).filter(([, v]) => v !== undefined)) as Record<string, string>,
      },
    });
  }, [editor, mode, id, props['aria-label'], props['aria-labelledby'], describedBy, invalid, props['aria-required'],
    disabled, readOnly, emoji, suggestOpen, suggestId, suggestIndex, rows]);

  // Toolbar state, recomputed on transactions only.
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null;
      const can = ed.can();
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        strike: ed.isActive('strike'),
        code: ed.isActive('code'),
        h1: ed.isActive('heading', { level: 1 }),
        h2: ed.isActive('heading', { level: 2 }),
        h3: ed.isActive('heading', { level: 3 }),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        taskList: ed.isActive('taskList'),
        blockquote: ed.isActive('blockquote'),
        codeBlock: ed.isActive('codeBlock'),
        link: ed.isActive('link'),
        inTable: ed.isActive('table'),
        canUndo: can.undo(),
        canRedo: can.redo(),
      };
    },
  });

  const openLink = () => {
    if (!editor || mode !== 'rich') return;
    setLinkUrl(String(editor.getAttributes('link').href ?? ''));
    setLinkError(false);
    const pop = document.getElementById(linkPopoverId);
    if (pop && !popoverOpen(pop)) pop.showPopover();
    requestAnimationFrame(() => linkInputRef.current?.select());
  };
  openLinkRef.current = openLink;

  const closeLink = () => {
    const pop = document.getElementById(linkPopoverId);
    if (pop && popoverOpen(pop)) pop.hidePopover();
    editor?.commands.focus();
  };

  const applyLink = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      closeLink();
      return;
    }
    if (!isSafeUrl(url)) {
      setLinkError(true);
      linkInputRef.current?.focus();
      return;
    }
    const chain = editor.chain().focus().extendMarkRange('link');
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
    } else {
      chain.setLink({ href: url }).run();
    }
    closeLink();
  };

  const toggleMode = () => {
    if (!editor) return;
    if (mode === 'rich') {
      setMode('source');
      requestAnimationFrame(() => sourceRef.current?.focus());
    } else {
      load(editor, lastValue.current);
      setMode('rich');
      requestAnimationFrame(() => editor.commands.focus());
    }
  };

  const insertEmoji = (glyph: string) => {
    if (mode === 'source') {
      const box = sourceRef.current;
      if (!box) return;
      const next = `${box.value.slice(0, box.selectionStart)}${glyph}${box.value.slice(box.selectionEnd)}`;
      const caret = box.selectionStart + glyph.length;
      emit(next);
      requestAnimationFrame(() => { box.focus(); box.setSelectionRange(caret, caret); });
      return;
    }
    editor?.chain().focus().insertContent(glyph).run();
  };

  const run = (fn: (ed: Editor) => void) => () => {
    if (editor) fn(editor);
  };

  const locked = disabled || !editor;
  const richOnly = locked || mode === 'source';
  const shortcut = (key: string) => `${isMac() ? '⌘' : 'Ctrl+'}${key}`;

  interface Tool { key: string; icon: EditorIconName; label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; hint?: string }
  const groups: Tool[][] = [];
  if (has('heading')) {
    groups.push(headingLevels.map((level) => ({
      key: `h${level}`,
      icon: `heading${level}` as EditorIconName,
      label: labels[`heading${level}` as 'heading1'],
      pressed: !!state?.[`h${level}` as 'h1'],
      disabled: richOnly,
      onClick: run((ed) => ed.chain().focus().toggleHeading({ level }).run()),
    })));
  }
  const marks: Tool[] = [];
  if (has('bold')) marks.push({ key: 'bold', icon: 'bold', label: labels.bold, hint: shortcut('B'), pressed: state?.bold, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleBold().run()) });
  if (has('italic')) marks.push({ key: 'italic', icon: 'italic', label: labels.italic, hint: shortcut('I'), pressed: state?.italic, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleItalic().run()) });
  if (has('strike')) marks.push({ key: 'strike', icon: 'strike', label: labels.strike, hint: shortcut('Shift+X'), pressed: state?.strike, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleStrike().run()) });
  if (has('code')) marks.push({ key: 'code', icon: 'code', label: labels.code, hint: shortcut('E'), pressed: state?.code, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleCode().run()) });
  if (has('link')) marks.push({ key: 'link', icon: 'link', label: labels.link, hint: shortcut('K'), pressed: state?.link, disabled: richOnly, onClick: openLink });
  if (marks.length) groups.push(marks);
  const blocks: Tool[] = [];
  if (has('bulletList')) blocks.push({ key: 'bulletList', icon: 'bulletList', label: labels.bulletList, pressed: state?.bulletList, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleBulletList().run()) });
  if (has('orderedList')) blocks.push({ key: 'orderedList', icon: 'orderedList', label: labels.orderedList, pressed: state?.orderedList, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleOrderedList().run()) });
  if (has('taskList')) blocks.push({ key: 'taskList', icon: 'taskList', label: labels.taskList, pressed: state?.taskList, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleTaskList().run()) });
  if (has('blockquote')) blocks.push({ key: 'blockquote', icon: 'blockquote', label: labels.blockquote, pressed: state?.blockquote, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleBlockquote().run()) });
  if (has('codeBlock')) blocks.push({ key: 'codeBlock', icon: 'codeBlock', label: labels.codeBlock, pressed: state?.codeBlock, disabled: richOnly, onClick: run((ed) => ed.chain().focus().toggleCodeBlock().run()) });
  if (has('horizontalRule')) blocks.push({ key: 'horizontalRule', icon: 'horizontalRule', label: labels.horizontalRule, disabled: richOnly, onClick: run((ed) => ed.chain().focus().setHorizontalRule().run()) });
  if (blocks.length) groups.push(blocks);
  const inserts: Tool[] = [];
  if (has('table')) inserts.push({ key: 'table', icon: 'table', label: labels.table, pressed: state?.inTable, disabled: richOnly || state?.inTable, onClick: run((ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()) });
  if (has('image')) inserts.push({ key: 'image', icon: 'image', label: labels.image, disabled: richOnly || status?.kind === 'busy', onClick: () => fileRef.current?.click() });
  if (inserts.length) groups.push(inserts);
  if (has('table') && state?.inTable && mode === 'rich') {
    groups.push([
      { key: 'tableAddRow', icon: 'tableAddRow', label: labels.tableAddRow, disabled: locked, onClick: run((ed) => ed.chain().focus().addRowAfter().run()) },
      { key: 'tableAddColumn', icon: 'tableAddColumn', label: labels.tableAddColumn, disabled: locked, onClick: run((ed) => ed.chain().focus().addColumnAfter().run()) },
      { key: 'tableDeleteRow', icon: 'tableDeleteRow', label: labels.tableDeleteRow, disabled: locked, onClick: run((ed) => ed.chain().focus().deleteRow().run()) },
      { key: 'tableDeleteColumn', icon: 'tableDeleteColumn', label: labels.tableDeleteColumn, disabled: locked, onClick: run((ed) => ed.chain().focus().deleteColumn().run()) },
      { key: 'tableDelete', icon: 'trash', label: labels.tableDelete, disabled: locked, onClick: run((ed) => ed.chain().focus().deleteTable().run()) },
    ]);
  }
  const trailing: Tool[] = [];
  if (has('history')) {
    trailing.push({ key: 'undo', icon: 'undo', label: labels.undo, hint: shortcut('Z'), disabled: richOnly || !state?.canUndo, onClick: run((ed) => ed.chain().focus().undo().run()) });
    trailing.push({ key: 'redo', icon: 'redo', label: labels.redo, hint: shortcut(isMac() ? 'Shift+Z' : 'Y'), disabled: richOnly || !state?.canRedo, onClick: run((ed) => ed.chain().focus().redo().run()) });
  }
  if (has('source')) {
    trailing.push({
      key: 'source',
      icon: mode === 'rich' ? 'sourceMode' : 'richMode',
      label: mode === 'rich' ? labels.sourceMode : labels.richMode,
      pressed: mode === 'source',
      disabled: locked,
      onClick: toggleMode,
    });
  }

  // Roving tabindex over enabled tools, in DOM order.
  const tools = () => Array.from(toolbarRef.current?.querySelectorAll<HTMLButtonElement>('button[data-tool]:not(:disabled)') ?? []);
  const onToolbarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = tools();
    const current = list.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % list.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + list.length) % list.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else return;
    event.preventDefault();
    list[next]!.focus();
    list[next]!.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const enabledCount = { value: 0 };
  const renderTool = (tool: Tool) => {
    const index = tool.disabled ? -1 : enabledCount.value++;
    return (
      <button
        key={tool.key}
        ref={tool.key === 'link' ? linkButtonRef : undefined}
        type="button"
        data-tool={tool.key}
        className="uix-rich-text__tool"
        aria-label={tool.label}
        title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
        aria-pressed={tool.pressed === undefined ? undefined : !!tool.pressed}
        aria-keyshortcuts={tool.hint ? tool.hint.replace('⌘', 'Meta+') : undefined}
        disabled={tool.disabled}
        tabIndex={index === rovingIndex ? 0 : -1}
        onFocus={() => { if (index >= 0) setRovingIndex(index); }}
        onMouseDown={(event) => { if (tool.key !== 'source') event.preventDefault(); }}
        onClick={tool.onClick}
      >
        <EditorIcon name={tool.icon} />
      </button>
    );
  };

  // Keep one tool tabbable when the enabled set shrinks.
  useEffect(() => {
    const count = tools().length;
    if (count && rovingIndex >= count) setRovingIndex(0);
  });

  const toolbar = readOnly ? null : (
    <div
      ref={toolbarRef}
      className="uix-rich-text__toolbar"
      role="toolbar"
      aria-label={labels.toolbar}
      // Only once the controlled surface (editor or source textarea) carries the id.
      aria-controls={editor || mode === 'source' ? id : undefined}
      onKeyDown={onToolbarKeyDown}
    >
      {groups.map((group, g) => (
        <div key={g} className="uix-rich-text__group" role="group">
          {group.map(renderTool)}
        </div>
      ))}
      {has('emoji') ? (
        <div className="uix-rich-text__group" role="group">
          <EmojiPicker
            labels={emojiPickerLabels}
            locale={emojiLocale}
            emojiImageBaseUrl={emojiImageBaseUrl}
            onSelect={insertEmoji}
            trigger={
              (() => {
                const index = locked ? -1 : enabledCount.value++;
                return (
                  <button
                    type="button"
                    data-tool="emoji"
                    className="uix-rich-text__tool"
                    aria-label={labels.emoji}
                    title={labels.emoji}
                    disabled={locked}
                    tabIndex={index === rovingIndex ? 0 : -1}
                    onFocus={() => { if (index >= 0) setRovingIndex(index); }}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <EditorIcon name="emoji" />
                  </button>
                );
              })()
            }
          />
        </div>
      ) : null}
      {trailing.length ? (
        <div className="uix-rich-text__group uix-rich-text__group--end" role="group">
          {trailing.map(renderTool)}
        </div>
      ) : null}
      {has('link') ? (
        <Popover id={linkPopoverId} anchor={linkButtonRef} className="uix-rich-text__link" role="dialog" aria-label={labels.link}>
          {/* Not a <form>: the popover renders in place, and consumers mount the editor
              inside their own record form. A nested form is invalid HTML and its submit
              bubbles (React onSubmit) into the host form, saving/navigating the page. */}
          <div
            className="uix-rich-text__link-form"
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); closeLink(); }
              // Enter would otherwise implicitly submit the host form. An IME's
              // composition-confirming Enter is not a submit, as with a native form.
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === 'Enter' && event.target === linkInputRef.current) { event.preventDefault(); applyLink(); }
            }}
          >
            <div className="uix-field">
            <label className="uix-field__label" htmlFor={`${uid}-link-url`}>{labels.linkUrl}</label>
            <input
              ref={linkInputRef}
              id={`${uid}-link-url`}
              className="uix-input"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={linkUrl}
              aria-invalid={linkError || undefined}
              aria-describedby={linkError ? `${uid}-link-error` : undefined}
              onChange={(event) => { setLinkUrl(event.target.value); setLinkError(false); }}
            />
            {linkError ? (
              <div className="uix-field__msg">
                <span id={`${uid}-link-error`} className="uix-field__error" role="alert">{labels.linkInvalid}</span>
              </div>
            ) : null}
            </div>
            <div className="uix-rich-text__link-actions">
              {state?.link ? (
                <button
                  type="button"
                  className="uix-btn uix-btn--ghost uix-btn--sm"
                  onClick={() => { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); closeLink(); }}
                >
                  {labels.linkRemove}
                </button>
              ) : null}
              <button type="button" className="uix-btn uix-btn--primary uix-btn--sm" onClick={applyLink}>{labels.linkApply}</button>
            </div>
          </div>
        </Popover>
      ) : null}
      {has('image') ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file && editor) void uploadImage(editor, file);
          }}
        />
      ) : null}
    </div>
  );

  const surface = (
    <div className="uix-rich-text__surface">
      {mode === 'source' ? (
        <Textarea
          ref={sourceRef}
          id={id}
          value={markdown}
          onChange={(event) => emit(event.target.value)}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (onSubmitShortcut && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmitShortcut();
            }
          }}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          className="uix-rich-text__source"
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={props['aria-required'] || undefined}
        />
      ) : editor ? (
        <EditorContent editor={editor} className="uix-rich-text__editor" />
      ) : (
        // One frame before Tiptap mounts: the same content, read-only, without layout shift.
        <div className="uix-rich-text__content uix-rich-text__content--loading" aria-busy="true" style={{ minHeight: `calc(${rows} * 1lh + 2 * var(--uix-space-3))` }}>
          <Markdown isSafeUrl={isSafeUrl} resolveImageSrc={resolveImageSrc}>{value}</Markdown>
        </div>
      )}
      {suggestOpen && suggest ? (
        <EmojiSuggestions
          id={suggestId}
          label={labels.emojiSuggestions}
          items={suggest.items}
          query={suggest.query}
          active={suggestIndex}
          rect={suggest.rect}
          onPick={(item) => suggest.command(item)}
          renderEmoji={renderEmoji}
        />
      ) : null}
    </div>
  );

  const counter = maxLength !== undefined ? (
    <span id={counterId} className="uix-rich-text__counter" data-over={over || undefined}>
      {formatLabel(labels.characterCount, { count: markdown.length, max: maxLength })}
    </span>
  ) : null;
  const statusLine = (
    <span id={statusId} className="uix-rich-text__status" role="status" data-kind={status?.kind}>
      {status?.text ?? ''}
    </span>
  );
  const hidden = name ? <input type="hidden" name={name} value={markdown} /> : null;
  const stateAttrs = {
    'data-disabled': disabled || undefined,
    'data-readonly': readOnly || undefined,
    'data-invalid': invalid || undefined,
    'data-mode': mode,
  };

  if (variant === 'composer') {
    return (
      <Composer className={cx('uix-rich-text', 'uix-rich-text--composer', className)} {...stateAttrs}>
        {surface}
        <ComposerBar className="uix-rich-text__bar">
          {toolbar}
          {statusLine}
          {counter}
          {toolbarEnd}
        </ComposerBar>
        {hidden}
      </Composer>
    );
  }

  return (
    <div className={cx('uix-rich-text', className)} {...stateAttrs}>
      {toolbar}
      {surface}
      <div className="uix-rich-text__footer">
        {statusLine}
        {counter}
        {toolbarEnd}
      </div>
      {hidden}
    </div>
  );
}

interface EmojiSuggestionsProps {
  id: string;
  label: string;
  items: EmojiItem[];
  query: string;
  active: number;
  rect: DOMRect | null;
  onPick: (item: EmojiItem) => void;
  renderEmoji: (emoji: string) => ReactNode;
}

function EmojiSuggestions({ id, label, items, query, active, rect, onPick, renderEmoji }: EmojiSuggestionsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !rect || typeof window === 'undefined') return;
    const box = el.getBoundingClientRect();
    const result = computePosition(
      { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
      { placement: 'bottom-start', offset: 4, padding: 8 },
    );
    setPos({ x: result.x, y: result.y });
  }, [rect, items.length]);

  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, id]);

  return (
    <div
      ref={listRef}
      id={id}
      role="listbox"
      aria-label={label}
      className="uix-rich-text__suggest"
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}
    >
      {items.map((item, i) => (
        <div
          key={item.name}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === active}
          className="uix-rich-text__suggest-item"
          onMouseDown={(event) => { event.preventDefault(); onPick(item); }}
        >
          <span className="uix-rich-text__suggest-emoji" aria-hidden="true">{renderEmoji(item.emoji ?? '')}</span>
          <span className="uix-rich-text__suggest-name">:{item.shortcodes.find((s) => s.startsWith(query.toLowerCase())) ?? item.shortcodes[0] ?? item.name}:</span>
        </div>
      ))}
    </div>
  );
}
