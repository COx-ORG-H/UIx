import { createPipeline } from './pipeline.js';
import type { MarkdownPipeline } from './pipeline.js';

/** Editor options that change how markdown is read. */
export interface RoundTripOptions {
  /** As on RichTextEditor. Does not affect round-trip bytes; accepted for parity. */
  headingLevels?: ReadonlyArray<1 | 2 | 3>;
  /** As on RichTextEditor. */
  isSafeUrl?: (url: string) => boolean;
}

let shared: MarkdownPipeline | undefined;

/**
 * Load markdown into the RichTextEditor's document model and write it back, exactly as
 * the editor does when a user opens a field and saves without editing it. Consumers
 * use it to gate their own content corpus: every stored value should satisfy
 * `await roundTripMarkdown(md) === md`.
 *
 * Runs without a DOM (Node, Vitest, Jest). Asynchronous so the pipeline can be loaded
 * lazily in future versions without an API change.
 *
 * @example
 * for (const article of corpus) {
 *   expect(await roundTripMarkdown(article.body)).toBe(article.body);
 * }
 */
export async function roundTripMarkdown(markdown: string, options?: RoundTripOptions): Promise<string> {
  const pipeline = options ? createPipeline(options) : (shared ??= createPipeline());
  const origin = pipeline.read(markdown);
  const doc = pipeline.schema.nodeFromJSON(origin.doc).toJSON();
  return pipeline.write(doc, origin);
}
