---
name: ops-drill
description: 做回滚演练、上线加固（#53 #64）、写 出事处理手册.md、给所有者出「照着点」的运维步骤时使用：11-20 发送程序 staging 演练的实测结论、哪些做不了、怎么写步骤。
---

# 回滚演练与运维步骤（11-20，来自 #64 发送程序 staging 演练，所有者本人在自己电脑做）

## 实测结论（证据 = 手册 §6 演练记录表、#64 评论）
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

## 怎么给所有者出步骤
1. 一次只给一条命令，让他贴输出，看完再给下一条；别一次给五步（11-20 所有者说「太复杂了我不会」）。
2. 能自动化的先自动化，被拦（强制更新、没后台权限）就说清被拦在哪、给 A / B 两个选项，不绕过。
3. 预测错了当场承认，并把结论改进手册。
4. 写手册前先 `node tools/doc_budget.mjs`：手册只剩几十字节预算，先精简再加，演练结果表每次只加一行。
5. 每个动作的「验证」写成可对照的东西（版本号、指纹、HTTP 状态），不写「看起来正常」。

## 红线
强制改分支、代批环境、改正式库 / 开关 / 密钥，一律只听当前对话里所有者的当次明说；演练结果没填进记录表 = 没演练。
