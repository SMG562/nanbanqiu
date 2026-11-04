// 「只改了内存、没写服务器」审计（11-04：6d 漏了印象；徽章「已庆祝」也只在内存）。
// 思路：0495 里被服务器读回去的内存仓库（nbqApply* 里写入的 KUDOS / OPIN / AFTER / BDG …）= 持久数据；
//   这些仓库在别处被改（set / add / delete / push / 赋值）时，同一行或前后 2 行必须能看到真实模式的分支（nbqOn() / NBQ_NET / nbqXxx(）。
//   看不到的列出来：要么补写服务器，要么写进 tests/spec/persist_allow.json 并写明理由（演示专用 / 纯派生 / 只影响本机界面）。
// 用法：node tools/persist_audit.mjs [--list]   有未登记的 → 退出码 1
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = d => fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => path.join(d, f)) : [];
const SRC = [...files('src/shared/script'), ...files('src/pwa/script'), ...files('src/web/script')];
const NET = SRC.filter(f => /0495-/.test(f)), OTHER = SRC.filter(f => !/0495-/.test(f));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
// 1) 持久仓库 = 0495 里被写入的全大写全局变量
const stores = new Set();
for (const f of NET) for (const l of read(f)) for (const m of l.matchAll(/\b([A-Z][A-Z_]{1,})\s*(?:\.(?:set|add|delete|push|clear)\(|\[[^\]]+\]\s*=[^=]|\.length\s*=)/g)) stores.add(m[1]);
for (const s of ['NBQ_BUSY', 'NBQ_ENUM_SEEN', 'VEN', 'USERS', 'GAMES', 'PARTS', 'NOTIFS', 'ME', 'NBQ_NET', 'NBQ_STALE', 'AFTER_T']) stores.delete(s);   // 这几个有自己的路径（读入 / 缓存 / 状态位）
// 2) 其他文件里改这些仓库的地方
const MUT = n => new RegExp(`\\b${n}\\s*(?:\\.(?:set|add|delete|push|unshift|splice|clear)\\(|\\[[^\\]]+\\]\\s*(?:=[^=]|\\+\\+|\\+=)|\\.[a-z_]+\\s*=[^=])`);
const GUARD = /nbqOn\(\)|NBQ_NET|\bnbq[A-Z]\w*\(|bdgOn\(\)|bdgSync\(/;
const allow = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/spec/persist_allow.json'), 'utf8'));
const hits = [];
for (const f of OTHER) { const L = read(f);
  L.forEach((l, i) => { if (/^\s*(\/\/|\/\*|\*)/.test(l)) return;
    for (const n of stores) { if (!MUT(n).test(l)) continue;
      const win = L.slice(Math.max(0, i - 2), i + 3).join('\n'); if (GUARD.test(win)) continue;
      const key = `${path.basename(f)}:${n}:${l.trim().slice(0, 60)}`; const ok = allow.entries.find(e => path.basename(f).startsWith(e.file) && e.store === n && (!e.match || l.includes(e.match)));
      hits.push({ f, line: i + 1, n, ok: !!ok, why: ok && ok.why, text: l.trim().slice(0, 110) }) } }) }
// 3) 整个仓库没有读回：声明过、会被改、但 0495 里从来不写 → 刷新后这类数据一定回到初始。要登记：server（必须补读回）/ local（只影响本机界面）/ demo（只在演示里有）/ derived（别的数据算出来的）
const declared = new Set();
for (const f of OTHER) for (const l of read(f)) for (const m of l.matchAll(/^(?:const|let|var)\s+([A-Z][A-Z_0-9]{1,})\s*=\s*(?:new (?:Map|Set)\(|\{\}|\[\])/g)) declared.add(m[1]);
const unhydrated = [...declared].filter(n => !stores.has(n) && !['NBQ_BUSY', 'NBQ_ENUM_SEEN', 'VEN', 'USERS', 'GAMES', 'PARTS', 'NOTIFS'].includes(n)).filter(n => OTHER.some(f => read(f).some(l => MUT(n).test(l) && !new RegExp(`^(?:const|let|var)\\s+${n}\\b`).test(l.trim()))));
const stBad = unhydrated.filter(n => !(allow.stores || {})[n]);
if (process.argv.includes('--list')) unhydrated.forEach(n => console.log(`${(allow.stores || {})[n] ? '已登记' : '未登记'} 仓库 ${n} 没有读回${(allow.stores || {})[n] ? '：' + allow.stores[n] : ''}`));
else stBad.forEach(n => console.log(`未登记 仓库 ${n}：会被改，但登录读入（0495）从来不写它`));
const bad = hits.filter(h => !h.ok);
if (process.argv.includes('--list')) { console.log('持久仓库：' + [...stores].join(' ')); hits.forEach(h => console.log(`${h.ok ? '允许' : '未登记'} ${h.f}:${h.line} [${h.n}] ${h.ok ? '(' + h.why + ') ' : ''}${h.text}`)) }
else bad.forEach(h => console.log(`未登记 ${h.f}:${h.line} [${h.n}] ${h.text}`));
const debt = Object.entries(allow.stores || {}).filter(([n, w]) => w.startsWith('todo') && unhydrated.includes(n));
debt.forEach(([n, w]) => console.log(`欠账 ${n}：${w}`));
console.log(`persist_audit: ${hits.length - bad.length} 处改动已登记, ${bad.length} 处未登记；${unhydrated.length - stBad.length} 个无读回仓库已登记, ${stBad.length} 个未登记 · 持久仓库 ${stores.size} 个`);
if (bad.length || stBad.length) { console.log('→ 真实模式下这些改动刷新就丢：补写服务器（先调接口，成功后重读），或在 tests/spec/persist_allow.json 登记并写明理由'); process.exit(1) }
