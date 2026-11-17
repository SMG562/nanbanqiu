#!/usr/bin/env node
// 每周经验提炼的「收集」一步（确定性、不用模型）：输出最近 N 天（默认 7）的素材，≤ 60 行，只含摘要不含对话。
// 素材 = ① Issue/PR 评论里「踩过的坑」行（交接固定格式）② 逃逸缺陷.md / 技能 / 开发规矩 的近期提交 ③ 技能各条规则体量。
// 用法：node tools/lib/lessons_digest.mjs [天数]；出错不崩，只少一类素材。判断和改写由定时会话做（技能 §十一）。
import { execFileSync } from 'node:child_process';
const days = +process.argv[2] || 7, since = new Date(Date.now() - days * 864e5).toISOString();
const sh = (c, a) => { try { return execFileSync(c, a, { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return '' } };
export const pitfalls = bodies => bodies.flatMap(b => String(b || '').split('\n').filter(l => /踩过的坑|教训|复发|第二次/.test(l)).map(l => l.replace(/[*_`]/g, '').trim().slice(0, 160)));
export const dupes = lines => { const k = l => l.replace(/\W+/g, '').slice(0, 24), m = new Map(); for (const l of lines) m.set(k(l), (m.get(k(l)) || 0) + 1); return [...m].filter(([, n]) => n > 1).map(([x]) => x) };
// 规则体检：每条编号规则 = 一行；年龄取 git blame 的提交日期；「近期被用到」= 它点名的 #号 / `脚本名` 在近 30 天提交说明或评论里出现过。老（>30 天）且没被用到 = 候选删除（时效性）；有 #号证据却从没出现 = 证据缺失
export const ruleKeys = line => [...new Set([...(line.match(/#\d{2,4}/g) || []), ...(line.match(/`([\w./-]+\.(?:mjs|sh|js))`/g) || []).map(x => x.replace(/`/g, ''))])];
export const stale = (age, hits, days = 30) => age > days && hits === 0;
if (process.argv[1] && process.argv[1].endsWith('lessons_digest.mjs')) {
  let bodies = []; try { bodies = JSON.parse(sh('gh', ['api', '-X', 'GET', `repos/SMG562/nanbanqiu/issues/comments`, '-f', `since=${since}`, '-f', 'per_page=100']) || '[]').map(c => c.body) } catch { }
  const p = pitfalls(bodies); console.log(`## ① 近 ${days} 天评论里的踩坑 / 教训（${p.length} 条，重复 ${dupes(p).length} 组 = 该升级成自动检查）`); p.slice(0, 25).forEach(l => console.log('- ' + l));
  console.log('## ② 近期改动过的经验文档'); console.log(sh('git', ['log', `--since=${since}`, '--oneline', '--', '逃逸缺陷.md', '.claude/skills', '开发规矩.md']).split('\n').slice(0, 15).join('\n') || '（无）');
  console.log('## ③ 规则体检（老 >30 天且近 30 天没被用到 = 候选删除；净增行数必须 ≤ 0）');
  const recent = sh('git', ['log', '--since=30 days ago', '--format=%s%n%b']) + bodies.join('\n'), f = '.claude/skills/collaborator-pitfalls/SKILL.md', txt = sh('git', ['show', 'HEAD:' + f]).split('\n'), bl = sh('git', ['blame', '--date=short', '-e', f]).split('\n'); let n = 0, un = 0;
  txt.forEach((l, i) => { if (!/^\d+\.\s/.test(l)) return; const d = (/(\d{4}-\d{2}-\d{2})/.exec(bl[i] || '') || [])[1], age = d ? Math.round((Date.now() - Date.parse(d)) / 864e5) : 0, keys = ruleKeys(l), hits = keys.filter(k => recent.includes(k)).length;
    if (stale(age, hits)) { n++; console.log(`- 候选删除（${age} 天、近期 0 次引用）：${l.slice(0, 60)}`) } else if (!keys.length) { if (age <= 30) { n++; if (n <= 5) console.log(`- 新规则缺证据（要写 #号 / 脚本名）：${l.slice(0, 60)}`) } else un++ } });
  if (un) console.log(`（另有 ${un} 条旧规则没写证据、无法自动检验：提炼时顺手补 #号 / 脚本名，补不出的就是该删的）`);
  if (n > 5) console.log(`…（共 ${n} 条要补证据 / 候选删除，仓库还不满 30 天，现在多数是「新规则」，满 30 天后才开始出现真正的候选删除）`); if (!n) console.log('（无）');
  console.log(sh('bash', ['-c', 'wc -l .claude/skills/*/SKILL.md']).trim());
}
