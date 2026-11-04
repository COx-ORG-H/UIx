import { MARKDOWN_CORPUS } from '../packages/react/src/fixtures/markdown-corpus.mjs';
import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
const source = MARKDOWN_CORPUS.map((f) => f.markdown).filter((m) => m.trim()).join('\n\n\n') + '\n';
const o = p.read(source);
console.log(o.blocks.length, o.blocks.map(b=>b.keys.length).join(','));
