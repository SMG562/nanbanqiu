// 第七批 S1：场边 24h 的数据库（schema ㉕）。真实 PostgreSQL 上逐条验证：默认配置 · 约束 · 谁能看到什么 · 举报 · 后台统计。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const J0 = JSON.stringify;
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0], n = async (s, p) => +Object.values(await one(s, p))[0];
  const fails = async (s, p) => { try { await q(s, p); return false } catch (e) { return e.message } };
  // 以某个身份执行（与 API 的写法相同）；uid 为空 = 没登录
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message } } finally { cl.release() } };
  const denied = r => !r.ok && /permission denied|row-level security/.test(r.err);
  const ids = async (uid, sql) => { const r = await as('nbq_user', uid, sql); return r.ok ? r.rows.map(x => Object.values(x)[0]).sort().join(',') : 'ERR ' + r.err };

  // ---------- 默认配置 = 设计稿 v35 ----------
  T('话题：10 个常驻上线 + 2 个限时未上线', await n(`select count(*) from sb_topics where kind='evergreen' and active`) === 10 && await n(`select count(*) from sb_topics where kind='limited' and not active`) === 2);
  T('每个常驻话题都有问题和三个开头', await n(`select count(*) from sb_topics where kind='evergreen' and (ask='' or cardinality(starters)<>3)`) === 0);
  T('相似词 10 个、太宽的词 8 个', await n(`select count(*) from sb_topic_alias`) === 10 && await n(`select count(*) from sb_generic_words`) === 8);
  T('底栏问题 5 句（通用 1、失物 1、球场 3）', await n(`select count(*) from sb_hints`) === 5 && await n(`select count(*) from sb_hints where kind='court'`) === 3);
  T('时段 4 个、每个 2 个话题且都存在', await n(`select count(*) from sb_slots s where (select count(*) from sb_topics t where t.id = any(s.topic_ids)) = 2`) === 4);
  T('周历 7 天，周三是「大家发起的本周最热」', await n(`select count(*) from sb_week`) === 7 && (await one(`select auto_hot from sb_week where dow=3`)).auto_hot === true);
  T('设置项 13 个，名字 2–12 字、门槛 3 人 7 天、沉下去 30 天', await n(`select count(*) from sb_settings`) === 13 &&
    (await one(`select string_agg(key||'='||value::text, ',' order by key) s from sb_settings where key in ('name_min','name_max','release_people','release_days','sink_days')`)).s === 'name_max=12,name_min=2,release_days=7,release_people=3,sink_days=30');

  // ---------- 准备：球友、球场 ----------
  const id = k => '00000000-0000-0000-0000-0000000000' + String(k).padStart(2, '0');
  const U = { A: 1, B: 2, C: 3, H: 4, S: 5 }; for (const k in U) U[k] = id(U[k]);
  for (const k in U) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [U[k], '+614000000' + U[k].slice(-2), k]);
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=$1`, [U.S]);
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [U.H, U.C]);
  await q(`insert into suburbs(name,postcode,centroid) values ('Kooyong','3144','POINT(145.03 -37.84)')`);
  const V = id(90), V2 = id(91);
  await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Kooyong Lawn Tennis Club','Kooyong','Kooyong','3144','POINT(145.03 -37.84)','{grass}','active'),($2,'Glen Iris Park','Glen Iris','Kooyong','3144','POINT(145.05 -37.85)','{hard}','active')`, [V, V2]);
  const post = async (o) => (await one(`insert into sb_posts(user_id,city,body,topic_id,floor,venue_id,photo_count,created_at,publish_at,status,deleted_at,replies_open)
     values ($1,'melb',$2,$3,$4,$5,$6,${o.created || 'now()'},${o.publish || o.created || 'now()'},$7,${o.deleted ? 'now()' : 'null'},$8) returning id`,
     [o.u, o.body ?? 'x', o.topic || null, o.floor || null, o.venue || null, o.photos || 0, o.status || 'visible', o.open ?? true])).id;

  // ---------- 约束 ----------
  T('正文超过 60 字不行', /check/.test(await fails(`insert into sb_posts(user_id,city,body) values ($1,'melb',$2)`, [U.A, '字'.repeat(61)])));
  T('没有字也没有照片不行', /check/.test(await fails(`insert into sb_posts(user_id,city,body) values ($1,'melb','  ')`, [U.A])));
  T('带话题必须有编号、不带话题不能有编号', /check/.test(await fails(`insert into sb_posts(user_id,city,body,topic_id) values ($1,'melb','a','ootd')`, [U.A]))
    && /check/.test(await fails(`insert into sb_posts(user_id,city,body,floor) values ($1,'melb','a',3)`, [U.A])));
  T('公开时间最多推后 6 小时', /check/.test(await fails(`insert into sb_posts(user_id,city,body,publish_at) values ($1,'melb','a',now()+interval '7 hours')`, [U.A])));
  await post({ u: U.A, topic: 'ootd', floor: 1 });
  T('同一话题的编号不能重复', /duplicate|unique/.test(await fails(`insert into sb_posts(user_id,city,body,topic_id,floor) values ($1,'melb','b','ootd',1)`, [U.A])));
  T('照片最多 3 张', /check/.test(await fails(`insert into sb_posts(user_id,city,body,photo_count) values ($1,'melb','a',4)`, [U.A])));
  T('话题名字不分大小写不能重复', /duplicate|unique/.test(await fails(`insert into sb_topics(id,title,kind,created_by) values ('u_x1','网球人的ootd','user',$1)`, [U.A])));
  T('开头最多 16 个字', /check/.test(await fails(`insert into sb_topics(id,title,kind,starters) values ('t_long','长开头','evergreen',$1)`, [['一二三四五六七八九十一二三四五六七']])));
  T('限时话题必须有起止时间', /check/.test(await fails(`insert into sb_topics(id,title,kind) values ('t_lim','限时','limited')`)));
  T('球场问题必须带 {球场}，其他问题不能带', /check/.test(await fails(`insert into sb_hints(kind,text) values ('court','现在怎么样？')`)) && /check/.test(await fails(`insert into sb_hints(kind,text) values ('general','{球场} 好吗？')`)));
  T('回复 1–60 字', /check/.test(await fails(`insert into sb_replies(post_id,user_id,body) select id,$1,' ' from sb_posts limit 1`, [U.B])));
  await q(`delete from sb_posts`);

  // ---------- 谁能看到哪条 ----------
  const P = {};
  P.pub = await post({ u: U.A, body: '公开中', venue: V, photos: 2 });
  P.later = await post({ u: U.A, body: '两小时后', publish: "now()+interval '2 hours'" });
  P.old = await post({ u: U.A, body: '昨天的', created: "now()-interval '25 hours'" });
  P.hid = await post({ u: U.A, body: '被后台隐藏', status: 'hidden' });
  P.del = await post({ u: U.A, body: '自己删了', deleted: true });
  P.sus = await post({ u: U.S, body: '暂停的人' });
  P.blk = await post({ u: U.C, body: '被 H 屏蔽的人' });
  const all = `select id::text from sb_posts`;
  T('没登录：只看到 24 小时内公开的', await ids(null, all) === [P.pub, P.blk].sort().join(','), await ids(null, all));
  T('作者自己：还能看到没公开的、过期的、被隐藏的（相册），看不到自己删掉的', await ids(U.A, all) === [P.pub, P.later, P.old, P.hid, P.blk].sort().join(','), await ids(U.A, all));
  T('屏蔽的人发的看不到', await ids(U.H, all) === [P.pub].sort().join(','), await ids(U.H, all));
  T('被屏蔽的一方也看不到对方', await ids(U.C, all) === [P.pub, P.blk].sort().join(','));   // C 没被 H 发过帖；C 看得到 A 的
  await q(`insert into sb_hides(user_id,post_id,reason) values ($1,$2,'topic')`, [U.B, P.pub]);
  T('点了「不感兴趣」的那条，自己看不到了', !(await ids(U.B, all)).includes(P.pub));
  T('作者被暂停：内容对别人隐藏', !(await ids(U.B, all)).includes(P.sus));
  // 照片
  await q(`insert into sb_photos(post_id,idx,storage_key,review,tags) values ($1,0,'k0','ok','{穿搭}'),($1,1,'k1','removed','{}')`, [P.pub]);
  T('照片：别人看不到审核拿掉的那张', await ids(null, `select storage_key from sb_photos`) === 'k0');
  T('照片：作者两张都看得到', await ids(U.A, `select storage_key from sb_photos`) === 'k0,k1');
  T('照片：自动识别的标签不给前台', denied(await as('nbq_user', U.A, `select tags from sb_photos`)));
  // 回复
  await q(`insert into sb_replies(post_id,user_id,body) values ($1,$2,'B 的回复'),($1,$3,'C 的回复')`, [P.pub, U.B, U.C]);
  await q(`insert into sb_replies(post_id,user_id,body,status) values ($1,$2,'被隐藏的回复','hidden')`, [P.pub, U.B]);
  T('回复：没登录看到正常的两条', await ids(null, `select body from sb_replies`) === 'B 的回复,C 的回复');
  T('回复：屏蔽了 C 的人看不到 C 的回复', await ids(U.H, `select body from sb_replies`) === 'B 的回复');
  T('回复：自己被隐藏的回复自己还看得到', (await ids(U.B, `select body from sb_replies`)).includes('被隐藏的回复'));
  T('回复：过期的帖子别人看不到它的回复', (await q(`insert into sb_replies(post_id,user_id,body) values ($1,$2,'旧帖回复')`, [P.old, U.B]), !(await ids(U.H, `select body from sb_replies`)).includes('旧帖回复')));
  // 网球、不感兴趣只看自己的
  await q(`insert into sb_balls(post_id,user_id) values ($1,$2),($1,$3)`, [P.pub, U.B, U.C]);
  T('网球：只看得到自己点的', await ids(U.B, `select user_id::text from sb_balls`) === U.B);
  T('不感兴趣：只看得到自己的', await ids(U.A, `select post_id::text from sb_hides`) === '');
  // 写入一律走接口
  T('前台不能直接发帖 / 改帖 / 点网球', denied(await as('nbq_user', U.A, `insert into sb_posts(user_id,city,body) values ('${U.A}','melb','直接写')`))
    && denied(await as('nbq_user', U.A, `update sb_posts set body='改' where id='${P.pub}'`)) && denied(await as('nbq_user', U.B, `insert into sb_balls(post_id,user_id) values ('${P.pub}','${U.B}')`)));
  T('前台看不到后台隐藏原因、配置表、浏览明细', denied(await as('nbq_user', U.A, `select hidden_reason from sb_posts`)) && denied(await as('nbq_user', null, `select * from sb_settings`)) && denied(await as('nbq_user', U.A, `select * from sb_views`)));
  T('话题：没登录看不到未上线的', !(await ids(null, `select id from sb_topics`)).includes('ao') && (await ids(null, `select id from sb_topics`)).includes('ootd'));
  await q(`insert into sb_topics(id,title,kind,created_by,city) values ('u_a1','周末夜场','user',$1,'melb')`, [U.A]);
  T('话题：自己发起、还没上线的自己看得到，别人看不到', (await ids(U.A, `select id from sb_topics`)).includes('u_a1') && !(await ids(U.B, `select id from sb_topics`)).includes('u_a1'));
  // 后台
  T('后台只读看不到发帖明细', denied(await as('nbq_viewer', null, `select * from sb_posts`)));
  // A1：场边表后台一律只读，隐藏发布 / 回复、照片审核走 admin_sb_ 函数（和球友 / 举报一致）
  T('后台运营能看，不能直接改（隐藏、改正文、照片审核、隐藏回复都要走函数）', (await as('nbq_admin', null, `select count(*) from sb_posts`)).ok
    && denied(await as('nbq_admin', null, `update sb_posts set status='hidden', hidden_reason='广告' where id='${P.blk}'`))
    && denied(await as('nbq_admin', null, `update sb_posts set body='改' where id='${P.pub}'`))
    && denied(await as('nbq_admin', null, `update sb_photos set review='blurred', flagged_by='admin' where post_id='${P.pub}' and idx=0`))
    && denied(await as('nbq_admin', null, `update sb_replies set status='hidden'`)));
  const mkAdm = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,cities) values ($1,$2,$3,'x','x',$4) returning id`, [email, email.split('@')[0], role, cities])).id;
  const AO = await mkAdm('sb-o@x.com', 'owner'), AM = await mkAdm('sb-m@x.com', 'operator', ['melb']), AY = await mkAdm('sb-y@x.com', 'operator', ['syd']), AV = await mkAdm('sb-v@x.com', 'viewer');
  const asA = async (adm, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role nbq_admin`); await cl.query(`select set_config('nbq.admin', $1, true)`, [adm]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const isErr = (r, code) => !r.ok && r.err === code;
  const hide = (adm, id, h, why) => asA(adm, `select admin_sb_post_hide($1, $2, $3)`, [id, h, why]);
  T('隐藏发布：要理由（至少 4 个字）', isErr(await hide(AO, P.pub, true, ''), 'admin_reason_required') && isErr(await hide(AO, P.pub, true, '广'), 'admin_reason_required') && (await one(`select status from sb_posts where id=$1`, [P.pub])).status === 'visible');
  T('隐藏发布：只读不行', isErr(await hide(AV, P.pub, true, '广告内容'), 'admin_forbidden'));
  T('隐藏发布：只负责悉尼的不能管墨尔本的', isErr(await hide(AY, P.pub, true, '广告内容'), 'admin_forbidden') && (await hide(AM, P.pub, true, '广告内容')).ok);
  T('隐藏发布：状态 + 理由 + 操作日志（message.hide，对象 sbpost:）', (await one(`select status, hidden_reason from sb_posts where id=$1`, [P.pub])).status === 'hidden'
    && (await one(`select hidden_reason from sb_posts where id=$1`, [P.pub])).hidden_reason === '广告内容'
    && +(await one(`select count(*) n from admin_audit_log where action='message.hide' and target=$1`, [`sbpost:${P.pub}`])).n === 1);
  T('隐藏发布：恢复（不用理由也要 4 个字，记日志），理由清掉', (await hide(AO, P.pub, false, '误判，已恢复')).ok && (await one(`select status, hidden_reason from sb_posts where id=$1`, [P.pub])).status === 'visible' && (await one(`select hidden_reason from sb_posts where id=$1`, [P.pub])).hidden_reason === null);
  T('隐藏发布：不存在 / 自己删掉的 → not_found', isErr(await hide(AO, '00000000-0000-0000-0000-000000000000', true, '广告内容'), 'not_found') && isErr(await hide(AO, P.del, true, '广告内容'), 'not_found'));
  await hide(AO, P.blk, true, '广告内容');   // 和原来的状态一致：P.blk 被后台隐藏
  const RP = (await one(`select id from sb_replies where body='B 的回复'`)).id;
  T('隐藏回复：要理由；隐藏后别人看不到、回复数少一条；恢复', isErr(await asA(AO, `select admin_sb_reply_hide($1, true, '')`, [RP]), 'admin_reason_required')
    && (await asA(AO, `select admin_sb_reply_hide($1, true, '人身攻击')`, [RP])).ok && !(await ids(null, `select body from sb_replies`)).includes('B 的回复')
    && (await asA(AO, `select admin_sb_reply_hide($1, false, '误判，恢复')`, [RP])).ok && (await ids(null, `select body from sb_replies`)).includes('B 的回复'));
  T('隐藏回复：只读不行；不存在 → not_found', isErr(await asA(AV, `select admin_sb_reply_hide($1, true, '人身攻击')`, [RP]), 'admin_forbidden') && isErr(await asA(AO, `select admin_sb_reply_hide(999999, true, '人身攻击')`), 'not_found'));
  // 照片审核：只处理 blurred
  const phr = (adm, idx, a) => asA(adm, `select admin_sb_photo_review($1, $2, $3)`, [P.pub, idx, a]);
  await q(`update sb_photos set review='blurred', flagged_by='report' where post_id=$1 and idx=0`, [P.pub]);
  T('照片审核：动作只能是 keep / remove；只读不行；别的城市不行', isErr(await phr(AO, 0, 'x'), 'invalid') && isErr(await phr(AV, 0, 'keep'), 'admin_forbidden') && isErr(await phr(AY, 0, 'keep'), 'admin_forbidden'));
  T('照片审核：保留 → ok，记审核人和时间，来源（举报）不变；再审一次 → state_changed', (await phr(AM, 0, 'keep')).ok
    && J0(await one(`select review, flagged_by, reviewed_by = $2::uuid as by, reviewed_at is not null as at from sb_photos where post_id=$1 and idx=0`, [P.pub, AM])) === J0({ review: 'ok', flagged_by: 'report', by: true, at: true })
    && isErr(await phr(AM, 0, 'keep'), 'state_changed'));
  await q(`update sb_photos set review='blurred', flagged_by=null, reviewed_at=null, reviewed_by=null where post_id=$1 and idx=0`, [P.pub]);
  T('照片审核：拿掉 → removed（来源没有记录时记 admin）；没送审的（已拿掉的）→ state_changed', (await phr(AO, 0, 'remove')).ok
    && (await one(`select review, flagged_by from sb_photos where post_id=$1 and idx=0`, [P.pub])).review === 'removed' && (await one(`select flagged_by from sb_photos where post_id=$1 and idx=0`, [P.pub])).flagged_by === 'admin'
    && isErr(await phr(AO, 1, 'keep'), 'state_changed'));
  T('照片审核记操作日志（report.handle，对象 sbphoto:）', +(await one(`select count(*) n from admin_audit_log where action='report.handle' and target like 'sbphoto:%'`)).n === 2);
  await q(`update sb_photos set review='blurred', flagged_by='admin', reviewed_at=null, reviewed_by=null where post_id=$1 and idx=0`, [P.pub]);   // 和原来的状态一致：第一张被打码
  // 举报（S2b 起：只能举报自己看得到的；U.B 对 P.pub 点了不感兴趣，所以用 U.H）
  const rep = (uid, t, tid, reason, via = 'sideline') => as('nbq_user', uid, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('${uid}','${t}','${tid}','${reason}','in_app','${via}')`);
  T('场边举报：不当照片 / 虚假交易 / 骚扰 / 其他（不要求写说明）', (await rep(U.H, 'sb_post', P.pub, 'photo')).ok && (await rep(U.C, 'sb_post', P.pub, 'other')).ok);
  T('场边举报不能用球局的原因，球员卡举报不能指向场边', !(await rep(U.H, 'sb_post', P.pub, 'no_show')).ok && !(await rep(U.H, 'sb_post', P.pub, 'harass', 'card')).ok);
  T('原来的球员卡举报照常', (await rep(U.H, 'user', U.A, 'harass', 'card')).ok);

  // ---------- 后台统计 ----------
  await q(`delete from sb_posts`); await q(`delete from reports`);
  // 墨尔本时间 10-24（周六）晚 7 点、早 8 点；10-25 晚 7 点；上一周期 10-22
  const mk = async (u, t, topic, floor, venue, photos, extra = {}) => (await one(`insert into sb_posts(user_id,city,body,topic_id,floor,venue_id,photo_count,created_at,publish_at,balls,replies,views,replies_open)
      values ($1,'melb','x',$2,$3,$4,$5,$6::timestamptz,$6::timestamptz + $7::interval,$8,$9,$10,$11) returning id`, [u, topic, floor, venue, photos, t, extra.later || '0', extra.balls || 0, extra.replies || 0, extra.views || 0, extra.open ?? true])).id;
  const p1 = await mk(U.A, '2026-10-24 19:00+11', 'ootd', 1, V, 1, { balls: 5, replies: 2, views: 120 });
  await mk(U.B, '2026-10-24 08:00+11', 'ootd', 2, V, 0, { balls: 1, views: 40 });
  await mk(U.B, '2026-10-25 19:00+11', 'brain', 1, V2, 2, { views: 300, later: '2 hours', open: false });
  await mk(U.C, '2026-10-25 19:30+11', null, null, null, 0, { views: 10 });
  await mk(U.A, '2026-10-22 12:00+11', 'brain', 2, null, 0);   // 上一周期
  for (const u of [U.B, U.C]) await q(`insert into sb_balls(post_id,user_id) values ($1,$2)`, [p1, u]);
  await q(`insert into sb_replies(post_id,user_id,body) values ($1,$2,'好看')`, [p1, U.C]);
  await q(`insert into sb_hides(user_id,post_id,reason,created_at) values ($1,$2,'user','2026-10-24 20:00+11')`, [U.H, p1]);
  const F = ['melb', '2026-10-24 00:00+11', '2026-10-26 00:00+11'];
  const k = await one(`select * from sb_stat_kpis($1,$2,$3)`, F);
  T('统计：发布 4、发布的人 3、带照片 50%、浏览 470', +k.posts === 4 && +k.posters === 3 && +k.with_photo === 0.5 && +k.views === 470, k);
  T('统计：网球、回复按明细数', +k.balls === 2 && +k.replies === 1, k);
  const tp = (await q(`select * from sb_stat_topics($1,$2,$3)`, F)).rows;
  T('最热闹的话题：#网球人的OOTD 2 条 2 人；#脑子会了 1 条，上一周期 1 条', tp[0].topic_id === 'ootd' && +tp[0].posts === 2 && +tp[0].people === 2 && +tp.find(r => r.topic_id === 'brain').prev_posts === 1, tp.slice(0, 2));
  const ct = (await q(`select * from sb_stat_courts($1,$2,$3)`, F)).rows;
  T('发布最多的球场：Kooyong 2 条、Glen Iris 1 条', ct[0].venue_id === V && +ct[0].posts === 2 && +ct[1].posts === 1, ct);
  const tops = (await q(`select * from sb_stat_top_posts($1,$2,$3,3)`, F)).rows;
  T('浏览最多的发布：按浏览排序，带作者和球场', tops.length === 3 && tops[0].views === 300 && tops[0].venue === 'Glen Iris' && tops[1].author === 'A', tops.map(r => [r.views, r.author, r.venue]));
  const heat = (await q(`select * from sb_stat_heat($1,$2,$3)`, F)).rows.map(r => `${r.dow}-${r.hour}:${r.posts}`).join(' ');
  T('热度按墨尔本时间、按公开时刻（周六 8 点、19 点；周日 19 点、推后到 21 点）', heat === '6-8:1 6-19:1 7-19:1 7-21:1', heat);
  const ch = await one(`select * from sb_stat_choices($1,$2,$3)`, F);
  T('发的时候怎么选：带话题 75%、选球场 75%、2 小时后公开 25%、关闭回复 25%', +ch.with_topic === 0.75 && +ch.with_venue === 0.75 && +ch.later === 0.25 && +ch.replies_closed === 0.25, ch);
  const ng = await one(`select * from sb_stat_negative($1,$2,$3)`, F);
  T('不想看到的：不感兴趣 1（少看这个人 1）', +ng.hides === 1 && +ng.hide_user === 1, ng);
  T('别的城市没有数据', +(await one(`select posts from sb_stat_kpis('syd',$1,$2)`, F.slice(1))).posts === 0);
  T('统计函数：后台只读能用，前台不能用', (await as('nbq_viewer', null, `select * from sb_stat_kpis('melb',now()-interval '7 days',now())`)).ok && denied(await as('nbq_user', U.A, `select * from sb_stat_kpis('melb',now()-interval '7 days',now())`)));
} catch (e) { T('运行出错', false, e.stack) }
finally { if (pool) await pool.end(); c.stop() }
console.log(`sb_schema: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
