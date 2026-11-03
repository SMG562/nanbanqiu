// 三套环境按域名选（11-03）：nbqEnvOf 的判断 + 正式/测试库不能串；横幅只在测试环境出现
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 200) : '')) };
const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0490-Supabase登录.js'), 'utf8');
const i = src.indexOf('function nbqEnvOf'), j = src.indexOf('const NBQ_ENV=');
T('源码里找得到 nbqEnvOf', i > 0 && j > i);
const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(i, j) + ';this.f=nbqEnvOf', ctx); const f = ctx.f;
T('正式域名 → prod（含 www）', f('nanbanqiu.app') === 'prod' && f('www.nanbanqiu.app') === 'prod');
T('分支 / 部署预览 → staging', f('feat-x.nanbanqiu-preview.pages.dev') === 'staging' && f('3f2a9c1b.nanbanqiu-preview.pages.dev') === 'staging');
T('预览站根 → preview（正式库登录 + 演示数据，旧行为）', f('nanbanqiu-preview.pages.dev') === 'preview');
T('别人的 pages.dev 不当成我们的测试库', f('evil.pages.dev') === 'preview' && f('a.nanbanqiu-preview.pages.dev.evil.com') === 'none');
T('本地、测试域名 → none（演示登录）', f('localhost') === 'none' && f('127.0.0.1') === 'none' && f('x.test') === 'none' && f('') === 'none');
T('伪造：nanbanqiu.app.evil.com / xnanbanqiu.app → none', f('nanbanqiu.app.evil.com') === 'none' && f('xnanbanqiu.app') === 'none');
const urls = [...src.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/g)].map(m => m[1]);
T('正式库、测试库是两个不同的项目', new Set(urls).size === 2 && /SB_STAGING=\{url:'https:\/\/nqgyhjtwbvuxmyxvegkf/.test(src) && /SB_REAL=\{url:'https:\/\/xosrdkrkfxkdrwldfhac/.test(src));
T('测试环境才画横幅', /NBQ_ENV!=='staging'/.test(fs.readFileSync(path.join(DIR, 'src/shared/script/0497-测试环境横幅.js'), 'utf8')));
console.log(`env_select: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
