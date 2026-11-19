// 首页引导条显示规则（11-19 改为「每天每端一次、所有人」，src/shared/script/0501）：放进空沙盒载入（证明不依赖页面）。
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const ctx = vm.createContext({ Date, String }); vm.runInContext(fs.readFileSync(path.join(DIR, 'src/shared/script/0501-首页引导条_规则.js'), 'utf8'), ctx);
const D = c => ctx.nbqIntroDecide(c);
const base = { on: true, deep: false, surface: 'pwa', today: '2026-11-19', days: {}, audience: 'all', isNew: false };
T('今天还没看过 → 显示（手机端）', D(base) === 'show');
T('今天还没看过 → 显示（网页端）', D({ ...base, surface: 'web' }) === 'show');
T('开关关着 → 不显示', D({ ...base, on: false }) === 'off');
T('从分享 / 推送 / 球局链接进来 → 不显示', D({ ...base, deep: true }) === 'off');
T('今天这一端已经看过 → 不显示', D({ ...base, days: { pwa: '2026-11-19' } }) === 'off');
T('今天只在手机端看过，网页端仍有当天额度', D({ ...base, surface: 'web', days: { pwa: '2026-11-19' } }) === 'show');
T('今天只在网页端看过，手机端仍有当天额度', D({ ...base, days: { web: '2026-11-19' } }) === 'show');
T('昨天看过，今天又显示', D({ ...base, days: { pwa: '2026-11-18', web: '2026-11-18' } }) === 'show');
T('两端今天都看过 → 两端都不显示', D({ ...base, days: { pwa: '2026-11-19', web: '2026-11-19' } }) === 'off' && D({ ...base, surface: 'web', days: { pwa: '2026-11-19', web: '2026-11-19' } }) === 'off');
T('不认识的端（既不是 pwa 也不是 web）→ 不显示', D({ ...base, surface: '' }) === 'off' && D({ ...base, surface: 'x' }) === 'off');
T('已登录 / 主屏幕打开不再影响显示（传了也不看）', D({ ...base, loggedIn: true, standalone: true, seen: true }) === 'show');
T('什么都没传 → 不显示（开关默认关）', D() === 'off' && D({}) === 'off');
// 以后曝光够了只给新用户看：audience = 'new'
const NEW = { ...base, audience: 'new' };
T('audience=new：新用户 → 显示', D({ ...NEW, isNew: true }) === 'show');
T('audience=new：老用户 → 不显示', D({ ...NEW, isNew: false }) === 'off');
T('audience=new：新用户今天看过 → 不显示', D({ ...NEW, isNew: true, days: { pwa: '2026-11-19' } }) === 'off');
// 辅助：本机日期、是否新用户
T('nbqIntroDay：本机日期 YYYY-MM-DD，月日补零', ctx.nbqIntroDay(new Date(2026, 0, 5)) === '2026-01-05' && ctx.nbqIntroDay(new Date(2026, 10, 19)) === '2026-11-19');
const now = Date.UTC(2026, 10, 19), DAY = 864e5;
T('nbqIntroIsNew：没记录 → 新用户', ctx.nbqIntroIsNew(null, now) === true && ctx.nbqIntroIsNew({}, now) === true);
T('nbqIntroIsNew：第一次显示 13 天前 → 新用户', ctx.nbqIntroIsNew({ first: now - 13 * DAY }, now) === true);
T('nbqIntroIsNew：第一次显示 15 天前 → 老用户', ctx.nbqIntroIsNew({ first: now - 15 * DAY }, now) === false);
// 开关按环境（#203，11-13 正式站打开）：把 0502 的 NBQ_INTRO 放进沙盒，按 NBQ_ENV 逐个核对
{ const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0502-首页引导条.js'), 'utf8');
  const i = src.indexOf('const NBQ_INTRO='), j = src.indexOf('})();', i) + 5;
  const on = (env, ff) => { const c = vm.createContext({ NBQ_ENV: env, localStorage: { getItem: k => k === 'nbq_ff_intro' ? ff : null }, location: { hash: '', pathname: '/' } });
    vm.runInContext(src.slice(i, j) + ';this.r=NBQ_INTRO.on', c); return c.r };
  T('开关：源码里找得到 NBQ_INTRO', i > 0 && j > i);
  for (const e of ['prod', 'staging', 'preview']) T('开关：' + e + ' 默认开', on(e, null) === true);
  T('开关：本地 / 测试域名（none）默认关', on('none', null) === false);
  T('开关：本地设 nbq_ff_intro=1 打开', on('none', '1') === true);
  T('受众默认「所有人」（要收窄只改这一行）', /NBQ_INTRO_AUDIENCE='all'/.test(src)); }
console.log(`intro_rules: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
