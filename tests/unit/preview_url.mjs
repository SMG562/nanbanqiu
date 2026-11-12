// 分支预览地址（tools/preview_url.mjs）：用真实部署出来的地址核对别名规则，防止再手拼出不存在的地址。
import { aliasOf, previewURL } from '../../tools/preview_url.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
T('长分支名截到 28 个字符（PR #131 实际部署：claude-wonderful-hawking-nzf）', previewURL('claude/wonderful-hawking-nzfgi7') === 'https://claude-wonderful-hawking-nzf.nanbanqiu-preview.pages.dev', previewURL('claude/wonderful-hawking-nzfgi7'));
T('固定测试地址 staging（开发规矩里写的 staging.nanbanqiu-preview.pages.dev）', previewURL('staging') === 'https://staging.nanbanqiu-preview.pages.dev');
T('斜杠、大写换成 - 和小写', aliasOf('Fix/Owner_Only') === 'fix-owner-only', aliasOf('Fix/Owner_Only'));
T('截断后不以 - 结尾', !/-$/.test(aliasOf('feature/abcdefghijklmnopqrst-uvwxyz')), aliasOf('feature/abcdefghijklmnopqrst-uvwxyz'));
T('别名不超过 28 个字符', aliasOf('x'.repeat(60)).length === 28);
T('main 是预览站本身', previewURL('main') === 'https://nanbanqiu-preview.pages.dev');
console.log(`preview_url: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
