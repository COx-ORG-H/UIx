import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
const B = String.fromCharCode(92);
const N = String.fromCharCode(10);
const cases = [
  ['- a  ', '< #Z  ', 'c'],
  ['- a  ', '< ' + B + '*Z  ', 'c'],
  ['- a  ', '< #  ', 'c'],
  ['- a  ', 'b #  ', 'c'],
  ['- a  ', 'b #x  ', 'c'],
  ['- a  ', 'b #x', 'c'],
  ['- a', 'b #x', 'c'],
  ['- a  ', 'b c#x  ', 'c'],
];
for (const lines of cases) {
  const md = lines.join(N);
  const c = p.read(md).doc.content;
  console.log(JSON.stringify(md).padEnd(34), c.length);
}
