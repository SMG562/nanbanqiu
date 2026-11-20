---
name: ops-drill
description: 做回滚演练、上线加固（#53 #64）、写 出事处理手册.md、给所有者出「照着点」的运维步骤时使用：11-20 发送程序 staging 演练的实测结论、哪些做不了、怎么写步骤。
---

# 回滚演练与运维步骤（11-20，来自 #64 发送程序 staging 演练，所有者本人在自己电脑做）

## 实测结论（证据 = `docs/演练记录.md`、#64 评论）
- **演练的价值在实测，预测会错**：我预测「回滚后 `--check` 报红」，实际刚回滚时是绿的——发送程序每分钟才写一次心跳，`/api/version` 指纹 1–2 分钟后才变。**确认回滚用 `npx wrangler deployments list --env staging` 看最新版本号**，指纹只作二次确认。
- `wrangler rollback` 不写版本号 = 回到「上一个部署」，这次是 9 天前的旧版；真出事要指定 `<版本号>`。
- **Pages 预览部署不是回滚目标**（Cloudflare 文档），Rollback 只对生产部署；staging 分支由 `staging-sync` 只快进，倒退要强制更新，**被安全检查拒绝，不绕过**。可选：所有者当场明说允许一次，或打开旧部署自己的网址验证。
- **所有者电脑「文稿/南伴球」副本没有 `.git`**：给所有者的命令别写 `git checkout`；旧版指纹用 `node tools/worker_version.mjs`（内容哈希，不依赖 git）在旧代码上算。路径是 `~/Documents/南伴球/…`。
- 云会话 curl 外网被封：查线上用 WebFetch，URL 加 `?_=随机数` 避开 15 分钟缓存；WebFetch 请求没人批准就停，不重试。
- 外部服务额度（Supabase 免费项目闲置 7 天暂停、无 PITR；Resend 免费档每天 100 封；Workers 免费档每天 10 万次）：**先查官方页再写，标日期，不凭记忆**。
- **开关演练只能走后台界面**（超级管理员登录，开关页，管理端时间显示 UTC）；验证：`GET /api/switches` 读到新值，`maintenance` 开时 `GET /api/venues` = 503 `{"error":"maintenance"}` + `Retry-After: 300`。`register_paused` / `photos_paused` 要登录令牌（curl 只得 401），`sms_paused` 只在前台拦；所有者没有新手机号 = 这三项被拦文案**未实测**，记录表如实写。
- **所有者 Mac 不要 `brew install postgis`**：旧系统没有预编译包，会从源码编（protobuf→gdal…一两小时）。本机没有 Docker，用 Postgres.app v3.0（自带 PostGIS 3.7，PG19，macOS 11+），`NBQ_PGBIN=/Applications/Postgres.app/Contents/Versions/19/bin`。
- **恢复演练（手册 §3）**：`drill` 会往**源库**写一行 `ops_drills`，所有者 11-20 选 A = 用 staging 当源库（不碰正式库；要用正式库须当次明说）；源库连接串要 `postgres` 角色、Session pooler 或直连（不用 6543），密码**别贴进对话**，让所有者 `read -s "SRC?…"` 存终端变量；恢复前先建 6 个角色（nbq_user / nbq_service / nbq_admin / nbq_viewer / anon / authenticated）。
- **长命令别接 `| tail`**（安装时一片空白，所有者以为卡死）；先说预计耗时，给只读进度检查（`ps`、`ls -lt /opt/homebrew/Cellar`）。
- **云会话先 `add_repo` 带 push 权限**，否则 `gh api` 一律 403；所有者当次明说授权后才可（自动分类器会拒绝未授权的升级）。

## 11-20 下午新增（证据：#64 评论、#473）
- **`backup.mjs` 三个坑（#473 已修，PR #476；下面是修前现象，遇到同类先怀疑它）**：①目录含中文时启动判断恒假，脚本**静默退出无输出**（先怀疑它，别当成「成功」）；绕过：在 `~/Documents/南伴球` 下 `node --input-type=module -e 'import {drill} from "./server/ops/backup.mjs"…' "$SRC"`；②Supabase `postgres` 账号无权 `set local role nbq_service`，演练末段抛错、**已算好的结果丢失**；③备份含 pg_cron / supabase_vault，本机装不了，恢复要跳过。
- **本机恢复绕法**：`NBQ_PGBIN` 指向临时目录，里面 `pg_dump` 软链真文件、`pg_restore` 是包装脚本（`-L` 过滤平台扩展，日志写文件）；`nbq_drill` 必须每次先 dropdb / createdb 重建（上次恢复一半会让下一次失败）。
- **日志先看再删**：「数报错条数」和「删日志」别放同一条命令（1077 条报错因此无法分类）。
- **云会话没有 `device_bash`**，computer use 对终端只开点击不能打字：所有者终端「贴来贴去」省不掉，只能把步骤合成**一条可整段粘贴的多行命令**（heredoc 可行）；所有者问「能不能自动」时先 `ToolSearch device_bash` 查实，再答。
- **验前端旧版**：内置浏览器里 Cloudflare 可能未登录，登录由所有者做（面板隐藏时让他 Cmd+Shift+B）；Pages 部署列表在 `…/pages/view/nanbanqiu-preview`（`get_page_text`）；**用 Preview（staging 分支）部署自己的网址**读 `/version.json`，Production 的 hash 网址对应正式库；WebFetch 读外网要所有者批准，请求没人应答就停下说明，别重试。
- **演练结果表在 `docs/演练记录.md`**（11-20 从手册 §6 挪出，手册有字数上限、每次加行都要先精简）；每次演练只加一行，不占手册预算。

## 11-20 傍晚新增（正式环境演练；证据：#64 #50 评论、`docs/演练记录.md` 末几行）
- **演练前先查验收依赖的东西建没建**：#64 验收要「L3 报警」，开演才发现 #50 从没建；先 `gh api` 看依赖 Issue 状态再排演练。
- **前端回滚（Pages）AI 可在内置浏览器已登录的 Cloudflare 里做**：`…/pages/view/nanbanqiu-preview` → 部署表里 Production 行的 Details（`find "Details"` 取 ref，点后 URL 里的部署 ID 前缀要与目标行对上）→ Manage deployment → Rollback to this deployment → 确认框 Roll back。Manage 菜单第一下常点不开，截图确认菜单出现再点；回滚目标选「上一个**生产**部署」，别选 Preview。
- **验证避缓存**：`?_=` 参数前两次仍读到旧 sha，第三次换参数才对；同时读该部署自己的网址 `https://<部署ID>.nanbanqiu-preview.pages.dev/version.json` 交叉核对。回滚 / 恢复各约 40 秒内生效。
- **开着自动部署，回滚窗口内 push main 会盖掉回滚**：先确认没有在途合并，窗口控制在 2 分钟内。
- **发送程序正式回滚 / 恢复**：`wrangler deployments list` 只显示最近一批；回滚 `npx wrangler rollback <版本号> --message … -y`（非交互必须 `-y`）；**恢复也用 `rollback <原当前版本号>`，不重新部署**，不依赖本机文件夹是否最新；指纹下一次心跳就变（实测 4 秒）。整段脚本一次粘贴：回滚 → 等 100 秒 → 恢复 → 轮询 `/api/version` 直到指纹回来，约 4 分钟。
- **正式库恢复演练**：命令同 staging，源库换 `$SRC`（`read -s`、Session pooler、postgres 角色），`NBQ_BACKUP_KEY` 用一次性生成的（演练内加解密，不用密码管理器那把），日志写文件只 `tail -25`；0.95 分钟、8 MB，会往正式 `ops_drills` 写一行。
- **外部探测选型（实测）**：GitHub Actions 定时不可靠（新增 `*/5` 合并后 40+ 分钟无运行，原 6 小时那条也漏过一次），只当兜底；Cloudflare「Monitors」是对日志的 SQL 告警，站点整个挂了测不出；Health Checks 免费域名套餐 0 个（要 Pro）；用 UptimeRobot 免费档（5 分钟，各家对免费档能否商用说法不一，注册时看当前条款）。**关键字监控方向要选「关键字不存在时告警」**，选反会立刻误报。
- **验收写法要能测得出**：回滚期间站点仍 200，HTTP / 关键字探测本来不报警；要测「版本不对 / 发送程序心跳停」得给 `/api/health` 之类加会 503 的条件（见 #50）。
- **会话限制**：下载并运行二进制（如本地跑 actionlint）会被自动分类器拒绝，不绕；改读代码推理 + 看 CI。`gh api` 读不到 Actions 日志（404）。shellcheck 对未使用的循环变量报 SC2034，用 `for _ in …`。
- **改 `.github/workflows` 受「工作流数 ≤ 13」预算**：已满，别新增文件，并进现有 workflow（`concurrency` 组按触发拆开，免得互相取消）。PR 转 Ready 前描述照模板（风险类别要勾选，否则 `pr_state ready` 拒绝）。

## 11-20 晚新增（#50 心跳停告警；证据：#498、`docs/演练记录.md` #50 行）
- **告警验收要用「同款故障」**：给探测加 `?sender=1` 这类 503 条件后，先在 staging 停发送程序（Cloudflare → `nanbanqiu-notify-staging` → Settings → Cron Triggers 删 `* * * * *` → Save，AI 可在内置浏览器做），约 5 分钟后 503；再建一个**临时** UptimeRobot 监控指向 staging 同款地址，Down 邮件到 Gmail 才算验到，验完删临时监控。
- **面板加回 cron（Cron expression 页签填 `* * * * *`）约 10 分钟才恢复心跳**，别当失败反复操作；要立刻恢复：所有者终端 `git switch main && git pull && npm ci && node tools/deploy_notify.mjs --env=staging --expect=<node tools/worker_version.mjs 的指纹>`（本机仓库常停在旧分支；缺 `npm ci` 会报找不到 `pg`；不带 `--expect` 会拒绝）。
- **UptimeRobot 登录态会失效，密码只能所有者在内置浏览器里自己输**（Cmd+Shift+B 开面板）；改监控地址走 `/monitors/<id>/edit`；免费档 5 分钟一次，邮件默认已勾。
- **独立复核留言只认第一行 `独立复核：通过 <7位> `**，提交号后必须是空格 / 行尾，不能紧跟全角括号或套 `**`（`review_state.mjs`）；用 Agent 只读子会话照 `tools/review_prompt.md`，约 40 秒。
- **会话环境**：`gh pr create` 走 GraphQL 会 403，改 `gh api repos/SMG562/nanbanqiu/pulls -f title=… -f head=… -f base=main -F body=@文件 -F draft=true`；本机跑 `tests/pg/*` 要先 `apt-get update && apt-get install -y postgresql-16-postgis-3` 和 `npm ci`；`ci_wait.sh` 对已合并的 main 提交可能「找不到」，用 `gh api …/actions/runs?head_sha=<完整sha>` 查。

## 怎么给所有者出步骤
1. 一次只给一条命令，让他贴输出，看完再给下一条；别一次给五步（11-20 所有者说「太复杂了我不会」）。
2. 能自动化的先自动化，被拦（强制更新、没后台权限）就说清被拦在哪、给 A / B 两个选项，不绕过。
3. 预测错了当场承认，并把结论改进手册。
4. 写手册前先 `node tools/doc_budget.mjs`；演练结果只往 `docs/演练记录.md` 加一行，不改手册。
5. 每个动作的「验证」写成可对照的东西（版本号、指纹、HTTP 状态），不写「看起来正常」。

## 红线
强制改分支、代批环境、改正式库 / 开关 / 密钥，一律只听当前对话里所有者的当次明说；演练结果没填进记录表 = 没演练。
