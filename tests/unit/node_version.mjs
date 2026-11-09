// Node 版本单一来源（#127）：.nvmrc 是唯一事实，工作流的 setup-node、package.json 的 engines、tests/README.md 必须跟它一致。
// 来历：工作流写死 22、README 写「≥ 18」、仓库没有 .nvmrc —— 协作者本机和 CI 可能不是同一个版本，各处靠人记会漂。
// 本机版本不对只打印提醒、不判失败（环境问题不该让测试红）。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.NBQ_CI_ROOT || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const rd = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8') } catch { return null } };

const nvmrc = (rd('.nvmrc') || '').trim();
T('.nvmrc 存在且是一个大版本号（如 22）', /^\d+$/.test(nvmrc), nvmrc);
const V = nvmrc;

// 工作流：每个 node-version 都等于 .nvmrc（写法有 '22'、22、{ node-version: 22 } 几种）
const WF = path.join(ROOT, '.github', 'workflows');
const uses = [];
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)).sort())
  for (const m of fs.readFileSync(path.join(WF, f), 'utf8').matchAll(/node-version(-file)?:\s*['"]?([^'"\s,}]+)/g)) uses.push({ f, file: !!m[1], v: m[2] });
T('至少有一个工作流装 Node（读不到说明正则失效）', uses.length > 0);
const bad = uses.filter(u => u.file ? u.v !== '.nvmrc' : u.v !== V);
T('所有工作流的 node-version 都等于 .nvmrc（或用 node-version-file: .nvmrc）', bad.length === 0, { nvmrc: V, 不一致: bad });

// package.json engines
let pkg = null; try { pkg = JSON.parse(rd('package.json')) } catch { }
T('package.json 的 engines.node 是「>=<.nvmrc>」', !!pkg && pkg.engines && pkg.engines.node === '>=' + V, pkg && pkg.engines);
let lock = null; try { lock = JSON.parse(rd('package-lock.json')) } catch { }
T('package-lock.json 根包的 engines 和 package.json 一致', !!lock && JSON.stringify(lock.packages[''].engines) === JSON.stringify(pkg && pkg.engines), lock && lock.packages[''].engines);

// README 不再写死另一个版本
const readme = rd('tests/README.md') || '';
const said = [...readme.matchAll(/Node(?:\.js)?\s*(?:≥|>=)?\s*(\d+)/g)].map(m => m[1]);
T('tests/README.md 里提到的 Node 版本都等于 .nvmrc', said.length > 0 && said.every(x => x === V), said);

// 本机：只提醒
const cur = process.versions.node.split('.')[0];
if (cur !== V) console.log(`  提醒：本机 Node ${process.versions.node}，项目用 ${V}（.nvmrc）。nvm / fnm 用户在仓库目录执行 nvm use 或 fnm use。`);

console.log(`\nnode_version: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
