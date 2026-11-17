// 首页引导条显示规则（11-08，src/shared/script/0501）：放进空沙盒载入（证明不依赖页面），五个条件逐个翻转。
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(DIR, 'src/shared/script/0501-首页引导条_规则.js'), 'utf8'), ctx);
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
// 开关按环境（#203，11-13 正式站打开）：把 0502 的 NBQ_INTRO 放进沙盒，按 NBQ_ENV 逐个核对
{ const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0502-首页引导条.js'), 'utf8');
  const i = src.indexOf('const NBQ_INTRO='), j = src.indexOf('})();', i) + 5;
  const on = (env, ff) => { const c = vm.createContext({ NBQ_ENV: env, localStorage: { getItem: k => k === 'nbq_ff_intro' ? ff : null }, location: { hash: '', pathname: '/' } });
    vm.runInContext(src.slice(i, j) + ';this.r=NBQ_INTRO.on', c); return c.r };
  T('开关：源码里找得到 NBQ_INTRO', i > 0 && j > i);
  for (const e of ['prod', 'staging', 'preview']) T('开关：' + e + ' 默认开', on(e, null) === true);
  T('开关：本地 / 测试域名（none）默认关', on('none', null) === false);
  T('开关：本地设 nbq_ff_intro=1 打开', on('none', '1') === true); }
console.log(`intro_rules: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
