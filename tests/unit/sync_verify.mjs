// 同步回读核对脚本（tools/sync_verify.sh）：一致 → 0；有文件不一致或缺失 → 1 并点名；--paths 给出带电脑路径的列表
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url'; import { cleanGitEnv } from '../lib/git_env.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const run = (up, ...a) => spawnSync('bash', [path.join(DIR, 'tools/sync_verify.sh'), ...a], { cwd: DIR, env: { ...process.env, UPLOADS: up }, encoding: 'utf8' });
const files = spawnSync('node', [path.join(DIR, 'tools/worker_version.mjs'), '--list'], { cwd: DIR, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-'));
for (const f of files) { fs.mkdirSync(path.join(tmp, path.dirname(f)), { recursive: true }); fs.copyFileSync(path.join(DIR, f), path.join(tmp, f)) }
let r = run(tmp, '--deploy');
T('电脑上的内容和仓库一致 → 通过', r.status === 0 && /一致/.test(r.stdout), r.stdout);
fs.appendFileSync(path.join(tmp, 'server/notify/rules.mjs'), '\n// 旧版');
r = run(tmp, '--deploy');
T('有一个文件内容不同 → 失败，并点名是哪个', r.status === 1 && /server\/notify\/rules\.mjs/.test(r.stdout) && !/sender\.mjs/.test(r.stdout), r.stdout);
fs.rmSync(path.join(tmp, 'server/notify/sender.mjs'));
r = run(tmp, '--deploy');
T('有文件没回读到（缺失）也算失败', r.status === 1 && /sender\.mjs/.test(r.stdout), r.stdout);
r = run(tmp, '--deploy', '--paths');
T('--paths：给出电脑上的完整路径（device_stage_files 用），每行是一个 JSON 数组', r.status === 0 && JSON.parse(r.stdout.split('\n')[0]).every(p => p.startsWith('/Users/hanliu/Documents/南伴球/')), r.stdout);
// 11-11：CLAUDE.md 不同步到电脑（电脑上只放指路桩，免得会话把两份都当指令读）。临时仓库里改 CLAUDE.md + a.txt，--paths 只该列 a.txt
{
  const g = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-git-')), sh = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: g, encoding: 'utf8', env: cleanGitEnv() });
  fs.mkdirSync(path.join(g, 'tools')); fs.copyFileSync(path.join(DIR, 'tools/sync_verify.sh'), path.join(g, 'tools/sync_verify.sh'));
  sh('init', '-q'); fs.writeFileSync(path.join(g, 'a.txt'), '1'); fs.writeFileSync(path.join(g, 'CLAUDE.md'), '1'); sh('add', '-A'); sh('commit', '-qm', 'a');
  fs.writeFileSync(path.join(g, 'a.txt'), '2'); fs.writeFileSync(path.join(g, 'CLAUDE.md'), '2'); sh('add', '-A'); sh('commit', '-qm', 'b');
  const o = spawnSync('bash', [path.join(g, 'tools/sync_verify.sh'), 'HEAD~1', '--paths'], { cwd: g, encoding: 'utf8', env: cleanGitEnv() }).stdout;
  T('CLAUDE.md 不在要回读的清单里，其他改动的文件在', /a\.txt/.test(o) && !/CLAUDE\.md/.test(o), o);
  T('sync_files.sh 两处 git diff 都排除了 CLAUDE.md', (fs.readFileSync(path.join(DIR, 'tools/sync_files.sh'), 'utf8').match(/':!CLAUDE\.md'/g) || []).length === 2);
  fs.rmSync(g, { recursive: true, force: true });
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`sync_verify: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
