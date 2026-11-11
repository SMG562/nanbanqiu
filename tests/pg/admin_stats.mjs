// #27 第 4 步：后台统计批量接口 GET /admin/api/stats（概览和各统计页共用）。
// 覆盖：白名单里每一个查询在真库上都能跑（运营全部成功，不是 failed）· 数字是数字 · 不含内部 uuid · 只读角色拿不到带昵称 / 内容的 ·
//       一个查询失败不影响同一批的其他 · 城市范围 · 时间范围和参数校验 · 有数据时数字对得上。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_stats'), { T, call, as, user, one, q } = K;
try {
  const API = await import(new URL('../../server/admin/api.mjs', import.meta.url));
  const A = await user('统计甲'), B = await user('统计乙');
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,city) values ('Stat Court','Stat','Brighton','3186','POINT(145 -37.9)','{hard}','active','melb') returning id`)).id;
  const G = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,status,visibility) values ('S0001',$1,$2,now()-interval '2 days',90,'singles',2,3,6,'open','public') returning id`, [A.id, V])).id;
  await q(`insert into game_participants(game_id,user_id,role,status,decided_at) values ($1,$2,'player','approved',now()-interval '3 days')`, [G, B.id]);
  await q(`insert into daily_metrics(day,metric,dims,value,additive) values (current_date - 1,'new_users','{}',3,true),(current_date - 2,'new_users','{}',2,true),(current_date - 1,'dau','{}',7,false)`);
  const all = API.STAT_NAMES;
  const RANGE = `&from=${new Date(Date.now() - 30 * 864e5).toISOString()}&to=${new Date(Date.now() + 864e5).toISOString()}`;   // 夹具时钟在 2027 年，数据按真实时间写：显式给范围
  const get = (fns, ck = as.operator, extra = RANGE) => call('GET', '/admin/api/stats?fns=' + fns.join(',') + extra, { cookie: ck });
  await K.guards('GET', '/admin/api/stats?fns=fill_rate');

  // 每批最多 12 个：分批把白名单全跑一遍
  const data = {}; for (let i = 0; i < all.length; i += 12) { const r = await get(all.slice(i, i + 12)); T(`批 ${i / 12 + 1}：200`, r.s === 200, r); Object.assign(data, r.j?.data || {}) }
  const bad = all.filter(f => !Array.isArray(data[f]));
  T(`运营：白名单 ${all.length} 个查询在真库上全部成功`, !bad.length, bad.map(f => [f, data[f]]));
  T('数字是数字（bigint / numeric 转好了）', typeof data.active_users?.[0]?.users === 'number' && typeof data.fill_rate?.[0]?.started === 'number', [data.active_users, data.fill_rate]);
  T('不含任何内部 uuid', !JSON.stringify(data).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/), JSON.stringify(data).match(/[0-9a-f]{8}-[0-9a-f-]{27}/));
  T('有数据时对得上：每日序列里有昨天的 new_users=3、dau=7', data.series.some(x => x.metric === 'new_users' && x.value === 3) && data.series.some(x => x.metric === 'dau' && x.value === 7), data.series);
  T('有数据时对得上：最活跃的球场是 Stat，1 局', data.venue_activity[0]?.short_name === 'Stat' && data.venue_activity[0].games === 1, data.venue_activity);
  T('有数据时对得上：最活跃球友里有发起人（带编号昵称）', data.user_activity.some(x => x.member_no === A.no && x.nickname === '统计甲'), data.user_activity);

  let r = await get(['user_activity', 'sb_top_posts', 'series', 'fill_rate'], as.viewer);
  T('只读：带昵称 / 内容的两个 → admin_forbidden，其余照常', r.s === 200 && r.j.data.user_activity.error === 'admin_forbidden' && r.j.data.sb_top_posts.error === 'admin_forbidden' && Array.isArray(r.j.data.series), r.j);
  const vbad = []; for (let i = 0; i < all.length; i += 12) { const x = await get(all.slice(i, i + 12), as.viewer); for (const [k, v] of Object.entries(x.j.data)) if (!Array.isArray(v) && v.error !== 'admin_forbidden') vbad.push([k, v]) }
  T('只读：读不到的表报 admin_forbidden（不是 failed），一个失败不影响同批其他', !vbad.length, vbad);
  r = await get(['sb_kpis'], as.syd); T('限悉尼：不传城市 = 悉尼', r.s === 200 && r.j.city === 'syd', r.j);
  r = await get(['sb_kpis'], as.syd, RANGE + '&city=melb'); T('限悉尼：要看墨尔本 → 403', r.s === 403, r);
  r = await get(['fill_rate'], as.operator, '&from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z'); T('自定时间范围：回显 from / to', r.s === 200 && r.j.from === '2026-01-01T00:00:00.000Z', r.j);
  for (const qs of ['fns=', 'fns=nope', 'fns=fill_rate&from=abc', 'fns=fill_rate&from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z', 'fns=fill_rate&from=2024-01-01T00:00:00Z&to=2026-01-01T00:00:00Z', 'fns=fill_rate&city=MELB', 'fns=' + all.slice(0, 13).join(',')])
    { r = await call('GET', '/admin/api/stats?' + qs, { cookie: as.operator }); T('参数不合法 → 422 ' + qs.slice(0, 70), r.s === 422, r) }
  // ---- 导出 ----
  const ex = (body, ck = as.operator) => call('POST', '/admin/api/export', { body: { from: new Date(Date.now() - 30 * 864e5).toISOString(), to: new Date(Date.now() + 864e5).toISOString(), ...body }, cookie: ck });
  r = await ex({ dataset: 'user_activity', with_ids: false });
  T('运营导出（不带 ID）：有行，但没有编号、昵称', r.s === 200 && r.j.rows.length > 0 && r.j.rows.every(x => !('member_no' in x) && !('nickname' in x)) && 'score' in r.j.rows[0], r.j);
  T('导出留痕：data.export + 数据集', !!(await one(`select 1 from admin_audit_log where action='data.export' and target='user_activity'`)));
  r = await ex({ dataset: 'user_activity', with_ids: true, reason: '核对活跃名单' }); T('运营导出带 ID → 403', r.s === 403, r);
  r = await ex({ dataset: 'user_activity', with_ids: true }, as.owner); T('owner 带 ID 不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await ex({ dataset: 'user_activity', with_ids: true, reason: '核对活跃名单' }, as.owner); T('owner 带 ID + 理由 → 有编号和昵称', r.s === 200 && r.j.rows.some(x => x.nickname === '统计甲'), r.j);
  r = await ex({ dataset: 'fill_rate', with_ids: false }, as.viewer); T('只读导出 → 403', r.s === 403, r);
  r = await ex({ dataset: 'fill_rate', with_ids: false }, as.syd); T('限城市的运营导出 → 403（导出是全站数据）', r.s === 403, r);
  for (const b of [{ dataset: 'nope', with_ids: false }, { dataset: 'fill_rate' }, { dataset: 'fill_rate', with_ids: false, from: 'x' }]) { r = await ex(b); T('导出参数不合法 → 422 ' + JSON.stringify(b).slice(0, 50), r.s === 422, r) }
  r = await get(['event_defs']); T('事件定义：有上百条，带类别和说明', r.j.data.event_defs.length > 50 && r.j.data.event_defs[0].category && r.j.data.event_defs[0].description, r.j.data.event_defs?.length);
  await K.done();
} catch (e) { await K.done(e) }
