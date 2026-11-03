// 第七批 S2：场边接口函数（schema ㉕ 接口部分）。真实 PostgreSQL 上以前台身份调用，逐条验证规则和错误码。
//   S2a 发布：内容 · 照片 · 球场与城市 · 话题（选已有 / 相似 / 同名 / 太宽 / 新建 / 已结束 / 合并）· 编号 · 2 小时后公开 · 账号状态 · 频率 · 删除 · 照片识别
//   S2b 互动：回复（回复某人、关回复、屏蔽）· 删除回复 · 网球（同时点）· 不感兴趣（先隐藏后补原因）· 浏览 / 分享（一人一天一次）· 举报（照片先打码）
//   S2b+ 互动通知：网球合并 / 取消 / 看过再推 · 回复 10 分钟合并 · 回复某人 · 过时判断
//   S2c 收口：没登录一律不能写 · 被拒的操作记风险信号 · 下载我的数据加场边（同时操作在 pg/sb_race）
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 12 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0], n = async (s, p) => +Object.values(await one(s, p))[0];
  // 以某个身份执行（与 API 的写法相同）；uid 为空 = 没登录。返回 {ok, v（第一行第一列）, code（错误码）, detail}
  const as = async (role, uid, sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, rows: r.rows, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, code: e.message, detail: e.detail } } finally { cl.release() } };
  // 频率那一段之外，每次发之前清掉本人的发布计数（别的段落要连续发很多条）
  let RATE_USER = null;
  const post = async (uid, p) => { if (uid && uid !== RATE_USER) await q(`delete from rate_hits where subject=$1 and grp='sb_post'`, [uid]); return as('nbq_user', uid, `select api_sb_post($1::jsonb)`, [JSON.stringify(p)]) };
  const code = r => r.ok ? 'ok' : r.code + (r.detail ? ':' + r.detail : '');

  // ---------- 准备 ----------
  const id = k => '00000000-0000-0000-0000-0000000000' + String(k).padStart(2, '0');
  const U = {}; for (let i = 1; i <= 30; i++) U[i] = id(i);
  for (const k in U) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [U[k], '+6140000000' + String(k).padStart(2, '0'), 'P' + k]);
  const A = U[1], B = U[2], S = U[3], R = U[4];
  await q(`update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=$1`, [S]);
  await q(`update users set status='review' where id=$1`, [R]);
  await q(`insert into suburbs(name,postcode,centroid) values ('Kooyong','3144','POINT(145.03 -37.84)')`);
  const V = id(90), VP = id(91);
  await q(`insert into venues(id,name,short_name,suburb,postcode,location,surfaces,status) values ($1,'Kooyong Lawn Tennis Club','Kooyong','Kooyong','3144','POINT(145.03 -37.84)','{grass}','active'),($2,'Pending Court','Pending','Kooyong','3144','POINT(145.05 -37.85)','{hard}','pending')`, [V, VP]);
  const key = (u, k = 'abcdefgh') => `sb/${u}/${k}.jpg`;

  // ---------- 前置 ----------
  T('没登录不能发：login_required', code(await post(null, { body: '你好' })) === 'login_required');
  T('停用中不能发：account_suspended', code(await post(S, { body: '你好' })) === 'account_suspended');
  T('待核实的账号可以发（场边不需要先同意球友约定）', (await post(R, { body: '你好' })).ok);
  T('前台不能直接写表', !(await as('nbq_user', A, `insert into sb_posts(user_id,city,body) values ($1,'melb','x')`, [A])).ok);

  // ---------- 内容 ----------
  let r = await post(A, { body: '  Kooyong 现在有空场  ', venue_id: V, tone: 'film', replies_open: false });
  T('发布：返回 id、无话题无编号', r.ok && r.v.id && r.v.topic_id === null && r.v.floor === null && r.v.new_topic === false, r);
  let row = await one(`select * from sb_posts where id=$1`, [r.v?.id]);
  T('发布：去掉首尾空格、城市取球场的、色调和关回复照存、立刻公开', row && row.body === 'Kooyong 现在有空场' && row.city === 'melb' && row.venue_id === V && row.tone === 'film' && row.replies_open === false && Math.abs(row.publish_at - row.created_at) < 1000, row);
  T('超过 60 字：invalid:body', code(await post(A, { body: '字'.repeat(61) })) === 'invalid:body');
  T('60 字可以', (await post(A, { body: '字'.repeat(60) })).ok);
  T('没字也没照片：invalid:body', code(await post(A, { body: '   ' })) === 'invalid:body');
  for (const l of ['看这个 https://x.cn', 'www.abc.com', '加我 abc.com.au', 'tennis.net/a'])
    T(`不能发链接：${l}`, code(await post(B, { body: l })) === 'message_link');
  T('普通的点号不算链接（3.5 级、Mr.Li）', (await post(B, { body: '3.5 级找搭子，Mr.Li 一起' })).ok);
  T('色调只能是那几种：invalid:tone', code(await post(A, { body: 'a', tone: 'neon' })) === 'invalid:tone');
  T('球场不存在或未审核：invalid:venue', code(await post(A, { body: 'a', venue_id: id(99) })) === 'invalid:venue' && code(await post(A, { body: 'a', venue_id: VP })) === 'invalid:venue' && code(await post(A, { body: 'a', venue_id: 'xx' })) === 'invalid:venue');
  T('城市没开放：city_closed', code(await post(A, { body: 'a', city: 'syd' })) === 'city_closed:syd');

  // ---------- 照片 ----------
  r = await post(B, { photos: [{ key: key(B, 'p1aaaaaa'), w: 1080, h: 1350 }, { key: key(B, 'p2aaaaaa') }, { key: `sb/${B}/p3aaaaaa.webp` }] });
  T('只发照片（3 张）可以，按顺序存', r.ok && await n(`select count(*) from sb_photos where post_id=$1`, [r.v.id]) === 3 && (await one(`select photo_count, body from sb_posts where id=$1`, [r.v.id])).photo_count === 3
    && (await one(`select width from sb_photos where post_id=$1 and idx=0`, [r.v.id])).width === 1080, r);
  const P3 = r.v?.id;
  T('照片默认正常、没识别标签', await n(`select count(*) from sb_photos where post_id=$1 and review='ok' and tags='{}'`, [P3]) === 3);
  T('4 张：invalid:photos', code(await post(B, { photos: [1, 2, 3, 4].map(i => ({ key: key(B, 'q' + i + 'aaaaaaa') })) })) === 'invalid:photos');
  T('用别人的照片：invalid:photos', code(await post(B, { photos: [{ key: key(A) }] })) === 'invalid:photos');
  T('键格式不对：invalid:photos', code(await post(B, { photos: [{ key: `sb/${B}/../x.jpg` }] })) === 'invalid:photos' && code(await post(B, { photos: [{ key: `sb/${B}/abcdefgh.png` }] })) === 'invalid:photos');
  T('同一张发两次：invalid:photos', code(await post(B, { photos: [{ key: key(B) }, { key: key(B) }] })) === 'invalid:photos');
  T('photos 不是数组：invalid:photos', code(await post(B, { body: 'a', photos: { key: key(B) } })) === 'invalid:photos');

  // ---------- 话题 ----------
  const fl = async (uid, p) => { const x = await post(uid, { body: '话题', ...p }); return x.ok ? `${x.v.topic_id}#${x.v.floor}${x.v.new_topic ? '+new' : ''}` : code(x) };
  T('选已有话题：编号从 1 开始往上', await fl(A, { topic_id: 'ootd' }) === 'ootd#1' && await fl(B, { topic_id: 'ootd' }) === 'ootd#2');
  T('输入相似词并入：#穿搭 → ootd', await fl(A, { topic_title: '#穿搭' }) === 'ootd#3');
  T('输入同名（不分大小写、带空格）并入', await fl(A, { topic_title: '  网球人的ootd ' }) === 'ootd#4');
  T('太宽的词不能当话题：topic_too_generic', await fl(A, { topic_title: '网球' }) === 'topic_too_generic' && await fl(A, { topic_title: '#Tennis' }) === 'topic_too_generic');
  T('名字 2–12 个字：invalid:topic_title', await fl(A, { topic_title: '#好' }) === 'invalid:topic_title' && await fl(A, { topic_title: '一二三四五六七八九十一二三' }) === 'invalid:topic_title');
  T('名字里有链接 / 冒充官方：topic_name_not_allowed', await fl(A, { topic_title: 'abc.com' }) === 'topic_name_not_allowed:link' && await fl(A, { topic_title: '南伴球官方活动' }) === 'topic_name_not_allowed:impersonate');
  const before = await n(`select post_count from sb_topics where id='ootd'`);
  T('发布失败不占编号', code(await post(A, { body: '字'.repeat(61), topic_id: 'ootd' })) === 'invalid:body' && await n(`select post_count from sb_topics where id='ootd'`) === before);
  let x = await post(A, { body: '新话题', topic_title: '#反手练习日记' });
  const NT = x.v?.topic_id;
  T('新建话题：大家发起、上线、还没放出、不进推荐、记下发起人和城市', x.ok && x.v.new_topic === true && x.v.floor === 1 && /^u_[0-9a-f]{8}$/.test(NT) &&
    await n(`select count(*) from sb_topics where id=$1 and kind='user' and active and released_at is null and not suggest and created_by=$2 and city='melb' and title='反手练习日记'`, [NT, A]) === 1, x);
  T('别人用同名再发：并入、不新建', await fl(B, { topic_title: '反手练习日记' }) === `${NT}#2` && await fl(B, { topic_id: NT }) === `${NT}#3`);
  T('新建话题每天 3 个：topic 第 4 个报 sb_topic_daily_limit', await fl(A, { topic_title: '截击小分队' }) === (await one(`select id from sb_topics where title='截击小分队'`))?.id + '#1+new'
    && /\+new$/.test(await fl(A, { topic_title: '发球练习营' })) && /^sb_topic_daily_limit:\d+$/.test(await fl(A, { topic_title: '第四个话题' })));
  T('超了不会留下话题', await n(`select count(*) from sb_topics where title='第四个话题'`) === 0);
  T('不存在的话题：not_found:topic', await fl(A, { topic_id: 'nope' }) === 'not_found:topic');
  T('限时话题没上线：topic_ended', await fl(A, { topic_id: 'ao' }) === 'topic_ended');
  await q(`update sb_topics set active=true where id='ao'`);
  T('限时话题上线了但还没到开始时间：topic_ended', await fl(A, { topic_id: 'ao' }) === 'topic_ended');
  await q(`update sb_topics set active=true, starts_at=now()-interval '1 hour', ends_at=now()+interval '1 day' where id='rain'`);
  T('限时话题在时间内：可以发', await fl(B, { topic_id: 'rain' }) === 'rain#1');
  await q(`update sb_topics set active=false where id='love'`);
  T('常驻话题下线了：topic_ended', await fl(B, { topic_id: 'love' }) === 'topic_ended');
  await q(`insert into sb_topics(id,title,kind,active,created_by,merged_into) values ('u_merged1','穿搭日记','user',true,$1,'ootd')`, [A]);
  T('合并掉的话题：发到合并进的那个', (await fl(B, { topic_id: 'u_merged1' })).startsWith('ootd#'));
  await q(`update sb_topics set sunk_at=now() where id='spot'`);
  T('沉下去的话题有人发了就浮上来', await fl(B, { topic_id: 'spot' }) === 'spot#1' && await n(`select count(*) from sb_topics where id='spot' and sunk_at is null`) === 1);
  await q(`insert into sb_topics(id,title,kind,active,city,created_by) values ('u_sydney1','悉尼约球','user',true,'syd',$1)`, [B]);
  T('别的城市的话题：invalid:topic_city', await fl(A, { topic_id: 'u_sydney1' }) === 'invalid:topic_city');

  // ---------- 同时发同一个话题：编号不重复、不跳号 ----------
  const users = Object.values(U).slice(4, 24);
  const res = await Promise.all(users.map(u => post(u, { body: '同时', topic_id: 'gear' })));
  const floors = res.filter(z => z.ok).map(z => z.v.floor).sort((a, b) => a - b);
  T('20 人同时发 #我的新装备：编号 1–20 各一个', floors.join(',') === Array.from({ length: 20 }, (_, i) => i + 1).join(','), res.filter(z => !z.ok).map(code));
  const res2 = await Promise.all(users.slice(0, 6).map(u => post(u, { body: '同时新建', topic_title: '双打默契养成' })));
  T('6 人同时新建同名话题：只建一个，都发进去', res2.every(z => z.ok) && await n(`select count(*) from sb_topics where title='双打默契养成'`) === 1 && new Set(res2.map(z => z.v.topic_id)).size === 1
    && res2.filter(z => z.v.new_topic).length === 1, res2.map(code));

  // ---------- 2 小时后再公开 ----------
  x = await post(B, { body: '晚点再给大家看', later: true });
  const L = x.v?.id;
  T('2 小时后再公开：publish_at = 现在 + 2 小时', x.ok && Math.abs(new Date(x.v.publish_at) - Date.now() - 2 * 3600e3) < 60e3, x);
  T('还没公开：别人和没登录的看不到，自己看得到', (await as('nbq_user', A, `select count(*) from sb_posts where id=$1`, [L])).v === '0' && (await as('nbq_user', null, `select count(*) from sb_posts where id=$1`, [L])).v === '0'
    && (await as('nbq_user', B, `select count(*) from sb_posts where id=$1`, [L])).v === '1');

  // ---------- 频率 ----------
  const F = U[25]; RATE_USER = F; let last;
  for (let i = 0; i < 6; i++) last = await post(F, { body: '第' + i + '条' });
  T('每小时 5 条：第 6 条报 sb_post_hourly_limit，带要等的秒数', !last.ok && last.code === 'sb_post_hourly_limit' && +last.detail > 3000 && +last.detail <= 3600, last);
  await q(`update rate_hits set at = at - interval '2 hours' where subject=$1`, [F]);
  for (let k = 0; k < 3; k++) { for (let i = 0; i < 5; i++) await post(F, { body: 'x' + k + i }); await q(`update rate_hits set at = at - interval '2 hours' where subject=$1`, [F]); }
  last = await post(F, { body: '再一条' });
  T('每天 20 条：第 21 条报 sb_post_daily_limit', !last.ok && last.code === 'sb_post_daily_limit', last);
  T('被拒的不计次', await n(`select count(*) from rate_hits where subject=$1 and grp='sb_post'`, [F]) === 20);

  // ---------- 删除 ----------
  const mine = (await post(A, { body: '要删的' })).v.id;
  T('删别人的：not_found:post', code(await as('nbq_user', B, `select api_sb_delete($1)`, [mine])) === 'not_found:post');
  T('没登录删：login_required', code(await as('nbq_user', null, `select api_sb_delete($1)`, [mine])) === 'login_required');
  T('删自己的：成功，大家和自己都看不到了', (await as('nbq_user', A, `select api_sb_delete($1)`, [mine])).ok && await n(`select count(*) from sb_posts where id=$1 and deleted_at is not null`, [mine]) === 1
    && (await as('nbq_user', A, `select count(*) from sb_posts where id=$1`, [mine])).v === '0');
  T('删两次：not_found:post', code(await as('nbq_user', A, `select api_sb_delete($1)`, [mine])) === 'not_found:post');
  const pc = await n(`select post_count from sb_topics where id='ootd'`);
  await q(`update sb_posts set deleted_at=now() where topic_id='ootd' and floor=$1`, [pc]);
  T('删掉的编号不回收', await fl(A, { topic_id: 'ootd' }) === `ootd#${pc + 1}`);

  // ---------- 照片识别（识别程序） ----------
  T('前台不能调照片识别', !(await as('nbq_user', B, `select sb_photo_scan($1,0,'{穿搭}',true)`, [P3])).ok);
  T('识别：写标签，可疑的打码送审', (await as('nbq_service', null, `select sb_photo_scan($1,0,'{穿搭,鞋}',true)`, [P3])).v === 'blurred'
    && await n(`select count(*) from sb_photos where post_id=$1 and idx=0 and review='blurred' and flagged_by='auto' and tags='{穿搭,鞋}'`, [P3]) === 1);
  T('识别：不可疑的只写标签', (await as('nbq_service', null, `select sb_photo_scan($1,1,'{宠物}',false)`, [P3])).v === 'ok');
  await q(`update sb_photos set review='ok', reviewed_at=now() where post_id=$1 and idx=1`, [P3]);
  T('人工审过的不再被自动打码', (await as('nbq_service', null, `select sb_photo_scan($1,1,'{宠物}',true)`, [P3])).v === 'ok');
  T('照片不存在：not_found:photo', code(await as('nbq_service', null, `select sb_photo_scan($1,2,'{}',true)`, [mine])) === 'not_found:photo');
  T('打码的照片作者和别人都还能看到这一行（前台按 review 打码）', (await as('nbq_user', A, `select review from sb_photos where post_id=$1 and idx=0`, [P3])).v === 'blurred');
  // ================= S2b 互动 =================
  const A2 = U[26], B2 = U[27], C2 = U[28], D2 = U[29];
  await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [A2, C2]);
  const call = (uid, sql, p) => as('nbq_user', uid, sql, p);
  const PA = (await post(A2, { body: '今天的场', venue_id: V, photos: [{ key: key(A2, 'pa000000') }, { key: key(A2, 'pa111111') }] })).v.id;
  const PC = (await post(A2, { body: '不想被回复', replies_open: false })).v.id;
  const PB = (await post(B2, { body: 'B 的' })).v.id;
  const PL = (await post(A2, { body: '晚点', later: true })).v.id;
  const PO = (await one(`insert into sb_posts(user_id,city,body,created_at,publish_at) values ($1,'melb','昨天',now()-interval '25 hours',now()-interval '25 hours') returning id`, [A2])).id;
  const reps = async p => (await one(`select replies from sb_posts where id=$1`, [p])).replies;
  const rep = (uid, p, body, to) => call(uid, `select api_sb_reply($1,$2,$3)`, [p, body, to || null]);

  // ---------- 回复 ----------
  T('没登录不能回复：login_required', code(await rep(null, PA, '好')) === 'login_required');
  T('停用中不能回复：account_suspended', code(await rep(S, PA, '好')) === 'account_suspended');
  let rr = await rep(B2, PA, '  好看  ');
  const RB = rr.v;
  T('回复：成功，去掉首尾空格，回复数 1', rr.ok && (await one(`select body from sb_replies where id=$1`, [RB])).body === '好看' && await reps(PA) === 1, rr);
  T('回复作者（to = 作者）', (await rep(D2, PA, '同问', A2)).ok && (await one(`select to_user from sb_replies where user_id=$1 order by id desc limit 1`, [D2])).to_user === A2);
  T('回复下面回复过的人', (await rep(D2, PA, '你也在？', B2)).ok);
  T('回复没在这条下面说过话的人 / 自己：invalid:to', code(await rep(D2, PA, 'x', C2)) === 'invalid:to' && code(await rep(D2, PA, 'x', D2)) === 'invalid:to');
  T('空的、超过 60 字：invalid:body', code(await rep(D2, PA, '  ')) === 'invalid:body' && code(await rep(D2, PA, '字'.repeat(61))) === 'invalid:body');
  T('回复里不能有链接：message_link', code(await rep(D2, PA, '看 abc.com')) === 'message_link');
  T('作者关了回复：别人 replies_closed，作者自己可以', code(await rep(B2, PC, '嗨')) === 'replies_closed' && (await rep(A2, PC, '补一句')).ok);
  T('别人不能开关我的回复：not_found:post', code(await call(B2, `select api_sb_replies_open($1,true)`, [PC])) === 'not_found:post');
  T('作者打开回复后别人能回', (await call(A2, `select api_sb_replies_open($1,true)`, [PC])).ok && (await rep(B2, PC, '嗨')).ok);
  T('作者发出后再关回复', (await call(A2, `select api_sb_replies_open($1,false)`, [PC])).ok && code(await rep(D2, PC, '嗨')) === 'replies_closed');
  T('屏蔽了的：not_found:post（不说明原因）', code(await rep(C2, PA, '嗨')) === 'not_found:post');
  T('还没公开、过了 24 小时、不存在：not_found:post', code(await rep(B2, PL, '嗨')) === 'not_found:post' && code(await rep(B2, PO, '嗨')) === 'not_found:post' && code(await rep(B2, id(98), '嗨')) === 'not_found:post');
  const n0 = await reps(PA);
  T('删别人的回复：not_found:reply', code(await call(D2, `select api_sb_reply_delete($1)`, [RB])) === 'not_found:reply');
  T('删自己的回复：回复数跟着少', (await call(B2, `select api_sb_reply_delete($1)`, [RB])).ok && await reps(PA) === n0 - 1);
  T('删两次：not_found:reply', code(await call(B2, `select api_sb_reply_delete($1)`, [RB])) === 'not_found:reply');
  await q(`update sb_replies set status='hidden' where post_id=$1 and user_id=$2 and to_user=$3`, [PA, D2, A2]);
  T('后台隐藏回复：回复数也跟着少', await reps(PA) === n0 - 2);
  const RH = (await rep(U[23], PA, '会被隐藏')).v; await q(`update sb_replies set status='hidden' where id=$1`, [RH]);
  T('回复的人那条被后台隐藏了：不能再「回复 TA」（invalid:to）', code(await rep(D2, PA, '嗯', U[23])) === 'invalid:to');
  T('和我有屏蔽关系的回复人：不能「回复 TA」（invalid:to）', (await rep(U[22], PB, '我先说')).ok && (await q(`insert into blocks(blocker_id,blocked_id) values ($1,$2)`, [U[22], U[21]]), true)
    && code(await rep(U[21], PB, '回你', U[22])) === 'invalid:to' && (await rep(U[20], PB, '回你', U[22])).ok);
  let lastR; for (let i = 0; i < 7; i++) lastR = await rep(U[30], PB, '刷' + i);
  T('回复每分钟 6 条：第 7 条 message_too_fast', !lastR.ok && lastR.code === 'message_too_fast', lastR);

  // ---------- 网球 ----------
  const ball = (uid, p) => call(uid, `select api_sb_ball($1)`, [p]), unball = (uid, p) => call(uid, `select api_sb_unball($1)`, [p]);
  T('没登录不能点：login_required', code(await ball(null, PA)) === 'login_required');
  T('点网球：返回现在的数', (await ball(B2, PA)).v === 1 && (await ball(B2, PA)).v === 1 && (await ball(D2, PA)).v === 2);
  T('自己的也能点', (await ball(A2, PA)).v === 3);
  T('取消：少一个，再取消不变', (await unball(B2, PA)).v === 2 && (await unball(B2, PA)).v === 2);
  T('看不到的不能点也不能取消：not_found:post', code(await ball(C2, PA)) === 'not_found:post' && code(await unball(D2, id(98))) === 'not_found:post' && code(await ball(B2, PL)) === 'not_found:post');
  T('停用中不能点：account_suspended', code(await ball(S, PA)) === 'account_suspended');
  const crowd = Object.values(U).slice(4, 19);
  await Promise.all(crowd.map(u => ball(u, PB)));
  await Promise.all(crowd.slice(0, 5).flatMap(u => [unball(u, PB), ball(u, PB), unball(u, PB)]));
  const bb = await one(`select balls, (select count(*) from sb_balls where post_id=$1) n from sb_posts where id=$1`, [PB]);
  T('15 人同时点、5 人同时来回点：网球数 = 实际点了的人数', +bb.n === bb.balls, bb);
  let lastB; for (let i = 0; i < 31; i++) lastB = await ball(D2, PB);
  T('网球每分钟 30 次：第 31 次 rate_limited', !lastB.ok && lastB.code === 'rate_limited', lastB);

  // ---------- 不感兴趣 ----------
  const hide = (uid, p, r) => call(uid, `select api_sb_hide($1,$2)`, [p, r || 'none']);
  T('没登录：login_required', code(await hide(null, PA)) === 'login_required');
  T('自己的不能点不感兴趣：invalid:post', code(await hide(B2, PB)) === 'invalid:post');
  T('原因不对：invalid:reason', code(await hide(B2, PA, 'ugly')) === 'invalid:reason');
  T('先隐藏（没说原因），之后看不到这条', (await hide(B2, PA)).ok && (await call(B2, `select count(*) from sb_posts where id=$1`, [PA])).v === '0');
  T('补原因：少看这个人', (await hide(B2, PA, 'user')).ok && (await one(`select reason from sb_hides where user_id=$1 and post_id=$2`, [B2, PA])).reason === 'user');
  T('隐藏后不能回复、不能点网球', code(await rep(B2, PA, '嗨')) === 'not_found:post' && code(await ball(B2, PA)) === 'not_found:post');
  T('看不到的不能隐藏：not_found:post', code(await hide(C2, PA)) === 'not_found:post' && code(await hide(B2, id(98))) === 'not_found:post');
  T('不通知对方、对方看不到谁隐藏了', (await call(A2, `select count(*) from sb_hides`)).v === '0');

  // ---------- 浏览 / 分享 ----------
  const views = async p => (await one(`select views, shares from sb_posts where id=$1`, [p]));
  const view = (uid, arr, dev) => call(uid, `select api_sb_view($1::uuid[],$2)`, [arr, dev || null]);
  const v0 = (await views(PA)).views;
  T('没登录按设备算：两条都算', (await view(null, [PA, PB], 'devAAAAAAAAAAAAAAAA')).v === 2);
  T('同一台设备同一天再看不算', (await view(null, [PA, PB], 'devAAAAAAAAAAAAAAAA')).v === 0);
  T('另一台设备算', (await view(null, [PA], 'devBBBBBBBBBBBBBBBB')).v === 1);
  T('没登录也没设备 id、设备 id 格式不对：invalid:device', code(await view(null, [PA])) === 'invalid:device' && code(await view(null, [PA], 'x')) === 'invalid:device');
  T('登录的一人一天一次', (await view(D2, [PA])).v === 1 && (await view(D2, [PA], 'devCCCCCCCCCCCCCCCC')).v === 0);
  T('自己的、隐藏了的、没公开的、过期的不算', (await view(A2, [PA])).v === 0 && (await view(B2, [PA])).v === 0 && (await view(D2, [PL, PO])).v === 0);
  T('浏览数 = 算上的次数', (await views(PA)).views === v0 + 3);
  T('一次最多 50 条：invalid:posts', code(await view(D2, Array(51).fill(PA))) === 'invalid:posts');
  const share = (uid, p, dev) => call(uid, `select api_sb_share($1,$2)`, [p, dev || null]);
  T('分享：一人一天一次，和浏览分开算', (await share(null, PA, 'devAAAAAAAAAAAAAAAA')).v === 1 && (await share(null, PA, 'devAAAAAAAAAAAAAAAA')).v === 0 && (await share(D2, PA)).v === 1 && (await views(PA)).shares === 2 && (await views(PA)).views === v0 + 3);

  // ---------- 举报 ----------
  const report = (uid, type, target, reason) => call(uid, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,$2,$3,$4,'in_app','sideline') returning id`, [uid, type, String(target), reason]);
  await q(`update sb_photos set review='ok', reviewed_at=now() where post_id=$1 and idx=1`, [PA]);
  T('举报不当照片：成功', (await report(D2, 'sb_post', PA, 'photo')).ok);
  T('举报照片 → 没审过的照片先打码送审，审过的不动', await n(`select count(*) from sb_photos where post_id=$1 and idx=0 and review='blurred' and flagged_by='report'`, [PA]) === 1
    && await n(`select count(*) from sb_photos where post_id=$1 and idx=1 and review='ok'`, [PA]) === 1);
  const RV = (await one(`select id from sb_replies where post_id=$1 and status='visible' and deleted_at is null and user_id=$2 limit 1`, [PA, D2])).id;
  T('举报回复（骚扰或冒犯）：成功；隐藏了那条发布的人举报不了下面的回复', (await report(U[30], 'sb_reply', RV, 'harass')).ok && code(await report(B2, 'sb_reply', RV, 'other')) === 'not_found:reply');
  T('举报自己的：invalid:target', code(await report(A2, 'sb_post', PA, 'other')) === 'invalid:target');
  T('看不到的、不存在的、乱写的：not_found', code(await report(C2, 'sb_post', PA, 'harass')) === 'not_found:post' && code(await report(D2, 'sb_post', id(98), 'harass')) === 'not_found:post'
    && code(await report(D2, 'sb_post', 'abc', 'harass')) === 'not_found:post' && code(await report(D2, 'sb_reply', 'abc', 'harass')) === 'not_found:reply' && code(await report(D2, 'sb_reply', 999999, 'harass')) === 'not_found:reply');
  T('场边举报只能选那四个原因', !(await report(D2, 'sb_post', PB, 'no_show')).ok);
  T('没登录不能举报', !(await report(null, 'sb_post', PB, 'harass')).ok);
  T('被举报的人看不到谁举报了', (await call(A2, `select count(*) from reports`)).v === '0');
  // ================= S2b+ 互动通知（数据库这一侧；推送文字和发送见 notify.mjs） =================
  const X1 = U[17], X2 = U[18];   // 前面的网球段落把 D2 的次数用完了，这里换两个人
  const PN = (await post(A2, { body: '通知用' })).v.id;
  const NT2 = (u, k, p = PN) => q(`select * from notifications where user_id=$1 and kind=$2 and sb_post_id=$3 order by id`, [u, k, p]).then(r => r.rows);
  await ball(X1, PN);
  let nb = await NT2(A2, 'sb_ball');
  T('网球：作者收到一条，记下是谁、哪条', nb.length === 1 && nb[0].actor_id === X1 && nb[0].sb_count === 1 && nb[0].read_at === null, nb);
  await ball(X2, PN); await ball(X1, PN); await ball(A2, PN);
  nb = await NT2(A2, 'sb_ball');
  T('网球：没看之前合并进同一条（2 人、最近是后点的那个）；重复点、自己点不算', nb.length === 1 && nb[0].sb_count === 2 && nb[0].actor_id === X2, nb.map(x => [x.sb_count, x.actor_id]));
  await unball(X2, PN); nb = await NT2(A2, 'sb_ball');
  T('取消网球：人数跟着少，名字换回还在的人', nb.length === 1 && nb[0].sb_count === 1 && nb[0].actor_id === X1, nb.map(x => [x.sb_count, x.actor_id]));
  await unball(X1, PN);
  T('都取消了：这条没看的提醒拿掉', (await NT2(A2, 'sb_ball')).length === 0);
  await ball(X1, PN); await q(`update notifications set read_at=now() where user_id=$1 and kind='sb_ball'`, [A2]);
  await unball(X1, PN);
  T('看过的提醒，取消网球不动它', (await NT2(A2, 'sb_ball')).length === 1);
  await ball(X2, PN);
  T('看过之后再有新网球：新的一条（会再推）', (await NT2(A2, 'sb_ball')).length === 2 && (await NT2(A2, 'sb_ball'))[1].sb_count === 1);
  const PN2 = (await post(A2, { body: '很多人点' })).v.id;
  await Promise.all(Object.values(U).slice(4, 16).map(u => ball(u, PN2)));
  nb = await NT2(A2, 'sb_ball', PN2);
  T('12 人同时点：只有一条，12 人', nb.length === 1 && nb[0].sb_count === 12, nb.map(x => x.sb_count));
  // 回复
  const PN3 = (await post(A2, { body: '回复用' })).v.id;
  const r1 = (await rep(B2, PN3, '第一条')).v;
  let nr = await NT2(A2, 'sb_reply', PN3);
  T('回复：作者收到，记下回复 id', nr.length === 1 && nr[0].actor_id === B2 && +nr[0].sb_reply_id === +r1 && nr[0].sb_count === 1, nr);
  await rep(D2, PN3, '第二条'); await rep(B2, PN3, '第三条');
  nr = await NT2(A2, 'sb_reply', PN3);
  T('回复：10 分钟内合并（2 人，同一人两条算 1 人），记最近一条', nr.length === 1 && nr[0].sb_count === 2 && nr[0].actor_id === B2, nr.map(x => [x.sb_count, x.actor_id]));
  await q(`update notifications set created_at = created_at - interval '11 minutes' where id=$1`, [nr[0].id]);
  await rep(D2, PN3, '过了十分钟');
  T('回复：超过 10 分钟，新的一条（会再推）', (await NT2(A2, 'sb_reply', PN3)).length === 2);
  await rep(D2, PN3, '回 B', B2);
  T('回复某人：被回复的人收到 sb_reply_to，作者照常收到', (await NT2(B2, 'sb_reply_to', PN3)).length === 1 && (await NT2(A2, 'sb_reply', PN3)).at(-1).sb_count === 1 + 0 && (await NT2(A2, 'sb_reply_to', PN3)).length === 0);
  await rep(D2, PN3, '回作者', A2);
  T('回复作者：作者只收一条（不重复收 sb_reply_to）', (await NT2(A2, 'sb_reply_to', PN3)).length === 0);
  await rep(A2, PN3, '作者回 D', D2);
  T('作者自己回复：作者不收，被回复的人收', (await NT2(D2, 'sb_reply_to', PN3)).length === 1 && (await NT2(A2, 'sb_reply', PN3)).every(x => x.actor_id !== A2));
  T('自己看得到自己的通知（带发布 id、人数）', (await call(A2, `select count(*) from notifications where sb_post_id is not null`)).v > 0 && (await call(B2, `select count(*) from notifications where user_id<>$1`, [B2])).v === '0');
  // 推送前判断过时
  const nid = (await NT2(D2, 'sb_reply_to', PN3))[0].id;
  T('过时判断：正常 = 空', (await as('nbq_service', null, `select sb_notif_stale($1)`, [nid])).v === null);
  await q(`update sb_replies set deleted_at=now() where id=(select sb_reply_id from notifications where id=$1)`, [nid]);
  T('过时判断：回复删了 = removed', (await as('nbq_service', null, `select sb_notif_stale($1)`, [nid])).v === 'removed');
  const nid2 = (await NT2(A2, 'sb_ball', PN2))[0].id;
  await q(`update sb_posts set status='hidden' where id=$1`, [PN2]);
  T('过时判断：发布被隐藏 = removed', (await as('nbq_service', null, `select sb_notif_stale($1)`, [nid2])).v === 'removed');
  T('前台调不了过时判断、也不能自己造通知', !(await call(A2, `select sb_notif_stale($1)`, [nid2])).ok && !(await call(A2, `select sb_notify_ball($1,$2,true)`, [PN, B2])).ok);
  await q(`delete from sb_posts where id=$1`, [PN2]);
  T('发布真删了（注销匿名化时）：通知一起删', await n(`select count(*) from notifications where id=$1`, [nid2]) === 0);

  // ---------- S2c 收口：没登录一律不能写 · 被拒的操作记风险信号 · 下载我的数据 ----------
  const W = [41, 42, 43].map(id); for (const [i, u] of W.entries()) await q(`insert into users(id,phone_e164,nickname,utr,gender) values ($1,$2,$3,5,'f')`, [u, '+614100000' + (41 + i), 'W' + (41 + i)]);
  const [WA, WB, WC] = W;
  const WP = (await post(WA, { body: '收口用的一条', topic_title: '收口专用话题', venue_id: V, photos: [{ key: key(WA, 'wphoto01'), w: 800, h: 600 }] })).v;
  const WR = (await call(WB, `select api_sb_reply($1,'回一句',$2)`, [WP.id, WA])).v;
  // 没登录：每个写接口都是 login_required（不说别的原因）；浏览 / 分享可以（按设备）
  const writes = [[`select api_sb_post($1::jsonb)`, [JSON.stringify({ body: 'x' })]], [`select api_sb_delete($1)`, [WP.id]], [`select api_sb_reply($1,'x')`, [WP.id]],
    [`select api_sb_reply_delete($1)`, [WR]], [`select api_sb_replies_open($1,false)`, [WP.id]], [`select api_sb_ball($1)`, [WP.id]], [`select api_sb_unball($1)`, [WP.id]],
    [`select api_sb_hide($1,'none')`, [WP.id]], [`select api_sb_hide($1,'far')`, [WP.id]], [`select api_export_me()`, []]];
  for (const [sql, ps] of writes) T(`没登录：${sql.slice(7, 30)} → login_required`, code(await as('nbq_user', null, sql, ps)) === 'login_required');
  for (const [sql, ps] of writes) T(`登录的人已不存在（真删了）：${sql.slice(7, 30)} → login_required`, code(await as('nbq_user', id(77), sql, ps)) === 'login_required');
  T('没登录也没写进去：发布、回复、网球、不感兴趣都没变', await n(`select count(*) from sb_posts where user_id=$1`, [WA]) === 1 && await n(`select count(*) from sb_replies where post_id=$1`, [WP.id]) === 1
    && await n(`select balls from sb_posts where id=$1`, [WP.id]) === 0 && await n(`select count(*) from sb_hides where post_id=$1`, [WP.id]) === 0 && (await one(`select replies_open from sb_posts where id=$1`, [WP.id])).replies_open === true);
  T('没登录举报：拒绝', !(await as('nbq_user', null, `insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'sb_post',$2,'harass','in_app','sideline')`, [WB, WP.id])).ok);
  T('没登录能浏览、分享（按设备）', (await as('nbq_user', null, `select api_sb_view($1::uuid[],'dev_s2c_0123456789')`, [[WP.id]])).v === 1 && (await as('nbq_user', null, `select api_sb_share($1,'dev_s2c_0123456789')`, [WP.id])).v === 1);
  for (const t of ['sb_posts', 'sb_photos', 'sb_replies', 'sb_balls', 'sb_hides', 'sb_views', 'sb_topics'])
    T(`前台（没登录 / 登录）都不能直接改 ${t}`, !(await as('nbq_user', null, `delete from ${t}`)).ok && !(await as('nbq_user', WA, `update ${t} set ${t === 'sb_topics' ? 'title' : t === 'sb_views' ? 'viewer' : t === 'sb_balls' || t === 'sb_hides' ? 'created_at' : t === 'sb_photos' ? 'storage_key' : 'body'} = ${t === 'sb_balls' || t === 'sb_hides' ? 'now()' : "'x'"}`)).ok);
  const pubFns = (await q(`select p.proname from pg_proc p where p.proname like any (array['api_sb_%','sb_%']) and p.pronamespace='public'::regnamespace
      and (has_function_privilege('public', p.oid, 'execute') or (exists (select 1 from pg_roles where rolname='anon') and has_function_privilege('anon', p.oid, 'execute')))`)).rows.map(x => x.proname);
  T('场边函数 PUBLIC / anon 都不能调（只能经后端以 nbq_user 调）', pubFns.length === 0, pubFns);

  // 被拒的操作记风险信号（后端收到错误码后另开事务以 nbq_service 调 risk_log_rejected）
  const svc = (sql, ps) => as('nbq_service', null, sql, ps);
  const rej = await post(WC, { body: '看 www.x.com' });
  T('场边发链接被拒：message_link，什么都没写进去', code(rej) === 'message_link' && await n(`select count(*) from sb_posts where user_id=$1`, [WC]) === 0);
  T('发布带链接 → link_attempt（相关对象 = 错误码）', (await svc(`select risk_log_rejected($1,'message_link')`, [WC])).v === 'link_attempt');
  T('回复带链接 → link_attempt（相关对象 = 发布 id）', code(await call(WC, `select api_sb_reply($1,'tennis.net/a')`, [WP.id])) === 'message_link'
    && (await svc(`select risk_log_rejected($1,'message_link',$2)`, [WC, WP.id])).v === 'link_attempt' && await n(`select count(*) from risk_events where user_id=$1 and kind='link_attempt' and ref=$2`, [WC, WP.id]) === 1);
  T('话题名带链接被拒（后端按 message_link 记，见 api_spec §14.10）', code(await post(WC, { body: 'x', topic_title: 'abc.com' })) === 'topic_name_not_allowed:link'
    && (await svc(`select risk_log_rejected($1,'message_link','topic')`, [WC])).v === 'link_attempt');
  for (const k of ['sb_post_hourly_limit', 'sb_post_daily_limit', 'sb_topic_daily_limit', 'message_too_fast', 'rate_limited'])
    T(`场边频率上限 ${k} → rate_hit`, (await svc(`select risk_log_rejected($1,$2)`, [WC, k])).v === 'rate_hit');
  for (const k of ['topic_too_generic', 'replies_closed', 'topic_ended', 'not_found', 'invalid'])
    T(`普通的拒绝 ${k} 不记`, (await svc(`select risk_log_rejected($1,$2)`, [WC, k])).v === null);
  T('话题名带链接：后端按 message_link 记（topic_name_not_allowed 本身不记，见 api_spec §14.10）', (await svc(`select risk_log_rejected($1,'topic_name_not_allowed')`, [WC])).v === null);
  T('前台不能自己记 / 抹掉风险信号', !(await call(WC, `select risk_log_rejected($1,'message_link')`, [WC])).ok && !(await call(WC, `delete from risk_events`)).ok);
  await svc(`select job_risk_scores()`);
  T('7 天内 3 次发链接 → 风险提醒「反复尝试发链接」', await n(`select count(*) from risk_alerts where user_id=$1 and rule_code='link_spam'`, [WC]) === 1);
  T('5 次触发频率限制 → 风险提醒「反复触发频率限制」', await n(`select count(*) from risk_alerts where user_id=$1 and rule_code='rate_hit'`, [WC]) === 1);

  // 下载我的数据：加上场边
  await call(WA, `select api_sb_ball($1)`, [P3]); await call(WA, `select api_sb_hide($1,'far')`, [PB]);
  const WD = (await post(WA, { body: '删掉的那条' })).v.id; await call(WA, `select api_sb_delete($1)`, [WD]);
  const WH = (await post(WA, { body: '被后台隐藏的那条' })).v.id; await q(`update sb_posts set status='hidden', hidden_reason='内部原因XYZ' where id=$1`, [WH]);
  await q(`update sb_photos set tags='{内部标签QQ}', review='blurred', flagged_by='auto' where post_id=$1`, [WP.id]);
  await call(WA, `select api_sb_reply($1,'作者自己回一句',$2)`, [WP.id, WB]);
  await call(WB, `select api_sb_hide($1,'user')`, [WH]).catch(() => { });
  await q(`delete from rate_hits where subject=$1 and grp='export'`, [WA]);
  const X = (await call(WA, `select api_export_me()`)).v || {}, XS = JSON.stringify(X.sideline || {});
  const XP = (X.sideline?.posts || []).find(p => p.id === WP.id);
  T('导出：有场边一栏', X.sideline && Array.isArray(X.sideline.posts), Object.keys(X));
  T('导出：自己的发布（话题、编号、球场、照片键、计数）', XP && XP.body === '收口用的一条' && XP.topic === '收口专用话题' && XP.floor === 1 && XP.venue === 'Kooyong Lawn Tennis Club'
    && XP.photos.length === 1 && XP.photos[0] === key(WA, 'wphoto01') && XP.replies === 2, XP);
  T('导出：后台隐藏的也在（相册里看得到），删了的不在', XS.includes('被后台隐藏的那条') && !XS.includes('删掉的那条'));
  T('导出：不含后台隐藏原因、照片识别标签和审核结果', !XS.includes('内部原因XYZ') && !XS.includes('内部标签QQ') && !XS.includes('blurred') && !/hidden_reason|tags|review/.test(XS));
  T('导出：自己的回复（回复谁）、点过的网球、不感兴趣、发起的话题', X.sideline.replies.length === 1 && X.sideline.replies[0].to === 'W42' && X.sideline.balls_given.some(b => b.post === P3)
    && X.sideline.not_interested.length === 1 && X.sideline.not_interested[0].reason === 'far' && X.sideline.topics_started.some(t => t.title === '收口专用话题'), X.sideline);
  T('导出：不含别人对我的不感兴趣、别人的回复内容', !XS.includes('"user"') && !XS.includes('"回一句"'), XS.slice(0, 300));
} catch (e) { fail++; console.log('FAIL 异常', e.stack) }
finally { await pool?.end().catch(() => { }); c.stop() }
console.log(`sb_api: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
