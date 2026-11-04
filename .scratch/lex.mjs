import { Marked } from 'marked';
const m = new Marked({ gfm: true, tokenizer: { html() { return false; }, tag() { return false; } } });
const src = '# T\n\n\npara one\nline2\n\n- a\n- b\n\n<div>x</div>\n\n[^1]: note\n\n| A | B |\n|---|---|\n| 1 | 2 |\ntext after <b>bold</b>\n';
const toks = m.lexer(src);
console.log(toks.map(t => [t.type, t.raw]));
console.log('concat equal:', toks.map(t=>t.raw).join('') === src);
