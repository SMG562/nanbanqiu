// #27 第 5 步：后台球局取消 / 隐藏（POST /admin/api/games/cancel · /hide）。真 PostgreSQL + 线上同一个角色。
// 覆盖：权限（未登录 / 只读）· 理由必填 · 取消（通知发起人和球友、待确认申请结束、审计）· 状态不符 409 · 隐藏后公开列表看不到 / 恢复 ·
//       只恢复后台隐藏过的 · 限城市的运营不能动别的城市 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_games_write'), { T, call, q, one } = K;
try {
  const op = K.as.operator, vw = K.as.viewer, sy = K.as.syd;
  const user = async (nick, city = 'melb') => (await K.user(nick, { city })).id;
  const A = await user('小A'), B = await user('小B'), C = await user('小C');
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source,city) values ('Glen Court','Glen','Brighton','3186','POINT(145 -37.9)'::geography,'{hard}','active','admin','melb') returning id`)).id;
  const VS = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source,city) values ('Syd Court','Syd','Brighton','3186','POINT(145 -37.9)'::geography,'{hard}','active','admin','syd') returning id`)).id;   // 球局城市 = 球场城市
  let n = 0;
  const mk = async (host, hours, o = {}) => { const code = 'W' + String(++n).padStart(4, '0');
    const id = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,status,visibility,city) values ($1,$2,$3,now()+($4||' hours')::interval,90,'doubles',4,3,6,$5::game_status,$6,$7) returning id`, [code, host, o.city === 'syd' ? VS : V, String(hours), o.status ?? 'open', o.vis ?? 'public', o.city ?? 'melb'])).id; return { id, code } };
  const join = (g, u, st) => q(`insert into game_participants(game_id,user_id,role,status,decided_at) values ($1,$2,'player',$3::part_status,case when $3::text='approved' then now() end)`, [g, u, st]);
  const G1 = await mk(A, 5); await join(G1.id, B, 'approved'); await join(G1.id, C, 'pending');
  const POST = (p, body, cookie = op) => call('POST', '/admin/api/games/' + p, { body, cookie });

  let r = await call('POST', '/admin/api/games/cancel', { body: { code: G1.code, reason: '发起人要求取消' } }); T('未登录 → 401', r.s === 401, r);
  r = await POST('cancel', { code: G1.code, reason: '发起人要求取消' }, vw); T('只读角色取消 → 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await POST('hide', { code: G1.code, hide: true, reason: '内容违规' }, vw); T('只读角色隐藏 → 403', r.s === 403, r);
  r = await POST('cancel', { code: G1.code, reason: '短' }); T('理由太短 → 422（库里拒绝）', r.s === 422 || r.s === 400, r);
  r = await POST('cancel', { code: "x';--", reason: '发起人要求取消' }); T('分享码格式不对 → 422', r.s === 422, r);
  r = await POST('cancel', { code: 'NOPE99', reason: '发起人要求取消' }); T('找不到 → 404', r.s === 404, r);
  T('被拒绝的请求没改任何东西', (await one(`select status::text s from games where id=$1`, [G1.id])).s === 'open');

  // 隐藏 / 恢复
  r = await POST('hide', { code: G1.code, hide: true, reason: '内容违规，先下架' }); T('隐藏 → 200', r.s === 200, r);
  let g = await one(`select visibility, admin_hidden_at is not null h from games where id=$1`, [G1.id]); T('隐藏后：visibility=private 且记了后台隐藏', g.visibility === 'private' && g.h, g);
  r = await call('GET', '/admin/api/games', { cookie: op }); T('后台列表仍看得到并标 admin_hidden', r.j.games.find(x => x.share_code === G1.code)?.admin_hidden === true, r.j.games?.[0]);
  r = await POST('hide', { code: G1.code, hide: true, reason: '内容违规，先下架' }); T('已隐藏再隐藏 → 409', r.s === 409, r);
  r = await POST('hide', { code: G1.code, hide: false, reason: '核实无问题' }); T('恢复公开 → 200', r.s === 200, r);
  g = await one(`select visibility, admin_hidden_at is null h from games where id=$1`, [G1.id]); T('恢复后：public 且清了标记', g.visibility === 'public' && g.h, g);
  r = await POST('hide', { code: G1.code, hide: false, reason: '核实无问题' }); T('没被后台隐藏过的不能「恢复」→ 409', r.s === 409, r);
  const P = await mk(A, 6, { vis: 'private' });
  r = await POST('hide', { code: P.code, hide: false, reason: '核实无问题' }); T('用户自己设成私人的球局不能被「恢复」成公开 → 409', r.s === 409, r);
  r = await POST('hide', { code: P.code, hide: true, reason: '内容违规，先下架' }); T('已是私人的球局不用隐藏 → 409', r.s === 409, r);

  // 限城市
  const S = await mk(B, 7, { city: 'syd' });
  r = await POST('cancel', { code: G1.code, reason: '悉尼运营越权' }, sy); T('限悉尼的运营取消墨尔本球局 → 403', r.s === 403, r);
  r = await POST('hide', { code: G1.code, hide: true, reason: '悉尼运营越权' }, sy); T('限悉尼的运营隐藏墨尔本球局 → 403', r.s === 403, r);
  T('越权请求没改任何东西', (await one(`select status::text s, visibility v from games where id=$1`, [G1.id])).v === 'public');
  r = await POST('cancel', { code: S.code, reason: '发起人要求取消' }, sy); T('限悉尼的运营取消悉尼球局 → 200', r.s === 200, r);

  // 取消
  const before = (await one(`select count(*)::int n from admin_audit_log where action='game.cancel'`)).n;
  r = await POST('cancel', { code: G1.code, reason: '发起人要求取消' }); T('取消 → 200', r.s === 200, r);
  g = await one(`select status::text s, cancelled_at is not null c from games where id=$1`, [G1.id]); T('状态 cancelled 且有取消时间', g.s === 'cancelled' && g.c, g);
  T('待确认的申请被结束', (await one(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [G1.id, C])).s === 'rejected');
  const ns = (await q(`select user_id from notifications where game_id=$1 and kind='game_cancelled'`, [G1.id])).rows.map(x => x.user_id);
  T('通知了发起人、已确认和待确认的球友', [A, B, C].every(u => ns.includes(u)) && ns.length === 3, ns.length);
  T('审计多一行 game.cancel，带理由', (await one(`select count(*)::int n from admin_audit_log where action='game.cancel' and target=$1 and detail->>'reason'='发起人要求取消'`, ['game:' + G1.code])).n === 1 && (await one(`select count(*)::int n from admin_audit_log where action='game.cancel'`)).n === before + 1);
  r = await POST('cancel', { code: G1.code, reason: '发起人要求取消' }); T('重复取消 → 409', r.s === 409, r);
  const Pa = await mk(A, -3); r = await POST('cancel', { code: Pa.code, reason: '发起人要求取消' }); T('已开打的球局不能取消 → 409', r.s === 409, r);
  const Cp = await mk(A, -30, { status: 'completed' }); r = await POST('cancel', { code: Cp.code, reason: '发起人要求取消' }); T('已结束的球局不能取消 → 409', r.s === 409, r);
  await K.done();
} catch (e) { await K.done(e) }
