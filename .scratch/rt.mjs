import { MARKDOWN_CORPUS } from '../packages/react/src/fixtures/markdown-corpus.mjs';
import { createPipeline } from '../packages/react/src/rich-text/pipeline.ts';
const p = createPipeline();
for (const f of MARKDOWN_CORPUS) {
  const o = p.read(f.markdown);
  const doc = p.schema.nodeFromJSON(o.doc).toJSON();
  const rt = p.write(doc, o);
  const fresh = p.write(doc, p.read(''));
  console.log(rt === f.markdown ? 'RT ok ' : 'RT BAD', f.canonical ? (fresh === f.markdown ? 'canon ok ' : 'canon BAD') : '         ', f.name, rt === f.markdown ? '' : JSON.stringify(rt), f.canonical && fresh !== f.markdown ? JSON.stringify(fresh) : '');
}
