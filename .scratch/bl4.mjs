import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
const lines = ['_ .', '< #*Z', 'äi ä"👍'];
const content = lines.flatMap((l, n) => (n ? [{ type: 'hardBreak' }, { type: 'text', text: l }] : [{ type: 'text', text: l }]));
const doc = { type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content }] }] }] };
const md = p.write(doc, p.read(''));
console.log(JSON.stringify(md));
console.log(JSON.stringify(p.read(md).doc.content));
