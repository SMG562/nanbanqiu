// 测试分片守卫（11-11）：run_all --shard=i/n 把测试分给 n 台机器并行跑。分错了 = 悄悄少测，所以程序盯着：
//   ① 各份合起来正好是不分片的全部，互不重复（任何 n、任何档位）
//   ② 分得均衡（最大一份不比平均多出超过一个最大的单项）；同样的输入每次分法一样（每台机器各自算，必须得到同一结果）
//   ③ 非法的 --shard 一律退出码 2，不会静默当成「跑全部」或「一项都不跑」
//   ④ test_weights.json 里登记的名字都还存在（改名后登记会悄悄失效，按默认值分）
//   ⑤ tests.yml 里 matrix 的分片列表自洽：每个列表是 1/n … n/n 完整的一组（漏一份 = 那一份的测试永远没人跑）
//   ⑥ tests/frontend 下没登记的 .js 自动加入（run_all），已登记的不重复
import fs from 'fs'; import os from 'os'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 500))) };
const list = (...a) => spawnSync('node', [path.join(ROOT, 'tests', 'run_all.mjs'), '--list', ...a], { encoding: 'utf8', env: { ...process.env, NBQ_DIR: ROOT } });
const ids = r => r.stdout.split('\n').filter(l => l && !l.startsWith('--')).map(l => l.trim().split(/\s+/).slice(1).join(' '));
const W = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'spec', 'test_weights.json'), 'utf8')).seconds, w = id => W[id] ?? 15;

const CONFIGS = { 'CI 快速档（浏览器）': ['--quick', '--fast', '--skip=static,unit,schema,pg'], '完整档': [], '快速档全部': ['--quick', '--fast'] };
for (const [name, base] of Object.entries(CONFIGS)) {
  const all = ids(list(...base));
  T(`${name}：不分片能列出测试`, all.length > 10, all.length);
  for (const n of [1, 2, 3, 4, 7]) {
    const parts = Array.from({ length: n }, (_, k) => ids(list(...base, `--shard=${k + 1}/${n}`)));
    const flat = parts.flat();
    T(`${name} ${n} 份：合起来 = 全部、互不重复`, flat.length === all.length && new Set(flat).size === flat.length && all.every(id => flat.includes(id)),
      { 全部: all.length, 合计: flat.length, 去重: new Set(flat).size, 漏: all.filter(id => !flat.includes(id)).slice(0, 5) });
    const sums = parts.map(p => p.reduce((s, id) => s + w(id), 0)), avg = sums.reduce((a, b) => a + b, 0) / n, maxItem = Math.max(...all.map(w));
    T(`${name} ${n} 份：均衡（最大一份 ≤ 平均 + 最大单项）`, Math.max(...sums) <= avg + maxItem + 1e-9, { sums, avg, maxItem });
  }
  T(`${name}：同样的输入分法一样`, JSON.stringify(ids(list(...base, '--shard=2/3'))) === JSON.stringify(ids(list(...base, '--shard=2/3'))));
}
for (const bad of ['0/3', '4/3', '1/0', 'abc', '1/', '/3', '-1/3', '1.5/3', '2']) { const r = list('--quick', `--shard=${bad}`); T(`非法 --shard=${bad} → 退出码 2`, r.status === 2, { status: r.status }) }

const known = new Set(ids(list()));   // 完整档的全部名字
T('test_weights.json 登记的名字都存在', Object.keys(W).every(id => known.has(id)), Object.keys(W).filter(id => !known.has(id)));

// ⑥ 页面测试自动发现（11-11，#172 第 5 项）：tests/frontend 下新加的 .js 不用登记也会跑；已登记的不会再加一遍
const all0 = ids(list()); T('完整档没有重名的项（已登记的页面测试没被自动发现再加一遍）', new Set(all0).size === all0.length, all0.filter((id, i) => all0.indexOf(id) !== i));
{ const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-autodisc-')), src = path.join(ROOT, 'tests');
  try {
    fs.cpSync(src, path.join(tmp, 'tests'), { recursive: true, filter: s => !/[\\/](reports|node_modules)$/.test(s) });
    fs.writeFileSync(path.join(tmp, 'tests', 'frontend', 'zz_probe.js'), 'console.log("zz_probe: 1 passed, 0 failed")\n');
    const r = spawnSync('node', [path.join(tmp, 'tests', 'run_all.mjs'), '--list', '--quick'], { encoding: 'utf8', env: { ...process.env, NBQ_DIR: ROOT } });
    const got = ids(r), base = ids(list('--quick'));
    T('新加 tests/frontend/zz_probe.js、不改 run_all → 自动出现在快速档', got.includes('frontend/zz_probe') && got.length === base.length + 1, { status: r.status, 多: got.filter(id => !base.includes(id)), err: r.stderr.slice(0, 300) });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) } }

const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'tests.yml'), 'utf8');
const lists = [...wf.matchAll(/'(\[(?:"\d+\/\d+"(?:,\s*)?)+\])'/g)].map(m => JSON.parse(m[1]));
T('tests.yml 里有 matrix 分片列表', lists.length >= 1, lists.length);
for (const l of lists) {
  const n = +l[0].split('/')[1];
  T(`tests.yml 分片列表 ${JSON.stringify(l)} 是完整的一组 1/${n}…${n}/${n}`, l.length === n && l.every((s, k) => s === `${k + 1}/${n}`), l);
}
console.log(`\nshard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
