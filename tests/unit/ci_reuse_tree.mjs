// CI 按内容复用（ADR 0010）：用假的 gh 验证——提交号相同命中 / 提交号不同但 tree 相同命中 / tree 不同不命中。不碰 GitHub。
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-reuse-')); fs.mkdirSync(path.join(d, 'bin'));
// 假 gh：runs?head_sha=X → 只有 PRSHA 有成功运行 99；commits/SHA → tree；commits/SHA/pulls → [PRSHA]
fs.writeFileSync(path.join(d, 'bin', 'gh'), `#!/usr/bin/env bash
u="$2"
case "$u" in
  *"actions/runs?head_sha=PRSHA"*) echo 99;;
  *"actions/runs?head_sha="*) echo "";;
  *"/commits/MAINSHA/pulls"*) echo PRSHA;;
  *"/commits/MAINSHA"*) echo "tree-$TREE_MAIN";;
  *"/commits/PRSHA"*) echo "tree-same";;
esac
`, { mode: 0o755 });
const run = (sha, treeMain) => { const out = path.join(d, 'out'); fs.writeFileSync(out, ''); spawnSync('bash', [path.join(ROOT, 'tools/ci_reuse.sh'), 'tests-fast', sha], { env: { ...process.env, PATH: path.join(d, 'bin') + ':' + process.env.PATH, GITHUB_REPOSITORY: 'o/r', GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: path.join(d, 'sum'), GITHUB_RUN_ID: '1', TREE_MAIN: treeMain }, encoding: 'utf8' }); return fs.readFileSync(out, 'utf8').trim() };
T('同一提交号：命中', run('PRSHA', 'same') === 'hit=1');
T('提交号不同、内容（tree）相同：命中', run('MAINSHA', 'same') === 'hit=1');
T('提交号不同、内容不同：不命中（重跑）', run('MAINSHA', 'other') === 'hit=0');
fs.rmSync(d, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
