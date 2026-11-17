// 文案守卫（11-17 前端瘦身）：页面只留「用户做决定要读的」文字，说明句 / 副标题不许悄悄长回来。
// ① 副标题棘轮：弹层副标题（.sh-s 手机 / .m-s 网页）的个数不得超过 tests/spec/copy_budget.json（只降不升；少了会提示下调）。
//    新增副标题要先删一个旧的，并说明它帮用户做了什么决定。
// ② 禁用文案：分享面板不再提供「复制链接」「只想发文字」，不许加回来（产品决定：分享只留 微信群 / 更多 / 小红书）。
// 自检：统计函数对合成文本必须给出预期数字，防止正则悄悄失效。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
export const countSubs = (t, cls) => (t.match(new RegExp(`<p class="${cls}"`, 'g')) || []).length;
const textOf = dirs => dirs.flatMap(d => ['script', 'side'].flatMap(k => { const p = path.join(ROOT, 'src', d, k); return fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(p, f), 'utf8')) : [] })).join('\n');
T('自检：统计函数数得对', countSubs('<p class="sh-s">a</p><p class="sh-s" style="x">b</p><p class="m-s">c</p>', 'sh-s') === 2 && countSubs('<p class="m-s">c</p>', 'm-s') === 1);
const B = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/spec/copy_budget.json'), 'utf8'));
const pwa = textOf(['shared', 'pwa']), web = textOf(['shared', 'web']);
for (const [side, txt, cls] of [['pwa', pwa, 'sh-s'], ['web', web, 'm-s']]) {
  const n = countSubs(txt, cls);
  T(`${side} 弹层副标题 ${n} 个，不超过预算 ${B[side]}`, n <= B[side], n);
  if (n < B[side]) console.log(`提示：${side} 副标题只剩 ${n} 个，把 tests/spec/copy_budget.json 的 ${side} 下调到 ${n}`);
}
for (const [side, txt] of [['pwa', pwa], ['web', web]]) for (const w of B.banned) T(`${side} 不出现「${w}」`, !txt.includes(w), w);
console.log(`copy_budget: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
