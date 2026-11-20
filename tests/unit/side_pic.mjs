// #488 列表带图卡片的 srcset / sizes / 懒加载（src/shared/side/0030-照片.js 的 PIC / phSet），空沙盒载入。
//   浏览器里真选了哪一档（DPR、卡片宽）见 tests/frontend/side_real.js；这里守纯逻辑：什么时候出 srcset、描述符怎么算、不该变的地方没变。
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = vm.createContext({ esc, Math, Object, String, Array });
vm.runInContext(fs.readFileSync(path.join(DIR, 'src/shared/side/0030-照片.js'), 'utf8') + '\n;globalThis.__x={PIC,phSet,phW,phSrc}', ctx);
const { PIC, phSet, phW, phSrc } = ctx.__x;
const P = (o = {}) => ({ ph: 1, t: '/api/sideline/photo/u/n-t?v=t&e=1&s=a', u: '/api/sideline/photo/u/n?v=full&e=1&s=b', b: '/api/sideline/photo/u/n-b?v=b&e=1&s=c', w: 1200, h: 1600, ...o });
const SZ = 'min(712px,calc(100vw - 28px))', O = { sz: SZ };
const attr = (h, k) => (h.match(new RegExp(` ${k}="([^"]*)"`)) || [])[1];

// ---- 描述符：变体真实宽（长边 960 / 1600，不放大）----
T('竖图 1200×1600：t 长边 960 → 宽 720；u 长边 1600 → 宽 1200', phW(P(), 't') === 720 && phW(P(), 'u') === 1200);
T('横图 1600×900：t = 960 宽，u = 1600 宽', phW(P({ w: 1600, h: 900 }), 't') === 960 && phW(P({ w: 1600, h: 900 }), 'u') === 1600);
T('原图比变体小（800×600）：不放大，两档同宽', phW(P({ w: 800, h: 600 }), 't') === 800 && phW(P({ w: 800, h: 600 }), 'u') === 800);
T('没有宽高 / 非数字 / 0：算不出（0）', [{ w: undefined, h: undefined }, { w: 'x', h: 5 }, { w: 0, h: 9 }, { w: -3, h: 5 }].every(o => phW(P(o), 't') === 0));

// ---- 出 srcset 的条件 ----
{ const h = PIC(P(), 'band', '', { sz: SZ });
  T('t + u 都有、宽高齐、有 sz：出 srcset（t 在前、宽度升序）+ sizes', attr(h, 'srcset') === '/api/sideline/photo/u/n-t?v=t&amp;e=1&amp;s=a 720w, /api/sideline/photo/u/n?v=full&amp;e=1&amp;s=b 1200w' && attr(h, 'sizes') === SZ, h);
  T('src 仍是 u（不支持 srcset 的环境 / 旧行为不变）', attr(h, 'src') === '/api/sideline/photo/u/n?v=full&amp;e=1&amp;s=b', h);
  T('sizes 里不含 DPR 乘数（只写 CSS 宽，浏览器自己乘）', !/dpr|devicePixel|\*\s*[23]\b/i.test(attr(h, 'sizes'))); }
T('没有 sz（详情 / 大图 / 网格等调用处）：不出 srcset、不出 sizes —— 同改前', !/srcset|sizes/.test(PIC(P(), 'hero')) && !/srcset|sizes/.test(PIC(P(), 'full', '', {})), PIC(P(), 'hero'));
T('原图小到两档同宽：不出 srcset', !/srcset/.test(PIC(P({ w: 800, h: 600 }), 'band', '', O)));
T('缺宽高：不出 srcset（只用 u）', !/srcset/.test(PIC(P({ w: undefined, h: undefined }), 'band', '', O)));
T('打码 / 只有 b：t、u 都回退成 b，同一地址：不出 srcset', !/srcset/.test(PIC({ ph: 1, t: '/api/x/b', u: '/api/x/b', b: '/api/x/b', w: 1200, h: 1600 }, 'band', '', O)));
T('blob: 本地预览（发布页）：不出 srcset', !/srcset/.test(PIC(P({ t: 'blob:https://a/1', u: 'blob:https://a/2' }), 'band', '', O)));
T('地址不合规（javascript: / http: / data:）：不出 srcset，src 也被白名单挡掉', ['javascript:alert(1)', 'http://a/x', 'data:image/png;base64,AA'].every(u => { const h = PIC(P({ t: u }), 'band', '', O), g = PIC(P({ t: u, u }), 'band', '', O); return !/srcset/.test(h) && attr(g, 'src') === '' }));
T('地址里的引号 / 尖括号被转义（不能跳出属性）', (() => { const h = PIC(P({ t: '/api/x"onerror="1', u: '/api/y<b>' }), 'band', '', O); return !/"onerror="/.test(h) && !/<b>/.test(h) })());
T('t / u 完全缺失只有 b：照旧用 b，不出 srcset', (() => { const h = PIC({ ph: 1, b: '/api/x/b', w: 5, h: 5 }, 'band', '', O); return attr(h, 'src') === '/api/x/b' && !/srcset/.test(h) })());

// ---- 懒加载 ----
T('lazy:true → loading="lazy"；不传 / false → 没有 loading 属性（新发的帖子插进来立刻加载）', /loading="lazy"/.test(PIC(P(), 'band', '', { sz: SZ, lazy: true })) && !/loading=/.test(PIC(P(), 'band', '', { sz: SZ })) && !/loading=/.test(PIC(P(), 'band', '', { sz: SZ, lazy: false })));
T('lazy 不依赖 srcset（缺宽高也能懒加载）', /loading="lazy"/.test(PIC(P({ w: undefined, h: undefined }), 'band', '', { sz: SZ, lazy: true })));
T('保留 decoding="async"、alt=""、铺满样式', (() => { const h = PIC(P(), 'band', '', { sz: SZ, lazy: true }); return /decoding="async"/.test(h) && / alt=""/.test(h) && /object-fit:cover/.test(h) })());

// ---- 回归：内置插画、字符串键不受影响 ----
T('phSrc 行为同改前：优先 u，再 t，再 b；非白名单地址返回空', phSrc(P(), 'band') === esc(P().u) && phSrc({ t: '/api/t' }, 'band') === '/api/t' && phSrc({ b: '/api/b' }, 'full') === '/api/b' && phSrc({ u: 'ftp://x' }, 'band') === '');
T('phSet 无 o / 无 sz 直接返回空串', phSet(P()) === '' && phSet(P(), {}) === '');

console.log(`\nside_pic: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
