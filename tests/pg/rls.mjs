// 第四批 4e：谁能读、谁能写。在真实 PostgreSQL 上用不同身份（前台球友 / 后台运营 / 后台只读 / Supabase 公开角色）逐条验证能 / 不能。
//   前台请求的写法与 API 一致：begin; set local role nbq_user; select set_config('nbq.uid', <id>, true); …
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };

// 前台球友能碰的表（多了少了都要在这里登记，测试会提醒）
const USER_TABLES = ['sb_topics', 'sb_posts', 'sb_photos', 'sb_replies', 'sb_balls', 'sb_hides', 'cities', 'countries', 'legal_docs', 'users', 'games', 'game_participants', 'invites', 'notifications', 'player_prefs', 'player_pref_mutes', 'follow_notices', 'game_feel', 'user_clubs',
  'user_suburb_picks', 'user_devices', 'push_subscriptions', 'thread_reads', 'blocks', 'game_series', 'user_badges', 'user_level_log', 'user_rackets', 'impressions', 'noshow_reports',
  'noshow_appeals', 'reports', 'threads', 'messages', 'game_changes', 'venues', 'suburbs', 'suburb_aliases', 'service_areas', 'venue_fees', 'hitting_walls',
  'venue_reviews', 'venue_suggestions', 'area_demand'];
const USER_VIEWS = ['public_profiles', 'player_cards', 'api_game_cards', 'my_private_contacts'];

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 在真实 PostgreSQL 上执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p);
  // 以某个身份执行：成功返回 {ok, rows, n}，失败返回 {ok:false, err}
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('${role === 'nbq_user' ? 'nbq.uid' : 'nbq.admin'}', $1, true)`, [uid]);   // 后台角色：uid = 管理员 id
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, rows: r.rows, n: r.rowCount } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message } } finally { cl.release() } };
  const denied = r => !r.ok && /permission denied|row-level security|violates row-level/.test(r.err);

  // ---------- 目录检查 ----------
  const tabs = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition order by 1`)).rows.map(r => r.relname);
  const noRls = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition and not c.relrowsecurity`)).rows.map(r => r.relname);
  T(`所有表都开了 RLS（${tabs.length} 张）`, !noRls.length, noRls);
  const pubTab = (await q(`select c.relname, r.rolname from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values ('anon'),('authenticated'),('public')) r(rolname)
     where n.nspname='public' and c.relkind in ('r','p','v','m') and (case when r.rolname='public' then has_table_privilege('nbq_user', c.oid, 'select') and false else has_table_privilege(r.rolname, c.oid, 'select,insert,update,delete') end)`)).rows;
  T('Supabase 公开角色（anon / authenticated）对任何表都没有权限', !pubTab.length, pubTab.slice(0, 5));
  const pubAcl = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace, aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a where n.nspname='public' and a.grantee = 0`)).rows;
  T('PUBLIC 对任何表都没有权限', !pubAcl.length, pubAcl.slice(0, 5));
  const pubFn = (await q(`select p.oid::regprocedure::text f from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).rows.map(r => r.f).filter(f => !/^(postgis|st_|_st|geography|geometry|box|gidx|spheroid|pgis|_postgis|addgeometry|dropgeometry|find_srid|populate_geometry|updategeometry|equals|path|point|polygon|text|bytea|json|jsonb|gserialized)/i.test(f));
  T('Supabase 公开角色不能调用任何业务函数', !pubFn.length, pubFn.slice(0, 8));
  const userTabs = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
     and (has_any_column_privilege('nbq_user', c.oid, 'select') or has_table_privilege('nbq_user', c.oid, 'insert') or has_any_column_privilege('nbq_user', c.oid, 'update'))`)).rows.map(r => r.relname);
  T('前台球友能碰的表 = 登记的那些（新增的表要先想清楚谁能看）', JSON.stringify(userTabs.sort()) === JSON.stringify([...USER_TABLES].sort()), { 多了: userTabs.filter(t => !USER_TABLES.includes(t)), 少了: USER_TABLES.filter(t => !userTabs.includes(t)) });
  const userViews = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m') and has_table_privilege('nbq_user', c.oid, 'select')`)).rows.map(r => r.relname);
  T('前台球友能读的视图 = 登记的那些', JSON.stringify(userViews.sort()) === JSON.stringify([...USER_VIEWS].sort()), userViews);
  const noPol = (await q(`select c.relname, r from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join unnest(array['nbq_user','nbq_admin']) r
     where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition and has_table_privilege(r, c.oid, 'select')
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid and (p.polroles @> array[(select oid from pg_roles where rolname = r)])) `)).rows;
  T('每张能读的表都有对应的策略', !noPol.length, noPol);

  // ---------- 样例数据 ----------
  const id = n => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
  const [A, B, H, C, D] = [1, 2, 3, 4, 5].map(id);
  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  for (const [u, nm, g] of [[A, 'Amy', 'f'], [B, 'Ben', 'm'], [H, 'Hal', 'm'], [C, 'Cat', 'f'], [D, 'Dan', 'm']])
    await q(`insert into users(id,phone_e164,nickname,utr,gender,email,wechat_id) values ($1,$2,$3,5,$4,$5,$6)`, [u, '+6140000' + u.slice(-4), nm, g, nm.toLowerCase() + '@x.com', 'wx_' + nm]);
  const V = id(90); await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Brighton TC','Brighton TC','Brighton','3186','POINT(145 -37.9)','{hard}','active')`, [V]);
  const game = async (code, opts = {}) => (await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_device,visibility,join_mode)
     values ($1,$2,$3,${opts.start || "now()+interval '2 days'"},90,'singles',${opts.cap || 2},3,8,'mobile',$4,$5) returning id`, [code, opts.host || H, V, opts.vis || 'public', opts.mode || 'approve'])).rows[0].id;
  const G = await game('g'), GI = await game('gi', { mode: 'instant', start: "now()+interval '90 minutes'", cap: 4 }), P = await game('p', { vis: 'private' }), GC = await game('gc', { start: "now()-interval '1 day'", cap: 4 });
  await q(`insert into game_participants(game_id,user_id,status,via,approved_at,show_wechat) values ($1,$2,'approved','invite',now(),true)`, [P, B]);
  await q(`update game_participants set show_wechat=true where game_id=$1 and user_id=$2`, [P, H]);
  await q(`insert into game_participants(game_id,user_id,status,approved_at) values ($1,$2,'approved',now()-interval '2 days'),($1,$3,'approved',now()-interval '2 days')`, [GC, A, B]);
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [H, C]);
  await q(`insert into player_prefs(user_id,target_id,pref) values ($1,$2,'less')`, [B, A]);
  await q(`insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [GC, A, B]);
  await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [B, A]);
  await q(`insert into notifications(user_id,kind,game_id) values ($1,'request',$2),($3,'approved',$2)`, [H, G, B]);
  await q(`insert into events(occurred_at,user_id,anon_id,session_id,build,event) values (now(),$1,'a1','s1','pwa','page_view')`, [A]);
  const th = (await q(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [B < H ? B : H, B < H ? H : B])).rows[0].id;
  await q(`insert into messages(thread_id,sender_id,body) values ($1,$2,'see you')`, [th, H]);
  await q(`insert into admin_users(id,email,name,role,password_hash,totp_secret) values ($1,'ops@x.com','Ops','operator','hash','secret')`, [id(80)]);

  // ---------- 前台球友（nbq_user）----------
  let r;
  r = await as('nbq_user', A, `select phone_e164, email, wechat_id from users`); T('自己的资料（含手机号）能看到，别人的看不到', r.ok && r.rows.length === 1 && r.rows[0].email === 'amy@x.com', r);
  r = await as('nbq_user', A, `select * from public_profiles where id = $1`, [B]); T('别人的公开资料能看（没有手机号 / 邮箱 / 微信 / 性别列）', r.ok && r.rows.length === 1 && !('phone_e164' in r.rows[0]) && !('wechat_id' in r.rows[0]) && !('gender' in r.rows[0]) && !('email' in r.rows[0]), r);
  r = await as('nbq_user', A, `update users set nickname='Amy W.' where id=$1`, [A]); T('可以改自己的昵称', r.ok && r.n === 1, r);
  r = await as('nbq_user', A, `update users set nickname='x' where id=$1`, [B]); T('改不到别人的资料', r.ok && r.n === 0, r);
  for (const col of ["status='active'", 'level=5', 'member_no=1', "status_until=null", 'gender_review=false', "phone_e164='+61'"]) {
    r = await as('nbq_user', A, `update users set ${col} where id=$1`, [A]); T(`不能自己改 ${col.split('=')[0]}`, !r.ok, r) }
  r = await as('nbq_user', D, `update users set gender='f' where id=$1`, [D]); T('男 → 女第一次可以', r.ok && r.n === 1, r);
  r = await as('nbq_user', D, `update users set gender='m' where id=$1`, [D]); T('女 → 男随时可以', r.ok, r);
  r = await as('nbq_user', D, `update users set gender='f' where id=$1`, [D]); T('男 → 女第二次被拒绝', !r.ok && /gender_m2f_used/.test(r.err), r);
  for (const t of ['player_prefs', 'reports', 'noshow_reports', 'notifications', 'blocks', 'messages']) {
    r = await as('nbq_user', A, `select count(*)::int n from ${t}`); T(`${t}：看不到别人的（少遇到 / 举报 / 爽约反馈都不知道是谁）`, r.ok && r.rows[0].n === 0, r) }
  for (const t of ['events', 'sessions', 'user_risk', 'risk_alerts', 'user_status_log', 'admin_users', 'admin_audit_log', 'email_outbox', 'link_visits', 'daily_people', 'gender_changes', 'identity_links']) {
    r = await as('nbq_user', A, `select 1 from ${t} limit 1`); T(`${t}：前台不能读`, denied(r), r) }
  r = await as('nbq_user', A, `select game_cards.* from game_cards limit 1`); T('不能直接读 game_cards（要用 api_game_cards）', denied(r), r);
  // 球局可见性
  r = await as('nbq_user', A, `select share_code from api_game_cards order by 1`); T('看得到公开的局，看不到别人的私人局', r.ok && r.rows.map(x => x.share_code).join() === 'g,gc,gi', r);
  r = await as('nbq_user', C, `select count(*)::int n from api_game_cards where host_id=$1`, [H]); T('被发起人屏蔽的人看不到 TA 的局', r.ok && r.rows[0].n === 0, r);
  r = await as('nbq_user', B, `select share_code from api_game_cards where share_code='p'`); T('私人局的参加者看得到', r.ok && r.rows.length === 1, r);
  r = await as('nbq_user', A, `update games set note='hack' where id=$1`, [G]); T('改不了别人的局', r.ok && r.n === 0, r);
  r = await as('nbq_user', A, `insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('x',$1,$2,now()+interval '1 day',90,'singles',2,3,8)`, [B, V]);
  T('不能替别人发局', denied(r), r);
  // 申请
  r = await as('nbq_user', A, `insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile')`, [G, A]); T('可以申请公开的局', r.ok, r);
  r = await as('nbq_user', A, `insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile')`, [GI, B]); T('不能替别人申请', denied(r), r);
  r = await as('nbq_user', C, `insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile')`, [G, C]); T('被屏蔽的人不能申请', denied(r), r);
  r = await as('nbq_user', D, `insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','request',now())`, [G, D]); T('确认制的局不能自己直接加入', denied(r), r);
  r = await as('nbq_user', D, `insert into game_participants(game_id,user_id,status,via,approved_at) values ($1,$2,'approved','instant',now())`, [GI, D]); T('直接加入的局可以直接加入', r.ok, r);
  r = await as('nbq_user', A, `update game_participants set status='approved', approved_at=now() where game_id=$1 and user_id=$2`, [G, A]); T('申请人不能自己通过自己', denied(r), r);
  r = await as('nbq_user', B, `insert into game_participants(game_id,user_id,device) values ($1,$2,'mobile')`, [G, B]); T('另一个人也申请', r.ok, r);
  r = await as('nbq_user', B, `select user_id from game_participants where game_id=$1`, [G]); T('申请人看不到别人的待确认申请', r.ok && r.rows.length === 1 && r.rows[0].user_id === B, r);
  r = await as('nbq_user', H, `select count(*)::int n from game_participants where game_id=$1`, [G]); T('发起人看得到自己局里的所有申请', r.ok && r.rows[0].n === 3, r);
  r = await as('nbq_user', H, `update game_participants set status='approved', decided_at=now(), approved_at=now() where game_id=$1 and user_id=$2 and status='pending'`, [G, A]); T('发起人可以通过', r.ok && r.n === 1, r);
  r = await as('nbq_user', A, `select user_id from game_participants where game_id=$1 and status='approved' order by 1`, [G]); T('加入后看得到同局已加入的人', r.ok && r.rows.length === 2, r);
  r = await as('nbq_user', A, `update game_participants set attendance='came' where game_id=$1 and user_id=$2`, [GC, A]); T('参加者不能自己标「到场」', denied(r), r);
  r = await as('nbq_user', H, `update game_participants set attendance='no_show' where game_id=$1 and user_id=$2`, [GC, B]); T('发起人可以标记到场情况', r.ok && r.n === 1, r);
  r = await as('nbq_user', A, `update game_participants set status='left', left_at=now() where game_id=$1 and user_id=$2`, [G, A]); T('参加者可以退出', r.ok && r.n === 1, r);
  // 邀约
  r = await as('nbq_user', A, `insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 90 minutes',$3,'singles') returning id`, [A, B, V]);
  T('可以约别人', r.ok, r); const iv = r.ok && r.rows[0].id;
  r = await as('nbq_user', C, `select count(*)::int n from invites`); T('第三人看不到别人的邀约', r.ok && r.rows[0].n === 0, r);
  r = await as('nbq_user', A, `update invites set status='accepted' where id=$1`, [iv]); T('发起人不能替对方接受', denied(r), r);
  r = await as('nbq_user', B, `update invites set status='declined', responded_at=now() where id=$1`, [iv]); T('接收人可以婉拒', r.ok && r.n === 1, r);
  r = await as('nbq_user', H, `insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 90 minutes',$3,'singles')`, [H, C, V]);
  T('不能约自己屏蔽的人', denied(r), r);
  r = await as('nbq_user', C, `insert into invites(from_user,to_user,starts_at,ends_at,venue_id,game_type) values ($1,$2,now()+interval '1 day',now()+interval '1 day 90 minutes',$3,'singles')`, [C, H, V]);
  T('不能约屏蔽了自己的人（看不到对方的屏蔽，但数据库知道）', denied(r), r);
  // 微信、聊天、通知
  r = await as('nbq_user', B, `select wechat_id from my_private_contacts where game_id=$1`, [P]); T('私人局里双方都展示微信时看得到', r.ok && r.rows.length === 1 && r.rows[0].wechat_id === 'wx_Hal', r);
  r = await as('nbq_user', A, `select count(*)::int n from my_private_contacts`); T('不在局里的人看不到任何微信号', r.ok && r.rows[0].n === 0, r);
  r = await as('nbq_user', B, `select body from messages`); T('私信双方看得到', r.ok && r.rows.length === 1, r);
  r = await as('nbq_user', A, `insert into messages(thread_id,sender_id,body) values ($1,$2,'hi')`, [th, A]); T('不能往别人的私信里发', denied(r), r);
  r = await as('nbq_user', H, `update notifications set read_at=now() where user_id=$1`, [H]); T('可以标记自己的通知已读', r.ok && r.n === 1, r);
  r = await as('nbq_user', H, `update notifications set kind='badge' where user_id=$1`, [H]); T('不能改通知内容', denied(r), r);
  r = await as('nbq_user', A, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [A, B]); T('可以举报', r.ok, r);
  r = await as('nbq_user', A, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [B, H]); T('不能冒名举报', denied(r), r);
  r = await as('nbq_user', A, `update reports set status='dismissed'`); T('不能改举报的处理结果', denied(r), r);
  r = await as('nbq_user', A, `insert into impressions(game_id,from_id,to_id,kinds) values ($1,$2,$3,'{fun}')`, [G, A, H]); T('没一起打过的局不能留印象', denied(r), r);
  r = await as('nbq_user', A, `insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [GC, B, A]); T('同局的人可以反馈没到场', r.ok, r);
  r = await as('nbq_user', D, `insert into noshow_reports(game_id,target_id,reporter_id) values ($1,$2,$3)`, [GC, A, D]); T('不在局里的人不能反馈', denied(r), r);

  // ---------- 后台运营（nbq_admin）----------
  r = await as('nbq_admin', null, `select count(*)::int n from users`); T('运营看得到所有球友', r.ok && r.rows[0].n === 5, r);
  r = await as('nbq_admin', null, `select phone_e164 from users limit 1`); T('运营读不到完整手机号', denied(r), r);
  r = await as('nbq_admin', null, `select phone_tail from admin_user_phone where id=$1`, [A]); T('运营只看到手机号后 4 位', r.ok && /^••• \d{4}$/.test(r.rows[0].phone_tail), r);
  r = await as('nbq_admin', null, `select password_hash from admin_users`); T('运营读不到管理员密码', denied(r), r);
  r = await as('nbq_admin', null, `update users set status='review', status_since=now() where id=$1`, [A]); T('运营不能直接改账号状态（5c：一律走 admin_ 函数）', denied(r), r);
  r = await as('nbq_admin', id(80), `select admin_user_status($1,'review','reported','两人举报待核实')`, [A]); T('运营用 admin_user_status 改账号状态', r.ok, r);
  r = await as('nbq_admin', null, `update users set nickname='x' where id=$1`, [A]); T('运营不能改球友的昵称', denied(r), r);
  r = await as('nbq_admin', null, `insert into admin_audit_log(admin_id,action,target) values ($1,'user.review',$2) returning id`, [id(80), A]); T('运营不能直接写操作日志（由 admin_ 函数写）', denied(r), r);
  r = await as('nbq_admin', null, `select count(*)::int n from admin_audit_log where action='user.status'`); T('改状态时自动写了操作日志', r.ok && r.rows[0].n === 1, r);
  r = await as('nbq_admin', null, `update admin_audit_log set action='x'`); T('操作日志不能改', !r.ok, r);
  r = await as('nbq_admin', null, `delete from admin_audit_log`); T('操作日志不能删', !r.ok, r);
  r = await q(`delete from admin_audit_log`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('连数据库管理员也不能删操作日志', !r.ok && /append_only/.test(r.err), r);
  r = await as('nbq_admin', null, `delete from users where id=$1`, [D]); T('运营不能删球友', denied(r), r);
  // ---------- 后台只读（nbq_viewer）----------
  r = await as('nbq_viewer', null, `select * from today_board()`); T('只读可以看统计', r.ok, r);
  r = await as('nbq_viewer', null, `select * from active_users(now()-interval '30 days', now())`); T('只读可以调统计函数（函数里读原始事件）', r.ok && r.rows.length === 1, r);
  for (const t of ['users', 'messages', 'reports', 'events', 'player_prefs', 'admin_audit_log']) { r = await as('nbq_viewer', null, `select 1 from ${t} limit 1`); T(`只读不能读 ${t}`, denied(r), r) }
  r = await as('nbq_viewer', null, `select can_act($1,'apply')`, [A]); T('只读不能调业务函数', denied(r), r);
  // ---------- Supabase 公开角色 ----------
  for (const role of ['anon', 'authenticated']) {
    r = await as(role, null, `select * from users limit 1`); T(`${role} 读不到 users`, denied(r), r);
    r = await as(role, null, `select * from today_board()`); T(`${role} 调不了统计函数`, denied(r), r) }
  // ---------- 内部服务（nbq_service）----------
  r = await as('nbq_service', null, `select count(*)::int n from events`); T('内部服务读写全部表', r.ok && r.rows[0].n === 1, r);
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
