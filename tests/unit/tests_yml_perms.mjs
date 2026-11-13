// tests.yml 权限收窄（#178，11-11）：顶层只读；跑 PR 代码的任务没有写权限、检出不留令牌；只有 baseline-commit 能写。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/tests.yml'), 'utf8');
let pass = 0, fail = 0; const T = (n, ok) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n) };
const nc = wf.replace(/#[^\n]*/g, ''), top = nc.split(/^jobs:/m)[0], jobs = nc.split(/^jobs:/m)[1] || '';
T('顶层 permissions 是 contents: read', /^permissions:\n  contents: read/m.test(top) && !/contents: write/.test(top));
const blocks = jobs.split(/^  (?=[a-z][a-z-]*:)/m).filter(b => /^[a-z][a-z-]*:/.test(b));
const writers = blocks.filter(b => /contents: write/.test(b)).map(b => b.match(/^([a-z-]+):/)[1]);
T('只有 baseline-commit 带 contents: write', writers.length === 1 && writers[0] === 'baseline-commit');
const checkouts = [...wf.matchAll(/uses: actions\/checkout@[^\n]*\n((?:\s+[^\n]*\n){0,4})/g)];
T('每个 checkout 都 persist-credentials: false', checkouts.length >= 3 && checkouts.every(m => /persist-credentials: false/.test(m[0])));
const shard = blocks.find(b => b.startsWith('shard:')) || '';
T('shard（跑 PR 代码）里没有 git push', shard && !/git push/.test(shard));
const bc = blocks.find(b => b.startsWith('baseline-commit:')) || '';
T('baseline-commit 的 if 带 !cancelled()（否则 gate / reuse 被跳过会连带跳过它，重拍的基准推不回分支，11-13）', /^\s+if: .*!cancelled\(\)/m.test(bc));
T('baseline-commit 下载基准不直接写进已有目录（gh run download 遇同名文件报错，11-13）', !/gh run download[^\n]*-D tests\/visual\/baseline/.test(bc) && /cp -f[^\n]*\/vb\/\*\.png tests\/visual\/baseline/.test(bc));
console.log(`tests_yml_perms: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
