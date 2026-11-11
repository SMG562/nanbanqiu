// R0（10-27）：两个前台 HTML 由 src/ 拼出来（tools/build.mjs）；E3（10-28）：后台 HTML 也是。
//   ① 现在仓库里的 HTML = 重新拼出来的，逐字节相同（只改了 src 没重新拼、或直接改了 HTML，都会报出来）
//   ② src 里每个文件都写进了 list；list 里的文件都存在；每个文件以换行结尾
//   ③ 两端共用的代码只有一份：shared/ 下的文件两份 list 都用到；pwa/ 只在 PWA、web/ 只在网页端
//   ⑤ ADR 0011：这三个 HTML 和 _bundle.sql 不进 git（.gitignore 里有、没被跟踪），免得又回到「每个 PR 都冲突」
//   ④ 自检：在临时副本里改一个字 / 加一个没登记的文件，核对必须失败（防止核对本身失效）
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath, pathToFileURL } from 'url'; import { cleanGitEnv } from '../lib/git_env.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const B = await import(pathToFileURL(path.resolve(DIR, 'tools', 'build.mjs')).href);

const lists = {};
for (const [k, file] of Object.entries(B.TARGETS)) {
  let got; try { got = B.assemble(k, DIR); } catch (e) { T(`${file}：能拼出来`, false, e.message); continue; }
  lists[k] = got.parts.map(p => p.rel);
  const cur = fs.readFileSync(path.join(DIR, file), 'utf8');
  let i = 0; const a = cur.split('\n'), b = got.text.split('\n'); while (i < a.length && a[i] === b[i]) i++;
  T(`${file} = src 拼出来的（逐字节）`, cur === got.text, cur === got.text ? undefined : `第 ${i + 1} 行起不同；改 src 后跑 node tools/build.mjs`);
  T(`${file}：list 里没有重复的文件`, new Set(lists[k]).size === lists[k].length);
}
if (fs.existsSync(path.join(DIR, '.git'))) {
  const GEN = [...Object.values(B.TARGETS), 'server/migrations/_bundle.sql'];
  const tracked = execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '--', ...GEN], { cwd: DIR, encoding: 'utf8', env: cleanGitEnv(process.env) }).split('\n').filter(Boolean);
  T('生成文件没有被 git 跟踪（ADR 0011）', !tracked.length, tracked);
  const ign = fs.readFileSync(path.join(DIR, '.gitignore'), 'utf8').split('\n');
  T('生成文件都在 .gitignore 里', GEN.every(f => ign.includes('/' + f)), GEN.filter(f => !ign.includes('/' + f)));
}
T('src 里的文件都写进了 list', B.orphans(DIR).length === 0, B.orphans(DIR));
if (lists.pwa && lists.web) {
  const P = new Set(lists.pwa), W = new Set(lists.web);
  const badShared = [...new Set([...P, ...W])].filter(r => r.startsWith('shared/') && !(P.has(r) && W.has(r)));
  T('shared/ 的文件两端都用到', !badShared.length, badShared);
  T('pwa/ 的文件只在 PWA', [...W].every(r => !r.startsWith('pwa/')), [...W].filter(r => r.startsWith('pwa/')));
  T('web/ 的文件只在网页端', [...P].every(r => !r.startsWith('web/')), [...P].filter(r => r.startsWith('web/')));
  T('共用部分有实际内容（≥ 3000 行）', lists.pwa.filter(r => r.startsWith('shared/')).reduce((s, r) => s + fs.readFileSync(path.join(DIR, 'src', r), 'utf8').split('\n').length - 1, 0) >= 3000);
}

// 自检：临时副本里做三种坏改动，tools/build.mjs --check 都必须失败；不改则通过
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-build-'));
try {
  const copy = () => {
    const d = fs.mkdtempSync(path.join(tmp, 'c-'));
    fs.cpSync(path.join(DIR, 'src'), path.join(d, 'src'), { recursive: true });
    fs.cpSync(path.join(DIR, 'tools'), path.join(d, 'tools'), { recursive: true });
    for (const f of Object.values(B.TARGETS)) fs.copyFileSync(path.join(DIR, f), path.join(d, f));
    return d;
  };
  const check = d => { try { execFileSync('node', [path.join(d, 'tools', 'build.mjs'), '--check'], { stdio: 'pipe' }); return 0; } catch (e) { return e.status || 1; } };
  const d0 = copy(); T('自检：原样副本核对通过', check(d0) === 0);
  const d1 = copy(); const r1 = path.join(d1, 'src', lists.pwa.find(r => r.startsWith('shared/script/')));
  fs.writeFileSync(r1, fs.readFileSync(r1, 'utf8').replace(/\n/, ' \n')); T('自检：改了 src 没重新拼 → 失败', check(d1) === 1);
  const d2 = copy(); const h = path.join(d2, B.TARGETS.web);
  fs.writeFileSync(h, fs.readFileSync(h, 'utf8').replace('</body>', '<!-- x --></body>')); T('自检：直接改 HTML → 失败', check(d2) === 1);
  const d3 = copy(); fs.writeFileSync(path.join(d3, 'src', 'shared', 'script', '9999-新文件.js'), '//\n'); T('自检：新文件没写进 list → 失败', check(d3) === 1);
  // E3：后台同样受保护
  T('后台由 src/admin 拼出（list 里有文件）', (lists.admin || []).length >= 10 && lists.admin.every(r => r.startsWith('admin/')), lists.admin && lists.admin.slice(0, 3));
  const d4 = copy(); const ha = path.join(d4, B.TARGETS.admin);
  fs.writeFileSync(ha, fs.readFileSync(ha, 'utf8').replace('<title>', '<title> ')); T('自检：直接改后台 HTML → 失败', check(d4) === 1);
  const d5 = copy(); const ra = path.join(d5, 'src', lists.admin.find(r => r.startsWith('admin/script/')));
  fs.writeFileSync(ra, fs.readFileSync(ra, 'utf8').replace(/\n/, ' \n')); T('自检：改了后台 src 没重新拼 → 失败', check(d5) === 1);
  const d6 = copy(); fs.writeFileSync(path.join(d6, 'src', 'admin', 'script', '9999-新文件.js'), '//\n'); T('自检：后台新文件没写进 list → 失败', check(d6) === 1);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
