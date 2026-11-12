// #27 第 4 步：后台球友详情与处理（GET /users/detail · POST /users/status · /users/reset · /users/gender · /users/phone）。
// 覆盖：权限（只读 / 运营 / owner；封禁只有 owner）· 必须填理由 · 城市范围（限悉尼的运营查不到、改不了墨尔本的人）·
//       写进库且重读还在 · 状态日志和操作日志留痕 · 暂停天数和原因代码校验 · 状态没变 → 409 · 不泄露完整手机号 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_user_ops'), { T, call, as, user, one } = K;
try {
  const A = await user('小A'), B = await user('小B', { gender: 'f' }), S = await user('悉尼人', { city: 'syd' });
  const det = async (no, ck = as.operator) => call('GET', '/admin/api/users/detail?no=' + no, { cookie: ck });
  await K.guards('GET', '/admin/api/users/detail?no=' + A.no);
  await K.guards('POST', '/admin/api/users/status', { no: A.no, status: 'review', reason: '核对资料' });

  // ---- 详情 ----
  let r = await det(A.no);
  T('详情：运营能看，带状态、性别、计数、手机后四位', r.s === 200 && r.j.user.member_no === A.no && r.j.user.status === 'active' && /\d{4}$/.test(r.j.user.phone_tail) && r.j.user.hosted === 0 && Array.isArray(r.j.log), r.j);
  T('详情：不含完整手机号和内部 id', !/\+6142/.test(r.text) && !r.text.includes(A.id), r.text.slice(0, 300));
  r = await det(A.no, as.viewer); T('详情：只读角色 → 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await det(999999); T('详情：不存在的编号 → 404', r.s === 404 && r.j.error === 'not_found', r);
  r = await det(A.no, as.syd); T('详情：限悉尼的运营查墨尔本的人 → 404（当作不存在）', r.s === 404, r);
  r = await det(S.no, as.syd); T('详情：限悉尼的运营能看悉尼的人', r.s === 200 && r.j.user.city === 'syd', r);
  for (const qs of ['', 'no=abc', 'no=-1', 'no=1;drop']) { r = await call('GET', '/admin/api/users/detail?' + qs, { cookie: as.operator }); T('详情参数不合法 ' + qs + ' → 422', r.s === 422, r) }

  // ---- 改状态 ----
  const st = (body, ck = as.operator) => call('POST', '/admin/api/users/status', { body, cookie: ck });
  r = await st({ no: A.no, status: 'suspended', reason_code: 'harass', reason: '' }); T('暂停不填理由 → 422 admin_reason_required', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await st({ no: A.no, status: 'suspended', reason_code: 'harass', reason: '多次骚扰', days: 5 }); T('暂停天数不在 1/3/7/30/90/180 → 422', r.s === 422, r);
  r = await st({ no: A.no, status: 'suspended', reason_code: 'nope', reason: '多次骚扰', days: 7 }); T('原因代码不认识 → 422', r.s === 422, r);
  r = await st({ no: A.no, status: 'suspended', reason_code: 'harass', reason: '举报核实：多次骚扰', days: 7 }); T('运营暂停 7 天 → 200', r.s === 200 && r.j.ok, r);
  r = await det(A.no);
  T('重读：状态是暂停、到期时间约 7 天后、原因代码 harass', r.j.user.status === 'suspended' && r.j.user.status_reason === 'harass' && Math.abs(new Date(r.j.user.status_until) - Date.now() - 7 * 864e5) < 36e5, r.j.user);
  T('重读：状态日志第一条是这次（谁做的、几天、备注是理由）', r.j.log[0]?.to_status === 'suspended' && r.j.log[0].duration_days === 7 && r.j.log[0].by_name === 'ops' && r.j.log[0].note === '举报核实：多次骚扰', r.j.log[0]);
  T('操作日志：记了 user.status、目标、理由', !!(await one(`select 1 from admin_audit_log where action='user.status' and target=$1 and detail->>'reason'='举报核实：多次骚扰' and detail->>'to'='suspended'`, [A.id])));
  T('球友收到 account_status 通知', !!(await one(`select 1 from notifications where user_id=$1 and kind='account_status'`, [A.id])));
  r = await st({ no: A.no, status: 'suspended', reason_code: 'harass', reason: '再来一次吧', days: 7 }); T('状态没变 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await st({ no: A.no, status: 'banned', reason_code: 'harass', reason: '情节严重封禁' }); T('运营封禁 → 403（只有 owner）', r.s === 403 && r.j.error === 'admin_forbidden', r);
  T('被拒的封禁没有改库', (await one(`select status from users where id=$1`, [A.id])).status === 'suspended');
  r = await st({ no: A.no, status: 'banned', reason_code: 'harass', reason: '情节严重封禁' }, as.owner); T('owner 封禁 → 200', r.s === 200, r);
  r = await st({ no: A.no, status: 'active', reason: '申诉通过恢复' }); T('运营恢复已封禁的 → 403（只有 owner）', r.s === 403, r);
  r = await st({ no: A.no, status: 'active', reason: '申诉通过恢复' }, as.owner); T('owner 恢复正常 → 200，重读是正常', r.s === 200 && (await det(A.no)).j.user.status === 'active', r);
  r = await st({ no: A.no, status: 'review', reason: '核对资料' }, as.syd); T('限悉尼的运营改墨尔本的人 → 404，没改库', r.s === 404 && (await one(`select status from users where id=$1`, [A.id])).status === 'active', r);
  r = await st({ no: A.no, status: 'review', reason: '核对资料' }, as.viewer); T('只读角色改状态 → 403', r.s === 403, r);
  for (const b of [{ no: '1', status: 'review', reason: 'abcd' }, { no: A.no, status: 'deleted', reason: 'abcd' }, { no: A.no, status: 'review', reason: 'x'.repeat(201) }, { no: A.no, status: 'review', reason: 'abcd', days: 1.5 }])
    { r = await st(b); T('改状态参数不合法 → 422 ' + JSON.stringify(b).slice(0, 60), r.s === 422, r) }

  // ---- 重置昵称 / 头像 ----
  r = await call('POST', '/admin/api/users/reset', { body: { no: B.no, what: 'nickname', reason: '' }, cookie: as.operator }); T('重置昵称不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await call('POST', '/admin/api/users/reset', { body: { no: B.no, what: 'nickname', reason: '昵称含广告' }, cookie: as.operator });
  T('重置昵称 → 200，重读昵称是「球友+编号」', r.s === 200 && (await det(B.no)).j.user.nickname === '球友' + B.no, r);
  await K.q(`update users set avatar_kind='animal', avatar_animal='cat' where id=$1`, [B.id]);
  r = await call('POST', '/admin/api/users/reset', { body: { no: B.no, what: 'avatar', reason: '头像不合适' }, cookie: as.operator });
  T('重置头像 → 200，重读是字母头像', r.s === 200 && (await det(B.no)).j.user.avatar_kind === 'letter', r);
  r = await call('POST', '/admin/api/users/reset', { body: { no: B.no, what: 'phone', reason: '头像不合适' }, cookie: as.operator }); T('重置未知项 → 422', r.s === 422, r);

  // ---- 性别 ----
  await K.q(`update users set gender_m2f_at=now() where id=$1`, [B.id]);
  r = await call('POST', '/admin/api/users/gender', { body: { no: B.no, action: 'unlock', reason: '核实后解除' }, cookie: as.operator });
  T('解除男改女限制 → 200，重读 m2f_used=false', r.s === 200 && (await det(B.no)).j.user.m2f_used === false, r);
  r = await call('POST', '/admin/api/users/gender', { body: { no: B.no, action: 'clear', reason: '冒用女生身份' }, cookie: as.operator });
  T('清除性别 → 200，重读 gender 为空', r.s === 200 && (await det(B.no)).j.user.gender === null, r);
  r = await call('POST', '/admin/api/users/gender', { body: { no: B.no, action: 'flip', reason: '冒用女生身份' }, cookie: as.operator }); T('性别未知操作 → 422', r.s === 422, r);

  // ---- 完整手机号 ----
  r = await call('POST', '/admin/api/users/phone', { body: { no: B.no, reason: '警方协查' }, cookie: as.operator }); T('运营看完整手机号 → 403', r.s === 403, r);
  r = await call('POST', '/admin/api/users/phone', { body: { no: B.no, reason: '' }, cookie: as.owner }); T('owner 不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await call('POST', '/admin/api/users/phone', { body: { no: B.no, reason: '警方协查' }, cookie: as.owner });
  T('owner 填理由 → 完整号码，响应不缓存', r.s === 200 && /^\+6142\d{7}$/.test(r.j.phone) && /no-store/.test(r.h.get('Cache-Control')), r);
  T('操作日志：记了 phone.reveal 和理由', !!(await one(`select 1 from admin_audit_log where action='phone.reveal' and target=$1 and detail->>'reason'='警方协查'`, [B.id])));
  await K.done();
} catch (e) { await K.done(e) }
