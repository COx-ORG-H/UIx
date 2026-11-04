import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
for (const md of ['- [ ] one  \n      two', '- [ ] one  \n  two', '- a  \n  b', '1. a  \n   b', '- [ ] one\\n      two']) {
  console.log(JSON.stringify(md), JSON.stringify(p.read(md).doc.content));
}
