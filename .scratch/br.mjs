import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
const cell = (type, content) => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: 'paragraph', content }] });
const doc = { type: 'doc', content: [{ type: 'table', content: [
  { type: 'tableRow', content: [cell('tableHeader', [{ type: 'text', text: 'h' }])] },
  { type: 'tableRow', content: [cell('tableCell', [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }])] },
] }] };
const md = p.write(p.schema.nodeFromJSON(doc).toJSON(), p.read(''));
console.log(JSON.stringify(md));
console.log(JSON.stringify(p.read(md).doc.content[0].content[1]));
