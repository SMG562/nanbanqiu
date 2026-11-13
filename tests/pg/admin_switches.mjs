// #49 PR①：后台开关接口（GET /switches · POST /switches/set）。权限（只有 owner，运营 / 只读 403）、必须填理由、开关名 / 值校验、留痕、切换后库里读得到。
// 前台怎么响应开关在 pg/switches 测。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_switches'), { T, call, as, one } = K;
try {
  await K.guards('GET', '/admin/api/switches'); await K.guards('POST', '/admin/api/switches/set', { key: 'maintenance', on: true, reason: '测试维护' });
  let r = await call('GET', '/admin/api/switches', { cookie: as.owner });
  T('owner 读：三个开关，默认全关', r.s === 200 && r.j.switches.map(x => x.key + ':' + x.is_on).join() === 'maintenance:false,register_paused:false,sms_paused:false', r);
  r = await call('GET', '/admin/api/switches', { cookie: as.operator }); T('运营读 → 403', r.s === 403, r);
  const set = (body, ck = as.owner) => call('POST', '/admin/api/switches/set', { body, cookie: ck });
  r = await set({ key: 'maintenance', on: true, reason: '测试维护' }, as.operator); T('运营切 → 403', r.s === 403, r);
  r = await set({ key: 'maintenance', on: true, reason: '测试维护' }, as.viewer); T('只读切 → 403', r.s === 403, r);
  r = await set({ key: 'maintenance', on: true, reason: '' }); T('owner 不填理由 → 422 admin_reason_required', r.s === 422 && r.j.error === 'admin_reason_required', r);
  for (const b of [{ key: 'bogus', on: true }, { key: 'maintenance', on: 'yes' }, { key: 'maintenance' }, { on: true }])
    { r = await set({ ...b, reason: '参数校验用例' }); T('参数不合法 → 422 ' + JSON.stringify(b), r.s === 422, r) }
  T('以上都没改动开关', (await one(`select count(*)::int n from app_switches where is_on`)).n === 0);
  r = await set({ key: 'register_paused', on: true, reason: '控制上线节奏' }); T('owner 暂停注册 → 200', r.s === 200, r);
  T('库里 register_paused 是开，记了修改时间和人', !!(await one(`select 1 from app_switches where key='register_paused' and is_on and updated_by is not null`)));
  T('留痕：switch.set + 开关名 + on + 理由', !!(await one(`select 1 from admin_audit_log where action='switch.set' and target='register_paused' and detail->>'on'='true' and detail->>'reason'='控制上线节奏'`)));
  r = await set({ key: 'register_paused', on: false, reason: '恢复注册' }); T('关掉 → 200，重读是关', r.s === 200 && (await call('GET', '/admin/api/switches', { cookie: as.owner })).j.switches.every(x => !x.is_on), r);
  T('关掉也留痕（共 2 条）', (await one(`select count(*)::int n from admin_audit_log where action='switch.set'`)).n === 2);
  T('app_switches_get 公开读返回三项', JSON.stringify(await one(`select app_switches_get() j`).then(x => Object.keys(x.j).sort())) === '["maintenance","register_paused","sms_paused"]');
  await K.done();
} catch (e) { await K.done(e) }
