import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
for (const md of ['- a  \nb  \nc', '- a  \nb c  \nd', '- a  \n< b  \nc', '- a  \n  b  \n  c', '- a  \n  < #x  \n  c', '1. a  \n   b  \n   c', '> a  \n> b  \n> c']) {
  console.log(JSON.stringify(md).padEnd(30), p.read(md).doc.content.length, JSON.stringify(p.read(md).doc.content).match(/"text":"[^"]*"/g).join(" "));
}
