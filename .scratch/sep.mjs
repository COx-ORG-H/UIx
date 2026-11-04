import { createPipeline } from '../packages/react/src/rich-text/pipeline.ts';
const p = createPipeline();
const src = ['# Change plan','','Deploy the **ledger** fix during the maintenance window. ✅','','- [x] CAB approval','- [ ] Rollback rehearsal','','| Step | Owner |','| :--- | ----: |','| Deploy | Ops |'].join('\n');
const o = p.read(src);
console.log(o.blocks.map(b => [b.raw.slice(0,20), JSON.stringify(b.lead), b.keys.length]));
console.log('tail', JSON.stringify(o.tail));
const doc = p.schema.nodeFromJSON(o.doc).toJSON();
doc.content[1].content.at(-1).text += ' Now.';
console.log(JSON.stringify(p.write(doc, o)));
