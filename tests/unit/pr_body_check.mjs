// PR 描述核对：入口清单必填、真机两项合并时必须已勾
import { checkBody } from '../../tools/pr_body_check.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x ? ' ' + JSON.stringify(x) : '')) };
const TBL = '## 入口清单\n| 入口 | 写服务器 | 读回 | 测试 |\n|---|---|---|---|\n| 球员卡点印象 | 是 PUT recap | /api/me/after | real_after |\n';
const RISK = '- [x] 较大风险　- [ ] 小修小补\n', HW = '- [ ] 真机：刷新后还在\n- [ ] 真机：换设备 / 换浏览器登录同一账号还在\n- [ ] 前台改动：真机在预览站看过画面\n', HW_OK = HW.replace(/\[ \]/g, '[x]');
const SRC = ['src/shared/script/0180.js'], DOC = ['进度记录.md'];
T('改了前台、没有入口清单 → 不过', checkBody(RISK, SRC).some(x => /入口清单/.test(x)));
T('只有空表头 → 不过', checkBody('## 入口清单\n| 入口 | 写服务器 | 读回 | 测试 |\n|---|---|---|---|\n' + RISK, SRC).some(x => /入口清单/.test(x)));
T('占位行（… / 入口）不算', checkBody('## 入口清单\n| 入口 | a | b | c |\n|---|---|---|---|\n| … | … | … | … |\n' + RISK, SRC).some(x => /入口清单/.test(x)));
T('有完整一行 → 过', checkBody(TBL + RISK, SRC).length === 0, checkBody(TBL + RISK, SRC));
T('「入口清单：无（理由）」→ 过', checkBody('入口清单：无（只改文案，不涉及用户数据）\n' + RISK, SRC).length === 0);
T('「入口清单：无」没理由 → 不过', checkBody('入口清单：无\n' + RISK, SRC).length > 0);
T('只改文档：不要求入口清单', checkBody(RISK, DOC).length === 0);
T('风险类别没勾 → 不过', checkBody(TBL + '- [ ] 较大风险　- [ ] 小修小补\n', SRC).some(x => /风险类别/.test(x)));
T('合并：较大风险、真机项没勾 → 不过', checkBody(TBL + RISK + HW, SRC, { merge: true }).length >= 2);
T('合并：真机项都勾了 → 过', checkBody(TBL + RISK + HW_OK, SRC, { merge: true }).length === 0, checkBody(TBL + RISK + HW_OK, SRC, { merge: true }));
T('合并：较大风险但描述里没有真机项 → 不过', checkBody(TBL + RISK, SRC, { merge: true }).length > 0);
T('合并：小修小补不要求真机两项', checkBody(TBL + '- [ ] 较大风险　- [x] 小修小补\n', SRC, { merge: true }).length === 0);
T('不带 merge：真机项没勾也不挡 CI', checkBody(TBL + RISK + HW, SRC).length === 0);
// 11-05：「你来做」里用到本 PR 才有的文件 → 必须写「已同步到电脑」
const FILES2 = [...SRC, 'server/migrations/x.sql', 'tools/admin_create.mjs'];
const TODO = '## 你来做\n1. 运行 `server/migrations/x.sql`\n2. 本机 `node tools/admin_create.mjs` 和 `tools/site.mjs`\n';
T('「你来做」用到本 PR 新文件、没写已同步 → 不过，且点名文件', (r => r.some(x => /已同步到电脑/.test(x) && /x\.sql/.test(x) && /admin_create/.test(x) && !/site\.mjs/.test(x)))(checkBody(TBL + RISK + TODO, FILES2)), checkBody(TBL + RISK + TODO, FILES2));
T('只同步了一部分 → 仍不过（点名没同步的那个）', (r => r.some(x => /admin_create/.test(x) && !/x\.sql、/.test(x)))(checkBody(TBL + RISK + TODO + '已同步到电脑：server/migrations/x.sql\n', FILES2)));
T('全部写了已同步 → 过', checkBody(TBL + RISK + TODO + '已同步到电脑：server/migrations/x.sql、tools/admin_create.mjs\n', FILES2).length === 0, checkBody(TBL + RISK + TODO + '已同步到电脑：server/migrations/x.sql、tools/admin_create.mjs\n', FILES2));
T('「你来做」只提 main 上已有的文件 → 不要求', checkBody(TBL + RISK + '## 你来做\n- 看 `tools/site.mjs`\n', FILES2).length === 0);
// 11-10 仅所有者文件：按 PR 作者核对（协作者会话曾没核对身份就改了进度记录.md、.claude/）
const OK = '入口清单：无（只改文档，不涉及用户数据）\n- [ ] 较大风险　- [x] 小修小补\n';
T('协作者改进度记录.md → 不过，并说明怎么退回', checkBody(OK, ['进度记录.md'], { author: 'MDD1102' }).some(x => /不是所有者[\s\S]*进度记录\.md[\s\S]*请所有者记录/.test(x)));
T('协作者改 .claude/ 技能 → 不过', checkBody(OK, ['.claude/skills/x/SKILL.md'], { author: 'MDD1102' }).some(x => /\.claude\//.test(x)));
T('协作者改业务规则.md / 出事处理手册.md → 不过', ['业务规则.md', '出事处理手册.md'].every(f => checkBody(OK, [f], { author: 'MDD1102' }).length > 0));
T('所有者改这些文件 → 过', checkBody(OK, ['进度记录.md', '.claude/skills/x/SKILL.md'], { author: 'SMG562' }).length === 0);
T('协作者改别的文档（逃逸缺陷.md）→ 过', checkBody(OK, ['逃逸缺陷.md'], { author: 'MDD1102' }).length === 0);
T('不传作者（老调用）→ 不检查身份', checkBody(OK, ['进度记录.md']).length === 0);
T('名字里只是包含、不在开头（docs/进度记录.md）→ 不误伤', checkBody(OK, ['docs/进度记录.md'], { author: 'MDD1102' }).length === 0);
console.log(`\npr_body_check: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
