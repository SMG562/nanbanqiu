// PR 描述核对（11-04）：改了前台 / 接口 / 库的 PR，描述里必须有「入口清单」（这份用户可改数据的全部修改入口 × 是否写服务器 × 读回在哪 × 测试），
//   否则 CI 变红；合并时（--merge）还要求真机两项「刷新后还在」「换设备登录还在」已勾（较大风险的 PR）。
// 用法：node tools/pr_body_check.mjs <PR号> [--merge]　　或被测试 import：checkBody(body, files, {merge})
import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url'; import { realpathSync } from 'fs';
const CODE = /^(src\/|server\/|schema\.sql|sw\.js|worker\/)/;
const ticked = (b, re) => new RegExp(`- \\[[xX]\\][^\\n]*${re}`).test(b);
const has = (b, re) => new RegExp(`- \\[[ xX]\\][^\\n]*${re}`).test(b);
export function checkBody(body, files, { merge = false, created = '' } = {}) {
  const b = body || '', bad = [], code = (files || []).some(f => CODE.test(f)), front = (files || []).some(f => /^src\//.test(f));
  if (code) {
    const sec = /入口清单[^\n]*\n([\s\S]*?)(?=\n#{1,3} |\n## |$)/.exec(b), txt = sec ? sec[1] : '';
    const rows = txt.split('\n').filter(l => /^\s*\|/.test(l) && !/^\s*\|[\s\-:|]+\|\s*$/.test(l)).slice(1);   // 去掉表头；分隔行已排除
    const real = rows.filter(r => r.split('|').filter(c => c.trim()).length >= 3 && !/^\s*\|\s*(…|\.\.\.|入口)\s*\|/.test(r));
    const none = /入口清单\s*[:：]\s*无[（(][^）)]{4,}[）)]/.test(b);   // 「入口清单：无（理由）」，理由至少 4 个字
    if (!real.length && !none) bad.push('缺「入口清单」：列出这份用户可改数据的所有修改入口（入口 | 真实模式是否写服务器 | 读回在哪 | 测试）；确实不涉及就写「入口清单：无（理由）」');
  }
  // 11-17（经验对齐）：改了经验 / 技能 / 钩子 / ADR 的 PR，描述里 @SMG562 或 @MDD1102 其一（GitHub 自动通知对方，不靠人转告；所有者自己改就 @ 共同所有者）；缺了 CI 变红
  if ((files || []).some(f => /^(\.claude\/|逃逸缺陷\.md|docs\/adr\/|tools\/lib\/(token_guard|token_report|lessons_digest))/.test(f)) && !/@(SMG562|MDD1102)\b/.test(b)) bad.push('改了经验 / 技能 / 钩子 / ADR：描述里要写 @SMG562 或 @MDD1102 其一（一句话说改了什么、为什么），GitHub 会自动通知，不用人转告');
  // 11-19（#397 E）：改了业务规则 / ADR / 路线图（= 规则或范围变了）的 PR，必须同时在 docs/决定台账.md 或 docs/变更记录.md 追加一行，或描述里写「台账：无（理由）」；缺了 CI 变红
  if ((files || []).some(f => /^(业务规则\.md|docs\/adr\/|docs\/roadmap\.md)/.test(f)) && !(files || []).some(f => /^docs\/(决定台账|变更记录)\.md$/.test(f)) && !/台账\s*[:：]\s*无[（(][^）)]{4,}[）)]/.test(b)) bad.push('改了业务规则 / ADR / 路线图：要在 docs/决定台账.md 或 docs/变更记录.md 追加一行（谁定的、不做什么、来源链接）；确实不用就在描述写「台账：无（理由）」');
  // 11-05（逃逸：用户照「你来做」去电脑上找迁移文件，没有）：「你来做」里提到的、本 PR 才有的文件，main 的同步不会带到用户电脑 →
  //   必须先 sync_files.sh --branch=<分支> <文件…> 写过去并回读核对，再在描述里写一行「已同步到电脑：…」
  const todo = /##+[^\n]*你来做[^\n]*\n([\s\S]*?)(?=\n##+ |$)/.exec(b);
  if (todo) { const need = [...new Set([...todo[1].matchAll(/`([^`]+)`/g)].flatMap(m => m[1].match(/[\w\u4e00-\u9fff./-]+\.[a-z]{1,5}\b/g) || []).filter(f => (files || []).includes(f)))];
    const synced = (/已同步到电脑[:：]([^\n]*)/.exec(b) || [])[1] || '';
    const miss = need.filter(f => !synced.includes(f));
    if (miss.length) bad.push(`「你来做」用到本 PR 才有的文件，没写「已同步到电脑」：${miss.join('、')}（先 bash tools/sync_files.sh --branch=<分支> ${miss.join(' ')}，写到电脑并 sync_verify.sh --branch 回读核对）`) }
  // 11-20（#465 D）：前台 + 较大风险 → 要写「真机怎么测：点哪几下、期望看到什么」（≥ 8 个字）；只管 11-22 起开的 PR，在途的不卡
  if (front && ticked(b, '较大风险') && Date.parse(created) >= Date.parse('2026-11-22T00:00:00Z') && !/真机怎么测\s*[:：]\s*\S[^\n]{7,}/.test(b)) bad.push('缺「真机怎么测：点哪几下、期望看到什么」一行（较大风险的前台改动，所有者按它在预览站测，不用猜）');
  if (!ticked(b, '(较大风险|小修小补)')) bad.push('风险类别没勾（较大风险 / 小修小补）');
  if (merge) {
    if (ticked(b, '较大风险') && has(b, '刷新后还在') && !ticked(b, '刷新后还在')) bad.push('真机项「刷新后还在」没勾');
    if (ticked(b, '较大风险') && has(b, '换设备') && !ticked(b, '换设备')) bad.push('真机项「换设备 / 换浏览器登录同一账号还在」没勾');
    if (ticked(b, '较大风险') && !has(b, '刷新后还在')) bad.push('较大风险的 PR 描述里缺真机项「刷新后还在」「换设备登录还在」（见 PR 模板）');
    if (front && has(b, '前台改动：真机') && !ticked(b, '前台改动：真机')) bad.push('「前台改动：真机在预览站看过画面」没勾');
  }
  return bad;
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const n = process.argv[2], merge = process.argv.includes('--merge'), R = process.env.GITHUB_REPOSITORY || 'SMG562/nanbanqiu';
  if (!n) { console.error('用法：node tools/pr_body_check.mjs <PR号> [--merge]'); process.exit(2) }
  const gh = a => JSON.parse(execFileSync('gh', ['api', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  const pr = gh([`repos/${R}/pulls/${n}`]), files = gh(['--paginate', `repos/${R}/pulls/${n}/files?per_page=100`]).map(f => f.filename);
  const bad = checkBody(pr.body, files, { merge, created: pr.created_at });
  bad.forEach(x => console.log('❌ ' + x)); if (!bad.length) console.log('✅ PR 描述核对通过' + (merge ? '（含真机项）' : ''));
  process.exit(bad.length ? 1 : 0);
}
