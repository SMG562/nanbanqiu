// #27 第 4 步：后台管理员管理与操作日志（GET /admins · POST /admins/update · POST /admins/cities · GET /audit）。
// 覆盖：只有 owner 能管理管理员 · 不泄露密码哈希 / 两步验证密钥 / 恢复码 · 至少留一位 owner、不能停用自己 · 停用后会话立即失效 ·
//       城市范围（owner 不能限城市、城市必须存在）· 日志：运营能看、只读不能看、按类别 / 精确动作筛、翻页 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_admins'), { T, call, as, ids, one } = K;
try {
  await K.guards('GET', '/admin/api/admins'); await K.guards('GET', '/admin/api/audit');
  let r = await call('GET', '/admin/api/admins', { cookie: as.owner });
  T('名单：owner 能看，4 位，owner 排第一，带城市和健康状况', r.s === 200 && r.j.admins.length === 4 && r.j.admins[0].role === 'owner' && r.j.admins.find(x => x.id === ids.syd).cities[0] === 'syd' && r.j.health.owners === 1 && r.j.me === ids.owner && r.j.cities.some(c => c.key === 'melb'), r.j);
  T('名单：不含密码哈希、两步验证密钥、恢复码', !/password_hash|totp_secret|recovery_hashes|scrypt/i.test(r.text), r.text.slice(0, 200));
  for (const k of ['operator', 'viewer']) { r = await call('GET', '/admin/api/admins', { cookie: as[k] }); T(`名单：${k} → 403`, r.s === 403, r) }

  const up = (body, ck = as.owner) => call('POST', '/admin/api/admins/update', { body, cookie: ck });
  r = await up({ id: ids.viewer, role: 'operator', reason: '' }); T('改角色不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  r = await up({ id: ids.viewer, role: 'operator', reason: '升为运营' }); T('只读升为运营 → 200，重读是运营', r.s === 200 && (await call('GET', '/admin/api/admins', { cookie: as.owner })).j.admins.find(x => x.id === ids.viewer).role === 'operator', r);
  r = await call('GET', '/admin/api/reports', { cookie: as.viewer }); T('升级后同一个会话立刻有运营权限', r.s === 200, r);
  r = await up({ id: ids.owner, role: 'operator', reason: '把自己降成运营' }); T('唯一的 owner 降级 → 409 admin_last_owner', r.s === 409 && r.j.error === 'admin_last_owner', r);
  r = await up({ id: ids.owner, disable: true, reason: '想停用我自己' }); T('停用自己 → 409', r.s === 409, r);
  r = await up({ id: ids.operator, disable: true, reason: '离职停用' }); T('停用运营 → 200', r.s === 200, r);
  r = await call('GET', '/admin/api/me', { cookie: as.operator }); T('被停用的人：会话立刻失效（401）', r.s === 401, r);
  r = await call('GET', '/admin/api/admins', { cookie: as.owner });
  T('重读：停用的排最后，带停用理由', r.j.admins.at(-1).id === ids.operator && r.j.admins.at(-1).disabled && r.j.admins.at(-1).disabled_reason === '离职停用', r.j.admins.at(-1));
  r = await up({ id: ids.operator, disable: false, reason: '回来了恢复' }); T('恢复 → 200，不再停用', r.s === 200 && !(await one(`select disabled from admin_users where id=$1`, [ids.operator])).disabled, r);
  r = await up({ id: ids.viewer, role: 'viewer', reason: '降回只读' }, as.syd); T('运营管理管理员 → 403', r.s === 403, r);
  for (const b of [{ id: 'x', role: 'viewer', reason: 'abcd' }, { id: ids.viewer, role: 'god', reason: 'abcd' }, { id: ids.viewer, reason: 'abcd' }, { id: ids.viewer, disable: 'yes', reason: 'abcd' }])
    { r = await up(b); T('改管理员参数不合法 → 422 ' + JSON.stringify(b).slice(0, 70), r.s === 422, r) }

  const cy = (body, ck = as.owner) => call('POST', '/admin/api/admins/cities', { body, cookie: ck });
  r = await cy({ id: ids.syd, cities: ['melb', 'syd'], reason: '加负责墨尔本' }); T('改负责城市 → 200，重读是两个城市', r.s === 200 && (await one(`select cities from admin_users where id=$1`, [ids.syd])).cities.length === 2, r);
  r = await cy({ id: ids.syd, cities: null, reason: '改成全部城市' }); T('改成全部城市（null）→ 200', r.s === 200 && (await one(`select cities from admin_users where id=$1`, [ids.syd])).cities === null, r);
  r = await cy({ id: ids.owner, cities: ['melb'], reason: 'owner 限城市' }); T('owner 不能限城市 → 422', r.s === 422, r);
  r = await cy({ id: ids.syd, cities: ['zzz'], reason: '不存在的城市' }); T('不存在的城市 → 422', r.s === 422, r);
  r = await cy({ id: ids.syd, cities: 'melb', reason: '格式不对' }); T('城市不是数组 → 422', r.s === 422, r);

  // ---- 操作日志 ----
  const ops2 = await K.login('ops@x.com'); T('恢复后重新登录可以', (await call('GET', '/admin/api/me', { cookie: ops2 })).s === 200);
  r = await call('GET', '/admin/api/audit', { cookie: ops2 });
  T('日志：运营能看，最新在前（含登录记录），带管理员名字和理由', r.s === 200 && r.j.rows[0].action === 'login' && r.j.rows[0].admin_name === 'ops' && r.j.rows[1].action === 'admin.manage' && r.j.rows[1].admin_name === 'own' && r.j.rows[1].detail.reason === '改成全部城市' && r.j.more === false, r.j?.rows?.slice(0, 2) ?? r);
  await K.q(`update admin_users set role='viewer' where id=$1`, [ids.viewer]);
  r = await call('GET', '/admin/api/audit', { cookie: as.viewer }); T('日志：只读 → 403', r.s === 403, r);
  r = await call('GET', '/admin/api/audit?action=admin', { cookie: as.owner }); T('按类别筛 admin → 全是 admin.*', r.s === 200 && r.j.rows.length > 0 && r.j.rows.every(x => x.action.startsWith('admin.')), r.j.rows.map(x => x.action));
  r = await call('GET', '/admin/api/audit?action=user.status', { cookie: as.owner }); T('精确筛 user.status → 0 条', r.s === 200 && r.j.rows.length === 0, r.j);
  await K.q(`insert into admin_audit_log(admin_id, action, target) select $1, 'report.handle', 'r' || g from generate_series(1, 120) g`, [ids.operator]);
  r = await call('GET', '/admin/api/audit', { cookie: as.owner }); const last = r.j.rows.at(-1).id;
  T('翻页：第一页 100 条、还有更多', r.j.rows.length === 100 && r.j.more === true, [r.j.rows.length, r.j.more]);
  r = await call('GET', '/admin/api/audit?before=' + last, { cookie: as.owner }); T('翻页：下一页都比上一页最后一条早', r.s === 200 && r.j.rows.length > 0 && r.j.rows.every(x => +x.id < +last) && r.j.more === false, r.j.rows.length);
  for (const qs of ['before=abc', 'action=x', "action=user.status'--", 'action=a.b.c']) { r = await call('GET', '/admin/api/audit?' + qs, { cookie: as.owner }); T('日志参数不合法 → 422 ' + qs, r.s === 422, r) }
  r = await call('GET', '/admin/api/audit?action=user_x', { cookie: as.owner }); T('类别里的下划线按字面量（不当通配符）', r.s === 200 && r.j.rows.length === 0, r.j);
  await K.done();
} catch (e) { await K.done(e) }
