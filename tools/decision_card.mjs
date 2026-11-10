// 决定卡 + 级别判定（ADR 0010，11-10）。
//   node tools/decision_card.mjs <PR 号>                  打印五行决定卡（可贴进 PR 描述顶部）
//   git diff --name-only ... | node tools/decision_card.mjs --level   从标准输入读文件名，打印 owner / review / self
// 级别：owner = 动了 CODEOWNERS 里的红线（只有所有者能合）；review = 需要「独立复核：通过 <提交号前 7 位>」留言；self = 自助合并。
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// 需要独立复核的路径（协作实践.md §11：C/D/E）
export const REVIEW = [/^src\/shared\/script\/(0130|0140|0155|0495)/, /^server\/(api|admin)\//, /^server\/migrations\//, /^schema\.sql$/, /^tools\//, /^\.github\//, /^\.claude\/skills\//, /^functions\//];
const toRe = p => { const d = p.endsWith('/'); let s = p.replace(/^\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'); return new RegExp('^' + s + (d ? '' : '$|^' + s + '/')) };
// CODEOWNERS 里写了 @SMG562 的行 = 红线
export const redLines = text => text.split('\n').filter(l => /^\//.test(l) && /@SMG562/.test(l)).map(l => toRe(l.trim().split(/\s+/)[0]));
export function levelOf(files, codeownersText) {
  const red = redLines(codeownersText); const owner = files.filter(f => red.some(r => r.test(f)));
  const review = files.filter(f => !owner.includes(f) && REVIEW.some(r => r.test(f)));
  return { level: owner.length ? 'owner' : review.length ? 'review' : 'self', owner, review };
}
const CO = () => fs.readFileSync(path.join(ROOT, '.github/CODEOWNERS'), 'utf8');
const gh = (...a) => execFileSync('gh', ['api', ...a], { encoding: 'utf8' });
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv[2];
  if (a === '--level') { const files = fs.readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean); console.log(levelOf(files, CO()).level); process.exit(0) }
  const R = 'repos/SMG562/nanbanqiu';
  const pr = JSON.parse(gh(`${R}/pulls/${a}`));
  const files = JSON.parse(gh('--paginate', `${R}/pulls/${a}/files`, '--jq', '[.[]|{f:.filename,a:.additions,d:.deletions}]').replace(/\]\s*\[/g, ','));
  const L = levelOf(files.map(x => x.f), CO());
  const runs = JSON.parse(gh(`${R}/actions/runs?head_sha=${pr.head.sha}&per_page=50`)).workflow_runs;
  const st = w => { const r = runs.filter(x => x.path === `.github/workflows/${w}.yml`).sort((x, y) => x.created_at < y.created_at ? 1 : -1)[0]; return r ? (r.status === 'completed' ? (r.conclusion === 'success' ? '✅' : '❌') : '⏳') : '—' };
  const add = files.reduce((s, x) => s + x.a, 0), del = files.reduce((s, x) => s + x.d, 0);
  const mig = files.some(x => /^server\/migrations\//.test(x.f));
  console.log([
    `**改了什么**：${pr.title}（${files.length} 个文件，+${add}/-${del}）`,
    `**影响面 / 级别**：${{ owner: '红线（只有所有者能合）：' + L.owner.slice(0, 5).join('、'), review: '需独立复核：' + L.review.slice(0, 5).join('、'), self: '自助合并（无红线、无需复核）' }[L.level]}`,
    `**CI（${pr.head.sha.slice(0, 7)}）**：tests-fast ${st('tests-fast')} · tests ${st('tests')}${pr.draft ? ' · 草稿（未跑浏览器测试）' : ''}`,
    `**怎么回滚**：${mig ? '迁移只往前、向后兼容（先加后删）；前端回退本 PR' : '回退本 PR（git revert 合并提交）'}`,
    `**需要所有者做**：${L.level === 'owner' ? '批准红线文件：' + L.owner.length + ' 个' : '无'}`].join('\n'));
}
