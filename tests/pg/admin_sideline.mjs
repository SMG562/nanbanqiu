// #27 第 4 步：后台场边举报（GET /sideline/reports · POST /sideline/hide · POST /sideline/dismiss）+ 举报队列不再混入场边举报。
// 覆盖：按内容合并 · 内容原文和作者 · 隐藏同时关掉该内容的未处理举报（一个事务、逐条留痕）· 恢复显示 · 忽略 · 重复处理 409 ·
//       权限（只读 403；隐藏要 message.hide 且必须填理由）· 城市范围 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_sideline'), { T, call, as, user, one, q } = K;
try {
  const A = await user('场边作者'), R1 = await user('举报一'), R2 = await user('举报二'), SA = await user('悉尼作者', { city: 'syd' }), SR = await user('悉尼举报人', { city: 'syd' });
  const post = async (u, body, city = 'melb') => (await one(`insert into sb_posts(user_id,city,body) values ($1,$2,$3) returning id`, [u, city, body])).id;
  const P1 = await post(A.id, '不合适的发布'), P2 = await post(A.id, '普通发布'), PS = await post(SA.id, '悉尼的发布', 'syd');
  const RP = (await one(`insert into sb_replies(post_id,user_id,body) values ($1,$2,'难听的回复') returning id::text`, [P2, R1.id])).id;
  // 夹具直接写举报（跳过「举报人必须看得到」的触发器：那是前台规则，pg/sideline 里测）
  const rep = (who, type, id, reason = 'harass') => q(`begin; set local session_replication_role = replica; insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('${who}','${type}','${id}','${reason}','in_app','sideline'); commit;`);
  await rep(R1.id, 'sb_post', P1); await rep(R2.id, 'sb_post', P1, 'photo'); await rep(R2.id, 'sb_reply', RP); await rep(SR.id, 'sb_post', PS);
  const PX = await post(SA.id, '悉尼的发布被墨尔本人举报', 'syd'); await rep(R1.id, 'sb_post', PX);
  await K.guards('GET', '/admin/api/sideline/reports'); await K.guards('POST', '/admin/api/sideline/hide', { kind: 'post', id: P1, hide: true, reason: '骚扰内容' });

  let r = await call('GET', '/admin/api/sideline/reports', { cookie: as.operator });
  const it = k => r.j.items.find(x => x.id === k);
  T('列表：同一条发布的 2 条举报合并成一行，带原因、举报人', r.s === 200 && it(P1)?.reports.length === 2 && it(P1).reports.map(x => x.reason).sort().join() === 'harass,photo' && it(P1).reports.some(x => x.reporter === '举报一'), r.j);
  T('列表：带内容原文、作者编号昵称、状态', it(P1).body === '不合适的发布' && it(P1).author === '场边作者' && it(P1).author_no === A.no && it(P1).status === 'visible' && it(P1).kind === 'post' && it(P1).open === true, it(P1));
  T('列表：回复也在，内容是回复原文、作者是回复的人', it(RP)?.kind === 'reply' && it(RP).body === '难听的回复' && it(RP).author === '举报一', it(RP));
  T('列表：不含举报人 / 作者的内部 id', ![A.id, R1.id, R2.id].some(x => r.text.includes(x)));
  r = await call('GET', '/admin/api/reports', { cookie: as.operator }); T('举报队列（/reports）不再混入场边举报', r.s === 200 && r.j.reports.every(x => !String(x.target_type).startsWith('sb_')), r.j.reports.map(x => x.target_type));
  r = await call('GET', '/admin/api/sideline/reports', { cookie: as.syd }); T('限悉尼的运营：只看到悉尼的场边', r.j.items.length === 2 && r.j.items.every(x => [PS, PX].includes(x.id)), r.j.items.map(x => x.body));
  r = await call('GET', '/admin/api/sideline/reports', { cookie: as.viewer }); T('只读 → 403', r.s === 403, r);

  const hide = (body, ck = as.operator) => call('POST', '/admin/api/sideline/hide', { body, cookie: ck });
  r = await hide({ kind: 'post', id: P1, hide: true, reason: '' }); T('隐藏不填理由 → 422', r.s === 422 && r.j.error === 'admin_reason_required', r);
  T('被拒的隐藏没有关掉举报', (await one(`select count(*)::int n from reports where target_id=$1 and status='open'`, [P1])).n === 2);
  r = await hide({ kind: 'post', id: P1, hide: true, reason: '骚扰内容，已核实' });
  T('隐藏 → 200：发布是 hidden，理由记在 hidden_reason', r.s === 200 && (await one(`select status, hidden_reason from sb_posts where id=$1`, [P1])).hidden_reason === '骚扰内容，已核实', r);
  T('隐藏同时：这条发布的 2 条举报都标成已处理，各自记了处理人', (await one(`select count(*)::int n from reports where target_id=$1 and status='actioned' and handled_by is not null`, [P1])).n === 2);
  T('操作日志：message.hide 一条 + report.handle 两条', (await one(`select count(*)::int n from admin_audit_log where action='message.hide' and target=$1`, ['sbpost:' + P1])).n === 1 && (await one(`select count(*)::int n from admin_audit_log where action='report.handle'`)).n === 2);
  r = await call('GET', '/admin/api/sideline/reports', { cookie: as.operator });
  T('重读：这条在「最近处理」里，状态是已隐藏', it(P1)?.open === false && it(P1).status === 'hidden', it(P1));
  r = await hide({ kind: 'post', id: P1, hide: false, reason: '误判，恢复显示' }); T('恢复显示 → 200，发布回到 visible', r.s === 200 && (await one(`select status from sb_posts where id=$1`, [P1])).status === 'visible', r);

  const dis = (body, ck = as.operator) => call('POST', '/admin/api/sideline/dismiss', { body, cookie: ck });
  r = await dis({ kind: 'reply', id: +RP }); T('回复的举报忽略 → 200，回复仍然可见', r.s === 200 && (await one(`select status from reports where target_id=$1`, [RP])).status === 'dismissed' && (await one(`select status from sb_replies where id=$1`, [RP])).status === 'visible', r);
  r = await dis({ kind: 'reply', id: +RP }); T('再忽略一次 → 409 state_changed', r.s === 409 && r.j.error === 'state_changed', r);
  r = await hide({ kind: 'reply', id: +RP, hide: true, reason: '回复骂人' }); T('隐藏回复 → 200', r.s === 200 && (await one(`select status from sb_replies where id=$1`, [RP])).status === 'hidden', r);
  r = await hide({ kind: 'post', id: PS, hide: true, reason: '越界处理' }, as.syd); T('限悉尼的运营能处理悉尼的（悉尼人举报的）', r.s === 200, r);
  r = await hide({ kind: 'post', id: PX, hide: true, reason: '跨城举报' }, as.syd);
  T('悉尼的发布但举报人在墨尔本：库函数按举报人城市拦 → 403，且隐藏也一起回滚（不会半成功）', r.s === 403 && (await one(`select status from sb_posts where id=$1`, [PX])).status === 'visible', r);
  r = await hide({ kind: 'post', id: P2, hide: true, reason: '越界处理' }, as.syd); T('限悉尼的运营处理墨尔本的 → 404，没改库', r.s === 404 && (await one(`select status from sb_posts where id=$1`, [P2])).status === 'visible', r);
  r = await dis({ kind: 'post', id: P2 }, as.viewer); T('只读忽略 → 403', r.s === 403, r);
  r = await hide({ kind: 'post', id: '00000000-0000-0000-0000-000000000000', hide: true, reason: '不存在的发布' }); T('不存在 → 404', r.s === 404, r);
  for (const b of [{ kind: 'photo', id: P1, hide: true, reason: 'abcd' }, { kind: 'post', id: 'x', hide: true, reason: 'abcd' }, { kind: 'reply', id: 'abc', hide: true, reason: 'abcd' }, { kind: 'post', id: P1, hide: 'yes', reason: 'abcd' }])
    { r = await hide(b); T('隐藏参数不合法 → 422 ' + JSON.stringify(b).slice(0, 60), r.s === 422, r) }
  await K.done();
} catch (e) { await K.done(e) }
