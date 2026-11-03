// 5g-3 前台接入第 3 轮：数据层骨架 nbqNetMake / nbqFrom* / nbqLoadAll（src/shared/script/0495-接口调用.js）
//   在空沙盒里载入纯逻辑部分（"页面接线"之前），用假 fetch 测：令牌、错误码、网络失败、401 回调、查询串、字段转换、一次读入的合并与失败不留半份
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const src = fs.readFileSync(path.join(DIR, 'src/shared/script/0495-接口调用.js'), 'utf8');
const pure = src.slice(0, src.indexOf('/* ---- 页面接线'));
// 印色名单（nbqColor 要用）：和页面里同一份，从源码取
const rdS = f => fs.readFileSync(path.join(DIR, 'src/shared/script', f), 'utf8'), lineOf = (s, a) => { const i = s.indexOf(a); return s.slice(i, s.indexOf('\n', i)) };
const COLORS = lineOf(rdS('0050-印章头像.js'), 'const ZAVC=') + '\n' + lineOf(rdS('0040-工具.js'), 'const AVC=[') + '\n';
const ctx = vm.createContext({ JSON, String, Math, Date, Promise, Object, Array, Set, encodeURIComponent, atob, Uint8Array, Number }); vm.runInContext(COLORS + pure + '\n;globalThis.__x={nbqFromNotif,nbqNtfList,nbqNtfNeedGames,nbqUnsyncedReads,nbqKeyBytes,nbqNetMake,nbqFromUser,nbqFromVenue,nbqFromGame,nbqFromPart,nbqFromInvite,nbqLoadAll,nbqLoadPublic}', ctx);
const X = ctx.__x;
T('纯逻辑部分在空沙盒里能载入', typeof X.nbqNetMake === 'function' && typeof X.nbqLoadAll === 'function');
T('仓库里没有 service_role', !/service_role/.test(src));
T('两端都拼进了接口调用模块，且在登录模块之后', ['pwa', 'web'].every(e => { const l = fs.readFileSync(path.join(DIR, `src/${e}.list`), 'utf8').split('\n'); const a = l.indexOf('shared/script/0490-Supabase登录.js'), b = l.indexOf('shared/script/0495-接口调用.js'); return a >= 0 && b > a }));

// 假 fetch：routes = { 'GET /api/me': {s,d,h} | 'net' }
const mk = (routes, tok = 'AT') => { const calls = []; let lost = 0;
  const fetch = async (u, o) => { calls.push({ u, o }); const k = o.method + ' ' + u.replace(/^https:\/\/x\.app/, '').split('?')[0]; const r = routes[k]; if (r === 'net') throw new Error('offline'); if (!r) return { ok: false, status: 404, json: async () => ({ error: 'not_found' }), headers: { get: () => null } };
    return { ok: r.s < 300, status: r.s, json: async () => { if (r.d === undefined) throw new Error('no json'); return r.d }, headers: { get: n => (r.h || {})[n] ?? null } } };
  return { net: X.nbqNetMake({ fetch, base: 'https://x.app/', token: async () => tok, onAuthLost: () => { lost++ } }), calls, lost: () => lost } };

let e = mk({ 'GET /api/me': { s: 200, d: { registered: false } } });
let r = await e.net.get('/api/me');
T('带登录令牌、地址不出现双斜杠', r.ok && e.calls[0].o.headers.Authorization === 'Bearer AT' && e.calls[0].u === 'https://x.app/api/me', e.calls[0]);
e = mk({}, null); r = await e.net.get('/api/me');
T('没令牌：不发请求，login_required', !r.ok && r.code === 'login_required' && e.calls.length === 0);
e = mk({ 'GET /api/venues': { s: 200, d: { venues: [] } } }, null); r = await e.net.get('/api/venues', null, { anon: true });
T('匿名接口：没令牌也发，且不带 Authorization', r.ok && e.calls.length === 1 && !e.calls[0].o.headers.Authorization);
e = mk({ 'GET /api/games': { s: 200, d: { games: [] } } }); await e.net.get('/api/games', { city: 'mel', a: '', b: null, c: 'x y' });
T('查询串：空值跳过、编码', e.calls[0].u === 'https://x.app/api/games?city=mel&c=x%20y', e.calls[0].u);
e = mk({ 'POST /api/games': { s: 201, d: { id: 'g1' } } }); r = await e.net.post('/api/games', { a: 1 });
T('POST：JSON 请求体和类型', r.ok && e.calls[0].o.body === '{"a":1}' && e.calls[0].o.headers['Content-Type'] === 'application/json');
e = mk({ 'GET /api/me': 'net' }); r = await e.net.get('/api/me');
T('断网 → network', !r.ok && r.code === 'network' && r.status === 0);
e = mk({ 'GET /api/me': { s: 401, d: { error: 'unauthorized' } } }); r = await e.net.get('/api/me');
T('401：返回错误码并通知登录失效一次', r.code === 'unauthorized' && e.lost() === 1);
e = mk({ 'POST /api/games': { s: 429, d: { error: 'game_create_limit', detail: '60' }, h: { 'Retry-After': '60' } } }); r = await e.net.post('/api/games', {});
T('429：错误码、detail、retry_after', r.code === 'game_create_limit' && r.detail === '60' && r.retry_after === 60, r);
e = mk({ 'POST /api/games': { s: 409, d: { error: 'game_open_limit' } } }); r = await e.net.post('/api/games', {});
T('409：错误码原样给前台（和 API_ERR 对照）', r.code === 'game_open_limit' && r.status === 409);
e = mk({ 'GET /api/me': { s: 502 } }); r = await e.net.get('/api/me');
T('非 JSON 的 5xx → db_unavailable', r.code === 'db_unavailable');
e = mk({ 'GET /api/me': { s: 403 } }); r = await e.net.get('/api/me');
T('非 JSON 的其他失败 → unknown', r.code === 'unknown');

// ---- 字段转换 ----
const u = X.nbqFromUser({ id: 'u1', member_no: 1288, nickname: 'Jason', last_initial: 'L', utr: 5.5, avatar_kind: 'animal', avatar_animal: 'fox', avatar_color: 'sage', card_venue_id: 'vv1' });
T('球友：昵称 / 姓 / 编号 / UTR / 头像', u.name === 'Jason' && u.last === 'L' && u.no === 1288 && u.ntrp === 5.5 && u.animal === 'fox' && u.avatar_kind === 'animal' && u.blocked instanceof Set && u.home_club_ids[0] === 'vv1', u);
T('球友：没填的给默认（字母头像、空姓）', (x => x.avatar_kind === 'letter' && x.last === '' && x.home_club_ids.length === 0)(X.nbqFromUser({ id: 'u2', nickname: 'A' })));
T('球友：null → null', X.nbqFromUser(null) === null);
const v = X.nbqFromVenue({ id: 'v1', name: 'Albert Park Tennis', short_name: null, suburb: 'Albert Park', surfaces: ['clay', 'hard'], lat: -37.84, lng: 144.97, lights: true });
T('球场：简称缺省取全名，场地取第一个', v.short === 'Albert Park Tennis' && v.surface === 'clay' && v.lights === true && v.lat === -37.84);
T('球场：多选场地全带上（surfaces），surface 是第一个（11-03：之前少显示场地）', JSON.stringify(v.surfaces) === '["clay","hard"]' && JSON.stringify(X.nbqFromVenue({ id: 'v2', name: 'X', surfaces: [] }).surfaces) === '["hard"]');
T('枚举：库里有前台不认识的值 → 用兜底值（不原样传下去）', (u => u.avatar_kind === 'letter' && u.card_theme === 'court' && u.gender === null)(X.nbqFromUser({ id: 'u9', nickname: 'Z', avatar_kind: 'robot', card_theme: 'neon', gender: 'x' })) && X.nbqFromVenue({ id: 'v3', name: 'Y', surfaces: ['lava'] }).surfaces[0] === 'hard');
T('枚举：认识的值原样保留', (u => u.avatar_kind === 'animal' && u.card_theme === 'night' && u.gender === 'f')(X.nbqFromUser({ id: 'u8', nickname: 'Z', avatar_kind: 'animal', card_theme: 'night', gender: 'f' })));
T('印色：库里的色名换成色值（paper → #F4EFE3）', X.nbqFromUser({ id: 'u7', nickname: 'Q', avatar_color: 'paper' }).color === '#F4EFE3');
const g = X.nbqFromGame({ id: 'g1', starts_at: '2026-11-01T01:00:00Z', original_start: null, filled: null, tags: null, utr_min: 3.5, utr_max: 5 });
T('球局：时间保持 ISO 字符串（和演示数据一致）、空值给默认', g.starts_at === '2026-11-01T01:00:00.000Z' && g.original_start === null && g.filled === 0 && Array.isArray(g.tags), g);
T('球局：utr_min / utr_max 同时给 ntrp_min / ntrp_max（前台用后者）', g.ntrp_min === 3.5 && g.ntrp_max === 5 && g.utr_min === 3.5);
const p = X.nbqFromPart({ game_id: 'g1', user_id: 'u1', role: 'player', status: 'rejected', message: null, decline_reason: 'level', decline_note: 'x', created_at: '2026-10-30T00:00:00Z' });
T('参与记录：婉拒原因 → reason / note，留言缺省为空串', p.reason === 'level' && p.note === 'x' && p.message === '' && typeof p.created_at === 'number');
T('参与记录：没有婉拒原因时 reason 不存在', X.nbqFromPart({ game_id: 'g', user_id: 'u', role: 'host', status: 'approved' }).reason === undefined);
T('邀约：四个时间转毫秒', (i => typeof i.starts_at === 'number' && i.counter_starts_at === null && typeof i.expires_at === 'number')(X.nbqFromInvite({ id: 'i', starts_at: '2026-11-01T01:00:00Z', ends_at: '2026-11-01T02:00:00Z', expires_at: '2026-11-02T00:00:00Z' })));

// ---- 一次读入 ----
const ME = { id: 'u1', member_no: 1, nickname: 'Me', utr: 5 }, HOST = { id: 'u2', member_no: 2, nickname: 'Host', utr: 6 };
const G = (id, t) => ({ id, host_id: 'u2', venue_id: 'v1', starts_at: t, status: 'open' });
const ok = o => ({ s: 200, d: o });
const base = () => ({ 'GET /api/me': ok({ registered: true, user: ME }), 'GET /api/venues': ok({ venues: [{ id: 'v1', name: 'A', suburb: 'S' }] }),
  'GET /api/games': ok({ games: [G('g1', '2026-11-01T01:00:00Z'), G('g2', '2026-11-02T01:00:00Z')] }),
  'GET /api/games/mine': ok({ games: [{ ...G('g2', '2026-11-02T01:00:00Z'), status: 'full' }], participants: [{ game_id: 'g2', user_id: 'u1', role: 'player', status: 'approved' }], profiles: { u2: HOST } }),
  'GET /api/invites': ok({ invites: [{ id: 'i1', from_user: 'u2', to_user: 'u1', starts_at: '2026-11-03T01:00:00Z' }], profiles: { u2: HOST } }) });
e = mk(base()); let L = await X.nbqLoadAll(e.net);
T('一次读入：我、球友、球场、球局合并（同一局以「我的」为准）、参与记录、邀约', L.ok && L.registered && L.me === 'u1' && Object.keys(L.users).sort().join() === 'u1,u2' && L.venues.length === 1 && L.games.length === 2
  && L.games.find(x => x.id === 'g2').status === 'full' && L.parts.length === 3 && L.invites.length === 1, L);   // 3 = 我在 g2 的一行 + 两局各补一行发起人
T('一次读入：球友卡片同时来自球局和邀约时只留一份', Object.keys(L.users).length === 2);
const b2 = base(); b2['GET /api/me'] = ok({ registered: false }); e = mk(b2); L = await X.nbqLoadAll(e.net);
T('新号码：registered=false，只带球场，不再读球局', L.ok && L.registered === false && L.venues.length === 1 && !e.calls.some(c => /\/api\/games|invites/.test(c.u)));
const b3 = base(); b3['GET /api/invites'] = { s: 503, d: { error: 'db_unavailable' } }; e = mk(b3); L = await X.nbqLoadAll(e.net);
T('任何一步失败：只返回错误码，不返回半份数据', L.ok === false && L.code === 'db_unavailable' && !L.games && !L.users);
const b4 = base(); b4['GET /api/me'] = { s: 401, d: { error: 'unauthorized' } }; e = mk(b4); L = await X.nbqLoadAll(e.net);
T('登录失效：unauthorized', L.ok === false && L.code === 'unauthorized' && e.lost() === 1);

// ---- 补全 + 匿名 ----
const CARD = (id, code, extra = {}) => ({ id, share_code: code, host_id: 'h-' + id, host_nickname: 'H' + id, host_utr: 5.5, venue_id: 'v1', starts_at: '2026-11-05T01:00:00Z', capacity: 4, utr_min: 3, utr_max: 7, status: 'open', filled: 0, approved_count: 3, pending_count: 1, spots_left: 1, ...extra });
const b5 = base(); b5['GET /api/games'] = ok({ games: [CARD('g9', 'Zk9x'), CARD('g8', 'Yy88', { filled: 1, approved_count: 2, spots_left: 1 })] });
e = mk(b5); L = await X.nbqLoadAll(e.net);
const g9 = L.games.find(x => x.id === 'g9'), g8 = L.games.find(x => x.id === 'g8');
T('别人的球局：补上发起人（卡片上的昵称 / UTR）和发起人的参与行', L.users['h-g9'].name === 'Hg9' && L.users['h-g9'].ntrp === 5.5 && L.parts.some(p => p.game_id === 'g9' && p.user_id === 'h-g9' && p.role === 'host' && p.status === 'approved'), L.users['h-g9']);
T('别人的球局：其余已确认的人只知道人数，算进 filled → 余位和接口的 spots_left 一致', g9.filled === 2 && g9.capacity - 1 - g9.filled === 1 && g8.filled === 2 && g8.capacity - 1 - g8.filled === 1, [g9.filled, g8.filled]);
T('我自己的球局：参与记录齐全时不加 filled', L.games.find(x => x.id === 'g2').filled === 0 && L.games.find(x => x.id === 'g2').unknown_n === 0);
const b6 = base(); b6['GET /api/games'] = ok({ games: [CARD('g9', 'Zk9x')] }); b6['GET /api/profiles'] = ok({ profiles: { 'h-g9': { id: 'h-g9', member_no: 77, nickname: 'Hostcard', utr: 5.5, avatar_kind: 'animal', avatar_animal: 'fox' } } });
e = mk(b6); L = await X.nbqLoadAll(e.net);
T('公开球局的发起人：取得到完整球员卡就用球员卡（头像等）', L.users['h-g9'].name === 'Hostcard' && L.users['h-g9'].animal === 'fox' && L.users['h-g9'].no === 77, L.users['h-g9']);
e = mk({ 'GET /api/games': ok({ games: [CARD('g9', 'Zk9x')], anon: true }) }); L = await X.nbqLoadPublic(e.net);
T('匿名读公开球局：不带令牌（即使有登录态），用发起人卡片兜底', L.ok && e.calls.length === 1 && !e.calls[0].o.headers.Authorization && L.games.length === 1 && L.users['h-g9'].name === 'Hg9' && L.games[0].filled === 2, e.calls[0]);
e = mk({ 'GET /api/games': { s: 503, d: { error: 'db_unavailable' } } }); L = await X.nbqLoadPublic(e.net);
T('匿名读失败：返回错误码', L.ok === false && L.code === 'db_unavailable');
e = mk({}, null); r = await e.net.get('/api/games', null, { noauth: true });
T('noauth：没令牌也发请求', e.calls.length === 1 && !r.ok && r.code === 'not_found');

// ---- 通知（第 5 轮）----
const NR = [{ id: '7', kind: 'request', game_id: 'g1', actor_id: 'u2', read_at: null, created_at: '2026-10-30T01:00:00Z' },
  { id: '6', kind: 'approved', game_id: 'g1', actor_id: 'u2', read_at: '2026-10-30T02:00:00Z', created_at: '2026-10-29T01:00:00Z' },
  { id: '5', kind: 'invite', game_id: null, actor_id: 'u3', read_at: null, created_at: '2026-10-28T01:00:00Z' },
  { id: '4', kind: 'badge', game_id: null, actor_id: null, read_at: null, created_at: '2026-10-28T01:00:00Z' },
  { id: '3', kind: 'recap', game_id: 'g1', actor_id: null, read_at: null, created_at: '2026-10-27T01:00:00Z' },
  { id: '2', kind: 'full', game_id: 'gX', actor_id: 'u2', read_at: null, created_at: '2026-10-26T01:00:00Z' }];
let nl = X.nbqNtfList(NR, 'me', new Set(['g1']));
T('通知：只留有球局文案的种类，邀约 / 徽章 / 赛后（第 6 轮）和球局不在内存里的先不显示', nl.map(n => n.id).join() === '7,6', nl);
T('通知：字段对上前台（from = 触发的人，at 毫秒，read 看 read_at，id 是数字）', nl[0].from === 'u2' && nl[0].user_id === 'me' && nl[0].at === Date.parse('2026-10-30T01:00:00Z') && nl[0].read === false && nl[1].read === true && typeof nl[0].id === 'number', nl);
T('通知：服务器给的已读不用再同步，未读的本地点开后才要同步', X.nbqUnsyncedReads(nl).length === 0 && X.nbqUnsyncedReads([{ ...nl[0], read: true }, nl[1]]).join() === '7');
T('通知：本地自造的（没有 srv）不参与同步', X.nbqUnsyncedReads([{ id: 101, read: true }]).length === 0);
T('通知：有指向内存里没有的球局的 → 需要先补读球局；邀约 / 徽章不算', X.nbqNtfNeedGames(NR, new Set(['g1'])) === true && X.nbqNtfNeedGames(NR.slice(0, 5), new Set(['g1'])) === false);
T('推送公钥 base64url → 字节', Array.from(X.nbqKeyBytes('AQID')).join() === '1,2,3' && Array.from(X.nbqKeyBytes('-_8')).join() === '251,255');

console.log(`\nnbq_net: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
