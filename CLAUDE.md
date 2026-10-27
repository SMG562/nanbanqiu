# 南伴球

墨尔本（之后悉尼）华人网球约局：手机端 PWA、电脑网页端、管理后台、PostgreSQL 数据库。

用户说「继续上次的」时：读 `进度记录.md`，按「§0 中断后怎么接着做」执行。进度只以那份文件为准；查旧决定再打开 `进度记录_历史.md`。

- 用中文回复，简洁；汇报只写结果、用户需要知道的和下一步。
- **前台两端改 `src/`**（shared 两端共用 / pwa / web；page、style、script、side=场边），改完 `node tools/build.mjs` 拼出两个 HTML、`node tools/lint.mjs` 检查；不要直接改 南伴球_PWA.html / 南伴球_Web.html。后台还是单个 HTML，直接改。
- 测试：本地只跑 `node tests/run_all.mjs --grep=<相关>`；推送后 GitHub 自动跑快速测试，一批收尾在 Actions 手动跑 full。看结果：`bash tests/lib/ci_status.sh`。说明见 `tests/README.md`。
- **接上 GitHub 仓库（add_repo、clone）、提交、`git push` 到 main：用户 10-27 说默认全部同意，不用问，直接做**（.claude/settings.json 里也放行了这些操作；强推仍禁止）。
- 预览网站 https://nanbanqiu-preview.pages.dev ：推送到 main 后 Cloudflare Pages 自动部署（`node tools/site.mjs` → site/），不用再手动发布预览页；要公开的新文件写进 site.mjs 的白名单。
- 不删除文件、不 `push --force`；每轮一次提交并推送，再把改过的文件同步到用户电脑的「文稿/南伴球」文件夹（10-27 用户说：往电脑存文件默认全部同意，不用问；只写改过的，不删任何东西）。
