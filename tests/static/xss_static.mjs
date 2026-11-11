// 第五批 5a-3：页面注入的静态检查。
//   ① 三个页面的 esc() 都转义 & < > " ' 五个字符；② 后台导出 CSV 防公式注入；③ 点通知只打开本站页面（sw.js）；
//   ④ 推送内容里不带链接（发送程序只给 id，sw 自己拼本站地址）；⑤ 页面里没有用数据拼出来的 javascript: 链接、没有 eval / new Function 处理数据；
//   ⑥ 用户写的文字直接拼进 href / src 的地方都经过 encodeURIComponent 或固定函数（白名单）
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const src = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const grab = (h, name) => { const m = h.match(new RegExp(`const ${name}=([^\\n]*?);(?:\\n|function |const )`)); return m ? vm.runInNewContext('(' + m[1] + ')') : null };
const FILES = ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html'];
for (const f of FILES) {
  const esc = grab(src(f), 'esc');
  T(`${f}：esc() 转义 & < > " '`, typeof esc === 'function' && esc(`<a href="x" title='y'>&</a>`) === '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;' && esc(null) === '' && esc(0) === '0', esc && esc(`<"'>&`));
  const h = src(f);
  T(`${f}：没有用数据拼的 javascript: 链接`, !/javascript:\s*\$\{|["']javascript:[^"']*\$\{/.test(h));
  T(`${f}：没有 eval / new Function`, !/[^.\w]eval\(|new Function\(/.test(h.replace(/<script[^>]*src=[^>]*><\/script>/g, '')), (h.match(/.{30}(?:[^.\w]eval\(|new Function\().{30}/g) || []).slice(0, 3));
  // ⑥ href / src 里的插值：只允许白名单
  const OK = /^(nav|url|reportMail\(\)|esc\(.*\)|encodeURIComponent\(.*\)|shareURL\(.*\)|.*\.dataURL|.*toDataURL\(.*\))$/;
  const bad = [...h.matchAll(/(?:href|src)="\$\{([^}]{0,80})\}/g)].map(m => m[1]).filter(e => !OK.test(e));
  T(`${f}：href / src 里的插值都在白名单里`, !bad.length, bad);
}
// nav / reportMail 的定义里用户文字都经过 encodeURIComponent
for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
  const h = src(f), navs = [...h.matchAll(/nav=`([^`]*)`/g)].map(m => m[1]), rm = (h.match(/(?:function reportMail\([^)]*\)\{|reportMail=[^=]*=>)[^\n]*/) || [''])[0];
  T(`${f}：导航链接只拼 Google 地图 + encodeURIComponent`, navs.length > 0 && navs.every(n => /^https:\/\/(www\.google\.com\/maps\/|maps\.google\.com\/\?)/.test(n) && [...n.matchAll(/\$\{([^}]*)\}/g)].every(m => /^encodeURIComponent\(/.test(m[1]))), navs);
  T(`${f}：举报邮件链接是 mailto + encodeURIComponent`, /`mailto:safety@nanbanqiu\.app\?subject=\$\{encodeURIComponent\(/.test(rm) && /&body=\$\{encodeURIComponent\(/.test(rm) && (rm.match(/\$\{/g) || []).length === 4, rm.slice(0, 300));
}
// ② CSV
const csvCell = grab(src('南伴球_后台.html'), 'csvCell');
T('后台 CSV：= + - @ 开头的文字加 \'', typeof csvCell === 'function' && csvCell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"` && csvCell('+61 4') === "'+61 4" && csvCell('@a') === "'@a" && csvCell('-cmd') === "'-cmd" && csvCell('\tx') === "'\tx");
T('后台 CSV：数字、负数、百分比、普通文字照常', csvCell(-5) === '-5' && csvCell('-3.5') === '-3.5' && csvCell('12%') === '12%' && csvCell('Han L.') === 'Han L.' && csvCell('a,b') === '"a,b"' && csvCell(null) === '');
T('后台导出用 csvCell', /rows\.map\(r=>r\.map\(csvCell\)/.test(src('南伴球_后台.html')));
// ③ sw.js
const sw = src('sw.js'); const fn = sw.match(/function pushTarget\(data\) \{[\s\S]*?\n\}/)[0];
const pushTarget = vm.runInNewContext(`(()=>{const self={location:{origin:'https://nanbanqiu.app'}};${fn};return pushTarget})()`, { URL });
T('点通知：本站路径带 n / k', pushTarget({ url: '/g/7Kq2', notif_id: 5, kind: 'request' }) === 'https://nanbanqiu.app/g/7Kq2?n=5&k=request');
T('点通知：站外链接、javascript:、坏地址都回到首页', ['https://evil.com/x', 'javascript:alert(1)', '//evil.com', 'http://[bad'].every(u => pushTarget({ url: u, notif_id: 1, kind: 'x' }).startsWith('https://nanbanqiu.app/?')), ['https://evil.com/x', 'javascript:alert(1)', '//evil.com'].map(u => pushTarget({ url: u })));
// ④ 推送内容
const R = await import(pathToFileURL(path.join(DIR, 'server/notify/rules.mjs')));
const pt = R.pushText({ id: 9, kind: 'request', game_id: 'g', invite_id: null }, { actorName: '<b>x</b>', game: null });
T('推送内容只带 id，不带链接', !('url' in pt.data) && Object.keys(pt.data).every(k => ['notif_id', 'kind', 'game_id', 'invite_id'].includes(k)), pt.data);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
