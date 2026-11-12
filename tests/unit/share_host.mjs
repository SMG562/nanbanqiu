// 分享 / 二维码链接按环境选域名（#208，11-12 协作者真机：预览站扫码跳到正式站，看到正式库的人和旧版页面）
// 只有分支预览站（staging）把 https://nanbanqiu.app 换成当前站点；正式站、预览站根、本地、伪造域名一律不变
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 200) : '')) };
const env = fs.readFileSync(path.join(DIR, 'src/shared/script/0490-Supabase登录.js'), 'utf8');
const sh = fs.readFileSync(path.join(DIR, 'src/shared/script/0210-埋点_v2_核心.js'), 'utf8');
const pick = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); return i >= 0 && j > i ? s.slice(i, j) : '' };
const envSrc = pick(env, 'function nbqEnvOf', 'const NBQ_ENV='), shSrc = pick(sh, 'function nbqLinkFor', '\n');
const shareSrc = sh.slice(sh.indexOf('function shareURL'), sh.indexOf('\n', sh.indexOf('function shareURL')));
T('源码里找得到 nbqEnvOf / nbqLinkFor / shareURL', !!envSrc && !!shSrc && shareSrc.length > 20);
const run = host => { const ctx = { location: { hostname: host }, ME: { no: 7 }, fmtNo: n => String(n).padStart(4, '0') }; vm.createContext(ctx);
  vm.runInContext(envSrc + ';' + shSrc + ';' + shareSrc + ';this.s=shareURL;this.l=nbqLinkFor', ctx); return ctx };
const B = 'claude-buddies-b2.nanbanqiu-preview.pages.dev';
let c = run(B);
T('分支预览站：球员卡二维码留在预览站', c.s('https://nanbanqiu.app/p/0002', 'qr') === `https://${B}/p/0002?s=qr&f=0007`, c.s('https://nanbanqiu.app/p/0002', 'qr'));
T('分支预览站：球局链接、不带渠道也换', c.s('https://nanbanqiu.app/g/abc') === `https://${B}/g/abc`);
T('部署预览（哈希子域）同样换', run('3f2a9c1b.nanbanqiu-preview.pages.dev').s('https://nanbanqiu.app/g/x', 'link').startsWith('https://3f2a9c1b.nanbanqiu-preview.pages.dev/g/x?'));
for (const h of ['nanbanqiu.app', 'www.nanbanqiu.app', 'nanbanqiu-preview.pages.dev', 'evil.pages.dev', 'localhost', '', 'a.nanbanqiu-preview.pages.dev.evil.com'])
  T('不该换：' + (h || '(空)'), run(h).s('https://nanbanqiu.app/p/0002', 'qr') === 'https://nanbanqiu.app/p/0002?s=qr&f=0007', [h, run(h).s('https://nanbanqiu.app/p/0002', 'qr')]);
T('只换开头的正式域名，不动长得像的域名和路径里的字', c.l('https://nanbanqiu.app.evil.com/p/1', B) === 'https://nanbanqiu.app.evil.com/p/1' && c.l('https://x.com/?u=https://nanbanqiu.app/p', B) === 'https://x.com/?u=https://nanbanqiu.app/p');
T('没载入 nbqEnvOf（单独载入埋点层）时原样返回', (() => { const k = { }; vm.createContext(k); vm.runInContext(shSrc + ';this.l=nbqLinkFor', k); return k.l('https://nanbanqiu.app/p/1', B) === 'https://nanbanqiu.app/p/1' })());
console.log(`share_host: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
