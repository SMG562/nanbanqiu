// 分支预览地址（tools/preview_url.mjs）：用真实部署出来的地址核对别名规则，防止再手拼出不存在的地址。
import { aliasOf, previewURL, unmergedOverlaps } from '../../tools/preview_url.mjs';
import { execFileSync } from 'node:child_process'; import { cleanGitEnv } from '../lib/git_env.mjs'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
T('长分支名截到 28 个字符（PR #131 实际部署：claude-wonderful-hawking-nzf）', previewURL('claude/wonderful-hawking-nzfgi7') === 'https://claude-wonderful-hawking-nzf.nanbanqiu-preview.pages.dev', previewURL('claude/wonderful-hawking-nzfgi7'));
T('固定测试地址 staging（开发规矩里写的 staging.nanbanqiu-preview.pages.dev）', previewURL('staging') === 'https://staging.nanbanqiu-preview.pages.dev');
T('斜杠、大写换成 - 和小写', aliasOf('Fix/Owner_Only') === 'fix-owner-only', aliasOf('Fix/Owner_Only'));
T('截断后不以 - 结尾', !/-$/.test(aliasOf('feature/abcdefghijklmnopqrst-uvwxyz')), aliasOf('feature/abcdefghijklmnopqrst-uvwxyz'));
T('别名不超过 28 个字符', aliasOf('x'.repeat(60)).length === 28);
T('main 是预览站本身', previewURL('main') === 'https://nanbanqiu-preview.pages.dev');
T('别名为空（空串、只有符号、纯中文）→ 不输出地址', ['', '---', '球友'].every(b => previewURL(b) === ''), ['', '---', '球友'].map(previewURL));

// #454 --contents：在临时仓库造「重叠未合并 / 不重叠 / 已压缩合并 / 本分支祖先」四种远端分支
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pu-')); const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', env: { ...cleanGitEnv(), GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
  const w = (f, t) => fs.writeFileSync(path.join(d, f), t); const commit = m => { g('add', '-A'); g('commit', '-qm', m); return g('rev-parse', 'HEAD'); };
  g('init', '-q', '-b', 'main'); w('a.js', '1'); w('b.js', '1'); w('c.js', '1'); const m0 = commit('m0'); g('update-ref', 'refs/remotes/origin/main', m0);
  g('checkout', '-q', '-b', 'ov', m0); w('a.js', 'ov'); g('update-ref', 'refs/remotes/origin/ov', commit('ov'));          // 与本分支重叠 a.js
  g('checkout', '-q', '-b', 'far', m0); w('c.js', 'far'); g('update-ref', 'refs/remotes/origin/far', commit('far'));      // 不重叠
  g('checkout', '-q', '-b', 'sq', m0); w('a.js', 'sq'); const sq = commit('sq'); g('update-ref', 'refs/remotes/origin/sq', sq); // 内容已压缩合并进 main
  g('checkout', '-q', 'main'); w('a.js', 'sq'); g('update-ref', 'refs/remotes/origin/main', commit('squash sq'));
  g('checkout', '-q', '-b', 'me', 'main'); w('a.js', 'me'); w('b.js', 'me'); commit('me');
  const r = unmergedOverlaps({ cwd: d, env: cleanGitEnv() }); const names = r.map(x => x.branch);
  T('--contents：与本分支改了同一文件的未合并分支 → 报出', names.includes('ov') && r.find(x => x.branch === 'ov').files === 1, r);
  T('--contents：不重叠的未合并分支 → 不报', !names.includes('far'), r);
  T('--contents：已压缩合并进 main 的分支 → 不报', !names.includes('sq'), r);
  g('update-ref', 'refs/remotes/origin/anc', g('rev-parse', 'HEAD~1'));
  T('--contents：本分支的祖先 → 不报', !unmergedOverlaps({ cwd: d, env: cleanGitEnv() }).some(x => x.branch === 'anc'));
  T('--contents：origin/main 自己不报', !names.includes('main'));
  fs.rmSync(d, { recursive: true, force: true });
}
console.log(`preview_url: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
