import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MarkdownManager } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
const exts = [StarterKit.configure({ underline: false }), TaskList, TaskItem.configure({ nested: true }), TableKit, Image.configure({ inline: true })];
const schema = getSchema(exts);
const mm = new MarkdownManager({ extensions: exts });
const samples = [
 '# Title\n\nSome **bold** and *italic* and ~~strike~~ and `code`.',
 '- a\n- b\n  - nested\n- c',
 '1. one\n2. two',
 '- [ ] open\n- [x] done',
 '> quote line',
 '```ts\nconst a = 1;\n```',
 '---',
 '[link](https://x.test) and ![alt](/img.png)',
 '| A | B |\n| :-- | --: |\n| 1 | 2 |',
 'Hello {{customer.name}}, ticket {{ticket.id}} is ready.',
 'Grüße aus Köln — Straße ÄÖÜ ß',
 'Rollback done ✅ 👩‍💻 👨‍👩‍👧‍👦 🏳️‍🌈',
 'snake_case and a*b and 2 * 3',
 'line one\nline two',
 '<div>raw html</div>',
 'Footnote[^1]\n\n[^1]: note',
];
for (const s of samples) {
  try { const json = mm.parse(s);
  const node = schema.nodeFromJSON(json); node.check();
  const out = mm.serialize(node.toJSON());
  console.log(out === s ? 'SAME ' : 'DIFF ', JSON.stringify(s), out === s ? '' : '=> ' + JSON.stringify(out)); } catch (e) { console.log('ERR  ', JSON.stringify(s), e.message); }
}
