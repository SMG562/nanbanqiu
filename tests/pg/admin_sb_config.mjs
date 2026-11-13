// #27 第 4 步：后台场边配置（GET /sideline/config · POST /sideline/config/set · discard · publish · rollback · /sideline/topics/release）。
// 库里的配置规则在 pg/sideline* 测；这里测接口层：权限（只读 403、限城市不能改全站配置）· 版本号防覆盖（409）· 草稿 → 发布 → 新版本 · 丢弃 · 退回旧版 ·
//       坏内容 → 422 且不存 · 提前放出话题 · 留痕 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_sb_config'), { T, call, as, one, q, user } = K;
try {
  const P = (path, body, ck = as.operator) => call('POST', '/admin/api/sideline/' + path, { body, cookie: ck });
  await K.guards('GET', '/admin/api/sideline/config'); await K.guards('POST', '/admin/api/sideline/config/discard', { base: 1 });
  let r = await call('GET', '/admin/api/sideline/config', { cookie: as.operator });
  const v1 = r.j?.draft?.version;
  T('读：草稿 = 最新版本，带 9 块配置、版本列表', r.s === 200 && Number.isInteger(v1) && ['topics', 'alias', 'generic', 'settings', 'hints', 'slots', 'starters', 'week', 'specials'].every(k => k in r.j.draft.config) && r.j.draft.changed.length === 0 && r.j.versions[0].version === v1, r.j?.draft?.changed);
  const cfg = r.j.draft.config;
  r = await call('GET', '/admin/api/sideline/config', { cookie: as.viewer }); T('只读 → 403', r.s === 403, r);

  const hints = cfg.hints.map((h, i) => i === 0 ? { ...h, text: h.text + '（改）' } : h);
  r = await P('config/set', { part: 'hints', value: hints, base: v1 }); T('改一块（hints）→ 草稿里 changed = [hints]', r.s === 200 && r.j.draft.changed.join() === 'hints' && r.j.draft.config.hints[0].text.endsWith('（改）'), r.j?.draft?.changed ?? r);
  r = await call('GET', '/admin/api/sideline/config', { cookie: as.owner }); T('重读：草稿还在，记了谁改的', r.j.draft.changed.join() === 'hints' && r.j.draft.updated_by === 'ops', r.j.draft);
  r = await P('config/set', { part: 'hints', value: hints, base: v1 }, as.syd); T('限城市的运营改全站配置 → 403', r.s === 403, r);
  r = await P('config/set', { part: 'slots', value: 'not-an-array', base: v1 }); T('坏内容 → 422，不存', r.s === 422 && (await call('GET', '/admin/api/sideline/config', { cookie: as.owner })).j.draft.changed.join() === 'hints', r);
  r = await P('config/set', { part: 'nope', value: [], base: v1 }); T('不认识的块 → 422', r.s === 422, r);
  r = await P('config/publish', { note: '', base: v1 }); T('发布不写说明 → 422', r.s === 422, r);
  r = await P('config/publish', { note: '改了一句提示', base: v1 }); const v2 = r.j?.version;
  T('发布 → 新版本号 = 旧 + 1，草稿清空', r.s === 200 && v2 === v1 + 1 && (await call('GET', '/admin/api/sideline/config', { cookie: as.owner })).j.draft.changed.length === 0, r);
  T('留痕：sideline.config publish', !!(await one(`select 1 from admin_audit_log where action='sideline.config' and target='publish'`)));
  r = await P('config/set', { part: 'hints', value: cfg.hints, base: v1 }); T('拿旧版本号改 → 409 admin_config_stale（别人刚发布过）', r.s === 409 && r.j.error === 'admin_config_stale', r);
  r = await P('config/set', { part: 'generic', value: [...cfg.generic, '测试词'], base: v2 }); T('再改一块 → 草稿', r.s === 200 && r.j.draft.changed.join() === 'generic', r.j?.draft?.changed);
  r = await P('config/discard', { base: v2 }); T('丢弃草稿 → 回到 v2', r.s === 200 && (await call('GET', '/admin/api/sideline/config', { cookie: as.owner })).j.draft.changed.length === 0, r);
  r = await P('config/rollback', { version: v1, base: v2 }); const v3 = r.j?.version;
  T('退回 v1 → 新版本 v3，提示文字回到原样', r.s === 200 && v3 === v2 + 1 && (await call('GET', '/admin/api/sideline/config', { cookie: as.owner })).j.draft.config.hints[0].text === cfg.hints[0].text, r);
  r = await call('GET', '/admin/api/sideline/config', { cookie: as.owner }); T('版本列表：v3 写着从 v1 退回', r.j.versions[0].version === v3 && r.j.versions[0].from_version === v1, r.j.versions[0]);
  r = await P('config/rollback', { version: 99999, base: v3 }); T('退回不存在的版本 → 404', r.s === 404, r);

  const U = await user('话题发起人');
  await q(`insert into sb_topics(id,title,kind,city,created_by) values ('t_user_1','大家发起的话题','user','melb',$1)`, [U.id]).catch(e => T('夹具：建「大家发起」话题', false, e.message));
  r = await call('GET', '/admin/api/sideline/config', { cookie: as.operator }); T('读：还没到门槛的话题在 pending 里', r.j.pending.some(x => x.id === 't_user_1'), r.j.pending);
  r = await P('topics/release', { topic: 't_user_1' }); T('提前放出 → 200，库里有放出时间，pending 里没了', r.s === 200 && !!(await one(`select released_at from sb_topics where id='t_user_1'`)).released_at && !(await call('GET', '/admin/api/sideline/config', { cookie: as.operator })).j.pending.some(x => x.id === 't_user_1'), r);
  r = await P('topics/release', { topic: 't_user_1' }); T('再放一次 → 404', r.s === 404, r);
  for (const [path, b] of [['config/set', { part: 'hints', value: [], base: '1' }], ['config/publish', { note: 'x'.repeat(61), base: v3 }], ['config/rollback', { version: 'v1', base: v3 }], ['topics/release', { topic: '' }]])
    { r = await P(path, b); T('参数不合法 → 422 ' + path, r.s === 422, r) }
  await K.done();
} catch (e) { await K.done(e) }
