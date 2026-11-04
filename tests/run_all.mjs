#!/usr/bin/env node
/* =====================================================================
 * 南伴球 · 测试总入口
 *   node tests/run_all.mjs                 完整测试（约 25–40 分钟）
 *   node tests/run_all.mjs --quick         快速测试（约 6–10 分钟）：静态 + 数据库 + 核心流程 + 后台一致性 + 一个时间点的演示
 *   node tests/run_all.mjs --only=static,schema     只跑指定的套件（static / unit / schema / pg / frontend / visual / admin / regression）
 *   node tests/run_all.mjs --update-snapshots       确认改动无误后，用这次的输出更新回归快照
 *   node tests/run_all.mjs --list          只列出会跑哪些测试
 *   --grep=sb_,rate,api   只跑名字里含这些字的测试（每一小轮只跑相关的，10-26 定）
 *   --skip=visual         不跑指定的套件（本地字体和 CI 不同，截图对比在本地必然不一致：本地一律 --changed --skip=visual，截图交给 CI）
 *   --fast                跳过最慢的几项（pg/perf@一年 约 9 分钟）；收尾时不加
 *   --jobs=N              同时跑 N 项（默认 = CPU 数，最多 4）；性能测试总是单独跑，不和别的抢 CPU
 *   --changed[=<ref>]     按改动的文件挑相关测试（规则在 tests/lib/select.mjs）：不带 ref = 没提交的改动 + 新文件；带 ref = 和它的差别（如 origin/main）。隐含 --quick（不含回归和全部时间点）；没有对应规则的文件会列出来
 *   --failed              只重跑「失败过、之后还没通过」的项（名单 tests/reports/failed.json，每次跑完自动更新）；和 --changed 一起用 = 两者的并集
 * 环境变量：
 *   NBQ_FAILED_FILE  失败名单的位置（默认 tests/reports/failed.json；单元测试用）
 *   NBQ_DIR        被测文件所在目录（默认 tests 的上一级）
 *   NBQ_CACHE      依赖缓存目录（默认 ~/.cache/nbq-tests），数据库测试的 PGlite 装在这里
 *   NBQ_CHROMIUM   Chromium 路径（默认 /opt/pw-browsers/chromium，不存在就用 Playwright 自带的）
 * 退出码：0 = 全部通过；1 = 有失败；2 = 环境不满足（会说明缺什么、怎么装）
 * 报告：tests/reports/<时间>/summary.md、results.json、logs/<测试>.log
 * ===================================================================== */
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { selectByChanged, matches, updateFailed, missingFrom, touchedNames, regressionHits } from './lib/select.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(process.env.NBQ_DIR || path.join(HERE, '..'));
const CACHE = path.resolve(process.env.NBQ_CACHE || path.join(os.homedir(), '.cache', 'nbq-tests'));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }));
const QUICK = !!args.quick || !!args.changed, UPDATE = !!args['update-snapshots'], ONLY = args.only ? String(args.only).split(',') : null, SKIP = args.skip ? String(args.skip).split(',') : (args.changed && !process.env.CI ? ['visual'] : null);   // 11-04：本地 --changed 默认不跑截图对比（本地字体和基准不同，必然不一致；截图在 CI 跑）。要跑就写 --skip=none
const GREP = args.grep ? String(args.grep).split(',').filter(Boolean) : null, FAST = !!args.fast, JOBS = Math.max(1, Math.min(4, +args.jobs || os.cpus().length));
const STAMP = new Date().toLocaleString('sv-SE', { timeZone: 'Australia/Melbourne' }).replace(' ', '_').replace(/:/g, '-');   // 墨尔本时间
const OUT = path.join(HERE, 'reports', STAMP), LOGS = path.join(OUT, 'logs'), WORK = path.join(os.tmpdir(), 'nbq-work-' + STAMP);
const PRELOAD = path.join(HERE, 'lib', 'preload.js');
const SPEC = path.join(HERE, 'spec', 'events_spec.md');

// ---------- 时间点：覆盖早上、白天、深夜（夜间免打扰）、凌晨、周三晚上（每周重复的局刚过） ----------
const TIMES_FULL = ['2026-10-14T07:50:00+11:00', '2026-10-14T15:10:00+11:00', '2026-10-14T22:55:00+11:00', '2026-10-17T23:40:00+11:00', '2026-10-18T05:30:00+11:00'];
const TIMES = QUICK ? ['2026-10-14T15:10:00+11:00'] : TIMES_FULL;

// ---------- 判定规则 ----------
const NOISE = /agent-proxy|connect_rejected|For details: curl|^\s*-\s+[a-z0-9.-]+:443|oldest \d+ not shown|^\s*$/;
const COMMON_FORBID = [/^FAIL\b/m, /\b(TypeError|ReferenceError|SyntaxError|RangeError)\b/, /Cannot read propert/, /^\[ ['"`]/m, /errors \[ ['"]/, /Error: page\.|Timeout \d+ms exceeded/];
const T = [];
const add = (suite, id, cmd, o = {}) => T.push({ suite, id, cmd, timeout: o.timeout || 300, pass: o.pass || [], forbid: o.forbid ?? COMMON_FORBID, snapshot: !!o.snapshot, env: o.env || {}, needsExit0: o.needsExit0 ?? true, cwd: o.cwd, solo: !!o.solo, slow: !!o.slow });

add('static', 'static/check', ['node', path.join(HERE, 'static/check.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 120 });
// 前台两端的错误提示 = 接口规格的错误码表（4f-3）
add('static', 'static/api_err', ['node', path.join(HERE, 'static/api_err.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 60 });
add('static', 'static/xss_static', ['node', path.join(HERE, 'static/xss_static.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 60 });
add('static', 'static/admin_perms', ['node', path.join(HERE, 'static/admin_perms.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 60 });
add('static', 'static/persist_audit', ['node', path.join(DIR, 'tools/persist_audit.mjs')], { pass: [/persist_audit: \d+ 处改动已登记, 0 处未登记；\d+ 个无读回仓库已登记, 0 个未登记/], timeout: 60 });
add('static', 'static/input_audit', ['node', path.join(DIR, 'tools/input_audit.mjs')], { pass: [/input_audit: \d+ 个输入框, 0 个问题/], timeout: 60 });
add('static', 'static/action_audit', ['node', path.join(DIR, 'tools/action_audit.mjs')], { pass: [/action_audit: \d+ 个动作, 0 个未归类, 0 个写法不对/], timeout: 60 });
// 两个前台 HTML = src/ 拼出来的（R0）
add('static', 'static/build', ['node', path.join(HERE, 'static/build.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 120 });
// 前台脚本的代码检查：没定义的名字、重复声明……（R0，ESLint 版本见 tests/lint/package.json）
add('static', 'static/lint', ['node', path.join(HERE, 'static/lint.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 180, env: { NBQ_CACHE: CACHE } });
add('static', 'static/cities_front', ['node', path.join(HERE, 'static/cities_front.mjs'), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 60 });
// 规则单元测试（E2）：页面里的纯规则直接在 Node 里测，不开浏览器，1 秒内
for (const f of fs.readdirSync(path.join(HERE, 'unit')).filter(f => f.endsWith('.mjs')).sort())
  add('unit', 'unit/' + f.replace(/\.mjs$/, ''), ['node', path.join(HERE, 'unit', f), DIR], { pass: [/\d+ passed, 0 failed/], timeout: 60 });
add('schema', 'schema/full', ['__schema__'], { pass: [/schema: \d+ statements, 0 errors/, /tests: \d+ blocks, 0 failed/, /dictionary: .* 0 differences/, /RESULT PASS/], timeout: 600 });
// 真实 PostgreSQL（+ PostGIS）：同时操作（4c）
add('pg', 'pg/race', ['node', path.join(HERE, 'pg/race.mjs')], { pass: [/\d+ passed, 0 failed/], timeout: 600 });
// 谁能读、谁能写（4e）：前台球友 / 后台运营 / 后台只读 / Supabase 公开角色逐条验证
add('pg', 'pg/rls', ['node', path.join(HERE, 'pg/rls.mjs')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
// 后端接口的数据库函数（4f）：按 api_spec.md 逐条测
add('pg', 'pg/api', ['node', path.join(HERE, 'pg/api.mjs')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('pg', 'pg/api2', ['node', path.join(HERE, 'pg/api2.mjs')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
// 定时任务（4g）
add('pg', 'pg/jobs', ['node', path.join(HERE, 'pg/jobs.mjs')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('pg', 'pg/notify', ['node', path.join(HERE, 'pg/notify.mjs')], { pass: [/notify: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/rate', ['node', path.join(HERE, 'pg/rate.mjs')], { pass: [/rate: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/risk', ['node', path.join(HERE, 'pg/risk.mjs')], { pass: [/risk: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/privacy', ['node', path.join(HERE, 'pg/privacy.mjs')], { pass: [/privacy: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/sb_schema', ['node', path.join(HERE, 'pg/sb_schema.mjs')], { pass: [/sb_schema: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/sb_api', ['node', path.join(HERE, 'pg/sb_api.mjs')], { pass: [/sb_api: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/sb_config', ['node', path.join(HERE, 'pg/sb_config.mjs')], { pass: [/sb_config: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/api_layer', ['node', path.join(HERE, 'pg/api_layer.mjs')], { pass: [/api_layer: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/api_write', ['node', path.join(HERE, 'pg/api_write.mjs')], { pass: [/api_write: \d+ 通过, 0 失败/], timeout: 300 });
add('frontend', 'frontend/e2e_fullstack', ['node', path.join(HERE, 'e2e/fullstack.mjs')], { pass: [/fullstack: \d+ 通过, 0 失败/], timeout: 600 });
add('pg', 'pg/api_read', ['node', path.join(HERE, 'pg/api_read.mjs')], { pass: [/api_read: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/api_events', ['node', path.join(HERE, 'pg/api_events.mjs')], { pass: [/api_events: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/venues_seed', ['node', path.join(HERE, 'pg/venues_seed.mjs')], { pass: [/venues_seed: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/notify_run', ['node', path.join(HERE, 'pg/notify_run.mjs')], { pass: [/notify_run: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/sb_jobs', ['node', path.join(HERE, 'pg/sb_jobs.mjs')], { pass: [/sb_jobs: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/sb_race', ['node', path.join(HERE, 'pg/sb_race.mjs')], { pass: [/sb_race: \d+ 通过, 0 失败/], timeout: 600 });
// 第八批：前台场边内置的配置、今日推荐 = 数据库
add('pg', 'pg/sb_front', ['node', path.join(HERE, 'pg/sb_front.mjs')], { pass: [/sb_front: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/admin', ['node', path.join(HERE, 'pg/admin.mjs')], { pass: [/admin: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/ops', ['node', path.join(HERE, 'pg/ops.mjs')], { pass: [/ops: \d+ 通过, 0 失败/], timeout: 400 });
add('pg', 'pg/cities', ['node', path.join(HERE, 'pg/cities.mjs')], { pass: [/cities: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/cities_stats', ['node', path.join(HERE, 'pg/cities_stats.mjs')], { pass: [/cities_stats: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/cities_backend', ['node', path.join(HERE, 'pg/cities_backend.mjs')], { pass: [/cities_backend: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/routes', ['node', path.join(HERE, 'pg/routes.mjs')], { pass: [/routes: \d+ 通过, 0 失败/], timeout: 300 });
add('pg', 'pg/cities_admin', ['node', path.join(HERE, 'pg/cities_admin.mjs')], { pass: [/cities_admin: \d+ 通过, 0 失败/], timeout: 300 });
// 一年数据量下的速度（4d）：小数据量核对改写前后结果相同；一年量测每条查询的用时
add('pg', 'pg/perf@对照', ['node', path.join(HERE, 'pg/perf.mjs')], { env: { NBQ_PERF_SCALE: '0.05' }, pass: [/\d+ passed, 0 failed/], timeout: 900, solo: true });
if (!QUICK) add('pg', 'pg/perf@一年', ['node', path.join(HERE, 'pg/perf.mjs')], { env: { NBQ_PERF_SCALE: '1' }, pass: [/\d+ passed, 0 failed/], timeout: 2400, solo: true, slow: true });
add('frontend', 'frontend/verify', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/verify.js')], { pass: [/\d+ passed, 0 failed/], timeout: 1200 });
add('frontend', 'frontend/verify2', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/verify2.js')], { pass: [/\d+ passed, 0 failed/], timeout: 900 });
add('frontend', 'frontend/pages', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/pages.js')], { pass: [/PASS pages/], timeout: 300 });
add('frontend', 'frontend/side', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/side.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 第八批 场边接入
add('frontend', 'frontend/side_write', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/side_write.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 第八批 F1b 场边发布与互动
add('frontend', 'frontend/side_bar', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/side_bar.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 场边首页输入框：点一下进写页、不弹键盘
add('frontend', 'frontend/sheet_gestures', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/sheet_gestures.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 手机端弹层：顶部留白可点、下拉收起
add('frontend', 'frontend/loc_persist', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/loc_persist.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 定位只问一次 + Club 按字母排序
add('frontend', 'frontend/invite_form', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/invite_form.js')], { pass: [/invite_form: \d+ passed, 0 failed/], timeout: 300 });   // 约 TA 表单：滚动不跳、发送条固定、说一句快捷短语
add('frontend', 'frontend/input_visible', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/input_visible.js')], { pass: [/input_visible: \d+ passed, 0 failed/], timeout: 300 });   // 键盘弹出时每个弹层输入框都看得见、点得到
add('frontend', 'frontend/paper_consistency', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/paper_consistency.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 默认印色纸白：各处真实渲染像素一致
add('frontend', 'frontend/side_scroll', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/side_scroll.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 场边整页上移 / 卡顿回归
add('frontend', 'frontend/side_notif', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/side_notif.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 第八批 F2 场边通知 + 埋点
add('frontend', 'frontend/web_side', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/web_side.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });   // 第八批 F3 网页端接入场边
// 第八批 T2：设计稿 v35 的 146 项场边测试（原来读 QA_FILE 设计稿），改测正式页面（手机端 / 网页端），tests/场边/lib.cjs 做转接
for (const [n, nm] of [[1, '信息流'], [2, '网球点赞'], [3, '筛选'], [4, '详情回复菜单'], [5, '底栏'], [6, '发布页'], [7, '话题墙相册'], [8, '压力边界']])
  add('frontend', 'side_design/t' + n, ['node', '-r', PRELOAD, path.join(HERE, '场边/t' + n + '.cjs')], { pass: [/T\d+：通过 \d+，失败 0/], timeout: 300 });   // t1 信息流 · t2 网球点赞 · …
add('pg', 'e2e/sb_publish', ['node', '-r', PRELOAD, path.join(HERE, 'e2e/sb_publish.mjs')], { pass: [/sb_publish: \d+ 通过, 0 失败/], timeout: 300, slow: true });   // 第八批 T1 后台发布 → 前台读到
add('frontend', 'frontend/site', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/site.js')], { pass: [/\d+ passed, 0 failed/], timeout: 200 });   // 预览网站 site/（Cloudflare Pages）
add('frontend', 'frontend/softdelete', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/softdelete.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('frontend', 'frontend/account', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/account.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('frontend', 'frontend/report', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/report.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('frontend', 'frontend/notif_open', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/notif_open.js')], { pass: [/\d+ passed, 0 failed/], timeout: 400 });
add('frontend', 'frontend/dst', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/dst.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('frontend', 'frontend/xss', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/xss.js')], { pass: [/PASS xss/], timeout: 900 });
add('frontend', 'frontend/csp', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/csp.js')], { pass: [/PASS csp/], timeout: 600 });
add('frontend', 'frontend/cities', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/cities.js')], { pass: [/cities: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/sb_login', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/sb_login.js')], { pass: [/sb_login: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_data', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_data.js')], { pass: [/real_data: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_write', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_write.js')], { pass: [/real_write: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_invite', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_invite.js')], { pass: [/real_invite: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_chat', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_chat.js')], { pass: [/real_chat: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_safety', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_safety.js')], { pass: [/real_safety: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/real_after', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/real_after.js')], { pass: [/real_after: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/dom_integrity', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/dom_integrity.js')], { pass: [/dom_integrity: \d+ 通过, 0 失败/], timeout: 600 });
add('frontend', 'frontend/img_save', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/img_save.js')], { pass: [/img_save: \d+ 通过, 0 失败/], timeout: 300 });
add('frontend', 'frontend/wx_share', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/wx_share.js')], { pass: [/wx_share: \d+ 通过, 0 失败/], timeout: 300 });
add('frontend', 'frontend/a2hs', ['node', '-r', PRELOAD, path.join(HERE, 'frontend/a2hs.js')], { pass: [/a2hs: \d+ 通过, 0 失败/], timeout: 300 });
for (const t of TIMES) add('frontend', 'frontend/demos@' + t.slice(5, 16).replace(':', ''), ['node', '-r', PRELOAD, path.join(HERE, 'frontend/smoke.js')],
  { env: { NBQ_TS: t }, pass: [/runs \d+ with errors 0 non-spec events \[\]/], timeout: 900 });
// 截图对比（T4）：三个页面的关键画面逐像素对 tests/visual/baseline/；界面改动是预期的 → 重拍基准（README §截图对比）
add('visual', 'visual/shots', ['node', '-r', PRELOAD, path.join(HERE, 'visual/shots.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('admin', 'admin/data', ['node', '-r', PRELOAD, path.join(HERE, 'admin/data.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300, solo: true });   // 里面量生成用时（< 1.5 秒），和别的测试同时跑会被拖慢：单独跑
if (!QUICK) for (const t of ['2026-10-15T07:05:00+11:00', '2026-10-18T05:30:00+11:00']) add('admin', 'admin/data@' + t.slice(5, 16).replace(':', ''), ['node', '-r', PRELOAD, path.join(HERE, 'admin/data.js')], { env: { NBQ_TS: t }, pass: [/\d+ passed, 0 failed/], timeout: 300, solo: true });
add('admin', 'admin/consist', ['node', '-r', PRELOAD, path.join(HERE, 'admin/consist.js')], { pass: [/ALL PASS/], timeout: 900 });
add('admin', 'admin/cardsrc', ['node', '-r', PRELOAD, path.join(HERE, 'admin/cardsrc.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('admin', 'admin/notif', ['node', '-r', PRELOAD, path.join(HERE, 'admin/notif.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('admin', 'admin/xss', ['node', '-r', PRELOAD, path.join(HERE, 'admin/xss.js')], { pass: [/ALL PASS admin-xss/], timeout: 600 });
add('admin', 'admin/roles', ['node', '-r', PRELOAD, path.join(HERE, 'admin/roles.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('admin', 'admin/cities', ['node', '-r', PRELOAD, path.join(HERE, 'admin/cities.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
add('admin', 'admin/sideline', ['node', '-r', PRELOAD, path.join(HERE, 'admin/sideline.js')], { pass: [/\d+ passed, 0 failed/], timeout: 300 });
// 4b 夏令时：开始当天（10-04，23 小时）与结束当天（04-04，25 小时）
for (const t of ['2026-10-04T21:30:00+11:00', '2027-04-04T09:00:00+10:00']) add('admin', 'admin/dst@' + t.slice(5, 10), ['node', '-r', PRELOAD, path.join(HERE, 'admin/dst.js')], { env: { NBQ_TS: t }, pass: [/\d+ passed, 0 failed/], timeout: 300 });
if (!QUICK) for (const t of ['2026-10-04T21:30:00+11:00', '2027-04-04T09:00:00+10:00']) add('admin', 'admin/consist@' + t.slice(5, 16).replace(':', ''), ['node', '-r', PRELOAD, path.join(HERE, 'admin/consist.js')], { env: { NBQ_TS: t }, pass: [/ALL PASS/], timeout: 900 });
// 后台在一天里不同时间（清早数字很小、深夜今天的局都已开打）也要自洽
if (!QUICK) for (const t of ['2026-10-15T07:05:00+11:00', '2026-10-14T23:40:00+11:00']) add('admin', 'admin/consist@' + t.slice(5, 16).replace(':', ''), ['node', '-r', PRELOAD, path.join(HERE, 'admin/consist.js')], { env: { NBQ_TS: t }, pass: [/ALL PASS/], timeout: 900 });
if (!QUICK) add('admin', 'admin/sweep', ['node', '-r', PRELOAD, path.join(HERE, 'admin/sweep.js')], { pass: [/checks=\d+ issues=0/], timeout: 2400 });
if (!QUICK || args.changed) for (const f of fs.readdirSync(path.join(HERE, 'regression')).filter(f => f.endsWith('.js')).sort())
  add('regression', 'regression/' + f.replace(/\.js$/, ''), ['node', '-r', PRELOAD, path.join(HERE, 'regression', f)], { snapshot: true, timeout: 400, needsExit0: true });

// ---------- --changed / --failed：按改动或上次失败选测试（规则和说明见 tests/lib/select.mjs） ----------
const FAILED_FILE = process.env.NBQ_FAILED_FILE || path.join(HERE, 'reports', 'failed.json');
const readFailed = () => { try { return JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8')).ids || [] } catch { return [] } };
let CHG = null, FAILED = null;
if (args.changed) {
  const ref = args.changed === true ? '' : String(args.changed);
  if (ref && !/^[\w.\/~^@-]+$/.test(ref)) { console.error('--changed=<ref> 的 ref 不合法：' + ref); process.exit(2) }
  const git = c => execSync('git -c core.quotePath=false ' + c, { cwd: DIR, encoding: 'utf8' }).split('\n').filter(Boolean);
  let files;
  try { files = ref ? git('diff --name-only ' + ref) : [...new Set([...git('diff --name-only HEAD'), ...git('ls-files -o --exclude-standard')])] }
  catch (e) { console.error('--changed 读不到 git 改动：' + String(e.message).split('\n')[0]); process.exit(2) }
  if (!files.length) { console.log('--changed：没有改动。' + (args.failed ? '' : '没有要跑的测试。')); if (!args.failed) process.exit(0) }
  else {
    CHG = selectByChanged(files); CHG.n = files.length;
    // 回归测试也按改动挑（11-04，规则见 select.mjs 末尾）：改到的函数 / id 被哪个回归测试用到，就在快速档里也跑它
    try {
      const diff = execSync('git -c core.quotePath=false diff -U3 ' + (ref || 'HEAD') + ' -- src server', { cwd: DIR, encoding: 'utf8', maxBuffer: 1 << 28 });
      const rd = path.join(HERE, 'regression'), srcs = Object.fromEntries(fs.readdirSync(rd).filter(f => f.endsWith('.js')).map(f => ['regression/' + f.replace(/\.js$/, ''), fs.readFileSync(path.join(rd, f), 'utf8')]));
      CHG.reg = regressionHits(touchedNames(diff), srcs);
    } catch { CHG.reg = [] }
  }
}
if (args.failed) FAILED = readFailed();
const SEL = !!(CHG || FAILED);
const picked = t => (CHG && (t.suite === 'regression' ? CHG.reg.includes(t.id) : (CHG.all || matches(t.id, CHG.tokens)))) || (FAILED && FAILED.includes(t.id));
const LIST = T.filter(t => (!SEL || picked(t)) && (!ONLY || ONLY.includes(t.suite)) && !(SKIP && SKIP.includes(t.suite)) && (!GREP || GREP.some(g => t.id.includes(g))) && !(FAST && t.slow));
if (CHG) {
  console.log(`--changed${args.changed === true ? '' : '=' + args.changed}：${CHG.n} 个文件有改动` + (CHG.all ? '，改了测试入口 / 公共库 → 跑整个快速档' : `，选了：${CHG.tokens.join(' ')}`) + (CHG.reg.length ? `；回归（改到的函数 / id 被它们用到）：${CHG.reg.join(' ')}` : ''));
  if (CHG.unmatched.length) console.log(`  没有对应规则（只跑基础的 static + unit；该有规则就补进 tests/lib/select.mjs）：${CHG.unmatched.join(' ')}`);
  if (CHG.ignored.length) console.log(`  不对应测试（文档 / 图片 / 物料 / CI 配置）：${CHG.ignored.length} 个`);
}
if (FAILED) {
  console.log(`--failed：上次没通过的 ${FAILED.length} 项` + (FAILED.length ? '：' + FAILED.join(' ') : ''));
  const gone = missingFrom(FAILED, T.map(t => t.id));
  if (gone.length) console.log(`  这一档里没有（完整档才有，或已改名；去掉 --quick / --fast 再试）：${gone.join(' ')}`);
}
if (SEL && !LIST.length && !args.list) { console.log('\n没有要跑的测试。'); process.exit(0) }
if (args.list) { LIST.forEach(t => console.log(t.suite.padEnd(11), t.id)); process.exit(0) }

// ---------- 环境检查 ----------
function need(ok, msg) { if (!ok) { console.error('环境不满足：' + msg); process.exit(2) } }
need(+process.versions.node.split('.')[0] >= 18, 'Node.js 需要 18 以上（当前 ' + process.version + '）');
let NODE_PATH = [process.env.NODE_PATH, path.join(CACHE, 'node_modules')];
try { NODE_PATH.push(execSync('npm root -g').toString().trim()) } catch (_) { }
NODE_PATH = NODE_PATH.filter(Boolean).join(path.delimiter);
const pwOk = (() => { try { execSync(`node -e "require('playwright')"`, { env: { ...process.env, NODE_PATH }, stdio: 'pipe' }); return true } catch (_) { return false } })();
if (LIST.some(t => !['static', 'schema', 'unit', 'pg'].includes(t.suite))) need(pwOk, '找不到 playwright。安装：npm i -g playwright && npx playwright install chromium');
if (LIST.some(t => t.suite === 'schema')) {
  try { execSync('python3 -c "import pglast"', { stdio: 'pipe' }) } catch (_) { need(false, '数据库测试需要 python3 和 pglast。安装：pip install pglast') }
  const sd = path.join(CACHE, 'schema');
  if (!fs.existsSync(path.join(sd, 'node_modules', '@electric-sql', 'pglite'))) {
    fs.mkdirSync(sd, { recursive: true }); fs.copyFileSync(path.join(HERE, 'schema', 'package.json'), path.join(sd, 'package.json'));
    console.log('首次运行：安装 PGlite 到 ' + sd + ' …');
    try { execSync('npm install --no-audit --no-fund', { cwd: sd, stdio: 'inherit' }) } catch (_) { need(false, 'PGlite 安装失败（需要能访问 npm）') }
  }
}
if (LIST.some(t => t.id === 'static/lint')) {
  const ld = path.join(CACHE, 'lint'), want = fs.readFileSync(path.join(HERE, 'lint', 'package.json'), 'utf8');
  const cur = fs.existsSync(path.join(ld, 'package.json')) ? fs.readFileSync(path.join(ld, 'package.json'), 'utf8') : '';
  if (!fs.existsSync(path.join(ld, 'node_modules', 'eslint')) || cur !== want) {
    fs.mkdirSync(ld, { recursive: true }); fs.writeFileSync(path.join(ld, 'package.json'), want);
    console.log('首次运行：安装 ESLint 到 ' + ld + ' …');
    try { execSync('npm install --no-audit --no-fund', { cwd: ld, stdio: 'inherit' }) } catch (_) { need(false, 'ESLint 安装失败（需要能访问 npm）') }
  }
}
if (LIST.some(t => t.suite === 'pg')) {
  const base = '/usr/lib/postgresql', hasPg = !!process.env.NBQ_PGBIN || (fs.existsSync(base) && fs.readdirSync(base).some(v => fs.existsSync(path.join(base, v, 'bin', 'initdb'))));
  const hasGis = !!process.env.NBQ_PGBIN || (fs.existsSync('/usr/share/postgresql') && fs.readdirSync('/usr/share/postgresql').some(v => fs.existsSync(path.join('/usr/share/postgresql', v, 'extension', 'postgis.control'))));
  need(hasPg && hasGis, '真实数据库测试需要 PostgreSQL 15/16 和 PostGIS（' + (hasPg ? '缺 PostGIS' : '缺 PostgreSQL') + '）。一条命令装好：bash tools/setup_env.sh（或 apt install postgresql postgresql-16-postgis-3，或设置 NBQ_PGBIN）；暂时跳过：--only=static,schema,frontend,admin,regression');
  const pd = path.join(CACHE, 'pg');
  if (!fs.existsSync(path.join(pd, 'node_modules', 'pg'))) {
    fs.mkdirSync(pd, { recursive: true }); fs.copyFileSync(path.join(HERE, 'pg', 'package.json'), path.join(pd, 'package.json'));
    console.log('首次运行：安装 pg 到 ' + pd + ' …');
    try { execSync('npm install --no-audit --no-fund', { cwd: pd, stdio: 'inherit' }) } catch (_) { need(false, 'pg 安装失败（需要能访问 npm）') }
  }
}
NODE_PATH = [NODE_PATH, path.join(CACHE, 'pg', 'node_modules')].join(path.delimiter);
for (const f of ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'schema.sql']) need(fs.existsSync(path.join(DIR, f)), '被测目录里没有 ' + f + '（NBQ_DIR=' + DIR + '）');

// ---------- 运行 ----------
fs.mkdirSync(LOGS, { recursive: true }); fs.mkdirSync(WORK, { recursive: true });
const clean = s => s.split('\n').filter(l => !NOISE.test(l)).join('\n').trim();
const norm = s => clean(s).replace(/\b\d{10,}\b/g, '<N>').replace(/[ \t]+$/gm, '');
function run(t) {
  return new Promise(res => {
    const wd = path.join(WORK, t.id.replace(/[^\w@.-]/g, '_')); fs.mkdirSync(wd, { recursive: true });
    for (const d of ['v69', 'v70']) fs.mkdirSync(path.join(wd, d), { recursive: true });   // 个别回归脚本把截图写进子目录
    let cmd = t.cmd;
    if (cmd[0] === '__schema__') {
      const sd = path.join(CACHE, 'schema');
      for (const f of ['run.mjs', 'preamble.sql']) fs.copyFileSync(path.join(HERE, 'schema', f), path.join(sd, f));
      const stm = path.join(wd, 'stmts.json');
      try { execSync(`python3 "${path.join(HERE, 'schema', 'split.py')}" "${path.join(DIR, 'schema.sql')}" "${stm}"`, { stdio: 'pipe' }) }
      catch (e) { return res({ code: 1, out: 'pglast 解析 schema.sql 失败：\n' + (e.stderr || e.stdout || e), ms: 0 }) }
      cmd = ['node', path.join(sd, 'run.mjs'), stm, path.join(HERE, 'schema', 'tests.sql'), SPEC];
    }
    const t0 = Date.now(); let out = '';
    const p = spawn(cmd[0], cmd.slice(1), { cwd: wd, env: { ...process.env, NODE_PATH, NBQ_DIR: DIR, ...t.env } });
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    const timer = setTimeout(() => { out += `\n[runner] 超时 ${t.timeout}s，已终止`; p.kill('SIGKILL') }, t.timeout * 1000);
    p.on('close', code => { clearTimeout(timer); res({ code, out, ms: Date.now() - t0 }) });
  });
}
const SNAP = path.join(HERE, 'snapshots');
const results = [];
console.log(`南伴球测试 · ${QUICK ? '快速' : '完整'}${FAST ? ' · 跳过慢的' : ''}${GREP ? ' · 只跑 ' + GREP.join('/') : ''}${CHG ? ' · 按改动选' : ''}${FAILED ? ' · 重跑失败的' : ''} · ${LIST.length} 项 · 同时 ${JOBS} 项 · 被测目录 ${DIR}\n`);
// 同时跑：普通的 JOBS 项一起跑，单独跑的（性能测试）最后一项一项跑；输出按完成顺序，报告按列表顺序
async function check(t) {
  let r = await run(t);
  const body = clean(r.out), why = [];
  if (t.needsExit0 && r.code !== 0) why.push(`退出码 ${r.code}`);
  for (const re of t.pass) if (!re.test(body)) why.push('缺少 ' + re);
  for (const re of t.forbid) { const m = body.match(re); if (m) why.push('出现 ' + JSON.stringify(m[0].slice(0, 80))) }
  let snap = '';
  if (t.snapshot && !why.length) {
    const f = path.join(SNAP, t.id.split('/')[1] + '.txt'), cur = norm(r.out);
    if (UPDATE || !fs.existsSync(f)) { snap = fs.existsSync(f) ? '已更新快照' : '新建快照'; fs.writeFileSync(f, cur + '\n') }
    else if (fs.readFileSync(f, 'utf8').trim() !== cur) {
      // 先排除偶发：再跑一次，两次一致才算真的变了
      const r2 = await run(t);
      if (norm(r2.out) !== cur) snap = '输出不稳定（两次运行结果不同）';
      why.push('输出和快照不同' + (snap ? '，且' + snap : '') + '：确认是预期改动后用 --update-snapshots 更新');
      fs.writeFileSync(path.join(LOGS, t.id.replace(/\//g, '__') + '.diff.txt'), '--- 快照\n' + fs.readFileSync(f, 'utf8') + '\n--- 本次\n' + cur + '\n');
    }
  }
  const ok = !why.length;
  fs.writeFileSync(path.join(LOGS, t.id.replace(/\//g, '__') + '.log'), body + '\n');
  // 失败时：具体哪几条 FAIL / 报错（CI 注解和 summary.md 用，不用再下日志或本地复现）；没有 FAIL 行（崩溃、超时）就取输出最后几行
  const fl = ok ? [] : (body.match(/^.*(FAIL|Error|[1-9]\d* failed).*$/gm) || []).map(l => l.trim().slice(0, 400));
  const fails = ok ? [] : fl.length ? fl.slice(0, 8) : body.split('\n').filter(l => l.trim()).slice(-6).map(l => l.trim().slice(0, 300));
  results.push({ suite: t.suite, id: t.id, ok, ms: r.ms, exit: r.code, why, fails, note: snap, summary: (body.match(/^.*(passed|PASS|issues=|RESULT|runs \d+).*$/gm) || []).slice(-3) });
  console.log(`${t.id.padEnd(40)} ${ok ? '通过' : '失败'}  ${(r.ms / 1000).toFixed(0)}s${snap ? '  · ' + snap : ''}${ok ? '' : '\n    ' + why.join('\n    ')}`);
}
{
  const queue = LIST.filter(t => !t.solo);
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await check(queue.shift()) }));
  for (const t of LIST.filter(t => t.solo)) await check(t);
  const order = new Map(LIST.map((t, i) => [t.id, i])); results.sort((a, b) => order.get(a.id) - order.get(b.id));
}

// ---------- 报告 ----------
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex').slice(0, 16);
const files = ['南伴球_PWA.html', '南伴球_Web.html', '南伴球_后台.html', 'schema.sql', 'sw.js', 'manifest.webmanifest'].filter(f => fs.existsSync(path.join(DIR, f)));
const nFail = results.filter(r => !r.ok).length;
const md = [`# 南伴球测试报告 · ${STAMP}`, '', `模式：${QUICK ? '快速' : '完整'}　结果：**${nFail ? nFail + ' 项失败' : '全部通过'}**（${results.length} 项）`, '',
  '## 被测文件', '', '| 文件 | sha256（前 16 位） |', '|---|---|', ...files.map(f => `| ${f} | \`${sha(f)}\` |`), '',
  '## 结果', '', '| 套件 | 测试 | 结果 | 用时 | 说明 |', '|---|---|---|---|---|',
  ...results.map(r => `| ${r.suite} | ${r.id} | ${r.ok ? '通过' : '**失败**'} | ${(r.ms / 1000).toFixed(0)}s | ${r.ok ? (r.note || r.summary.join(' · ').replace(/\|/g, '/')) : r.why.concat(r.fails.slice(0, 3)).join('；').replace(/\|/g, '/')} |`),
  '', `日志：logs/ 目录；快照差异：logs/*.diff.txt`].join('\n');
fs.writeFileSync(path.join(OUT, 'summary.md'), md + '\n');
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ stamp: STAMP, quick: QUICK, dir: DIR, files: Object.fromEntries(files.map(f => [f, sha(f)])), results }, null, 2));
try { fs.writeFileSync(FAILED_FILE, JSON.stringify({ stamp: STAMP, ids: updateFailed(readFailed(), results) }, null, 2) + '\n') } catch { /* 名单写不了不影响测试结果 */ }
if (!args.keep) fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\n${nFail ? '有 ' + nFail + ' 项失败' : '全部通过'} · 报告：${path.relative(process.cwd(), path.join(OUT, 'summary.md'))}`);
process.exit(nFail ? 1 : 0);
