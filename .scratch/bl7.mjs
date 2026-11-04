import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
const N = String.fromCharCode(10);
const texts = (c) => JSON.stringify(c).match(/"text":"[^"]*"/g)?.join(' ');
const cases = [
  ['- a  ', '  b #x  ', '  c'],
  ['1. a  ', '   b #x  ', '   c'],
  ['1. a  ', '  b #x  ', '  c'],
  ['10. a  ', '    b #x  ', '    c'],
  ['- [ ] a', '', '  b #x', '', '  c'],
  ['- a  ', '  b #x  ', '  c', '  - nested  ', '    d #y  ', '    e'],
  ['> a  ', '> b #x  ', '> c'],
  ['| h |', '| - |', '| b #x |'],
];
for (const lines of cases) {
  const md = lines.join(N);
  const c = p.read(md).doc.content;
  console.log(JSON.stringify(md).padEnd(60), c.length, texts(c));
}
