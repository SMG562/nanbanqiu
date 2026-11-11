// 界面动作清单（11-04：入口清单靠人列，漏过球员卡上的印象、徽章已庆祝）。
// 机器扫出 src/ 里所有 data-a / data-sx / data-rcx / data-rc / data-act / data-pact 动作，每个都要有「归类」：
//   write:<测试名>  会改用户数据——真实模式写服务器，且有「改 → 刷新 → 还在」的测试
//   local / nav     只影响本机界面 / 只是跳转、开关弹层
//   baseline        11-04 之前已有、尚未逐个归类（欠账；动到这个动作的 PR 顺手归类，别让它变多）
// 新出现的动作不在清单里 → 退出码 1：开发者必须当场回答「它改不改数据」。
// 用法：node tools/action_audit.mjs [--list] [--seed]（--seed 把当前未登记的全部记成 baseline，只在首次建清单时用）
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const ATTRS = ['a', 'sx', 'rcx', 'rc', 'act', 'pact'];
const found = new Map();
for (const f of walk(path.join(ROOT, 'src')).filter(f => /\.(js|html)$/.test(f))) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(new RegExp(`data-(${ATTRS.join('|')})=\\\\?["']([A-Za-z][A-Za-z0-9_]*)\\\\?["']`, 'g'))) { const k = m[1] + ':' + m[2]; if (!found.has(k)) found.set(k, path.relative(ROOT, f)) } }
const regF = path.join(ROOT, 'tests/spec/actions.json');
const reg = fs.existsSync(regF) ? JSON.parse(fs.readFileSync(regF, 'utf8')) : { 说明: '', actions: {} };
if (process.argv.includes('--seed')) { for (const k of found.keys()) if (!reg.actions[k]) reg.actions[k] = 'baseline'; fs.writeFileSync(regF, JSON.stringify(reg, null, 1) + '\n'); console.log('已写入 ' + found.size + ' 个'); process.exit(0) }
const missing = [...found].filter(([k]) => !reg.actions[k]);
const stale = Object.keys(reg.actions).filter(k => !found.has(k));
const bad = Object.entries(reg.actions).filter(([, v]) => !/^(write:\S+|local|nav|baseline)(\s|：|（|$)/.test(v));
const base = Object.values(reg.actions).filter(v => v === 'baseline').length;
if (process.argv.includes('--list')) for (const [k, v] of Object.entries(reg.actions)) console.log(k.padEnd(28), v);
missing.forEach(([k, f]) => console.log(`未归类 ${k}（${f}）`));
bad.forEach(([k, v]) => console.log(`归类写法不对 ${k}：${v}`));
console.log(`action_audit: ${found.size} 个动作, ${missing.length} 个未归类, ${bad.length} 个写法不对, 欠账 baseline ${base} 个, 清单里多余 ${stale.length} 个`);
if (missing.length || bad.length) { console.log('→ 在 tests/spec/actions.json 给它们归类：write:<测试名>（会改数据，必须有「刷新后还在」测试）/ local / nav。拿不准就按「会改数据」处理。'); process.exit(1) }
