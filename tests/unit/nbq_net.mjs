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
const ctx = vm.createContext({ JSON, String, Math, Date, Promise, Object, Array, Set, encodeURIComponent, atob, Uint8Array, Number }); vm.runInContext(COLORS + pure + '\n;globalThis.__x={nbqIdemMake,nbqFromNotif,nbqNtfList,nbqNtfNeedGames,nbqUnsyncedReads,nbqKeyBytes,nbqNetMake,nbqFromUser,nbqFromVenue,nbqFromGame,nbqFromPart,nbqFromInvite,nbqInvVenues,nbqFromThread,nbqThreadLast,nbqFromMsg,nbqLoadAll,nbqLoadPublic,nbqUpdNeeded}', ctx);
const X = ctx.__x;
T('纯逻辑部分在空沙盒里能载入', typeof X.nbqNetMake === 'function' && typeof X.nbqLoadAll === 'function');
T('仓库里没有 service_role', !/service_role/.test(src));
T('两端都拼进了接口调用模块，且在登录模块之后', ['pwa', 'web'].every(e => { const l = fs.readFileSync(path.join(DIR, `src/${e}.list`), 'utf8').split('\n'); const a = l.indexOf('shared/script/0490-Supabase登录.js'), b = l.indexOf('shared/script/0495-接口调用.js'); return a >= 0 && b > a }));

// 假 fetch：routes = { 'GET /api/me': {s,d,h} | 'net' }
const mk = (routes, tok = 'AT', io = {}) => { const calls = []; let lost = 0;
  const fetch = async (u, o) => { calls.push({ u, o }); const k = o.method + ' ' + u.replace(/^https:\/\/x\.app/, '').split('?')[0]; const r = routes[k]; if (r === 'net') throw new Error('offline'); if (!r) return { ok: false, status: 404, json: async () => ({ error: 'not_found' }), headers: { get: () => null } };
    return { ok: r.s < 300, status: r.s, json: async () => { if (r.d === undefined) throw new Error('no json'); return r.d }, headers: { get: n => (r.h || {})[n] ?? null } } };
  return { net: X.nbqNetMake({ fetch, base: 'https://x.app/', token: async () => tok, onAuthLost: () => { lost++ }, ...io }), calls, lost: () => lost } };

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
T('邀约：最少字段也能转（只有开始 / 结束 / 到期时间）：不报错、counter 为空、到期是毫秒', (i => i.counter === null && typeof i.expires_at === 'number' && typeof i.t === 'string' && i.note === '')(X.nbqFromInvite({ id: 'i', starts_at: '2026-11-01T01:00:00Z', ends_at: '2026-11-01T02:00:00Z', expires_at: '2026-11-02T00:00:00Z' })));

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


// ---- 邀约（第 6 轮）：接口时间 → 前台「第几天 + 时:分」；换时间 / 婉拒原因 / 自填场地；邀约类通知 ----
{ const day = (k, h, m = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + k); d.setHours(h, m); return d.toISOString() };
  const I = { id: 'i-1', from_user: 'u1', to_user: 'u2', starts_at: day(2, 9, 30), ends_at: day(2, 11), venue_id: 'v1', venue_name: null, game_type: 'singles', note: 'hi', status: 'pending',
    counter_starts_at: null, counter_ends_at: null, counter_venue_id: null, counter_venue_name: null, countered_at: null, game_id: null, created_at: new Date(Date.now() - 36e5).toISOString(), expires_at: new Date(Date.now() + 47 * 36e5).toISOString(), responded_at: null, decline_reason: null, decline_note: null };
  const a = X.nbqFromInvite(I);
  T('邀约：开始 / 结束时间换成 第几天 + 时:分', a.o === 2 && a.t === '09:30' && a.e === '11:00' && a.venue_id === 'v1' && a.from === 'u1' && a.to === 'u2' && a.status === 'pending' && a.counter === null && a.countered === false, a);
  T('邀约：48 小时有效期跟服务器的 expires_at 对齐（at = 到期时间 - 48 小时）', Math.abs(a.at - (Date.parse(I.expires_at) - 48 * 36e5)) < 5, a.at);
  const c = X.nbqFromInvite({ ...I, status: 'counter', counter_starts_at: day(3, 18), counter_ends_at: day(3, 19, 30), counter_venue_id: null, counter_venue_name: '我家后院', countered_at: day(0, 1) });
  T('邀约：换个时间带上新的日期 / 时间 / 自填场地', c.counter.o === 3 && c.counter.t === '18:00' && c.counter.e === '19:30' && c.counter.venue_id === 'n:我家后院' && c.countered === true, c);
  const c2 = X.nbqFromInvite({ ...I, status: 'counter', counter_starts_at: day(3, 18), counter_ends_at: day(3, 19, 30), countered_at: day(0, 1) });
  T('邀约：换时间没改场地 → 沿用原场地', c2.counter.venue_id === 'v1', c2);
  const d = X.nbqFromInvite({ ...I, status: 'declined', decline_reason: 'week', decline_note: '下次' });
  T('邀约：婉拒原因和一句话', d.status === 'declined' && d.no === 'week' && d.noNote === '下次', d);
  T('邀约：不认识的状态按已失效处理（不会出现死状态）', X.nbqFromInvite({ ...I, status: 'weird' }).status === 'expired');
  const own = X.nbqFromInvite({ ...I, venue_id: null, venue_name: '公园球场' }), VENS = { v1: { id: 'v1', lat: 1, lng: 2 } };
  X.nbqInvVenues(VENS, [own, c], 'v1');
  T('邀约：自填场地放进场地表，显示名字，位置借用常去球场', VENS['n:公园球场'] && VENS['n:公园球场'].name === '公园球场' && VENS['n:公园球场'].custom === true && VENS['n:公园球场'].lat === 1 && VENS['n:我家后院'], VENS);
  const NI = [{ id: '9', kind: 'invite', game_id: null, invite_id: 'i-1', actor_id: 'u1', read_at: null, created_at: '2026-10-30T01:00:00Z' },
    { id: '8', kind: 'invite_accepted', game_id: 'g1', invite_id: 'i-1', actor_id: 'u2', read_at: null, created_at: '2026-10-30T00:00:00Z' },
    { id: '7', kind: 'invite_declined', game_id: null, invite_id: 'i-zz', actor_id: 'u2', read_at: null, created_at: '2026-10-29T00:00:00Z' },
    { id: '6', kind: 'invite', game_id: null, invite_id: null, actor_id: 'u2', read_at: null, created_at: '2026-10-29T00:00:00Z' }];
  const nl2 = X.nbqNtfList(NI, 'me', new Set(), new Set(['i-1']));
  T('通知：邀约类要带 invite_id 且邀约已读入才显示；不带 invIds 一律不显示', nl2.map(n => n.id).join() === '9,8' && nl2[0].invite_id === 'i-1' && X.nbqNtfList(NI, 'me', new Set(['g1'])).length === 0, nl2);
  T('通知：邀约不在内存里 → 需要先重读；没有 invite_id 的坏数据不触发重读', X.nbqNtfNeedGames(NI, new Set(), new Set(['i-1'])) === true && X.nbqNtfNeedGames(NI.filter(n => n.id !== '7'), new Set(), new Set(['i-1'])) === false && X.nbqNtfNeedGames(NI, new Set()) === false); }


// ---- 聊天（第 6 轮 6b）：会话 / 最后一句占位 / 消息的转换 ----
{ const dm = { id: 't1', kind: 'dm', game_id: null, other_id: 'u2', last_body: '到了', last_at: '2026-11-01T01:00:00Z', last_sender: 'u2', unread: true };
  const gm = { id: 't2', kind: 'game', game_id: 'g1', other_id: null, last_body: null, last_at: null, last_sender: null, unread: false };
  const a = X.nbqFromThread(dm, 'me'), g = X.nbqFromThread(gm, 'me');
  T('聊天：私信会话带双方；球局群聊带 game_id', a.type === 'dm' && a.members.join() === 'me,u2' && a.srv === true && g.type === 'game' && g.game_id === 'g1' && g.members === undefined, [a, g]);
  const ph = X.nbqThreadLast(dm, 'me');
  T('聊天：最后一句占位（谁发的、内容、毫秒时间）', ph.tid === 't1' && ph.from === 'u2' && ph.text === '到了' && ph.at === Date.parse(dm.last_at) && ph.ph === true, ph);
  T('聊天：没有消息的会话没有占位；没给发送人时，未读 = 对方发的，已读 = 我发的', X.nbqThreadLast(gm, 'me') === null && X.nbqThreadLast({ ...dm, last_sender: null }, 'me').from === 'u2' && X.nbqThreadLast({ ...dm, last_sender: null, unread: false }, 'me').from === 'me');
  const m = X.nbqFromMsg({ id: 12, sender_id: 'u2', body: 'hi', created_at: '2026-11-01T01:00:00Z' }, 't1');
  T('聊天：消息字段对上前台（from / text / at 毫秒 / id 数字）', m.tid === 't1' && m.from === 'u2' && m.text === 'hi' && m.at === Date.parse('2026-11-01T01:00:00Z') && m.id === 12, m); }

// ---- 新版本提示 / 最低前端版本（#63 第 3 件，ADR 0013）：前台带 X-NBQ-Build，服务端 NBQ_MIN_BUILD 低于它回 426 client_outdated ----
{ const B = '1763017920-a9356c8';
  let e = mk({ 'GET /api/me': { s: 200, d: {} } }, 'AT', { build: B }); await e.net.get('/api/me'); await e.net.get('/api/venues', null, { anon: true });
  T('有构建号：每个请求（含匿名）都带 X-NBQ-Build', e.calls.length === 2 && e.calls.every(c => c.o.headers['X-NBQ-Build'] === B), e.calls.map(c => c.o.headers));
  e = mk({ 'GET /api/me': { s: 200, d: {} } }); await e.net.get('/api/me');
  T('没有构建号（本地 / 测试拼的页面）：不带这个头', !('X-NBQ-Build' in e.calls[0].o.headers));
  let od = 0; e = mk({ 'POST /api/games': { s: 426, d: { error: 'client_outdated' } } }, 'AT', { build: B, onOutdated: () => { od++ } });
  let r = await e.net.post('/api/games', {});
  T('426 client_outdated：返回码原样给调用处，并通知页面显示新版本提示（不当成登录失效）', !r.ok && r.status === 426 && r.code === 'client_outdated' && od === 1 && e.lost() === 0, { r, od });
  od = 0; e = mk({ 'POST /api/games': { s: 409, d: { error: 'game_full' } } }, 'AT', { build: B, onOutdated: () => { od++ } }); await e.net.post('/api/games', {});
  T('别的错误不触发新版本提示', od === 0);
  T('nbqUpdNeeded：构建号不同 → 提示；相同 / 本页没有 / 远端没有或不是字符串 → 不提示',
    X.nbqUpdNeeded(B, '1763099999-bbbbbbb') && !X.nbqUpdNeeded(B, B) && !X.nbqUpdNeeded('', '1763099999-bbbbbbb') && !X.nbqUpdNeeded(B, '') && !X.nbqUpdNeeded(B, undefined) && !X.nbqUpdNeeded(B, 123));
  const H = await import(path.join(DIR, 'server/api/handler.mjs'));
  T('outdated：没启用（不设 / 空 / 乱写）→ 一律放行', !H.outdated('GET /api/me', '', null) && !H.outdated('GET /api/me', '', '') && !H.outdated('GET /api/me', '', 'abc'));
  T('outdated：启用后，低于最低版本或没带头 / 头乱写 → 拦；等于、高于 → 放行（按前面的秒数比，提交号不参与）',
    H.outdated('GET /api/me', '1763017919-zzzzzzz', B) && H.outdated('GET /api/me', null, B) && H.outdated('GET /api/me', 'abc', B)
    && !H.outdated('GET /api/me', B, B) && !H.outdated('GET /api/me', '1763017920-0000000', B) && !H.outdated('GET /api/me', '1763099999-0000000', '1763017920'));
  T('outdated：健康检查 / 版本 / 报错上报 / 埋点 / SW 续订推送 不拦', ['GET /api/health', 'GET /api/version', 'POST /api/client-errors', 'POST /api/events', 'POST /api/push/subscriptions'].every(k => !H.outdated(k, null, B)));
  const req = (p, h) => new Request('https://x.app' + p, { headers: h || {} });
  let res = await H.handleApi(req('/api/me', { 'X-NBQ-Build': '1700000000-old0000' }), { minBuild: B });
  T('handleApi：旧前台 → 426 {error:client_outdated}，不碰数据库', res.status === 426 && (await res.json()).error === 'client_outdated');
  res = await H.handleApi(req('/api/health'), { minBuild: B });
  T('handleApi：健康检查不受最低版本影响', res.status === 200);
  res = await H.handleApi(req('/api/nope'), {});
  T('handleApi：没启用时照旧（未知路径 404）', res.status === 404);
  T('api_spec §1 登记了 client_outdated（426）', /^\| client_outdated \| 426 \|/m.test(fs.readFileSync(path.join(DIR, 'tests/spec/api_spec.md'), 'utf8'))); }

// ---------- 重复提交（#276 PR③）：Idempotency-Key ----------
e = mk({ 'POST /api/games': { s: 200, d: { id: 'g1' } } }); await e.net.post('/api/games', { a: 1 }, { idem: 'k-0000000000000001' }); await e.net.post('/api/games', { a: 1 });
T('带 idem → 请求头 Idempotency-Key；不带 → 没有这个头（opt-in）', e.calls[0].o.headers['Idempotency-Key'] === 'k-0000000000000001' && !('Idempotency-Key' in e.calls[1].o.headers), e.calls.map(c => c.o.headers));
{ let n = 0; const I = X.nbqIdemMake(() => 'key-' + String(++n).padStart(16, '0'));
  const k1 = I.key('create', { a: 1 });
  T('同一个操作、同样的内容，上次没有明确结果（断网）→ 沿用同一个 key', (I.done('create', { ok: false, status: 0, code: 'network' }), I.key('create', { a: 1 })) === k1);
  T('服务器 5xx（不知道写没写进去）→ 也沿用', (I.done('create', { ok: false, status: 503 }), I.key('create', { a: 1 })) === k1);
  const k2 = I.key('create', { a: 2 }); T('内容改了（换了时间 / 场地）→ 新 key', k2 !== k1);
  I.done('create', { ok: true, status: 200 }); T('成功后 → 下次换新 key（再发一局是新的一局）', I.key('create', { a: 2 }) !== k2);
  const k3 = I.key('create', { a: 3 }); I.done('create', { ok: false, status: 422, code: 'invalid' });
  T('4xx（服务器明确拒了）→ 下次换新 key', I.key('create', { a: 3 }) !== k3);
  const m1 = I.key('msg1', { body: 'hi' }), m2 = I.key('msg2', { body: 'hi' }); T('不同的操作槽（不同会话）各用各的 key', m1 !== m2);
  { let t = 0, m = 0; const J = X.nbqIdemMake(() => 'kk-' + String(++m).padStart(16, '0'), () => t);
    const a = J.key('msgT', { body: '我到了' }); J.done('msgT', { ok: false, status: 0 }); t = 9 * 60e3;
    T('断网后 10 分钟内再发同样的话 → 沿用', J.key('msgT', { body: '我到了' }) === a);
    t = 11 * 60e3; T('超过 10 分钟再发同样的话 → 新 key（是新的一条，不能错拿旧结果；独立复核发现）', J.key('msgT', { body: '我到了' }) !== a) }
  T('默认生成的 key 符合服务端格式（16–64 位字母数字 _ -）', /^[A-Za-z0-9_-]{16,64}$/.test(X.nbqIdemMake().key('x', {})), X.nbqIdemMake().key('x', {})) }

// 超时（11-13 上线前审查）：弱网下请求一直不回 → 到点放弃、按断网报（不然「处理中」的锁一直不放，按钮点了没反应）；正常返回的不受影响、定时器要清掉
{ const tm = { n: 0, set: (f, ms) => { tm.n++; return setTimeout(f, ms) }, clear: t => { tm.n--; clearTimeout(t) } };
  const hang = X.nbqNetMake({ fetch: () => new Promise(() => { }), base: '', token: async () => 'AT', timeout: 30, timer: tm });
  const t0 = Date.now(), rr = await hang.post('/api/games', {});
  T('请求一直不回：到点放弃，按断网报（status 0 / network）', rr.ok === false && rr.status === 0 && rr.code === 'network' && Date.now() - t0 < 2000, rr);
  const okNet = mk({ 'GET /api/me': { s: 200, d: { registered: false } } }, 'AT', { timeout: 30, timer: tm }), r2 = await okNet.net.get('/api/me');
  T('正常返回：不受超时影响，定时器已清掉', r2.ok === true && tm.n === 0, [r2, tm.n]);
  const off = X.nbqNetMake({ fetch: async () => ({ ok: true, status: 200, json: async () => ({}), headers: { get: () => null } }), base: '', token: async () => 'AT', timeout: 0, timer: tm });
  T('timeout = 0：不设超时', (await off.get('/api/me')).ok === true && tm.n === 0) }

console.log(`\nnbq_net: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
