import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
for (const md of ['- [ ] one\n\n  two', '- [x] one\n\n  two\n  - [ ] nested']) console.log(JSON.stringify(md), JSON.stringify(p.read(md).doc.content), JSON.stringify(p.write(p.schema.nodeFromJSON(p.read(md).doc).toJSON(), p.read(''))));
