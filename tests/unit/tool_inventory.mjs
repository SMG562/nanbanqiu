// tools/tool_inventory.mjs（#214 阶段 1e）：用临时 git 仓库造夹具，不碰真实仓库。
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { classify, inventory } from '../../tools/tool_inventory.mjs'; import { cleanGitEnv } from '../lib/git_env.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
T('classify：被工作流 / 钩子引用 → hook', classify('a.sh', ['.github/workflows/x.yml']) === 'hook' && classify('a.sh', ['.githooks/pre-push']) === 'hook');
T('classify：只被文档 / 别的脚本引用 → tool', classify('b.mjs', ['README.md', 'tools/z.mjs']) === 'tool');
T('classify：没人引用 → dead；只有自己的同名单元测试引用 → 也是 dead', classify('c.mjs', []) === 'dead' && classify('d.mjs', ['tests/unit/d.mjs']) === 'dead');
T('classify：别的单元测试提到它 → 算 tool（不是它自己的测试）', classify('e.mjs', ['tests/unit/other.mjs']) === 'tool');
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-inv-')), g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'pipe', env: { ...cleanGitEnv(), GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } });
const W = (f, c) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), c) };
g('init', '-q'); W('tools/a.sh', 'x'); W('tools/b.mjs', 'x'); W('tools/c.mjs', 'x'); W('tools/中文 d.mjs', 'x'); W('tools/sub/f.mjs', 'x');
W('.github/workflows/w.yml', 'run: bash tools/a.sh'); W('README.md', 'see b.mjs'); W('tests/unit/c.mjs', "// c.mjs 自己的测试");
g('add', '-A'); g('commit', '-qm', 'x');
const inv = Object.fromEntries(inventory(d).map(x => [path.basename(x.file), x.kind]));
T('夹具：a 被工作流引用 = hook、b 被文档引用 = tool、c 只有自己的测试 = dead', inv['a.sh'] === 'hook' && inv['b.mjs'] === 'tool' && inv['c.mjs'] === 'dead', inv);
T('中文文件名不被转义、子目录里的不盘点', inv['中文 d.mjs'] === 'dead' && !('f.mjs' in inv), inv);
console.log(`tool_inventory: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
