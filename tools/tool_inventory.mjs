#!/usr/bin/env node
// tools/ 脚本盘点（#214 阶段 1e）：每个脚本被谁引用、最近一次改动，分出「疑似废弃」。只读、不删任何东西——结果是给所有者看的提案清单。
//   node tools/tool_inventory.mjs [--json]      只用 git（git grep / git log），不联网
// 分类：hook = 被钩子 / 工作流 / package.json 调用（在用）；tool = 只被别的脚本 / 文档 / 测试引用；dead = 除自己和自己的测试外没人引用（疑似废弃）。
// 判据宁可漏报不误报：按文件名（含扩展名）整串匹配；名字太通用被别处碰巧提到会算「在用」——这是故意的，误判成废弃比漏判代价大。
import { execFileSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
export function classify(name, refs) {   // refs = [引用它的文件路径]（已去掉它自己）
  const real = refs.filter(f => f !== `tests/unit/${name.replace(/\.[^.]+$/, '')}.mjs`);   // 它自己的同名测试不算「有人用」
  if (real.some(f => /^\.github\/|^\.githooks\/|^package\.json$|^\.claude\//.test(f))) return 'hook';
  return real.length ? 'tool' : 'dead';
}
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|PREFIX|OBJECT_DIRECTORY|COMMON_DIR)$/.test(k)));   // 钩子里 git 会导出 GIT_DIR 等，不去掉就落到别的仓库（同 tests/lib/git_env.mjs）
export function inventory(cwd = process.cwd()) {
  const g = (...a) => { try { return execFileSync('git', ['-c', 'core.quotepath=false', ...a], { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }) } catch { return '' } };
  return g('ls-files', 'tools').split('\n').filter(f => /^tools\/[^/]+\.(mjs|sh|py|js)$/.test(f)).sort().map(f => {
    const name = path.basename(f), refs = g('grep', '-l', '-F', '-e', name, '--', '.', ':!' + f, ':!进度记录_历史.md', ':!tests/reports').split('\n').filter(Boolean);
    return { file: f, kind: classify(name, refs), refs: refs.length, last: g('log', '-1', '--format=%cs', '--', f).trim() };
  });
}
if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const rows = inventory();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows));
  else for (const k of ['dead', 'tool', 'hook']) { const r = rows.filter(x => x.kind === k); console.log(`\n## ${k}（${r.length}）${{ dead: '疑似废弃：只有自己和自己的测试引用', tool: '被别的脚本 / 文档 / 测试引用', hook: '被钩子 / 工作流 / package.json 调用' }[k]}`); r.forEach(x => console.log(`  ${x.file}  引用 ${x.refs}  最近改动 ${x.last}`)) }
}
