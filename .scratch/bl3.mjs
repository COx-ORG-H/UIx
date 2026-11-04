import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
for (const second of ['< #x', '< x', '<', 'a < #', '(x', '"x', ':x', '=x', '|x', '!x', '%x', '<3']) {
  const md = '- a  \n' + second;
  const c = p.read(md).doc.content;
  console.log(JSON.stringify(second).padEnd(10), c.length === 1 && c[0].type === 'bulletList' ? 'ok' : 'BROKEN ' + JSON.stringify(c).slice(0, 120));
}
