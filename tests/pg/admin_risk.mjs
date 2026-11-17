// #27 第 4 步：后台风险提醒与规则（GET /risk · POST /risk/handle · GET /rules · POST /rules/set）。
// 覆盖：权限（只读 403；运营能处理提醒但不能改规则；owner 改规则必须填理由）· 城市范围 · 处理后重读 · 操作日志记改前改后 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_risk'), { T, call, as, user, one, q } = K;
try {
  const A = await user('风险甲'), B = await user('风险乙'), S = await user('悉尼风险', { city: 'syd' });
  const alert = async (u, rule, score, st = 'open') => (await one(`insert into risk_alerts(user_id,rule_code,value,score,window_from,window_to,status,suggested,detail) values ($1,$2,2,$3,now()-interval '30 days',now(),$4,'review','{"games":["x"]}') returning id::text`, [u, rule, score, st])).id;
  const a1 = await alert(A.id, 'no_show', 50), a2 = await alert(B.id, 'reported', 60), a3 = await alert(S.id, 'no_show', 25), a4 = await alert(B.id, 'blocked_by', 15, 'handled');
  await K.guards('GET', '/admin/api/risk'); await K.guards('POST', '/admin/api/risk/handle', { id: +a1, status: 'handled' });

  let r = await call('GET', '/admin/api/risk', { cookie: as.operator });
  T('列表：运营看到全部待处理（按分数从高到低），带规则名、编号、昵称', r.s === 200 && r.j.alerts.length === 3 && r.j.alerts[0].id === a2 && r.j.alerts[0].rule_name && r.j.alerts[0].member_no === B.no && r.j.alerts[0].has_detail === true, r.j);
  T('列表：计数 open=3，不含内部 user_id', r.j.counts.open === 3 && !r.text.includes(A.id), r.j.counts);
  r = await call('GET', '/admin/api/risk?view=done', { cookie: as.operator }); T('已处理：只有 handled / ignored', r.j.alerts.length === 1 && r.j.alerts[0].id === a4, r.j);
  r = await call('GET', '/admin/api/risk', { cookie: as.syd }); T('限悉尼的运营：只看到悉尼的人的提醒，计数也只算悉尼', r.j.alerts.length === 1 && r.j.alerts[0].id === a3 && r.j.counts.open === 1, r.j);
  r = await call('GET', '/admin/api/risk', { cookie: as.viewer }); T('只读 → 403', r.s === 403, r);
  r = await call('GET', '/admin/api/risk?view=all', { cookie: as.operator }); T('view 不认识 → 422', r.s === 422, r);

  const h = (body, ck = as.operator) => call('POST', '/admin/api/risk/handle', { body, cookie: ck });
  r = await h({ id: +a1, status: 'watching', watch_days: 14, note: '先观察两周' });
  T('观察 14 天 → 200，重读在「观察中」、到期约 14 天后', r.s === 200 && await (async () => { const x = (await call('GET', '/admin/api/risk?view=watching', { cookie: as.operator })).j.alerts[0]; return x?.id === a1 && x.note === '先观察两周' && Math.abs(new Date(x.watch_until) - Date.now() - 14 * 864e5) < 36e5 && x.reviewed_by_name === 'ops' })(), r);
  T('操作日志：risk.handle 记了状态', !!(await one(`select 1 from admin_audit_log where action='risk.handle' and target=$1 and detail->>'status'='watching'`, [a1])));
  r = await h({ id: +a2, status: 'handled' }); T('处理 → 200，重读在「已处理」', r.s === 200 && (await call('GET', '/admin/api/risk?view=done', { cookie: as.operator })).j.alerts.some(x => x.id === a2), r);
  r = await h({ id: +a2, status: 'handled' }); T('重复处理 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await h({ id: +a2, status: 'open' }); T('重新打开 → 200', r.s === 200 && (await one(`select status from risk_alerts where id=$1`, [a2])).status === 'open', r);
  r = await h({ id: +a3, status: 'ignored' }); T('不限城市的运营可以处理悉尼的提醒', r.s === 200, r);
  r = await h({ id: +a1, status: 'handled' }, as.syd); T('限悉尼的运营处理墨尔本的提醒 → 404，没改库', r.s === 404 && (await one(`select status from risk_alerts where id=$1`, [a1])).status === 'watching', r);
  r = await h({ id: 99999999, status: 'handled' }); T('不存在 → 404', r.s === 404, r);
  for (const b of [{ id: 'x', status: 'handled' }, { id: +a1, status: 'deleted' }, { id: +a1, status: 'watching', watch_days: 5 }, { id: +a1, status: 'handled', note: 'x'.repeat(201) }])
    { r = await h(b); T('处理参数不合法 → 422 ' + JSON.stringify(b).slice(0, 60), r.s === 422, r) }

  r = await call('GET', '/admin/api/rules', { cookie: as.operator });
  T('规则：风险规则和频率规则都有', r.s === 200 && r.j.risk.some(x => x.code === 'no_show' && x.weight === 25) && r.j.rate.some(x => x.rule === 'game_day' && x.max_hits === 5 && x.win_s === 86400), r.j);
  const set = (body, ck = as.owner) => call('POST', '/admin/api/rules/set', { body, cookie: ck });
  r = await set({ kind: 'risk', rule: 'no_show', patch: { weight: 30 }, reason: '上线首月调权重' }, as.operator); T('运营改规则 → 403', r.s === 403, r);
  r = await set({ kind: 'risk', rule: 'no_show', patch: { weight: 30 }, reason: '' }); T('owner 不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await set({ kind: 'risk', rule: 'no_show', patch: { weight: 30, threshold: 3 }, reason: '上线首月调权重' });
  T('owner 改风险规则 → 重读是新值', r.s === 200 && (await call('GET', '/admin/api/rules', { cookie: as.owner })).j.risk.find(x => x.code === 'no_show').weight === 30, r);
  T('操作日志记了改前（weight 25）和改动', !!(await one(`select 1 from admin_audit_log where action='rules.edit' and target='risk:no_show' and detail->'before'->>'weight'='25' and detail->'patch'->>'weight'='30'`)));
  r = await set({ kind: 'rate', rule: 'game_day', patch: { max_hits: 8, win_s: 3600 * 12 }, reason: '周末活动放宽' });
  T('owner 改频率规则（次数 + 时间窗）→ 重读是新值', r.s === 200 && await (async () => { const x = (await call('GET', '/admin/api/rules', { cookie: as.owner })).j.rate.find(y => y.rule === 'game_day'); return x.max_hits === 8 && x.win_s === 43200 })(), r);
  r = await set({ kind: 'risk', rule: 'nope', patch: { weight: 1 }, reason: '不存在的规则' }); T('不存在的规则 → 404', r.s === 404, r);
  for (const b of [{ kind: 'x', rule: 'no_show', patch: { weight: 1 } }, { kind: 'risk', rule: 'no_show', patch: {} }, { kind: 'risk', rule: 'no_show', patch: { weight: -1 } }, { kind: 'risk', rule: 'no_show', patch: { score: 1 } },
    { kind: 'rate', rule: 'game_day', patch: { max_hits: 0 } }, { kind: 'rate', rule: 'game_day', patch: { win_s: '1 day' } }, { kind: 'risk', rule: 'no_show', patch: { enabled: 'no' } }])
    { r = await set({ ...b, reason: '参数校验用例' }); T('改规则参数不合法 → 422 ' + JSON.stringify(b).slice(0, 70), r.s === 422, r) }
  T('被拒的改动没有改库', (await one(`select weight from risk_rules where code='no_show'`)).weight === 30 && (await one(`select max_hits from rate_rules where rule='game_day'`)).max_hits === 8);
  await q('select 1'); await K.done();
} catch (e) { await K.done(e) }
