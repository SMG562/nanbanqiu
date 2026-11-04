// PR 描述核对（11-04）：改了前台 / 接口 / 库的 PR，描述里必须有「入口清单」（这份用户可改数据的全部修改入口 × 是否写服务器 × 读回在哪 × 测试），
//   否则 CI 变红；合并时（--merge）还要求真机两项「刷新后还在」「换设备登录还在」已勾（较大风险的 PR）。
// 用法：node tools/pr_body_check.mjs <PR号> [--merge]　　或被测试 import：checkBody(body, files, {merge})
import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const CODE = /^(src\/|server\/|schema\.sql|sw\.js|worker\/)/;
const ticked = (b, re) => new RegExp(`- \\[[xX]\\][^\\n]*${re}`).test(b);
const has = (b, re) => new RegExp(`- \\[[ xX]\\][^\\n]*${re}`).test(b);
export function checkBody(body, files, { merge = false } = {}) {
  const b = body || '', bad = [], code = (files || []).some(f => CODE.test(f)), front = (files || []).some(f => /^src\//.test(f));
  if (code) {
    const sec = /入口清单[^\n]*\n([\s\S]*?)(?=\n#{1,3} |\n## |$)/.exec(b), txt = sec ? sec[1] : '';
    const rows = txt.split('\n').filter(l => /^\s*\|/.test(l) && !/^\s*\|[\s\-:|]+\|\s*$/.test(l)).slice(1);   // 去掉表头；分隔行已排除
    const real = rows.filter(r => r.split('|').filter(c => c.trim()).length >= 3 && !/^\s*\|\s*(…|\.\.\.|入口)\s*\|/.test(r));
    const none = /入口清单\s*[:：]\s*无[（(][^）)]{4,}[）)]/.test(b);   // 「入口清单：无（理由）」，理由至少 4 个字
    if (!real.length && !none) bad.push('缺「入口清单」：列出这份用户可改数据的所有修改入口（入口 | 真实模式是否写服务器 | 读回在哪 | 测试）；确实不涉及就写「入口清单：无（理由）」');
  }
  if (!ticked(b, '(较大风险|小修小补)')) bad.push('风险类别没勾（较大风险 / 小修小补）');
  if (merge) {
    if (ticked(b, '较大风险') && has(b, '刷新后还在') && !ticked(b, '刷新后还在')) bad.push('真机项「刷新后还在」没勾');
    if (ticked(b, '较大风险') && has(b, '换设备') && !ticked(b, '换设备')) bad.push('真机项「换设备 / 换浏览器登录同一账号还在」没勾');
    if (ticked(b, '较大风险') && !has(b, '刷新后还在')) bad.push('较大风险的 PR 描述里缺真机项「刷新后还在」「换设备登录还在」（见 PR 模板）');
    if (front && has(b, '前台改动：真机') && !ticked(b, '前台改动：真机')) bad.push('「前台改动：真机在预览站看过画面」没勾');
  }
  return bad;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = process.argv[2], merge = process.argv.includes('--merge'), R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  if (!n) { console.error('用法：node tools/pr_body_check.mjs <PR号> [--merge]'); process.exit(2) }
  const gh = a => JSON.parse(execFileSync('gh', ['api', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const pr = gh([`repos/${R}/pulls/${n}`]), files = gh(['--paginate', `repos/${R}/pulls/${n}/files?per_page=100`]).map(f => f.filename);
  const bad = checkBody(pr.body, files, { merge });
  bad.forEach(x => console.log('❌ ' + x)); if (!bad.length) console.log('✅ PR 描述核对通过' + (merge ? '（含真机项）' : ''));
  process.exit(bad.length ? 1 : 0);
}
