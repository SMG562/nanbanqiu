// #27 第 4 步：后台城市接口（GET /cities · POST /cities/status · /cities/set · /cities/waitlist · /cities/waitlist/done）。
// 库函数的规则（检查清单、退回、试运行时间）在 pg/cities_admin 里测；这里测接口层：权限、理由、城市范围、检查清单的错误码、名单导出留痕、输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_cities_api'), { T, call, as, one, q } = K;
try {
  await q(`insert into area_demand(kind, city, email) values ('city_waitlist','melb','a@x.com'),('city_waitlist','melb','b@x.com'),('city_waitlist','syd','s@x.com')`);
  await K.guards('GET', '/admin/api/cities'); await K.guards('POST', '/admin/api/cities/status', { city: 'syd', status: 'prep', reason: '准备悉尼' });
  let r = await call('GET', '/admin/api/cities', { cookie: as.operator });
  const melb = () => r.j.cities.find(c => c.key === 'melb');
  T('一览：运营看得到全部 6 个城市，墨尔本是开放、等候 2 人、带检查清单和话题', r.s === 200 && r.j.cities.length === 6 && melb().status === 'on' && melb().waitlist_pending === 2 && Array.isArray(melb().checklist) && melb().hashtag === '墨尔本网球', r.j);
  r = await call('GET', '/admin/api/cities', { cookie: as.viewer }); T('一览：只读也能看（只有汇总数字）', r.s === 200 && r.j.cities.length === 6, r);
  r = await call('GET', '/admin/api/cities', { cookie: as.syd }); T('一览：限悉尼的运营只看到悉尼', r.s === 200 && r.j.cities.length === 1 && r.j.cities[0].key === 'syd', r.j);

  const st = (body, ck = as.owner) => call('POST', '/admin/api/cities/status', { body, cookie: ck });
  r = await st({ city: 'syd', status: 'prep', reason: '准备悉尼' }, as.operator); T('运营改城市状态 → 403', r.s === 403, r);
  r = await st({ city: 'syd', status: 'prep', reason: '' }); T('owner 不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await st({ city: 'syd', status: 'prep', reason: '准备悉尼' }); T('owner 改成准备中 → 200，重读是 prep', r.s === 200 && (await call('GET', '/admin/api/cities', { cookie: as.owner })).j.cities.find(c => c.key === 'syd').status === 'prep', r);
  r = await st({ city: 'syd', status: 'beta', reason: '直接试运行' }); T('清单没过就试运行 → 409 admin_city_not_ready', r.s === 409 && r.j.error === 'admin_city_not_ready', r);
  r = await st({ city: 'zzz', status: 'prep', reason: '不存在的城市' }); T('不存在的城市 → 404', r.s === 404, r);
  r = await st({ city: 'syd', status: 'open', reason: '状态不认识' }); T('状态不认识 → 422', r.s === 422, r);

  const set = (body, ck = as.owner) => call('POST', '/admin/api/cities/set', { body, cookie: ck });
  r = await set({ city: 'syd', patch: { community_url: 'https://example.com/syd', center_label: 'Sydney CBD' }, reason: '补社群链接' });
  T('改资料 → 200，重读是新值', r.s === 200 && await (async () => { const c = (await call('GET', '/admin/api/cities', { cookie: as.owner })).j.cities.find(x => x.key === 'syd'); return c.community_url === 'https://example.com/syd' && c.center_label === 'Sydney CBD' })(), r);
  r = await set({ city: 'syd', patch: { community_url: 'javascript:alert(1)' }, reason: '坏链接测试' }); T('社群链接不是 https → 422（库函数挡）', r.s === 422, r);
  for (const b of [{ city: 'syd', patch: { tz: 'UTC' } }, { city: 'syd', patch: {} }, { city: 'syd', patch: { hashtag: 1 } }, { city: 'SYD', patch: { hashtag: 'x' } }])
    { r = await set({ ...b, reason: '参数校验用例' }); T('改资料参数不合法 → 422 ' + JSON.stringify(b).slice(0, 60), r.s === 422, r) }

  const wl = (city, ck = as.owner, reason = '开放通知') => call('POST', '/admin/api/cities/waitlist', { body: { city, reason }, cookie: ck });
  r = await wl('melb', as.operator); T('运营导出名单 → 403', r.s === 403, r);
  r = await wl('melb', as.owner, ''); T('owner 不填理由 → 422', r.s === 422, r);
  r = await wl('melb'); T('导出墨尔本名单：2 个邮箱，响应不缓存', r.s === 200 && r.j.emails.map(x => x.email).sort().join() === 'a@x.com,b@x.com' && /no-store/.test(r.h.get('Cache-Control')), r);
  T('导出留痕：city.waitlist + 理由', !!(await one(`select 1 from admin_audit_log where action='city.waitlist' and target='melb' and detail->>'reason'='开放通知'`)));
  r = await wl('syd'); T('还没开放的城市导出 → 409', r.s === 409 && r.j.error === 'admin_city_not_ready', r);
  r = await call('POST', '/admin/api/cities/waitlist/done', { body: { city: 'melb', reason: '已群发邮件' }, cookie: as.owner });
  T('标记已通知 → 2 个；之后再导出是空的', r.s === 200 && r.j.marked === 2 && (await wl('melb')).j.emails.length === 0, r);
  await K.done();
} catch (e) { await K.done(e) }
