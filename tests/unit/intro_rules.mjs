// 首页引导条显示规则（11-08，src/shared/script/0499）：放进空沙盒载入（证明不依赖页面），五个条件逐个翻转。
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(DIR, 'src/shared/script/0499-首页引导条_规则.js'), 'utf8'), ctx);
const D = c => ctx.nbqIntroDecide(c);
const base = { on: true, loggedIn: false, seen: false, standalone: false, deep: false };
T('第一次来、没登录、直接打开首页 → 显示', D(base) === 'show');
const why = { on: '开关关着', loggedIn: '已登录 / 有登录快照', seen: '本机看过', standalone: '从主屏幕打开', deep: '从分享 / 推送 / 球局链接进来' };
for (const k of Object.keys(base)) { const c = { ...base, [k]: !base[k] }; T(why[k] + ' → 不显示', D(c) === 'off', c) }
// 32 种组合里只有一种显示
let shows = 0; for (let m = 0; m < 32; m++) { const c = {}; Object.keys(base).forEach((k, i) => c[k] = !!(m >> i & 1)); if (D(c) === 'show') shows++ }
T('全部 32 种组合只有 1 种显示', shows === 1, shows);
T('什么都没传 → 不显示（开关默认关）', D() === 'off' && D({}) === 'off');
T('只返回 show / off 两种', ['show', 'off'].includes(D({ on: 1 })));
console.log(`intro_rules: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
