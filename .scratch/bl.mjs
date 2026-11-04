import { createPipeline } from '../packages/react/dist/rich-text/pipeline.js';
const p = createPipeline();
for (const md of ["- |.\"\_\t\`  \n-\~:-", "- a  \n-\~:-", "- a  \n-b", "- a\\n-b", "- a  \nb", "- a  \n  -b"]) console.log(JSON.stringify(md), JSON.stringify(p.read(md).doc.content));
