# 南伴球

墨尔本（之后悉尼）华人网球约局：手机端 PWA、电脑网页端、管理后台、PostgreSQL 数据库。

用户说「继续上次的」「继续上一步对话」时：读 `进度记录.md`，按「§0 中断后怎么接着做」执行（第 2b 步 `bash tools/handoff_check.sh` 查记录是否落后于实际）。进度只以那份文件为准；做过什么看 `git log`，以后再做 / 要你定的看 GitHub Issues（`gh issue list -R SMG562/nanbanqiu`），业务规则看 `业务规则.md`，查旧决定再打开 `进度记录_历史.md`。

clone 后先启用提交前检查：`git config core.hooksPath .githooks`（拼接核对 + 代码检查 + 静态检查，约 6 秒）。

- **多人协作（11-06 起）**：仓库所有者是 SMG562；其他协作者先读 `CONTRIBUTING.md`。下面凡标「**仅所有者**」的条款，GitHub 账号不是 SMG562 时一律不适用（判断：`gh api user --jq .login`，拿不到就问用户）；协作者只走「分支 → PR」，不推 main、不碰正式库和部署、不往别人电脑写文件。
- 用中文回复，简洁；汇报只写结果、用户需要知道的和下一步。
- **三个页面都改 `src/`**（前台：shared 两端共用 / pwa / web；page、style、script、side=场边；后台：admin/），改完 `node tools/build.mjs` 拼出三个 HTML、`node tools/lint.mjs` 检查；不要直接改 南伴球_PWA.html / 南伴球_Web.html / 南伴球_后台.html。
- 测试：说明见 `tests/README.md`；分工见下面「CI 分工」。看结果：`bash tests/lib/ci_status.sh`。
- **【仅所有者】接上 GitHub 仓库（add_repo、clone）、提交、`git push` 到 main：用户 10-27 说默认全部同意，不用问，直接做**（.claude/settings.json 里也放行了这些操作；强推仍禁止）。
- 预览网站 https://nanbanqiu-preview.pages.dev ：推送到 main 后 Cloudflare Pages 自动部署（`node tools/site.mjs` → site/），不用再手动发布预览页；要公开的新文件写进 site.mjs 的白名单。
- **宣传物料 / 海报**：用户说做海报、朋友圈图、宣传图时，**只读 `.claude/skills/nanbanqiu-poster/SKILL.md`** 照流程做（marketing/ 里 84 张已有、一套出图脚本；不通读旧海报代码，省 token）；成品在预览站 /materials.html。
- **空状态 / 报错 / 加载 / 通知提示的图标和文案**：先读 `marketing/icons/README.md` 和 SKILL.md 里「App 里的空状态」一节（小毛图标 36 个 + 自适应放宽规则），别从头想。
- 不删除文件、不 `push --force`；**【同步到电脑一句仅所有者】**每轮一次提交并推送，再把改过的文件同步到用户电脑的「文稿/南伴球」文件夹（10-27 用户说：往电脑存文件默认全部同意，不用问；只写改过的，不删任何东西）。
## 工程规矩（一行一条；来历、命令、例子见 `开发规矩.md`，做到相关的事再打开）
- **同步到 Mac 必须回读核对**：`sync_files.sh <ref>` → `device_commit_files` → `sync_verify.sh <ref> --paths` → `device_stage_files` → `sync_verify.sh <ref>`。改了发送程序：先 `sync_verify.sh --deploy` 一致，再给用户 `node tools/deploy_notify.mjs --expect=<node tools/worker_version.mjs 的指纹>`（测试环境加 `--env=staging`，两个环境都要部署）。线上版本只认 `/version.json`、`/api/version`。
- **给用户的步骤只引用他电脑上已有的文件**（11-05）：用到还没合并的 PR 分支里的文件 → `sync_files.sh --branch=<分支> <文件…>` 写到电脑、`sync_verify.sh --branch=<分支> [--paths] <文件…>` 回读，PR 描述写「已同步到电脑：…」（`pr_body_check` 拦）。
- **上线闸门**：说「通过 / 已上线」前 `bash tools/gate.sh <提交号>` 三项全绿；没跑、被取消、看的不是这个提交号 = 没过，如实说。
- **发布流程 B**：风险较大（登录账号、推送、数据读写与迁移、启动流程、Service Worker）走「分支 → 预览站（staging 库）→ 用户真机 → PR 合并」，PR 清单用模板；小修直接推 main。**合并只用 `bash tools/pr_merge.sh <PR号>`**（只快进、核对测试 / db-parity；main 有新提交就在分支 `git merge origin/main`，不强推），PR 上测过的提交到 main 不重跑（11-04）。
- **两个库**：正式 `nanbanqiu-au`、测试 `nanbanqiu-staging`（分支预览 `*.nanbanqiu-preview.pages.dev` 自动连测试库）。改库结构 / 默认值 / 迁移：迁移可重复运行并**处理已有数据** → **先正式库跑迁移、再合并前端** → Actions `db-parity`（REST 触发，confirm=production）输出 ✅ 才算正式库也成立。
- **CI 分工（省 token）**：本地只跑相关的（`--changed`，已提交用 `--changed=origin/main`，自动跳过截图；改了测试入口会选中全部 → 改用 `--grep=`）；PR 自动跑浏览器快速测试，合并前不手动跑完整档（每周日自动）；等 CI 放后台轮询、读注解，不干等；截图基准用 tests.yml 的 visual-baseline 在 CI 重拍。
- **推 main 前**：`git diff --stat origin/main..HEAD` 只含预期文件；`.githooks/pre-push` 拦大量删除；不用 worktree 分支直推 main；在临时仓库跑 git 的测试必须去掉 `GIT_*` 变量。
- **前台数据边界**：接口数据只走 `nbqFrom*` 转换，枚举用 `nbqEnum`（`enum_cover` 测试盯着）；用户能改的资料必须写服务器，测试「改 → 重读 → 还在」。
- **用户能改的数据：按「入口清单」做，不按「接口清单」做**（11-04 6d 漏了球员卡上的印象、徽章已庆祝只在内存）：开工前 grep 这份数据的**所有**修改入口（仓库名 `KUDOS.set` 之类），列「入口 × 写服务器 × 刷新后还在」表放进 PR 描述；`node tools/persist_audit.mjs`（提交前自动跑）拦「改了内存却没写服务器 / 整仓库没读回」，欠账在 `tests/spec/persist_allow.json` 里 `todo:` 列着，不准当没事；测试必含「清空内存 → 重读 → 还在」；用户报一处，同一仓库的其他入口一起查。
- **开分支用 `bash tools/new_branch.sh <名>`**（从最新 main、本地名 = 远端名、立刻推）；用户报的问题各开从 main 出发的小 PR；PR 描述要有「入口清单」（CI `pr-checklist` 检查），合并前真机勾「刷新后还在 / 换设备还在」；用户发现的问题记进 `逃逸缺陷.md`，同类第二次必须升级成自动检查。
- **界面动作清单**（11-04）：新增 `data-a / data-sx / data-rcx …` 动作必须在 `tests/spec/actions.json` 归类（write:<测试> / local / nav），`tools/action_audit.mjs` 提交前拦；baseline 是旧欠账，动到时顺手归类。
- **弹层 / 表单 / 键盘**（11-05）：同屏重画滚动位置由 `openSheet` / `openModal` 根上保；键盘弹出（`.kb`）时长表单折起 `.kbhide` 只留输入框 + 提交，**不做固定浮层按钮**；有后果的操作回车只收键盘；自己写的 Enter 监听必须用 `nbqImeEnter(e)`（iOS 确认拼音后会紧跟一个 Enter）；键盘类改动**必须真机看过**。细节见 开发规矩.md「11-05」。
- **推 main 的顺序是机器管的**（11-05）：改 → 构建 → `node tests/run_all.mjs --changed=origin/main` **跑完且全绿、工作区干净** → 提交 → 推送；`pre-push` 没有这份记录就拦（跳过要 `NBQ_UNTESTED="原因"`）。后台测试没出结果不提交，停止钩子催也先说「测试还在跑」。**经 PR 合并的不重复本地测**：`pr_merge.sh` 核对 tests-fast + tests 对同一提交号都 completed success 后，自动带 `NBQ_UNTESTED="PR #N CI 已绿 …"` 推送；没有 PR 的直接推 main 仍要本地戳。新加闸门先对照「CI 分工」和 `pr_merge.sh` 这类自动推送路径是否冲突。**往公共层（shared 01xx/02xx、Sheets/弹窗、通用监听）加行为一律 opt-in**（如 `data-keep`），不做默认全开；改公共层的 PR 描述写「影响面 × 反例测试」。新 `<input id>` 先登记 `tests/spec/inputs.json`（`input_audit` 拦）。复盘见 开发规矩.md「11-05」两节。
- **前台状态看页面**：读入只走 `nbqApply`；测试断言 DOM / 像素，不只断言内存；异步后逐个查 `if(...)return`；刷新不准先闪「未登录」（快照 `nbq_snap`，`NBQ_STALE` 期间不写）。
- **改规则 = 同时改旧规则的测试**（11-04）：改业务规则 / 默认值 / 去掉功能时，同一轮 grep 全部 tests/（含只在完整档跑的 regression）里断言旧行为的地方一起改；`--changed` 会自动带上用到被改函数 / id 的回归测试。
- **用户明确说过的要求，先写成测试再改**（如纸白一致性 `paper_consistency` 按真实像素比对），避免同一个问题被反复提。
- **测试环境要齐全**：正式有的部件（发送程序、推送公钥、密钥）测试环境都要有；能测 = `staging.nanbanqiu-preview.pages.dev` 的 `/api/push/key` 有值 + `/api/version` 有新鲜心跳；连接串一律 `nbq_api.<项目编号>`（细节见 开发规矩.md「11-03 晚」）。
- **随做随写**：合并、部署、用户拍板、下一步变了 → 同一次回复里更新 进度记录.md 并推送；新对话第一步 `bash tools/handoff_check.sh`。进度记录保持约 15KB：完成的段落移到 进度记录_历史.md。
- **先写进度，再说「开新对话」**：下一步已写进 origin/main 的进度记录（`git grep` 找得到）并同步到电脑，才建议开新对话。
- **不确定原因时先拿数据**（一条只读 SQL、一张截图、日志里的那一行），不把推测当结论说。
- **回滚与冒烟**：迁移只往前、向后兼容（先加后删）；四层都能回到上一个稳定版，办法见 `出事处理手册.md` §6；推 main 后 Actions `smoke` 自动核对线上版本和页面，页面报错进后台。
- **CI 路径规则**：新增会被当成代码的目录 / 脚本类型时，同一轮改 `tests-fast.yml` / `tests.yml` 的 paths，跑 `--grep=ci_paths`（守卫说明和做法见 开发规矩.md「11-04 · 图稿提交」）。
