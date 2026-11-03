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
// 场边类（sb_*）两端都发（F3 起网页端也接入，去掉了 F2 时「只在手机端」的例外）
const SIDE = [...new Set(rows.filter(r => r[1] === '场边').map(r => r[0]))];
const quoted = (h, x) => new RegExp(`['"]${x}['"]`).test(h);   // 另一端用别的写法发（如 ['report_open',{…}]）也算有
const onlyP = [...eP].filter(x => !eW.has(x) && !quoted(H.web, x)), onlyW = [...eW].filter(x => !eP.has(x) && !quoted(H.pwa, x));
T('两端代码里的事件名一致（只允许 map_day 只在网页）', onlyP.length === 0 && onlyW.every(x => x === 'map_day'), { onlyP, onlyW });
T('场边类事件两端代码里都发出（字典有、代码没有 = 漏了）', SIDE.length === 12 && SIDE.every(x => eP.has(x) && eW.has(x)), SIDE.filter(x => !eP.has(x) || !eW.has(x)));
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
  T('manifest start_url = /melbourne/?source=pwa（统一城市网址）', man.start_url === '/melbourne/?source=pwa', man.start_url);
  for (const s of man.shortcuts || []) {
    const route = (s.url.split('#')[1] || '');
    T(`快捷方式 ${s.name} → #${route} 两端都有路由`, !!route && H.pwa.includes("'#" + route) && H.web.includes("'#" + route) || (H.pwa.includes('#' + route) && H.web.includes('#' + route)), s.url);
  }
}
const sw = read('sw.js');
// 数据库迁移记录（11-03）：每个迁移文件结尾记一行自己；schema.sql（新库一步到位）里有全部版本；拼接文件是最新的
{ const md = 'server/migrations'; if (fs.existsSync(path.join(DIR, md))) {
    const fl = fs.readdirSync(path.join(DIR, md)).filter(f => f.endsWith('.sql') && !f.startsWith('_')).sort(), stems = fl.map(f => f.replace(/\.sql$/, '')), sch = read('schema.sql');
    const noRec = fl.filter(f => !new RegExp(`insert into schema_migrations\\(version\\) values[^;]*'${f.replace(/\.sql$/, '')}'`).test(read(md + '/' + f)));
    T('每个迁移文件结尾都在 schema_migrations 记了自己（没记 = 线上看不出有没有跑）', noRec.length === 0, noRec);
    const noSch = stems.filter(x => !sch.includes(`('${x}')`)); T('schema.sql 的 schema_migrations 里有全部迁移版本（新库一步到位）', noSch.length === 0, noSch);
    const files = fl.filter(f => f > '20261030_zzz').sort((a, b) => (a.includes('schema_migrations') ? -1 : 0) - (b.includes('schema_migrations') ? -1 : 0) || a.localeCompare(b));
    const want = `-- 自动拼接，别手改：node tools/migrate_bundle.mjs\n` + files.map(f => `-- ===== ${f} =====\n${read(md + '/' + f)}`).join('\n');
    T('server/migrations/_bundle.sql 是最新拼的（改了迁移后运行 node tools/migrate_bundle.mjs）', fs.existsSync(path.join(DIR, md, '_bundle.sql')) && read(md + '/_bundle.sql') === want) } }
// 「需要登录」的区域必须走 authView（11-03：刷新时先闪「登录」就是各处各自判断 !ME 造成的）
{ const dirs = ['src/shared/script', 'src/pwa/script', 'src/web/script']; const bad = [];
  for (const d of dirs) { if (!fs.existsSync(path.join(DIR, d))) continue; for (const f of fs.readdirSync(path.join(DIR, d))) { if (!f.endsWith('.js')) continue;
    read(d + '/' + f).split('\n').forEach((l, n) => {
      const login = /data-a="login"/.test(l) || /loginCTA\(/.test(l) && !/const loginCTA=/.test(l);
      const okLine = /authView\(/.test(l) || /function openOtp\(/.test(l) || /const loginCTA=/.test(l);
      if (login && !okLine) bad.push(d + '/' + f + ':' + (n + 1)) }) } }
  T('登录按钮 / 登录入口只出现在 authView 里（新页面不能绕过「恢复登录中」状态）', bad.length === 0, bad) }
T('sw.js 点开通知：窗口已开着就发消息让页面切到通知页（不整页重载），前台接收', /nbq_open_notif/.test(sw) && /nbq_open_notif/.test(read('src/shared/script/0495-接口调用.js')) && !/w\.navigate\(/.test(sw));
T('sw.js 点开通知：认服务器放在 data 里的 url / kind / notif_id；前台读 ?n= 打开通知页', /d\.data/.test(sw) && /NBQ_PUSH_N/.test(read('src/shared/script/0495-接口调用.js')));
T('sw.js 离线壳逐个缓存、失败不影响安装（否则 /melbourne/ 不存在的预览站装不上，推送订阅不了）', /allSettled/.test(sw) && !/addAll/.test(sw));
T('sw.js 点通知打开时带 n / k 参数', /searchParams\.set\('n'/.test(sw) && /searchParams\.set\('k'/.test(sw));
for (const [k, h] of [['PWA', H.pwa], ['Web', H.web]]) T(`${k}：能解析推送打开的 n / k 参数`, /from:'push'/.test(h) && /searchParams\.delete\('n'\)/.test(h) && /searchParams\.delete\('k'\)/.test(h));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
