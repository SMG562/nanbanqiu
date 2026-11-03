# 南伴球

墨尔本（之后悉尼）华人网球约局：手机端 PWA、电脑网页端、管理后台、PostgreSQL 数据库。

用户说「继续上次的」时：读 `进度记录.md`，按「§0 中断后怎么接着做」执行。进度只以那份文件为准；做过什么看 `git log`，以后再做 / 要你定的看 GitHub Issues（`gh issue list -R SMG562/nanbanqiu`），业务规则看 `业务规则.md`，查旧决定再打开 `进度记录_历史.md`。

clone 后先启用提交前检查：`git config core.hooksPath .githooks`（拼接核对 + 代码检查 + 静态检查，约 6 秒）。

- 用中文回复，简洁；汇报只写结果、用户需要知道的和下一步。
- **三个页面都改 `src/`**（前台：shared 两端共用 / pwa / web；page、style、script、side=场边；后台：admin/），改完 `node tools/build.mjs` 拼出三个 HTML、`node tools/lint.mjs` 检查；不要直接改 南伴球_PWA.html / 南伴球_Web.html / 南伴球_后台.html。
- 测试：本地只跑 `node tests/run_all.mjs --changed`（按改动选相关的；`--failed` 只重跑上次没通过的；也可手写 `--grep=<相关>`）；推送后 GitHub 自动跑快速测试，一批收尾在 Actions 手动跑 full。看结果：`bash tests/lib/ci_status.sh`。说明见 `tests/README.md`。
- **接上 GitHub 仓库（add_repo、clone）、提交、`git push` 到 main：用户 10-27 说默认全部同意，不用问，直接做**（.claude/settings.json 里也放行了这些操作；强推仍禁止）。
- 预览网站 https://nanbanqiu-preview.pages.dev ：推送到 main 后 Cloudflare Pages 自动部署（`node tools/site.mjs` → site/），不用再手动发布预览页；要公开的新文件写进 site.mjs 的白名单。
- **宣传物料 / 海报**：用户说做海报、朋友圈图、宣传图时，**只读 `.claude/skills/nanbanqiu-poster/SKILL.md`** 照流程做（marketing/ 里 84 张已有、一套出图脚本；不通读旧海报代码，省 token）；成品在预览站 /materials.html。
- 不删除文件、不 `push --force`；每轮一次提交并推送，再把改过的文件同步到用户电脑的「文稿/南伴球」文件夹（10-27 用户说：往电脑存文件默认全部同意，不用问；只写改过的，不删任何东西）。
- **同步必须回读核对**（11-03）：`device_commit_files` 写完后，用 `bash tools/sync_verify.sh HEAD~1 --paths` 得到路径 → `device_stage_files` 读回 → `bash tools/sync_verify.sh HEAD~1`，一致才算同步完成。**改了发送程序**（server/notify、worker/notify.mjs）：先 `sync_verify.sh --deploy` 核对，再让用户在自己电脑运行 `node tools/deploy_notify.mjs`（部署 + 核对线上指纹，输出 ✅ 才算上线）；我也可随时 WebFetch `https://nanbanqiu.app/api/version`（发送程序指纹，对照 `node tools/worker_version.mjs`）和 `/version.json`（网页提交，对照 git HEAD）确认线上是哪一版。不能只凭「写入成功」或「部署命令没报错」说已生效。
- **前台改状态必须看页面，不能只看内存**（11-03 教训）：刷新后内存里 ME 已是 Liu，网页右上角 `#meSlot` 仍画着「登录」——因为读入后某处 `if(ME)return` 跳过了重画。规矩：①数据读进内存只走 `nbqApply`，它统一 `nbqRenderSoon()` 重画，不靠各调用处各自记得；②前台测试必须断言**页面**（DOM：登录后/刷新后/退出后头部是否对），不能只断言内存和接口调用；③声称「前台修好了」前，在真实页面里看一眼画面（不是读变量）。
- **库里的值进前台必须过转换口，枚举必须有覆盖检查**（11-03 头像印色教训）：库存色名 `paper`、前台画印要色值，真实数据模式漏了转换，默认纸白被画成黑色。规矩：①接口数据进前台只走 `nbqFrom*` 转换函数，枚举字段（印色、卡面主题、头像类型、性别、场地…）用 `nbqEnum` 校验，不认识的值给兜底并上报 `未知枚举值`（进后台报错、冒烟变红），不原样往下传；②库的约束加值 / 前台少值，`tests/unit/enum_cover.mjs` 会先红，新增枚举字段要同时加进去；③测试数据里出现某个值，就要断言它**画对了**（颜色、文字、图标），不能只断言「有头像」；④接真实数据的改动，在预览站用测试号登录后看过画面再合并 main；⑤schema 里「后面的语句覆盖前面的默认值」要有测试盯最终生效值。
- **测试库验过 ≠ 正式库成立**（11-03）：凡涉及库结构 / 默认值 / 约束 / 迁移 / 已有数据的改动，合并前必须：①迁移向后兼容、可重复运行，**同时处理已有数据**（不只改「以后新建」的默认，要查老行是不是还带着旧值）；②让用户在测试库和正式库各跑一次 `bash tools/db_parity.sh`（或 `NBQ_DB_URL=测试库 NBQ_DB_URL_B=正式库 bash tools/db_parity.sh --diff`），**输出 ✅ 一致才算「正式库也会成立」**，有差别先补迁移；③同时看数据里的枚举分布（脚本末尾），出现前台不认识的值就查；④正式库迁移按「先正式库跑迁移 → 再合并前端」的顺序，不反过来。
- **前台「改了就要存」**（11-03）：任何用户可改的资料（头像 / 印色 / 卡面 / 昵称 / 微信号 / 邮箱 / 性别 / 邀约限制…）在真实模式必须写到服务器并读回；测试里必须「改 → 重读（nbqRefresh）→ 断言还在」，只看改完当下的画面不算。新增可改字段时同时核对：`ME_EDITABLE`（服务端白名单）、`/api/me` 是否返回、`nbqFromUser` 是否带上。
- **推 main 前先看差异，测试不许碰真仓库**（11-03 事故）：提交前检查里的 `unit/select` 在 git hook 的环境变量（GIT_DIR 等）下，把临时仓库的两个提交（init 清空文件）落到了真仓库，我又 `git push …:main` 推了上去，main 一度被清空（Cloudflare 构建失败，线上未受影响，已用新提交恢复）。规矩：①凡是在临时仓库里跑 git 的测试，一律去掉 `GIT_*` 变量并先确认 `rev-parse --show-toplevel` 是临时目录；②推 main 之前先 `git diff --stat origin/main..HEAD` 看改动是不是只有预期的文件；③`.githooks/pre-push` 会拦下一次删 10 个以上文件的 main 推送；④不用 worktree 分支直推 main，改用 PR 或 cherry-pick 后再看差异。
- **改异步流程必查提前返回**（11-03）：改动涉及「读完数据再做事」的代码时，逐个检查同一段里的 `if(...)return` / 状态判断，在异步之后是否还成立（如 `if(ME)return` 在 `nbqEnter` 把 ME 设好之后就是错的）；有「恢复中」的中间状态，页面要画占位，不能先画成未登录再跳变（刷新闪「登录」）。
- **登录快照（11-03）**：刷新时用本机快照（`nbq_snap`）立刻画成登录状态，后台再更新（Gmail 同款）；`NBQ_STALE` 期间写操作不放行；退出 / 令牌失效 / 换账号必清快照。改动读入或登录流程时别破坏这条：任何时刻页面不能先画「未登录」再跳变。
- **上线后冒烟测试**（11-03）：推送后 GitHub Actions `smoke` 自动等线上换成这一版并检查接口、手机端 / 网页端能否正常打开（`tools/smoke_prod.mjs`，也可在你电脑跑）；看结果同 ci_status。页面报错现在真的会到后台（`POST /api/client-errors` 11-03 才补上，之前缺这一段，报的错一直被丢）。
- **环境与回滚**（11-03）：前端、接口、数据库、发送程序都要能「回到上一个稳定版」，不只是数据库。迁移一律向后兼容（先加后删，旧代码在新结构上能跑），数据库只往前不往回；回滚办法见 `出事处理手册.md` §6。预览 / staging 环境（分支预览 + 第二个数据库）上线前建好，用户真机先在预览验证再合进 main。
- **上线闸门**（11-03）：汇报「已通过 / 已上线可用」之前，必须 `bash tools/gate.sh [提交号]` 三项（tests-fast 静态+单元+数据库 · tests 浏览器 · smoke 线上冒烟）全绿；被取消、没跑完、没记录都算没过，如实说。tests-fast 不会被后面的推送取消，所以每个提交都有确定结果；浏览器那部分连续推送时只跑最新一次，所以收尾前别连着乱推。
- **发布流程（11-03 用户选 B）**：风险较大的改动走「分支 → 预览地址 → 用户真机看过 → 合并 main」；小修小补仍直接推 main。**算风险较大**：登录 / 账号 / 令牌、推送和通知、数据读写和数据库迁移、页面整体结构或启动流程、Service Worker。拿不准就按风险较大处理。预览环境（第二个数据库）建好之前，风险较大的改动先推分支、在预览站（演示数据）上能看的先看，涉及真实数据的在合并前明说「未在预览验证」。
