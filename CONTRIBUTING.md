# 协作说明（两人及以上开发）

仓库所有者：SMG562（负责正式库、部署、密钥、进度记录、最终合并）。协作者：按下面走 PR。

## 第一次上手
1. `git clone` 后 `git config core.hooksPath .githooks`
2. 读 `CLAUDE.md`、`开发规矩.md`、`tests/README.md`；跑一遍 `node tools/build.mjs && node tools/lint.mjs`
3. 领一个小 Issue，完整走一遍「分支 → PR → CI → 所有者审 → 合并」

## 日常流程
- **领任务**：在 GitHub Issue 里指定自己为负责人（assignee）；已有人领的不要重复做。大改动、动公共层或数据库前，先在 Issue 里说一声。
- **开分支**：`bash tools/new_branch.sh <名字>`（从最新 main 出发）。**不直推 main**，一个问题一个小 PR。
- **PR**：用模板，写清「入口清单」「风险类别」；改公共层（`src/shared` 01xx/02xx、弹窗、通用监听）写「影响面 × 反例测试」。
- **合并**：CI（tests-fast、tests）全绿 + 所有者审过后，由所有者用 `bash tools/pr_merge.sh <PR号>` 合并。

## 分工边界（默认）
| 区域 | 默认负责 |
|---|---|
| 前台 `src/shared`、`src/pwa`、`src/web` | 所有者 |
| 后台 `src/admin` | 由 Issue 认领 |
| 后端 `worker/`、`server/`、`functions/`、`notify-worker/` | 由 Issue 认领，改动先说 |
| 数据库结构 / 迁移（`schema.sql` 等） | 协作者写迁移，**正式库由所有者执行** |
| 测试 / CI（`tests/`、`.github/`） | 由 Issue 认领 |
| 进度记录.md、业务规则.md | 仅所有者改；协作者把要记的写在 PR 描述里 |

## 容易冲突的东西
- 三个生成的 HTML（南伴球_PWA / Web / 后台）：冲突时**只解决 `src/`**，然后重新 `node tools/build.mjs`，不要手动合并 HTML。
- `tests/spec/*.json`（actions、inputs、persist_allow）：PR 保持小，开 PR 前先 `git merge origin/main`。
- 分支落后时 `git merge origin/main`，不 rebase 已推送的分支，不强推。

## 协作者的权限边界
- 可以：开分支、推自己的分支、开 PR、用分支预览站（连测试库 staging）看效果。
- 不可以：推 main、碰正式库 `nanbanqiu-au`、部署发送程序、读写密钥、改 Cloudflare 设置。需要时在 Issue 里找所有者。
- 用 Claude Code 开发的协作者：`CLAUDE.md` 里标「仅所有者」的条款对你不适用（例如直推 main、同步到所有者电脑）。
