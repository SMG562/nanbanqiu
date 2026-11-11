// 子进程环境去掉「定位仓库」的 GIT_* 变量（11-11，同类第二次 → 统一入口 + 自动检查 tests/unit/git_env）。
// 起因：提交钩子里 git 会导出 GIT_DIR / GIT_INDEX_FILE（worktree 里更明显），测试在临时目录跑 git 时这些变量还在，命令就落到真仓库上。
//   11-03：两个测试提交（init、x）被推上 main；11-11：sync_verify 的临时提交 a / b 进了 #95 的分支，git init 还把真仓库改成了 bare。
// GIT_CONFIG_* / GIT_SSL_CAINFO 等不定位仓库的保留（代理、证书要用）。
export const REPO_VARS = /^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|OBJECT_DIRECTORY|COMMON_DIR|NAMESPACE|ALTERNATE_OBJECT_DIRECTORIES|CEILING_DIRECTORIES|QUARANTINE_PATH)$/;
export const cleanGitEnv = (env = process.env) => Object.fromEntries(Object.entries(env).filter(([k]) => !REPO_VARS.test(k)));
