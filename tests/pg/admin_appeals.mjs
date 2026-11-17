// #195 ②：后台爽约申诉（GET /appeals · POST /appeals/handle）+ 库函数 admin_noshow_appeal（迁移 20261114_admin_step4）。
// 覆盖：列表证据（谁反馈、是否发起人、出勤标记、近 90 天其他爽约）· 不泄露内部 id · 成立 → 这次不计；不成立 → 重新计入（v_confirmed_noshow）·
//       记处理人 / 时间 / 备注 · 重复处理 409 · 权限（只读 403）· 城市范围 · 留痕 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_appeals'), { T, call, as, user, one, q } = K;
try {
  const H = await user('发起人'), A = await user('被反馈甲'), B = await user('被反馈乙'), R = await user('反馈人'), S = await user('悉尼被反馈', { city: 'syd' });
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const V = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Appeal Court','AC','Brighton','3186','POINT(145 -37.9)','{hard}','active') returning id`)).id;
  const VS = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,city) values ('Syd Court','SC','Brighton','3186','POINT(145 -37.9)','{hard}','active','syd') returning id`)).id;
  let n = 0; const game = async (v = V) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,status,visibility) values ($1,$2,$3,now()-interval '2 days',90,'doubles',4,3,6,'open','public') returning id, share_code`, ['AP' + String(++n).padStart(3, '0'), H.id, v])).id;
  const G1 = await game(), G2 = await game(), G3 = await game(VS), G4 = await game();   // 球局城市跟球场走
  const code = async g => (await one(`select share_code from games where id=$1`, [g])).share_code;
  for (const [g, u] of [[G1, A], [G2, B], [G3, S], [G4, A]]) await q(`insert into game_participants(game_id,user_id,role,status,decided_at) values ($1,$2,'player','approved',now()-interval '3 days')`, [g, u.id]);
  await q(`insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3),($1,$2,$4)`, [G1, A.id, H.id, R.id]);   // 发起人 + 另一位
  await q(`insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [G2, B.id, H.id]);
  await q(`insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [G3, S.id, H.id]);
  await q(`insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [G4, A.id, H.id]);                    // 甲另一次爽约（没申诉）
  const counted = async (g, u) => !!(await one(`select 1 from v_confirmed_noshow where game_id=$1 and user_id=$2`, [g, u]));
  T('夹具：申诉前这次爽约是确认的', await counted(G1, A.id));
  await q(`insert into noshow_appeals(game_id,user_id,reason) values ($1,$2,'came'),($3,$4,'told'),($5,$6,'other')`, [G1, A.id, G2, B.id, G3, S.id]);
  T('夹具：申诉中不计入', !(await counted(G1, A.id)));
  await K.guards('GET', '/admin/api/appeals'); await K.guards('POST', '/admin/api/appeals/handle', { game: await code(G1), no: A.no, status: 'upheld' });

  let r = await call('GET', '/admin/api/appeals', { cookie: as.operator });
  const it = no => r.j.appeals.find(x => x.member_no === no);
  T('列表：3 条待处理，最早的在前', r.s === 200 && r.j.appeals.length === 3 && r.j.appeals[0].member_no === A.no, r.j);
  T('证据：两位反馈人、标明发起人；甲近 90 天另有 1 次确认爽约', it(A.no).reporters.length === 2 && it(A.no).reporters.some(x => x.is_host && x.name === '发起人') && it(A.no).other_noshows_90d === 1 && it(A.no).reason === 'came' && it(A.no).venue === 'Appeal Court', it(A.no));
  T('不含内部 id', ![A.id, H.id, R.id, G1].some(x => r.text.includes(x)));
  r = await call('GET', '/admin/api/appeals', { cookie: as.syd }); T('限悉尼：只看到悉尼的申诉', r.j.appeals.length === 1 && r.j.appeals[0].member_no === S.no, r.j);
  r = await call('GET', '/admin/api/appeals', { cookie: as.viewer }); T('只读 → 403', r.s === 403, r);

  const h = (body, ck = as.operator) => call('POST', '/admin/api/appeals/handle', { body, cookie: ck });
  r = await h({ game: await code(G1), no: A.no, status: 'upheld', note: '聊天记录显示到了' });
  T('申诉成立 → 200；这次爽约不再计入', r.s === 200 && !(await counted(G1, A.id)), r);
  T('记了处理人、时间、备注', !!(await one(`select 1 from noshow_appeals a join admin_users d on d.id=a.decided_by where a.game_id=$1 and a.user_id=$2 and a.status='upheld' and a.decided_at is not null and a.admin_note='聊天记录显示到了' and d.email='ops@x.com'`, [G1, A.id])));
  T('留痕：report.handle noshow:…', !!(await one(`select 1 from admin_audit_log where action='report.handle' and target=$1 and detail->>'status'='upheld'`, ['noshow:' + G1 + ':' + A.id])));
  r = await h({ game: await code(G1), no: A.no, status: 'rejected' }); T('重复处理 → 409', r.s === 409 && r.j.error === 'state_changed', r);
  r = await h({ game: await code(G2), no: B.no, status: 'rejected' }); T('申诉不成立 → 200；重新计入', r.s === 200 && await counted(G2, B.id), r);
  r = await call('GET', '/admin/api/appeals?view=done', { cookie: as.operator });
  T('最近处理：2 条，带处理人名字', r.j.appeals.length === 2 && r.j.appeals.every(x => x.decided_by_name === 'ops'), r.j);
  r = await h({ game: await code(G3), no: S.no, status: 'upheld' }, as.syd); T('限悉尼处理悉尼的 → 200', r.s === 200, r);
  r = await h({ game: await code(G4), no: A.no, status: 'upheld' }); T('没有申诉的那次 → 404', r.s === 404, r);
  r = await h({ game: await code(G1), no: A.no, status: 'upheld' }, as.syd); T('限悉尼处理墨尔本的 → 404', r.s === 404, r);
  r = await h({ game: 'AP999', no: A.no, status: 'upheld' }); T('不存在的球局 → 404', r.s === 404, r);
  r = await h({ game: await code(G2), no: B.no, status: 'upheld' }, as.viewer); T('只读处理 → 403', r.s === 403, r);
  for (const b of [{ game: 'AP001', no: '1', status: 'upheld' }, { game: 'AP001', no: A.no, status: 'pending' }, { game: '', no: A.no, status: 'upheld' }, { game: 'AP001', no: A.no, status: 'upheld', note: 'x'.repeat(201) }])
    { r = await h(b); T('参数不合法 → 422 ' + JSON.stringify(b).slice(0, 60), r.s === 422, r) }
  await K.done();
} catch (e) { await K.done(e) }
