/* @uix registry item — ported from @itsmx/shared-ui/src/markdown.tsx */
import type { ReactNode } from 'react';
import { cn } from './utils';

/**
 * `<Markdown/>` — a SMALL, SAFE, dependency-free markdown renderer.
 *
 * Why not `react-markdown` + `rehype-sanitize`? Two reasons:
 *
 *   1. Safety by construction. This renderer NEVER produces an HTML
 *      string and NEVER uses `dangerouslySetInnerHTML`. Every piece of
 *      author text becomes a React text node, which React escapes —
 *      so `<script>`, `<img onerror=…>`, and HTML-entity bypasses
 *      cannot run. There is no HTML sink to sanitize because there is
 *      no HTML sink. (rehype-sanitize is an allowlist over a sink that
 *      DOES exist; removing the sink is strictly safer.)
 *
 *   2. It keeps `@itsmx/shared-ui` a leaf package with no new runtime
 *      dependencies (today: just `clsx`). The platform already encodes
 *      this philosophy in `@itsmx/knowledge`'s `sanitizeMarkdown` (strip
 *      raw HTML, allowlist URL schemes); this component renders the same
 *      safe subset.
 *
 * Supported subset (everything else renders as escaped literal text):
 *   - Headings `#`..`######`
 *   - Unordered lists (`-` / `*` / `+`) and ordered lists (`1.`)
 *   - Blockquotes (`>`)
 *   - Fenced code blocks (```), inline code (`` `code` ``)
 *   - Paragraphs separated by blank lines; single newlines become <br/>
 *   - Inline: **bold**, *italic* / _italic_, [text](url), bare http(s) autolinks
 *
 * URL safety: link + autolink hrefs are allowlisted to
 * http/https/mailto/relative (`#`, `/`, `./`, `../`). Anything else
 * (javascript:, data:, vbscript:, file:, …) renders as plain text with
 * no anchor — the dangerous scheme never reaches an href attribute.
 *
 * Empty / whitespace-only input renders nothing (the caller owns the
 * empty-state copy).
 */

export interface MarkdownProps {
  /** Raw markdown source. */
  readonly children: string;
  readonly className?: string;
}

// Mirrors @itsmx/knowledge/sanitize URL_OK_RE — the single allowlist for
// link schemes across the platform.
const URL_OK_RE = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;

const isSafeUrl = (url: string): boolean => URL_OK_RE.test(url.trim());

// Bare-URL autolink detector for inline text. Conservative: only http(s).
const BARE_URL_RE = /(https?:\/\/[^\s<>()]+)/g;

/**
 * Per-render key generator. Each <Markdown/> invocation creates its own
 * via makeKeyGen() and threads it through the helpers, so keys are
 * deterministic per source string — no module-level mutable state that
 * concurrent SSR renders could interleave.
 */
type KeyGen = () => string;
const makeKeyGen = (): KeyGen => {
  let seq = 0;
  return () => `md-${++seq}`;
};

/**
 * Render inline markdown (bold / italic / code / links / autolinks) to
 * React nodes. Operates on already-escaped text (React escapes on
 * render); we only choose which spans become <strong>/<em>/<code>/<a>.
 */
function renderInline(text: string, nextKey: KeyGen): ReactNode[] {
  // Tokenize by the inline constructs in priority order. We do a single
  // left-to-right scan using a combined regex; each match is replaced by
  // the corresponding element, and the gaps stay as text (auto-linked).
  const nodes: ReactNode[] = [];
  // Order matters: code first (its content is literal), then links, then
  // bold, then italic.
  const pattern = /(`[^`]+`)|(!?\[[^\]]*\]\([^)]*\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/g;
  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      pushTextWithAutolinks(nodes, text.slice(lastIndex, match.index), nextKey);
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={nextKey()}
          className="rounded px-1 py-0.5 text-[0.85em]"
          style={{
            background: 'var(--uix-bg-hover)',
            fontFamily: 'var(--uix-font-mono, monospace)',
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[') || token.startsWith('![')) {
      // [text](url) — images (`![]`) are downgraded to a plain link to
      // the (allowlisted) URL; we never emit <img> (no remote-content
      // surface in comments/descriptions).
      const linkMatch = /^!?\[([^\]]*)\]\(([^)]*)\)$/.exec(token);
      const label = linkMatch?.[1] ?? token;
      const rawUrl = (linkMatch?.[2] ?? '').trim();
      if (rawUrl && isSafeUrl(rawUrl)) {
        const external = /^https?:/i.test(rawUrl);
        nodes.push(
          <a
            key={nextKey()}
            href={rawUrl}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="underline decoration-dotted underline-offset-2"
            style={{ color: 'var(--uix-link)' }}
          >
            {label}
          </a>,
        );
      } else {
        // Unsafe / empty URL → render the label as plain text (no anchor).
        nodes.push(label);
      }
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={nextKey()}>{renderInline(token.slice(2, -2), nextKey)}</strong>);
    } else {
      // *italic* or _italic_
      nodes.push(<em key={nextKey()}>{renderInline(token.slice(1, -1), nextKey)}</em>);
    }
    lastIndex = pattern.lastIndex;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) {
    pushTextWithAutolinks(nodes, text.slice(lastIndex), nextKey);
  }
  return nodes;
}

/** Split a plain-text run into text + bare-URL autolinks. */
function pushTextWithAutolinks(nodes: ReactNode[], text: string, nextKey: KeyGen): void {
  if (!text) return;
  let last = 0;
  BARE_URL_RE.lastIndex = 0;
  let m = BARE_URL_RE.exec(text);
  while (m !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[0];
    nodes.push(
      <a
        key={nextKey()}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2"
        style={{ color: 'var(--uix-link)' }}
      >
        {url}
      </a>,
    );
    last = m.index + url.length;
    m = BARE_URL_RE.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
}

interface ListBlock {
  readonly kind: 'ul' | 'ol';
  readonly items: string[];
}

/** Render a paragraph's lines with single-newline → <br/>. */
function renderParagraph(lines: string[], key: string, nextKey: KeyGen): ReactNode {
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    // Stable, render-unique <br/> key from the per-render key sequence —
    // the array index is not used as a key (avoids reorder/state pitfalls).
    if (i > 0) out.push(<br key={nextKey()} />);
    out.push(...renderInline(line, nextKey));
  });
  return (
    <p key={key} className="leading-relaxed">
      {out}
    </p>
  );
}

export function Markdown({ children, className }: MarkdownProps) {
  const source = typeof children === 'string' ? children : '';
  if (source.trim().length === 0) return null;

  // One key generator per render: keys are deterministic for a given
  // source string, even under concurrent SSR (no shared module state).
  const nextKey = makeKeyGen();

  // Normalise line endings, then walk line-by-line building blocks.
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(renderParagraph(paragraph, nextKey(), nextKey));
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Blank line → paragraph break.
    if (trimmed === '') {
      flushParagraph();
      i += 1;
      continue;
    }

    // Fenced code block.
    if (trimmed.startsWith('```')) {
      flushParagraph();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // consume closing fence (if present)
      blocks.push(
        <pre
          key={nextKey()}
          className="overflow-x-auto rounded-md p-3 text-[0.85em]"
          style={{
            background: 'var(--uix-bg-hover)',
            fontFamily: 'var(--uix-font-mono, monospace)',
          }}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading.
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      const level = (headingMatch[1] ?? '#').length;
      const content = headingMatch[2] ?? '';
      const sizeCls = level <= 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
      const Tag = `h${Math.min(level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(
        <Tag key={nextKey()} className={cn('mt-1 font-semibold', sizeCls)}>
          {renderInline(content, nextKey)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // Blockquote (collapses consecutive `>` lines).
    if (trimmed.startsWith('>')) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[i] ?? '').trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={nextKey()}
          className="border-l-2 pl-3 italic"
          style={{ borderColor: 'var(--uix-border-strong)', color: 'var(--uix-text-hushed)' }}
        >
          {renderInline(quoteLines.join(' '), nextKey)}
        </blockquote>,
      );
      continue;
    }

    // List (unordered or ordered) — collapses consecutive item lines.
    const ulMatch = /^[-*+]\s+(.*)$/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ulMatch || olMatch) {
      flushParagraph();
      const block: ListBlock = { kind: ulMatch ? 'ul' : 'ol', items: [] };
      while (i < lines.length) {
        const t = (lines[i] ?? '').trim();
        const um = /^[-*+]\s+(.*)$/.exec(t);
        const om = /^\d+\.\s+(.*)$/.exec(t);
        if (block.kind === 'ul' && um) {
          block.items.push(um[1] ?? '');
        } else if (block.kind === 'ol' && om) {
          block.items.push(om[1] ?? '');
        } else {
          break;
        }
        i += 1;
      }
      const itemEls = block.items.map((it) => <li key={nextKey()}>{renderInline(it, nextKey)}</li>);
      blocks.push(
        block.kind === 'ul' ? (
          <ul key={nextKey()} className="list-disc space-y-0.5 pl-5">
            {itemEls}
          </ul>
        ) : (
          <ol key={nextKey()} className="list-decimal space-y-0.5 pl-5">
            {itemEls}
          </ol>
        ),
      );
      continue;
    }

    // Default: accumulate into the current paragraph.
    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();

  return (
    <div className={cn('flex flex-col gap-2 text-sm', className)} data-component="markdown">
      {blocks}
    </div>
  );
}
