// No "use client" and no hooks: server components render this and pass policy functions to it.
import type { ReactNode } from 'react';
import { cx } from '../cx.js';
import { parseMarkdown, plainText } from '../markdown-model.js';
import type { MarkdownBlock, MarkdownInline, MarkdownList } from '../markdown-model.js';

import { defaultIsSafeUrl } from '../url-policy.js';

/** Default link policy: http(s), mailto and same-app paths (`/`, `#`, `./`, `../`); never `//host`. */
export const defaultMarkdownIsSafeUrl = defaultIsSafeUrl;

export interface MarkdownProps {
  /** Raw markdown source. Empty or whitespace-only input renders nothing. */
  children: string;
  className?: string;
  /** Link policy. Unsafe links render as their text, never as an anchor. */
  isSafeUrl?: (url: string) => boolean;
  /**
   * Image policy. Return the URL to load, or `null` to show the image as a link
   * (subject to `isSafeUrl`). Without it, no `<img>` is ever rendered.
   */
  resolveImageSrc?: (src: string) => string | null;
  /**
   * Added to markdown heading levels so content headings sit below the page's own
   * (`#` → `<h3>` by default, as in TENSOR's original renderer). Capped at `<h6>`.
   */
  headingOffset?: number;
}

interface Policy {
  isSafeUrl: (url: string) => boolean;
  resolveImageSrc?: (src: string) => string | null;
}

const isExternal = (href: string): boolean => /^https?:/i.test(href.trim());

function renderInlines(nodes: ReadonlyArray<MarkdownInline>, policy: Policy): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'br':
        return <br key={i} />;
      case 'code':
        return <code key={i}>{node.value}</code>;
      case 'strong':
        return <strong key={i}>{renderInlines(node.children, policy)}</strong>;
      case 'em':
        return <em key={i}>{renderInlines(node.children, policy)}</em>;
      case 'del':
        return <del key={i}>{renderInlines(node.children, policy)}</del>;
      case 'link': {
        const children = renderInlines(node.children, policy);
        if (!node.href.trim() || !policy.isSafeUrl(node.href)) return <span key={i}>{children}</span>;
        return (
          <a
            key={i}
            href={node.href.trim()}
            title={node.title}
            {...(isExternal(node.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {children}
          </a>
        );
      }
      case 'image': {
        const resolved = policy.resolveImageSrc?.(node.src) ?? null;
        if (resolved) {
          return <img key={i} src={resolved} alt={node.alt} title={node.title} loading="lazy" decoding="async" />;
        }
        // Not an allowed image: today's behaviour — a link to the (allowlisted) URL.
        const label = node.alt || node.src;
        if (!node.src.trim() || !policy.isSafeUrl(node.src)) return label;
        return (
          <a key={i} href={node.src.trim()} {...(isExternal(node.src) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {label}
          </a>
        );
      }
    }
  });
}

function renderList(list: MarkdownList, policy: Policy, key: number): ReactNode {
  const items = list.items.map((item, i) => {
    const content = renderInlines(item.children, policy);
    const nested = item.lists.map((sub, n) => renderList(sub, policy, n));
    if (item.checked === null) {
      return <li key={i}>{content}{nested}</li>;
    }
    return (
      <li key={i} className="uix-markdown__task" data-checked={item.checked || undefined}>
        {/* Read-only state: disabled keeps it out of the tab order; the name repeats the item text. */}
        <input type="checkbox" defaultChecked={item.checked} disabled aria-label={plainText(item.children)} />
        <span>{content}</span>
        {nested}
      </li>
    );
  });
  const hasTasks = list.items.some((item) => item.checked !== null);
  const className = hasTasks ? 'uix-markdown__tasks' : undefined;
  return list.ordered ? (
    <ol key={key} className={className} start={list.start !== 1 ? list.start : undefined}>{items}</ol>
  ) : (
    <ul key={key} className={className}>{items}</ul>
  );
}

function renderBlock(block: MarkdownBlock, policy: Policy, headingOffset: number, key: number): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <p key={key}>{renderInlines(block.children, policy)}</p>;
    case 'heading': {
      const Tag = `h${Math.min(Math.max(block.level + headingOffset, 1), 6)}` as 'h1';
      return <Tag key={key}>{renderInlines(block.children, policy)}</Tag>;
    }
    case 'code':
      return (
        <pre key={key}>
          <code data-language={block.lang || undefined}>{block.value}</code>
        </pre>
      );
    case 'quote':
      return <blockquote key={key}>{renderInlines(block.children, policy)}</blockquote>;
    case 'rule':
      return <hr key={key} />;
    case 'list':
      return renderList(block, policy, key);
    case 'table':
      return (
        // A scrollable region must be reachable from the keyboard.
        <div key={key} className="uix-markdown__table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, c) => (
                  <th key={c} scope="col" style={block.align[c] ? { textAlign: block.align[c]! } : undefined}>
                    {renderInlines(cell, policy)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} style={block.align[c] ? { textAlign: block.align[c]! } : undefined}>
                      {renderInlines(cell, policy)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/**
 * Safe markdown viewer over `.uix-prose`. It never produces an HTML string and never
 * uses `dangerouslySetInnerHTML`: author text only becomes React text nodes, raw HTML
 * shows as literal text, and link/image URLs pass the policy props first.
 *
 * Supports headings, paragraphs (single newline = line break), bold, italic,
 * strikethrough, inline and fenced code, links and bare http(s) URLs, blockquotes,
 * horizontal rules, nested bulleted/numbered lists, read-only task lists, GFM tables
 * (in a keyboard-scrollable wrapper) and images gated by `resolveImageSrc`.
 * Server-component safe.
 */
export function Markdown({ children, className, isSafeUrl = defaultMarkdownIsSafeUrl, resolveImageSrc, headingOffset = 2 }: MarkdownProps) {
  const source = typeof children === 'string' ? children : '';
  if (source.trim() === '') return null;
  const policy: Policy = { isSafeUrl, resolveImageSrc };
  const blocks = parseMarkdown(source);
  return (
    <div className={cx('uix-prose', 'uix-markdown', className)} data-component="markdown">
      {blocks.map((block, i) => renderBlock(block, policy, headingOffset, i))}
    </div>
  );
}
