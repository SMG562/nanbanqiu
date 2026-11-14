// 5g 前台接入 Supabase 登录：sbAuthMake（src/shared/script/0490-Supabase登录.js）在空沙盒里载入（不依赖页面），
//   用假的 fetch / 存储 / 时钟测：请求地址和内容、错误码归类、登录态保存、快过期自动续期、续期被拒清掉、断网保留、退出、资料缓存、没配置时不启用。
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0490-Supabase登录.js'), 'utf8');
// 只取纯逻辑部分（"页面接线"之前）放进空沙盒
const pure = src.slice(0, src.indexOf('/* ---- 页面接线'));
const ctx = vm.createContext({ JSON, String, Math, Date, Promise, Object }); vm.runInContext(pure + '\n;globalThis.__x={sbAuthMake,SB_PROF_KEYS,sbSmsPaused,SB_TXT}', ctx);
const { sbAuthMake, sbSmsPaused, SB_TXT } = ctx.__x;
T('纯逻辑部分在空沙盒里能载入', typeof sbAuthMake === 'function');
T('两端都拼进了登录模块，且在两端的登录页之前', ['pwa', 'web'].every(e => { const l = fs.readFileSync(path.join(DIR, `src/${e}.list`), 'utf8'); return l.includes('shared/script/0490-Supabase登录.js') && l.indexOf('0490-Supabase登录') < l.indexOf(`${e}/script/0260-`) }));
T('仓库里没有 service_role', !/service_role/.test(src.replace(/service_role 绝不能出现在这里/, '')));

const env = (cfg, replies) => {
  const calls = [], mem = {}; let t = 1_800_000_000_000;
  const fetch = async (u, o) => { calls.push({ u, o, body: JSON.parse(o.body) }); const r = replies.shift(); if (r === 'net') throw new Error('offline'); return { ok: r.s < 300, status: r.s, json: async () => r.d } };
  const io = { fetch, now: () => t, store: { get: k => mem[k] ?? null, set: (k, v) => { mem[k] = v }, del: k => { delete mem[k] } } };
  return { A: sbAuthMake(cfg, io), calls, mem, tick: s => { t += s * 1000 } };
};
const CFG = { url: 'https://abc.supabase.co/', key: 'sb_publishable_x' };
const OK = (extra = {}) => ({ s: 200, d: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'u-1', phone: '61412345678' }, ...extra } });

let e = env({ url: '', key: '' }, []); T('没配置（url / key 为空）= 不启用', e.A.on() === false);
e = env({ url: 'https://a.supabase.co', key: '' }, []); T('只配了 url 没配 key = 不启用', e.A.on() === false);
e = env(CFG, []); T('配齐 = 启用', e.A.on() === true);

e = env(CFG, [{ s: 200, d: {} }]); let r = await e.A.send('+61412345678');
T('发码：POST /auth/v1/otp，带 apikey、手机号、create_user', r.ok && e.calls[0].u === 'https://abc.supabase.co/auth/v1/otp' && e.calls[0].o.method === 'POST' && e.calls[0].o.headers.apikey === CFG.key && e.calls[0].body.phone === '+61412345678' && e.calls[0].body.create_user === true, e.calls[0]);
T('发码：url 末尾的斜杠不会变成双斜杠', !e.calls[0].u.includes('co//'));
for (const [name, rep, code] of [
  ['发太快 → otp_too_fast', { s: 429, d: { error_code: 'over_sms_send_rate_limit' } }, 'otp_too_fast'],
  ['请求太多 → rate_limited', { s: 429, d: { error_code: 'over_request_rate_limit' } }, 'rate_limited'],
  ['短信服务商失败 → sms_failed', { s: 500, d: { error_code: 'sms_send_failed' } }, 'sms_failed'],
  ['号码不被接受（422）→ sms_failed，不显示成验证码错', { s: 422, d: { error_code: 'validation_failed' } }, 'sms_failed'],
  ['断网 → network', 'net', 'network']]) { e = env(CFG, [rep]); r = await e.A.send('+61412345678'); T('发码失败：' + name, !r.ok && r.code === code, r) }

e = env(CFG, [OK()]); r = await e.A.verify('+61412345678', 123456);
T('验码：POST /auth/v1/verify，type=sms，token 是字符串', r.ok && r.uid === 'u-1' && e.calls[0].u.endsWith('/auth/v1/verify') && e.calls[0].body.type === 'sms' && e.calls[0].body.token === '123456' && e.calls[0].body.phone === '+61412345678', e.calls[0]);
T('验码成功：登录态存在本机（含 refresh token）', e.A.session() && e.A.session().refresh_token === 'RT' && e.A.session().uid === 'u-1', e.A.session());
for (const [name, rep, code] of [['验证码错误 / 过期 → otp_wrong', { s: 403, d: { error_code: 'otp_expired' } }, 'otp_wrong'], ['400 无错误码 → otp_wrong', { s: 400, d: { msg: 'x' } }, 'otp_wrong'], ['429 → rate_limited', { s: 429, d: {} }, 'rate_limited'], ['被封禁用户 → account_banned', { s: 403, d: { error_code: 'user_banned' } }, 'account_banned'], ['返回里没有登录态 → unknown', { s: 200, d: {} }, 'unknown']]) {
  e = env(CFG, [rep]); r = await e.A.verify('+61412345678', '000000'); T('验码失败：' + name, !r.ok && r.code === code && e.A.session() === null, r) }

e = env(CFG, [OK()]); await e.A.verify('+61412345678', '1'); e.calls.length = 0;
let s = await e.A.fresh(); T('登录态没过期：直接用，不发请求', s && s.access_token === 'AT' && e.calls.length === 0);
const e2 = env(CFG, [OK(), OK({ access_token: 'AT2', refresh_token: 'RT2' })]); await e2.A.verify('+61412345678', '1'); e2.tick(3600 - 30);
s = await e2.A.fresh(); T('快过期（60 秒内）：用 refresh token 续期，换上新的两个 token', s && s.access_token === 'AT2' && e2.calls[1].u.endsWith('/auth/v1/token?grant_type=refresh_token') && e2.calls[1].body.refresh_token === 'RT', { s, c: e2.calls[1] });
T('续期后 uid 不丢', s.uid === 'u-1' && e2.A.session().refresh_token === 'RT2');
const e3 = env(CFG, [OK(), { s: 400, d: { error_code: 'refresh_token_not_found' } }]); await e3.A.verify('+61412345678', '1'); e3.tick(4000);
T('续期被拒（已在别处退出 / 被撤销）：清掉登录态，返回空', (await e3.A.fresh()) === null && e3.A.session() === null);
const e4 = env(CFG, [OK(), 'net']); await e4.A.verify('+61412345678', '1'); e4.tick(3600 - 30);
s = await e4.A.fresh(); T('快过期时断网：先保留，下次再试（还没真过期仍视为登录）', s && s.access_token === 'AT' && e4.A.session() !== null);
const e4b = env(CFG, []);
T('没登录过：fresh 返回空', (await e4b.A.fresh()) === null);

const e5 = env(CFG, [OK(), { s: 204, d: null }]); await e5.A.verify('+61412345678', '1'); await e5.A.logout();
T('退出：清本机登录态，并通知 Supabase（带 Bearer access token）', e5.A.session() === null && e5.calls[1].u.endsWith('/auth/v1/logout') && e5.calls[1].o.headers.Authorization === 'Bearer AT', e5.calls[1]);
const e6 = env(CFG, [OK(), 'net']); await e6.A.verify('+61412345678', '1'); await e6.A.logout();
T('退出时断网：本机照样清掉', e6.A.session() === null);

const e7 = env(CFG, []); e7.A.setProf('u-1', { name: '小明', last: 'W', ntrp: 3.5, home_club_ids: ['v1'], gender: null, adult_confirmed_at: 'x', terms_version: '1', privacy_version: '1', no: 99, blocked: new Set(), password: 'x' });
const pr = e7.A.prof('u-1'); T('资料缓存：只存资料字段（不存编号、屏蔽名单等演示内部字段）', pr.name === '小明' && pr.ntrp === 3.5 && pr.no === undefined && pr.blocked === undefined && pr.password === undefined, pr);
T('资料缓存：按用户分开，没有的返回空', e7.A.prof('u-2') === null && e7.A.prof(undefined) === null);
const eb = env(CFG, []); eb.mem.nbq_sb = '{坏的'; T('本机数据损坏：当作没登录，不报错', eb.A.session() === null);
// 刷新登录的健壮性（10-31：手机桌面应用隔一阵再打开要重新登录）
const ec = env(CFG, [OK(), OK({ access_token: 'AT2', refresh_token: 'RT2' })]); await ec.A.verify('+61412345678', '1'); ec.tick(7200);
const cc = await Promise.all([ec.A.fresh(), ec.A.fresh(), ec.A.fresh()]);
T('并发刷新只发一次请求，三个调用拿到同一份新令牌', ec.calls.length === 2 && cc.every(x => x && x.access_token === 'AT2') && ec.A.session().refresh_token === 'RT2', [ec.calls.length, cc]);
for (const st of [429, 500, 502, 503]) {
  const ex = env(CFG, [OK(), { s: st, d: {} }, OK({ access_token: 'AT3', refresh_token: 'RT3' })]); await ex.A.verify('+61412345678', '1'); ex.tick(7200);
  const a1 = await ex.A.fresh(); const kept = ex.A.session() !== null && ex.A.session().refresh_token === 'RT';
  const a2 = await ex.A.fresh();
  T(`刷新遇到 ${st}（限流 / 服务端临时出错）：不清登录，已过期先返回空，下次再试就能续上`, a1 === null && kept && a2 && a2.access_token === 'AT3', [a1, kept, a2]);
}
for (const st of [400, 401, 403]) { const ex = env(CFG, [OK(), { s: st, d: {} }]); await ex.A.verify('+61412345678', '1'); ex.tick(7200); T(`刷新被拒（${st}，令牌无效）：清掉登录`, (await ex.A.fresh()) === null && ex.A.session() === null) }
const en = env(CFG, [OK(), 'net', OK({ access_token: 'AT4', refresh_token: 'RT4' })]); await en.A.verify('+61412345678', '1'); en.tick(7200);
T('已过期时断网：返回空但保留登录，网络回来再试能续上', (await en.A.fresh()) === null && en.A.session() !== null && (await en.A.fresh()).access_token === 'AT4');
// 运行时开关 sms_paused（#49 PR②）：发码前读 /api/switches，开了就不发；读不到一律放行（不挡正常登录）
{ const mk = (rep) => { const calls = []; return { calls, io: { fetch: async (u, o) => { calls.push({ u, o }); if (rep === 'net') throw new Error('offline'); return { ok: rep.s < 300, status: rep.s, json: async () => { if (rep.bad) throw new Error('bad json'); return rep.d } } } } } };
  let m = mk({ s: 200, d: { switches: { register_paused: false, maintenance: false, sms_paused: true } } });
  T('开关：sms_paused 开 = 暂停（GET /api/switches，不缓存）', await sbSmsPaused(m.io) === true && m.calls[0].u === '/api/switches' && m.calls[0].o.method === 'GET' && m.calls[0].o.cache === 'no-store', m.calls);
  m = mk({ s: 200, d: { switches: { sms_paused: false } } }); T('开关：sms_paused 关 = 不暂停', await sbSmsPaused(m.io) === false);
  m = mk({ s: 200, d: { switches: { register_paused: true, maintenance: true } } }); T('开关：只开了别的开关，短信不受影响', await sbSmsPaused(m.io) === false);
  for (const [n, rep] of [['断网', 'net'], ['接口 500', { s: 500, d: {} }], ['返回不是 JSON', { s: 200, bad: true }], ['返回缺 switches', { s: 200, d: {} }], ['sms_paused 是字符串 "true"（不认）', { s: 200, d: { switches: { sms_paused: 'true' } } }]])
    T('开关：' + n + ' → 放行（不挡登录）', await sbSmsPaused(mk(rep).io) === false);
  T('开关：页面接线里发码前先读开关，再发（sbaSendThen）', /sbSmsPaused\([^)]*\)[^;]*\.then\(p=>p\?\{ok:false,code:'sms_paused'\}:SBA\.send\(/.test(src), src.slice(src.indexOf('function sbaSendThen'), src.indexOf('function sbaSendThen') + 300));
  T('开关：暂停时的提示文案有，且不是「验证码错」', typeof SB_TXT.sms_paused === 'string' && SB_TXT.sms_paused.includes('暂时停发')); }

// 登录交接（11-14）：用码换登录、之后由自家接口续期 / 退出（不再找 Supabase）
{ const tok = { access_token: 'OWN1', refresh_token: 'R'.repeat(43), expires_in: 3600, user: { id: 'u-9', phone: '61412345678' } };
  let e = env({ url: 'https://p.supabase.co', key: 'k' }, [{ s: 200, d: tok }]); let r = await e.A.redeem('C'.repeat(43));
  T('redeem：发到自家接口（相对路径、不带 Supabase 的 key），存成 own 登录', r.ok && r.uid === 'u-9' && e.calls[0].u === '/api/session/redeem' && e.calls[0].body.code === 'C'.repeat(43) && !e.calls[0].o.headers.apikey && e.A.session().own === true && e.A.session().access_token === 'OWN1', [r, e.calls[0]]);
  T('已经有登录：不再换（不发请求）', (await e.A.redeem('D'.repeat(43))).code === 'has_session' && e.calls.length === 1);
  // 续期走自家接口
  const ee = env({ url: 'https://p.supabase.co', key: 'k' }, [{ s: 200, d: tok }, { s: 200, d: { ...tok, access_token: 'OWN2' } }, { s: 401, d: { error: 'session_revoked' } }, { s: 200, d: {} }]);
  await ee.A.redeem('C'.repeat(43)); ee.tick(3590); let s = await ee.A.fresh();
  T('own 登录快过期：向 /api/session/refresh 续期，仍是 own', s && s.access_token === 'OWN2' && s.own === true && ee.calls[1].u === '/api/session/refresh' && ee.calls[1].body.refresh_token === tok.refresh_token, [s, ee.calls[1] && ee.calls[1].u]);
  ee.tick(3590); s = await ee.A.fresh();
  T('续期被拒（凭证撤销 / 账号封禁）：清掉登录', s === null && ee.A.session() === null);
  const e3 = env({ url: 'https://p.supabase.co', key: 'k' }, [{ s: 200, d: tok }, { s: 200, d: { ok: true } }]); await e3.A.redeem('C'.repeat(43)); await e3.A.logout();
  T('own 登录退出：告诉自家接口作废凭证，本机清掉', e3.calls[1].u === '/api/session/logout' && e3.calls[1].body.refresh_token === tok.refresh_token && e3.A.session() === null);
  const e4 = env({ url: 'https://p.supabase.co', key: 'k' }, ['net']); r = await e4.A.redeem('C'.repeat(43));
  T('换码时没连上：报 network（码没用掉，可以再试），不存登录', r.ok === false && r.code === 'network' && e4.A.session() === null);
  const e5 = env({ url: 'https://p.supabase.co', key: 'k' }, [{ s: 401, d: { error: 'handoff_invalid' } }]); r = await e5.A.redeem('C'.repeat(43));
  T('码不对 / 用过 / 过期：报 handoff_invalid，不存登录', r.code === 'handoff_invalid' && e5.A.session() === null) }

console.log(`\nsb_auth: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
