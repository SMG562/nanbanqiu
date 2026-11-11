# 南伴球 · 测试体系

一条命令把前台两端、后台、数据库、发送程序、CI 配置全部检查一遍，给出明确的「通过 / 失败」和原因。
**单项测试的细节只写在该测试文件开头的注释里**（做什么、为什么、查什么）——那是唯一来源；本文件只讲体系、用法和约定，不逐项复述（逐项复述 11 月已落后 60 多项，不再维护）。权威清单：`node tests/run_all.mjs --list`。

## 1. 怎么跑
```bash
node tests/run_all.mjs --changed=origin/main --skip=visual   # 每轮默认：按改动挑相关的（规则 tests/lib/select.mjs）
node tests/run_all.mjs --grep=sb_,notify     # 名字含这些字的
node tests/run_all.mjs --only=static,schema,pg --fast   # 数据库 + 静态，约 2 分钟（跳过一年数据量性能测试）
node tests/run_all.mjs --quick               # 快速档（PR 上 CI 跑的就是它）；不带参数 = 完整档（每周日 CI 跑）
node tests/run_all.mjs --failed              # 只重跑「失败过、之后还没通过」的项（tests/reports/failed.json）
node tests/run_all.mjs --shard=i/n           # CI 分片用，本地不用
node tests/run_all.mjs --jobs=2 --list --update-snapshots
```
- 退出码：`0` 全过 · `1` 有失败 · `2` 环境不满足或参数非法（会说明缺什么）。
- 报告在 `tests/reports/<时间>/`：`summary.md`（给人）、`results.json`（给机器）、`logs/`（每项完整输出，快照差异 `*.diff.txt`）。
- **本地一律带 `--skip=visual`**（截图对比用 CI 字体，本地必然不一致）。**`--changed` 改了 `tests/run_all.mjs` 或 `tests/lib/` 会选中整个快速档**（约 100 项、10 分钟以上）→ 这类改动只 `--grep` 相关项，其余交给 PR 上的 CI。
- **失败先单独再跑一次**（`--grep=<名字>`；并发时浏览器类偶发超时）；单独也失败才查。同一条偶发失败出现 ≥ 2 次 = 开 Issue 修，不靠重跑糊过去。
- 单个测试直接 `node tests/…` 或浏览器打开 HTML 前先 `node tools/build.mjs`（三个 HTML 和 `_bundle.sql` 不入库，ADR 0011）。

**环境**：`bash tools/setup_env.sh` 一条命令装齐（ESLint、pglast、PostgreSQL 16 + PostGIS、提交前检查；`--check` 只检查）。单装：Node ≥ 18；Playwright + Chromium（`npm i -g playwright && npx playwright install chromium`）；`pip install pglast`（切分并解析 `schema.sql`）；PGlite 首次运行自动装到 `~/.cache/nbq-tests/schema`。可选变量：`NBQ_DIR`、`NBQ_CACHE`、`NBQ_CHROMIUM`。

## 2. 分层：能用便宜的测试证明的，不用贵的
| 层 | 目录 | 跑在哪 | 管什么 |
|---|---|---|---|
| 静态 | `static/` | Node，秒级 | 源文件拼装一致（`build`）、ESLint（`lint`）、字典 / 错误码 / 权限登记三方一致、注入静态检查、枚举覆盖 |
| 单元 | `unit/` | Node 空沙盒 | 页面纯规则（场边频率 / 通知文字）、登录与数据层逻辑、**所有 `tools/` 脚本与闸门**（`pr_merge`、`ci_reuse`、`pre_push_guard`、`migration_audit`、`doc_budget`、`ci_paths`…）；提交前检查也跑 |
| 库结构 | `schema/` | PGlite（PostGIS 用桩） | `schema.sql` 从头到尾真实执行 + 样例数据，带 `!` 的必须被数据库拒绝 |
| 数据库 | `pg/` | **真实 PostgreSQL 16 + PostGIS**（`cluster.mjs` 临时起关） | 接口函数、定时任务、RLS 谁能读写、同时操作（`race`：A 先 / B 先 / 并发 25 次）、频率限制、风险规则、隐私、后台、城市、场边、通知发送程序、一年数据量性能（`perf`） |
| 前台 / 后台 | `frontend/` `admin/` `场边/` | Playwright + Chromium，两端 | 真实界面点一遍：断言 **DOM**，不只断言内存；真实模式用「假 Supabase + 有状态的假 /api」（`real_*.js`） |
| 全栈 | `e2e/` | 真前台 ↔ 真 `handler.mjs` ↔ 真 PG | 「做一次 → 刷新 → 状态还在」；见 `开发规矩.md` §5 |
| 截图 | `visual/` | CI 字体 | 逐像素对 `visual/baseline/*.png`（三通道差 ≤ 16 算同色，不同点 > 0.05% 算不一致） |
| 回归 | `regression/` | 只在完整档 | 22 个历次回归脚本，输出与 `snapshots/` 逐字比对；不一致自动再跑一次，两次一致才判「真的变了」 |

**通用失败条件**（所有浏览器测试）：输出含 `FAIL`、`TypeError` / `ReferenceError` / `SyntaxError` / `RangeError`、`Cannot read propert…`、非空页面错误数组、Playwright 超时；退出码非 0；超过该项时限（超时直接终止判失败）。

## 3. 可重复性（同样的代码，每次结果一样）
所有浏览器测试经 `lib/preload.js` 启动（`node -r lib/preload.js 脚本`），脚本本身不用改：
- **固定时钟**：页面时间从 `NBQ_TS` 起（默认 2026-10-14 15:10 墨尔本）；**固定时区**墨尔本（`NBQ_TZ`），与机器无关。「几天前」之类断言按页面时间算（`pg.evaluate(() => Date.now())`）。
- **固定随机数**：`Math.random` 换成带种子的伪随机（`NBQ_SEED`），快照才可比。
- **断网**：外网请求一律拦掉，结果不受网络影响（第三方库已由 `vendor/` 本站托管，`frontend/vendor_load` 盯着）。
- **文件位置**：脚本里写死的 `/mnt/user-data/outputs/` 自动改到 `NBQ_DIR`。
- **等页面安静**：用 `page.settle(最多毫秒)`（页面内 `__nbqSettle`）代替「点完固定等 N 毫秒」——短定时器、rAF、会结束的动画都完了、连续两次检查安静才继续，最多等原来那么久，只会更快；`NBQ_SETTLE_DEBUG=1` 看哪步等满了。量位置、等弹窗回应、等真实时间流逝这类写明确条件（`waitForFunction`），不用 settle。
- **前置条件显式写**：不依赖浏览器默认值（如通知权限）；本地和 CI 同环境（含时区）。
- **临时仓库里跑 git 的测试**：去掉 `GIT_*` 变量并先确认 `rev-parse --show-toplevel` 是临时目录（`tests/lib/git_env.mjs`；11-03、11-11 两次落到真仓库）。

## 4. 写新测试
1. **先写会失败的测试**（含所有者反馈的问题），看它红，再改代码；改完单独跑那一项。
2. **文件开头必写注释**：测什么 · 为什么（哪个事故 / 需求）· 查什么 · 查不到什么。
3. **正例 + 反例 + 影响面**：不只测「我要它做的」，还要测「不该受影响的」和「谁用了这层」。
4. **放哪**：有明确断言的写到 `frontend/` 或 `admin/`，最后一行输出 `<文件名>: N passed, M failed`，失败 `process.exit(1)`；`frontend/*.js` 自动加入 `run_all`（默认超时 300s），要别的判定 / 超时才在 `run_all.mjs` 写 `add()`；`admin/` 仍要登记。新 pg 接口测试从 `pg/api_events.mjs` 头部复制；新前台真实模式用例往 `real_data.js` / `real_write.js` 的假 /api 加路由，不另起浏览器。
5. **新事件**先写进 `spec/events_spec.md`（唯一来源），static / schema / frontend / admin 四处按它核对。
6. **新目录 / 新测试 / 新服务端目录** → 同步 `tests/lib/select.mjs` 的 `RULES`（`unit/select` 核对每个名字都匹配真实测试）。
7. **很慢的测试（> 60s）** → 登记 `tests/spec/test_weights.json`（分片均衡用）；刷新：看最近一次 tests 运行「用时最长」注解前 15 项。
8. **键盘 / iOS 输入法 / 推送 / 登录 / Service Worker**：Playwright 模拟不了真机，写模拟（手动加 `.kb`、手发 `compositionend` + Enter）并**仍须真机看过**（`真机清单.md`）。
9. **别写「总数」断言**（会因别人加一项就红，11-10 冲突治理）；假请求头里别放中文；`page.evaluate` 访问不到 node 变量，要传参。

## 5. 快照与截图基准
- 回归快照不一致：先看 `logs/<测试>.diff.txt`——预期变化 → `--update-snapshots` 并在提交信息写原因；非预期 → 就是回归，先修。
- 截图基准用 CI 字体拍。界面改动是预期的 → 推送后在 Actions 手动运行选 `visual-baseline`（别同时再触发别的手动运行，会互相取消），CI 重拍并提交回 main，再 `git pull`；重拍期间不并行改界面。

## 6. 测试本身也要被检验
- **故意改坏**：`python3 tests/lib/mutate.py 计划.json`（跑时不改仓库文件）。一批收尾或做新闸门时对 8–10 处关键规则改坏，每处必须被至少一项测试抓到；抓不到的补测试。10-15 首轮 6 处全抓到；`side_rules` 13 处、`ci_paths` 5 处、城市系列各 11–15 处。
- **可重复性自检**：回归快照连续两次完整运行结果逐字相同；`unit/shard` 盯分片、`unit/select` 盯选择规则，工具自己也被测。
- **守卫类测试**（`ci_paths`、`doc_budget`、`enum_cover`、`persist_audit`、`input_audit`…）是把规矩变成机器闸门的落点，加规矩时优先加它们。

## 7. CI 分片与复用（11-11）
- **分片**：`tests.yml` 的 `shard` 按 matrix 并行（公开仓库 4 份、私有 2 份、重拍基准 1 份），每份 `run_all --shard=i/n`；汇总任务 `test` 全部分片成功才成功，所以 `gate.sh` / `pr_merge.sh` / `ci_reuse.sh` 看「整个运行结论」不变。依据：单机 `--jobs=2` 约 700s，xss / verify / demos 约占四分之一。
- **分法**：按 `test_weights.json` 预估用时确定性均衡（没登记的按 15s）；`unit/shard` 守「各份合起来 = 全部、互不重复、非法参数退出码 2、登记的名字都存在、`tests.yml` 分片列表完整」。
- **按端拆开**：xss、demos 拆成 `@PWA` / `@Web` 并行（env `XSS_ONLY` / `SMOKE_ONLY`），verify 两端同进程并行。
- **并发数**：每台机器 `--jobs=2`。11-11 试过默认（4 核 4 项）：两次运行各偶发 1 项，重跑才过——浏览器测试吃 CPU，并行交给分片，不靠机器内加并发。
- **周报分钟数**（`weekly_metrics.mjs`）按墙钟算，分片后低估计费分钟（私有仓库才计费）；转私有后改成按任务时长相加。
- **main 上 `tests` 总是 12 分钟**：复用没坏，是连续直推 main（11-10 / 11-11 调 iPhone「保存图片」连推 6 次）没有 PR、没有可复用的运行。**真机反复试的改动走「分支 → 预览站（staging 库）」，试好后一个 PR 合并**；直推 main 留给一次就对的小修。复用与合并规则见 `开发规矩.md` §3。

## 8. 目录
```
tests/
  run_all.mjs  总入口        lib/  preload · select · mutate.py · git_env · backup.py · ci_status.sh
  spec/  events_spec.md（事件字典，唯一来源）· api_spec.md（接口 + 错误码）· actions / inputs / persist_allow.json（登记）· test_weights.json · doc_budget.json
  static/ unit/ schema/ pg/ frontend/ admin/ 场边/ e2e/ visual/ regression/ snapshots/ reports/（可删）
```

## 9. 已知限制
- 浏览器测试用 Chromium；iPhone Safari 的推送、分享面板、添加到主屏幕、键盘只能真机验证。
- `schema/` 用 PGlite（PostGIS 是桩）；`pg/` 才是真实 PostgreSQL 16 + PostGIS。正式库用 PostgreSQL + PostGIS，迁移是否在正式库成立靠 `db-parity`（`开发规矩.md` §8），不靠测试库。
- 视觉对比只能在 CI 字体下做；本地只用来看差异图。
- 前台埋点由 `verify*.js` 核对「只发一次、props 齐全、两端一致」；服务端事件（来源 S）至少核对了字典，实际上报是否逐项核对以各测试注释为准。
