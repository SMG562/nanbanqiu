// 通知机制本身也是「两边共用的规矩」（11-18，#363）：它的文件一改，另一侧要被自动告知，不靠人记得发。
// 「哪些文件算通知机制」在四个地方各有一份清单（工作流触发器 / 工作流 git diff 过滤 / SessionStart 钩子 / handoff_check），这里守它们一致——漂移（只改一处）会红。
import fs from 'node:fs'; import path from 'node:path';
const DIR = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
export const MACHINERY = ['tools/collab_board.mjs', 'tools/pr_say.sh', '.github/workflows/collab-board.yml', '.github/workflows/proposals.yml', 'docs/协作分工.md', 'docs/roadmap.md'];
const norm = x => x.replace(/^['"]|['"]$/g, '').replace(/\/\*\*$/, '');
const yml = rd('.github/workflows/proposals.yml'), settings = rd('.claude/settings.json'), handoff = rd('tools/handoff_check.sh');
const paths = ((/paths:\s*\[([^\]]*)\]/.exec(yml) || [])[1] || '').split(',').map(s => norm(s.trim())).filter(Boolean);
const spec = ((/git (?:-c core\.quotepath=off )?diff --name-only "\$BEFORE" "\$SHA" -- ([^|]*)\|/.exec(yml) || [])[1] || '').trim().split(/\s+/).map(norm).filter(Boolean);
// 11-18 首次演练的缺陷：通知里中文文件名成了 "docs/\345\..." 八进制转义、提交标题被 cut -c（按字节）切成半个汉字。消息是发给人看的，所以不能靠「只给人看不查」放过
T('通知里的文件名带 core.quotepath=off（中文名不转义）', /git -c core\.quotepath=off diff --name-only "\$BEFORE"/.test(yml));
T('通知里的提交标题不用 cut -c（按字节，会切坏汉字）', !/git log --format='%s'[^\n]*\bcut\s+-c/.test(yml));
const hook = (/git diff --name-only HEAD origin\/main -- ([^2]*?) 2>\/dev\/null/.exec(settings) || [])[1] || '';
T('触发器 paths 与 git diff 过滤是同一组（只差 .claude/** 的写法）', paths.length > 0 && [...paths].sort().join() === [...spec].sort().join(), { paths, spec });
for (const f of MACHINERY) {
  T(`proposals.yml 的触发器和过滤都盯着 ${f}`, paths.includes(f) && spec.includes(f));
  T(`SessionStart 钩子盯着 ${f}（协作者开工会提示 git pull）`, hook.split(/\s+/).includes(f), hook);
}
for (const f of ['tools/collab_board.mjs', 'tools/pr_say.sh', 'docs/协作分工.md', 'docs/roadmap.md']) T(`handoff_check「近 7 天协作规则变化」盯着 ${f}`, handoff.includes(f));
console.log(`notify_watch: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
