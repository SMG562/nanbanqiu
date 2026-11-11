// #27 第 1 步：后台接口的「结构」守卫（不连数据库，几十毫秒）。出问题的典型方式都在这里拦：
//   路由没声明权限 / 声明了表里没有的权限 · 数据库新增了后台错误码却没给 HTTP 状态 · 部署入口漏了 /admin/api 或误用前台数据库连接 · 后台代码偷偷换回 nbq_service
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
const SITE = await import(pathToFileURL(path.join(DIR, 'tools/site.mjs')));
const ROUTE = await import(pathToFileURL(path.join(DIR, 'server/routes.mjs')));
const sql = rd('schema.sql'), spec = rd('tests/spec/api_spec.md');

// ---- 路由表 ----
const R = Object.entries(API.ROUTES), PUBLIC = ['health', 'login', 'logout'];
const permsSql = sql.split('insert into admin_perms(').slice(1).flatMap(b => [...b.slice(0, b.indexOf('on conflict (action) do update')).matchAll(/\('([a-z_.]+)',/g)].map(m => m[1]));
T(`路由表有 ${R.length} 条，键是「方法 /admin/api/…」`, R.length >= 4 && R.every(([k]) => /^(GET|POST) \/admin\/api\/[a-z_/]+$/.test(k)), R.map(r => r[0]));
T('路由名字不重复', new Set(R.map(([, v]) => v.name)).size === R.length);
T('公开路由只有 health / login / logout，其余都必须声明权限', R.every(([, v]) => v.public ? PUBLIC.includes(v.name) : !!v.perm), R.filter(([, v]) => v.public ? !PUBLIC.includes(v.name) : !v.perm).map(r => r[0]));
T(`每条路由声明的权限都在数据库 admin_perms 里（共 ${permsSql.length} 条）`, R.every(([, v]) => !v.perm || permsSql.includes(v.perm)), R.filter(([, v]) => v.perm && !permsSql.includes(v.perm)).map(r => [r[0], r[1].perm]));
T('只有 health 可以不带自定义头（其余一律防跨站）', R.every(([, v]) => !v.noCsrf || v.name === 'health'));
T('写入类（POST）路由都声明了 body（走 JSON 解析和大小限制）', R.every(([k, v]) => !k.startsWith('POST ') || v.body === true));

// ---- 错误码 → HTTP 状态 ----
const used = [...new Set([...sql.matchAll(/nbq_err\('(admin_[a-z_]+)'/g)].map(m => m[1]))];
const sec = spec.slice(spec.indexOf('### 10.4'), spec.indexOf('\n---', spec.indexOf('### 10.4')));
const inSpec = [...sec.matchAll(/^\| (admin_[a-z_]+) \| \d{3} \|/gm)].map(m => m[1]);
T(`schema 里所有后台错误码（${used.length} 个）都在 ADMIN_STATUS 里`, used.every(c => c in API.ADMIN_STATUS), used.filter(c => !(c in API.ADMIN_STATUS)));
T(`规格 §10.4 的后台错误码（${inSpec.length} 个）都在 ADMIN_STATUS 里，且状态码一致`, inSpec.every(c => {
  const m = sec.match(new RegExp(`^\\| ${c} \\| (\\d{3}) \\|`, 'm')); return c in API.ADMIN_STATUS && +m[1] === API.ADMIN_STATUS[c] }),
  inSpec.map(c => [c, API.ADMIN_STATUS[c], (sec.match(new RegExp(`^\\| ${c} \\| (\\d{3}) \\|`, 'm')) || [])[1]]));
T('通用码 invalid / not_found / state_changed / rate_limited 也有状态', ['invalid', 'not_found', 'state_changed', 'rate_limited'].every(c => c in API.ADMIN_STATUS));
T('没有被映射成 2xx / 3xx 的错误码', Object.values(API.ADMIN_STATUS).every(s => s >= 400 && s < 600));

// ---- 部署入口 ----
T('Pages 的 _routes.json 包含 /admin/api/*（漏了会落到静态文件，返回 404 网页而不是 JSON）', SITE.ROUTES.include.includes('/admin/api/*'), SITE.ROUTES.include);
T('站点路由放行 /admin（不会被改写成城市页面）', ROUTE.PASS.test('/admin/api/me') && ROUTE.PASS.test('/admin/api'));
const code = s => s.replace(/\/\/.*$/gm, '');
const apis = code(fs.readFileSync(path.join(DIR, 'server/admin/api.mjs'), 'utf8'));
const fn = rd('functions/admin/api/[[path]].js'), wk = rd('worker/index.mjs'), cn = rd('server/admin/connect.mjs');
T('Pages 入口用 handleAdmin + connectAdminFromEnv', /handleAdmin/.test(fn) && /connectAdminFromEnv/.test(fn));
T('Workers 入口也分流到 handleAdmin，且排在 /api 分流之前', /isAdminPath/.test(wk) && wk.indexOf('handleAdmin(request') < wk.indexOf('handleApi(request'));
const adminBlk = wk.slice(wk.indexOf('isAdminPath(new'), wk.indexOf('isAdminPath(new') + 200);
const notFront = s => !/\bDB_URL\b|HYPERDRIVE|\bconnectFromEnv\b/.test(code(s).replace(/ADMIN_DB_URL/g, ''));
T('后台入口和连接代码绝不碰前台的 DB_URL / HYPERDRIVE / connectFromEnv', [fn, adminBlk, cn].every(notFront));
T('Pages / Workers 入口都把 env.ADMIN_HOSTS 传给 handleAdmin（没配 = 全部 404）', /hosts: parseHosts\(env\.ADMIN_HOSTS\)/.test(fn) && /hosts: parseHosts\(env\.ADMIN_HOSTS\)/.test(wk));
T('handleAdmin 第一件事是查域名白名单（在路由、CSRF、数据库之前）', (() => { const b = apis.slice(apis.indexOf('export async function handleAdmin')); return b.indexOf('hostAllowed') > 0 && b.indexOf('hostAllowed') < b.indexOf('ROUTES[') })());
T('连接代码只读 ADMIN_DB_URL', /env\?\.ADMIN_DB_URL/.test(cn));

// ---- 最小权限 ----
const auth = code(rd('server/admin/auth.mjs'));
T('后台代码里不再有 nbq_service / nbq_user（不切到前台那套权限）', !/nbq_service|nbq_user/.test(auth + apis + code(cn)));
T('迁移：角色 NOINHERIT、不属于 nbq_service / nbq_user', /nologin noinherit/.test(rd('server/migrations/20261105_admin_api.sql')) && /revoke nbq_service from nbq_admin_api/.test(rd('server/migrations/20261105_admin_api.sql')));
const mig = rd('server/migrations/20261105_admin_api.sql');
const body = s => s.slice(s.indexOf('do $$'), s.indexOf('create table if not exists schema_migrations'));
T('schema.sql 里的后台接口一节与迁移文件一致（只差迁移记录）', sql.includes(body(mig).trim()), 0);
T('迁移记录里登记了 20261105_admin_api', /insert into schema_migrations\(version\) values \('20261105_admin_api'\)/.test(mig) && /'20261105_admin_api'/.test(sql));

// ---- 只用在 Cloudflare 上验证过的模块（Pages 把所有函数打成一个 Worker：一个不支持的模块会让整个部署失败，连前台 /api 一起）----
// crypto：11-05 探针在分支预览实测 scryptSync 可用；pg：前台 /api 早已在用。新增模块先在分支预览验证，再加进这张表
const OK_MODS = new Set(['crypto', 'node:crypto', 'pg']);
const mods = f => [...rd(f).matchAll(/(?:^|\n)\s*import\s[^'"]*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1] || m[2]).filter(x => !x.startsWith('.'));
const bad = ['server/admin/api.mjs', 'server/admin/auth.mjs', 'server/admin/connect.mjs', 'functions/admin/api/[[path]].js'].flatMap(f => mods(f).filter(m => !OK_MODS.has(m)).map(m => f + ' → ' + m));
T('后台接口只 import 验证过的模块（crypto、pg 和本仓库文件）', !bad.length, bad);

// ---- 响应不泄露 ----
T('接口代码不 console.log 请求内容（日志只记路由名和错误码）', !/console\.(log|info|debug)/.test(apis) && !/console\.error\([^)]*(await |\.text\(|body|password|email)/.test(apis));
console.log(`admin_api_routes: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
