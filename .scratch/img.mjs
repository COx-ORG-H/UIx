import { createPipeline } from '../packages/react/src/rich-text/pipeline.ts';
const p = createPipeline();
for (const s of ['![Net](/a/b)', 'x ![Net](/a/b) y']) console.log(JSON.stringify(p.manager.parse(s)), JSON.stringify(p.read(s).doc));
