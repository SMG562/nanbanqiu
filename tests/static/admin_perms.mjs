// 第五批 5c：后台页面的权限表 / 错误提示 = 数据库 admin_perms / 规格 §10.4（多一条、少一条、改一个字都会报出来）
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const h = fs.readFileSync(path.join(DIR, '南伴球_后台.html'), 'utf8'), sql = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8'), spec = fs.readFileSync(path.join(HERE, '..', 'spec', 'api_spec.md'), 'utf8');
const grab = n => { const m = h.match(new RegExp(`const ${n}=(\\[[^\\n]*\\]|\\{[^\\n]*\\});`)); return m ? vm.runInNewContext('(' + m[1] + ')') : null };
const FE = grab('ADMIN_PERMS'), FERR = grab('ADMIN_ERR');
// 第七批：场边后台四页还在 南伴球_后台_场边.html，下一批并入 南伴球_后台.html 时再加进页面的权限表 / 错误提示（并入后从这里删掉）
const PENDING_PERMS = ['sideline.config'], PENDING_ERR = ['admin_config_stale'];
const blks = sql.split('insert into admin_perms(').slice(1).map(b => b.slice(0, b.indexOf('on conflict (action) do update')));
const ALL = blks.flatMap(blk => [...blk.matchAll(/\('([a-z_.]+)',\s*'([^']+)',\s*'\{([a-z,]+)\}',\s*(true|false)\)/g)].map(m => [m[1], m[2], m[3].split(','), m[4] === 'true']));
const DB = ALL.filter(d => !PENDING_PERMS.includes(d[0]));
T(`数据库权限表 ${ALL.length} 条（其中待并入后台页面 ${PENDING_PERMS.length} 条：${PENDING_PERMS}）`, ALL.length === 20 && PENDING_PERMS.every(a => ALL.some(d => d[0] === a)), ALL.length);
T('待并入的权限还没出现在后台页面（并入时记得从 PENDING 删掉）', !(FE || []).some(x => PENDING_PERMS.includes(x[0])));
T('后台页面 ADMIN_PERMS 与数据库逐条相同（操作、名称、角色、是否要理由）', JSON.stringify(FE) === JSON.stringify(DB), { 页面: FE && FE.filter(x => !DB.some(d => JSON.stringify(d) === JSON.stringify(x))), 数据库: DB.filter(d => !(FE || []).some(x => JSON.stringify(d) === JSON.stringify(x))) });
T('只读角色只有「查看统计和名单」', DB.filter(d => d[2].includes('viewer')).map(d => d[0]).join() === 'page.view');
T('owner 能做全部操作', DB.every(d => d[2].includes('owner')));
T('封禁、看手机号、带 ID 导出、改规则、管管理员只有 owner', ['user.ban', 'phone.reveal', 'data.export_ids', 'rules.edit', 'admin.manage'].every(a => JSON.stringify(DB.find(d => d[0] === a)[2]) === '["owner"]'));
T('看对话、看手机号、改状态、封禁都必须填理由', ['message.read', 'phone.reveal', 'user.status', 'user.ban'].every(a => DB.find(d => d[0] === a)[3]));
const sec = spec.slice(spec.indexOf('### 10.4'), spec.indexOf('\n---', spec.indexOf('### 10.4')));
const SPA = Object.fromEntries([...sec.matchAll(/^\| (admin_[a-z_]+) \| \d{3} \| ([^|]+) \|/gm)].map(m => [m[1], m[2].trim()]));
const SP = Object.fromEntries(Object.entries(SPA).filter(([k]) => !PENDING_ERR.includes(k)));
T(`规格 §10.4 后台错误码 ${Object.keys(SPA).length} 个（其中待并入后台页面 ${PENDING_ERR.length} 个）`, Object.keys(SPA).length === 8 && PENDING_ERR.every(k => k in SPA));   // R4 加了 admin_city_not_ready
T('后台页面 ADMIN_ERR 与规格逐字相同', JSON.stringify(FERR) === JSON.stringify(SP), { 页面: FERR, 规格: SP });
const used = new Set([...sql.matchAll(/nbq_err\('(admin_[a-z_]+)'/g)].map(m => m[1]));
T('数据库用到的后台错误码都在规格里', [...used].every(c => c in SPA), [...used].filter(c => !(c in SPA)));
// 5d：系统状态卡片 = monitor_thresholds（代码、区域、名称、警告、严重）
const MC = grab('MON_CHECKS'), mb = sql.slice(sql.indexOf('insert into monitor_thresholds('), sql.indexOf('on conflict (code) do update set area'));
const MD = [...mb.matchAll(/\('([a-z_]+)',\s*'(系统|业务)',\s*'([^']+)',\s*([0-9.]+),\s*([0-9.]+|null),/g)].map(m => [m[1], m[2], m[3], +m[4], m[5] === 'null' ? null : +m[5]]);
T(`系统状态 16 项与数据库 monitor_thresholds 逐条相同`, MD.length === 16 && JSON.stringify(MC) === JSON.stringify(MD), { 页面: MC && MC.length, 数据库: MD.length });
const pf = fs.readFileSync(path.join(DIR, 'privacy.html'), 'utf8');
T('隐私政策写了页面报错的上报', /页面出错/.test(pf));
for (const f of ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html']) { const x = fs.readFileSync(path.join(DIR, f), 'utf8'); T(`${f}：有页面报错上报，只报信息和位置`, /window\.NBQ_ERRS=\[\]/.test(x) && /\/api\/client-errors/.test(x) && x.indexOf('NBQ_ERRS') < x.indexOf('<script>') + 400) }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
