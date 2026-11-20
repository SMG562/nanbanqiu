// 分支预览站地址（11-10）：不要按分支名手拼——Cloudflare Pages 会把分支名改成别名，太长还会截断。
//   11-09 记过一次「拼的地址不存在」，11-09 PR #131 又犯一次（同类第二次 → 做成工具）。
//   规则（以实际部署结果核对过：claude/wonderful-hawking-nzfgi7 → claude-wonderful-hawking-nzf）：
//   小写；字母数字以外的字符换成 -；截到 28 个字符；去掉首尾的 -。
//   最终以 PR 上「Cloudflare Pages」检查里的 Branch Preview URL 为准（部署失败时这个地址打不开）。
// 用法：node tools/preview_url.mjs [分支名] [--contents]　（不写就用当前分支；--contents 另列「预览不含」哪些未合并的重叠分支，#454）
import { execFileSync, spawnSync } from 'child_process'; import { fileURLToPath } from 'url'; import { realpathSync } from 'fs';
export const HOST = 'nanbanqiu-preview.pages.dev';
export function aliasOf(branch) {
  return String(branch || '').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 28).replace(/^-+|-+$/g, '');
}
// 别名为空（空串、只有符号、纯中文分支名）→ 返回空串，不拼出打不开的「https://.nanbanqiu-preview…」（#190 复核建议）
export const previewURL = branch => branch === 'main' ? `https://${HOST}` : (aliasOf(branch) ? `https://${aliasOf(branch)}.${HOST}` : '');
// #454：预览站只含本分支自己。列出「有未合并改动、与本分支改的文件重叠、又不是本分支祖先」的 origin/* 分支（只用 git；已被压缩合并进 main 的内容与 main 一致，不会误报）。
export function unmergedOverlaps({ cwd = '.', base = 'origin/main', head = 'HEAD', env = process.env } = {}) {
  const g = (...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env }).trim(), L = s => s ? s.split('\n') : [];
  const mine = new Set(L(g('diff', '--name-only', `${base}...${head}`)));
  const out = [];
  for (const r of L(g('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'))) {
    if (r === base || r === 'origin' || r.endsWith('/HEAD')) continue;
    if (spawnSync('git', ['merge-base', '--is-ancestor', r, head], { cwd, env }).status === 0) continue;
    const theirs = new Set(L(g('diff', '--name-only', `${base}...${r}`)));
    const differs = new Set(L(g('diff', '--name-only', base, r)));
    const n = [...theirs].filter(f => mine.has(f) && differs.has(f)).length;
    if (n) out.push({ branch: r.replace(/^origin\//, ''), files: n });
  }
  return out;
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const pos = process.argv.slice(2).filter(a => !a.startsWith('--')); const b = pos[0] || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
  console.log(previewURL(b) || `（分支名「${b}」算不出预览别名，以 PR 上「Cloudflare Pages」检查为准）`);
  console.log('（推送后约 1 分钟部署好；以 PR 上「Cloudflare Pages」检查里的 Branch Preview URL 为准）');
  if (process.argv.includes('--contents')) {
    const o = unmergedOverlaps({ head: pos[0] ? `origin/${pos[0]}` : 'HEAD' });
    console.log(o.length ? o.map(x => `⚠ 预览不含：${x.branch}（重叠 ${x.files} 个文件）`).join('\n') : '预览含 / 不含：没有与本分支重叠的未合并分支');
  }
}
