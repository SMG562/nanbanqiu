// 南伴球 · 静态检查（不开浏览器，几秒钟）：文件齐全、语法、事件字典、两端一致、取值对齐、版本指纹。
// 用法：node static/check.mjs [被测文件目录]   退出码 0 = 通过
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(process.argv[2] || process.env.NBQ_DIR || path.join(here, '..', '..'));
const SPEC = path.join(here, '..', 'spec', 'events_spec.md');
let pass = 0, fail = 0;
const T = (name, ok, detail) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? ' → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')) };
const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const FILES = ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'schema.sql', 'sw.js', 'manifest.webmanifest'];

// 0. 文件齐全 + 指纹（写进报告，便于确认测的是哪一版）
for (const f of FILES) T('文件存在 ' + f, fs.existsSync(path.join(DIR, f)));
if (fail) process.exit(1);
for (const f of FILES) { const b = fs.readFileSync(path.join(DIR, f)); console.log(`INFO ${f} ${b.length} bytes sha256=${crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)}`) }

// 1. 语法：三个页面的 <script> 内联代码 + sw.js
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-'));
const syntax = (name, code) => { const f = path.join(tmp, name.replace(/[^\w.]/g, '_') + '.js'); fs.writeFileSync(f, code);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); T('语法 ' + name, true) } catch (e) { T('语法 ' + name, false, String(e.stderr).split('\n').slice(0, 4).join(' | ')) } };
const scripts = h => [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const H = { pwa: read('南伴球_PWA.html'), web: read('南伴球_Web.html'), adm: read('南伴球_后台.html') };
syntax('PWA', scripts(H.pwa)); syntax('Web', scripts(H.web)); syntax('后台', scripts(H.adm)); syntax('sw.js', read('sw.js'));

// 2. 事件字典本身
const specTxt = fs.readFileSync(SPEC, 'utf8');
const rows = specTxt.split('\n').filter(l => /^\| [a-z0-9_]+ \|/.test(l)).map(l => l.split('|').slice(1, -1).map(x => x.trim()));
const names = rows.map(r => r[0]), NAMES = new Set(names);
T('字典：事件名不重复', names.length === NAMES.size, names.filter((n, i) => names.indexOf(n) !== i));
T('字典：来源只有 C / S', rows.every(r => r[2] === 'C' || r[2] === 'S'), rows.filter(r => !['C', 'S'].includes(r[2])).map(r => r[0]));
T('字典：每行 5 列（事件、分类、来源、说明、props）', rows.every(r => r.length === 5), rows.filter(r => r.length !== 5).map(r => r[0]));
const depLine = (specTxt.match(/^不再使用.*$/m) || [''])[0];
const DEPRECATED = [...new Set([...depLine.matchAll(/([a-z][a-z0-9_]+)(?=\s*(?:\/|→|；|$|,|，|（))/g)].map(m => m[1]).filter(n => !NAMES.has(n)))];
T('字典：废弃名单可解析', DEPRECATED.length >= 8, DEPRECATED);
console.log('INFO 字典 ' + NAMES.size + ' 个事件；废弃 ' + DEPRECATED.join(', '));

// 3. 前台：代码里直接写出的事件名都在字典里，废弃名不再出现，两端一致
const evNames = h => new Set([...h.matchAll(/\btrack\(\s*['"]([a-z0-9_]+)['"]/g), ...h.matchAll(/\bev:\s*['"]([a-z0-9_]+)['"]/g)].map(m => m[1]));
for (const [k, h] of [['PWA', H.pwa], ['Web', H.web]]) {
  const used = evNames(h), out = [...used].filter(n => !NAMES.has(n) && n !== 'ui_action');
  T(`${k}：代码里的事件名都在字典里（静态，共 ${used.size} 个）`, out.length === 0, out);
  const dep = DEPRECATED.filter(d => new RegExp(`['"]${d}['"]`).test(h));
  T(`${k}：不再使用废弃的事件名`, dep.length === 0, dep);
}
const eP = evNames(H.pwa), eW = evNames(H.web);
const onlyP = [...eP].filter(x => !eW.has(x)), onlyW = [...eW].filter(x => !eP.has(x));
T('两端代码里的事件名一致（允许 map_day 只在网页）', onlyP.length === 0 && onlyW.every(x => x === 'map_day'), { onlyP, onlyW });
const demos = h => [...h.matchAll(/data-demo="([a-z0-9_]+)"/g)].map(m => m[1]).join(',');
T('两端演示菜单相同（内容与顺序）', demos(H.pwa) === demos(H.web), { pwa: demos(H.pwa), web: demos(H.web) });
T('PWA 构建标记 = pwa', /AN_BUILD\s*=\s*['"]pwa['"]/.test(H.pwa)); T('Web 构建标记 = web', /AN_BUILD\s*=\s*['"]web['"]/.test(H.web));

// 4. 取值对齐：婉拒原因、参加状态、暂停时长
const REASONS = ['known', 'level', 'pass', 'full_auto', 'timeout', 'blocked'];
const sch = read('schema.sql');
const lastDecl = [...sch.matchAll(/check\s*\(\s*decline_reason\s+in\s*\(([^)]*)\)/gi)].filter(m => !/week|rest/.test(m[1])).pop();   // 球局婉拒的最后一次约束定义（排除邀约的 week/rest/pass）
const schReasons = lastDecl ? [...lastDecl[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]) : [];
T('数据库婉拒原因 = known/level/pass/full_auto/timeout/blocked', schReasons.sort().join() === [...REASONS].sort().join(), schReasons);
for (const [k, h] of [['PWA', H.pwa], ['Web', H.web]]) {
  const wrote = [...h.matchAll(/\breason\s*=\s*'([a-z_]+)'/g)].map(m => m[1]);
  T(`${k}：写入的自动婉拒原因都在数据库允许范围内`, wrote.every(x => REASONS.includes(x)), wrote);
  T(`${k}：撤回 / 退出保留记录（withdrawn / left + left_at）`, /status\s*=\s*p\.status===?'approved'\?'left':'withdrawn'/.test(h) && /left_at\s*=\s*Date\.now\(\)/.test(h));
}
T('数据库参加状态包含 withdrawn / left', /part_status\s+as\s+enum\s*\([^)]*'withdrawn'[^)]*'left'/.test(sch));
T('后台暂停时长 1/3/7/30/90/180 天', /1 \/ 3 \/ 7 \/ 30 \/ 90 \/ 180/.test(H.adm) && !/到人工解除/.test(H.adm));
// 举报原因：前台两端 REP_REASONS = 后台 REP_RC 前 5 个 = 数据库站内允许的原因；后台全部原因 = 数据库 reports.reason
{ const fr = h => { const m = h.match(/const REP_REASONS=\[([\s\S]*?)\];/); return m ? [...m[1].matchAll(/\['([a-z_]+)'/g)].map(x => x[1]) : [] };
  const adm = (H.adm.match(/const REP_RC=\{([^}]*)\}/) || ['', ''])[1].match(/[a-z_]+(?=:)/g) || [];
  const inApp = ((sch.match(/when source = 'in_app'[\s\S]*?reason in \(([^)]*)\)/) || ['', ''])[1].match(/'([a-z_]+)'/g) || []).map(x => x.slice(1, -1));
  const all = ((sch.match(/reason\s+text not null check \(reason in \(([^)]*)\)\)/) || ['', ''])[1].match(/'([a-z_]+)'/g) || []).map(x => x.slice(1, -1));
  const P = fr(H.pwa), W = fr(H.web);
  T('举报原因：两端相同且为 5 个', P.length === 5 && P.join() === W.join(), [P, W]);
  T('举报原因：前台 = 数据库站内允许的原因 = 后台前 5 个', P.join() === inApp.join() && P.join() === adm.slice(0, 5).join(), [P, inApp, adm]);
  T('举报原因：后台全部原因 = 数据库 reports.reason', adm.slice().sort().join() === all.slice().sort().join(), [adm, all]); }
// 第二批第 2 轮：球场页未上线、区域配置仅展示
T('后台：球场页标「未上线」且不再统计评价', /球场页暂未上线/.test(H.adm) && !/kpi\('球友评价'/.test(H.adm) && !/'rating','reviews'/.test(H.adm));
T('后台：区域配置标「仅展示」且没有修改按钮', /仅展示/.test(H.adm) && !/data-ar="(pin|unpin|alias|unalias|open|pause|prep)"/.test(H.adm));
T('后台不再出现「照片头像」', !/照片 ?\/ ?首字母|照片头像/.test(H.adm));

// 5. 推送与快捷方式
let man = null; try { man = JSON.parse(read('manifest.webmanifest')) } catch (e) { }
T('manifest 是合法 JSON', !!man);
if (man) {
  T('manifest start_url = /?source=pwa', man.start_url === '/?source=pwa', man.start_url);
  for (const s of man.shortcuts || []) {
    const route = (s.url.split('#')[1] || '');
    T(`快捷方式 ${s.name} → #${route} 两端都有路由`, !!route && H.pwa.includes("'#" + route) && H.web.includes("'#" + route) || (H.pwa.includes('#' + route) && H.web.includes('#' + route)), s.url);
  }
}
const sw = read('sw.js');
T('sw.js 点通知打开时带 n / k 参数', /searchParams\.set\('n'/.test(sw) && /searchParams\.set\('k'/.test(sw));
for (const [k, h] of [['PWA', H.pwa], ['Web', H.web]]) T(`${k}：能解析推送打开的 n / k 参数`, /from:'push'/.test(h) && /searchParams\.delete\('n'\)/.test(h) && /searchParams\.delete\('k'\)/.test(h));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
