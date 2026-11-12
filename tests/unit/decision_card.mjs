// 决定卡级别判定（ADR 0010）：红线跟着 CODEOWNERS 走，不另存一份；需复核的路径、自助合并的路径各有断言。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { levelOf } from '../../tools/decision_card.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CO = fs.readFileSync(path.join(ROOT, '.github/CODEOWNERS'), 'utf8');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const lv = f => levelOf(f, CO).level;
T('改文案 / 样式 → 自助合并', lv(['src/web/style/0300-我的页.css', '南伴球_Web.html']) === 'self');
T('改测试 → 自助合并', lv(['tests/frontend/web_me.js']) === 'self');
T('改测试运行器 / 测试公共库（run_all、tests/lib）→ 需独立复核（11-11：出错会让 CI 悄悄少测）', lv(['tests/run_all.mjs']) === 'review' && lv(['tests/lib/preload.js']) === 'review' && lv(['tests/frontend/a.js', 'tests/lib/app.js']) === 'review');
T('改单元测试 / 测试数据 → 仍自助合并', lv(['tests/unit/shard.mjs']) === 'self' && lv(['tests/spec/actions.json']) === 'self' && lv(['tests/library.js']) === 'self');
T('改普通 tools → 需独立复核', lv(['tools/handoff_check.sh']) === 'review');
T('改公共层 0495 → 需独立复核（不再是红线）', lv(['src/shared/script/0495-接口调用.js']) === 'review');
T('改接口 server/api → 需独立复核', lv(['server/api/handler.mjs']) === 'review');
T('改 .claude/skills → 需独立复核', lv(['.claude/skills/x/SKILL.md']) === 'review');
for (const f of ['server/migrations/20261201_x.sql', 'schema.sql', 'wrangler.jsonc', 'notify-worker/index.mjs', 'privacy.html', 'tools/pr_merge.sh', 'tools/gate.sh', '.githooks/pre-push', '.github/CODEOWNERS', '.github/workflows/deploy-notify.yml', 'CLAUDE.md', '业务规则.md', 'docs/adr/0011-x.md', 'tests/spec/doc_budget.json'])
  T(`红线：${f}`, lv([f]) === 'owner', lv([f]));
T('红线和普通文件混在一起 → 按红线算', lv(['tests/x.js', 'tools/gate.sh']) === 'owner');
T('.github/workflows/tests.yml 不是红线（要改 paths）', lv(['.github/workflows/tests.yml']) === 'review');
T('共同所有者名单是红线（只有 SMG562 能改谁和所有者同权）', lv(['.github/CO_OWNERS']) === 'owner');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
