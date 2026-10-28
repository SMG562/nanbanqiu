// 第七批 S4：场边配置下发（schema ㉕ 末尾）。后台改草稿 → 发布成版本 → 前台读 sb_config(版本号)；退回；操作留痕；权限；
//   以及前台设计稿（南伴球_场边设计稿_v35.html）、正式后台（南伴球_后台.html 里场边四页的配置，A1 并入）和数据库第 1 版配置是同一份（话题、问题、开头、时段、周历、设置……）
import fs from 'fs'; import vm from 'vm'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const J = JSON.stringify;
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = (role, id) => async (sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (id) await cl.query(`select set_config('${role === 'nbq_user' ? 'nbq.uid' : 'nbq.admin'}', $1, true)`, [id]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const is = (r, code, detail) => !r.ok && r.err === code && (detail === undefined || r.detail === detail);
  const mk = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,cities) values ($1,$2,$3,'x','x',$4) returning id`, [email, email.split('@')[0], role, cities])).id;
  const O = await mk('han@x.com', 'owner'), OPA = await mk('amy@x.com', 'operator'), OPM = await mk('melb@x.com', 'operator', ['melb']), VW = await mk('view@x.com', 'viewer');
  const own = as('nbq_admin', O), amy = as('nbq_admin', OPA), opm = as('nbq_admin', OPM), vw = as('nbq_viewer', VW), anon = as('nbq_user', null);
  const set = (who, part, value, base) => who(`select admin_sb_config_set($1, $2::jsonb, $3) r`, [part, J(value), base]);
  const draft = async () => (await amy(`select admin_sb_config_draft() r`)).v;
  const cfg = async () => (await one(`select sb_config_export() c`)).c;

  // ---------- 第 1 版 = 设计稿 ----------
  const v1 = (await one(`select * from sb_config_versions where version = 1`));
  T('建库时存了第 1 版（设计稿 v35）', !!v1 && v1.note === '初始配置（设计稿 v35）' && +(await one(`select count(*) n from sb_config_versions`)).n === 1);
  T('第 1 版 = 正式配置表导出', J(v1.config) === J(await cfg()));
  const A = fs.readFileSync(path.join(DIR, '南伴球_后台.html'), 'utf8'), F = fs.readFileSync(path.join(DIR, '南伴球_场边设计稿_v35.html'), 'utf8');
  const grab = (h, name, end) => { const i = h.indexOf(`const ${name}=`); if (i < 0) return null; const j = h.indexOf(end, i); return vm.runInNewContext('(' + h.slice(i + name.length + 7, j + end.length - 1) + ')') };
  const AT = grab(A, 'SB_TOPICS', '];'), FT = grab(F, 'TOPICS', '}};'), C = v1.config;
  const ed = C.topics.filter(t => t.id !== 'rain');   // 雨停了 暂不做（10-27），后台页面里也没有这个话题
  const at = AT.filter(t => t.kind !== '大家发起');
  T('后台页面的话题（常驻 + 限时）= 数据库：名字、说明、问题、开头、照片标签、上线、推荐、顺序',
    J(at.map(t => [t.id, t.t, t.q, t.ask, t.fills, t.photo, t.on, t.sug])) === J([...ed].sort((a, b) => at.findIndex(x => x.id === a.id) - at.findIndex(x => x.id === b.id)).map(t => [t.id, t.title, t.intro, t.ask, t.starters, t.photo_tags, t.active, t.suggest])),
    { 设计稿: at.map(t => t.id), 数据库: ed.map(t => t.id) });
  T('后台页面的限时话题起止 = 数据库（设计稿写最后一天）', (() => { const a = at.find(t => t.id === 'ao'), d = ed.find(t => t.id === 'ao'); return a.from === '2027-01-12' && +new Date(d.starts_at) === +new Date('2027-01-12T00:00:00+11:00') && +new Date(d.ends_at) === +new Date(a.to + 'T00:00:00+11:00') + 86400000 })());
  const fe = Object.entries(FT).filter(([, t]) => !t.user);
  T('前台设计稿 v35 的常驻话题 = 数据库（名字、说明、问题、开头）', fe.length === 10 && fe.every(([id, t]) => { const d = ed.find(x => x.id === id); return d && d.kind === 'evergreen' && d.title === t.t && d.intro === t.q && d.ask === t.ask && J(d.starters) === J(t.fills) }),
    fe.filter(([id, t]) => { const d = ed.find(x => x.id === id); return !(d && d.title === t.t && d.intro === t.q && d.ask === t.ask && J(d.starters) === J(t.fills)) }).map(x => x[0]));
  T('相似词、太宽的词 = 后台页面', J([...grab(A, 'SB_ALIAS', '];')].sort()) === J(C.alias) && J([...grab(A, 'SB_GENERIC', '];')].sort()) === J(C.generic));
  const R = grab(A, 'SB_RULES', '};'), S = grab(A, 'SB_SET', '};'), st = C.settings;
  T('设置 = 后台页面（名字长短、门槛、沉下去、轮播间隔、停留、推荐几个、问题字数）', R.min === st.name_min && R.max === st.name_max && R.people === st.release_people && R.days === st.release_days && R.sink === st.sink_days
    && S.every === st.hint_every && S.hold === st.hint_hold && S.sugN === st.suggest_n && S.hlen === st.hint_max_len, { R, S, st });
  T('周历 = 后台页面（话题 / 本周最热、说明）', J(grab(A, 'SB_WEEK', '];').map(w => [w[1], w[2]])) === J(C.week.map(w => [w.auto_hot ? '@hot' : w.topic_id, w.note])));
  T('周日隔周轮换的是 #实用网球好物（设计稿写在说明里）', C.week[6].alt_topic_id === 'good' && /实用网球好物/.test(C.week[6].note));
  T('时段 = 后台页面 = 前台设计稿', J(grab(A, 'SB_SLOTS', '];').map(s => [s.n, s.f, s.to, s.tp])) === J(C.slots.map(s => [s.name, s.from, s.to, s.topics])) && J(grab(F, 'SLOTT', '];')) === J(C.slots.map(s => s.topics)));
  T('底栏问题 = 后台页面（通用、失物、球场 3 句含白天 / 晚上）', J([...grab(A, 'SB_GENQ', '];').map(g => ['', g.t]), ...grab(A, 'SB_COURTQ', '];').map(q => [q.day ? 'day' : q.night ? 'night' : 'any', q.t])])
    === J([...C.hints.filter(h => h.kind !== 'court').map(h => ['', h.text]), ...C.hints.filter(h => h.kind === 'court').map(h => [h.daypart, h.text])]));
  T('球场 / 失物开头 = 后台页面', J(grab(A, 'SB_COURTF', '];')) === J(C.starters.court) && J(grab(A, 'SB_LOSTF', '];')) === J(C.starters.lost));
  T('特别安排：澳网 = 设计稿；雨停了 暂不做（不上线）', (() => { const e = grab(A, 'SB_EVENTS', '];')[0], s = C.specials.find(x => x.topic_id === 'ao'), r = C.specials.find(x => x.trigger === 'rain');
    return e.id === 'ao' && s.active && +new Date(s.starts_at) === +new Date(e.from + 'T00:00:00+11:00') && +new Date(s.ends_at) === +new Date(e.to + 'T00:00:00+11:00') + 86400000 && r && !r.active })());

  // ---------- 前台读 ----------
  let r = await anon(`select sb_config(null) r`);
  T('没登录也能读配置：版本号 + 上线的话题（没上线的澳网、雨停了不给）', r.ok && r.v.version === 1 && r.v.config.topics.length === 10 && r.v.config.topics.every(t => t.active), r);
  T('前台拿不到只给后台看的说明；没上线的特别安排不给', r.v.config.week.every(w => !('note' in w)) && r.v.config.specials.every(s => !('note' in s) && s.active) && r.v.config.specials.length === 1);
  T('版本没变只回 same', (x => x.version === 1 && x.same === true && Object.keys(x).length === 2)((await anon(`select sb_config(1) r`)).v));
  T('前台不能读草稿 / 版本表、不能调后台函数', !(await anon(`select * from sb_config_draft`)).ok && !(await anon(`select * from sb_config_versions`)).ok
    && !(await anon(`select admin_sb_config_draft()`)).ok && !(await anon(`select admin_sb_config_set('hints','[]'::jsonb,1)`)).ok && !(await anon(`select sb_config_apply('{}'::jsonb)`)).ok);

  // ---------- 权限 ----------
  T('只读管理员能看草稿和版本', (await vw(`select admin_sb_config_draft() r`)).ok && (await vw(`select * from admin_sb_config_versions()`)).rows.length === 1);
  const hints2 = [...C.hints, { kind: 'general', text: '今天的球感怎么样？', daypart: 'any', active: true }];
  T('只读管理员不能改', !(await vw(`select admin_sb_config_set('hints', $1::jsonb, 1)`, [J(hints2)])).ok);
  T('只负责部分城市的运营不能改（配置所有城市共用）', is(await set(opm, 'hints', hints2, 1), 'admin_forbidden', 'city'));
  T('权限表有 sideline.config（超级管理员、运营；不要理由）', J(await one(`select roles, need_reason from admin_perms where action='sideline.config'`)) === J({ roles: ['owner', 'operator'], need_reason: false }));

  // ---------- 草稿 ----------
  r = await set(amy, 'hints', hints2, 1);
  T('运营改底栏问题 → 草稿记下改了「问题」，正式的还没变', r.ok && J(r.v.changed) === J(['hints']) && +(await one(`select count(*) n from sb_hints`)).n === 5 && (await anon(`select sb_config(1) r`)).v.same, r);
  T('草稿记了谁改的', (await draft()).updated_by === 'amy');
  T('别人在这期间发布过（版本号对不上）→ admin_config_stale', is(await set(amy, 'hints', hints2, 0), 'admin_config_stale', '1'));
  const bad = [
    ['周历只有 6 天', 'week', C.week.slice(0, 6), 'config:week'],
    ['时段指向没上线的话题', 'slots', C.slots.map((s, i) => i ? s : { ...s, topics: ['ao', 'gear'] }), 'config:slots:topic'],
    ['通用问题里带 {球场}', 'hints', [...C.hints, { kind: 'general', text: '{球场} 好吗？' }], 'config:hints'],
    ['没有一句通用问题', 'hints', C.hints.filter(h => h.kind !== 'general'), 'config:hints:general'],
    ['名字最短改成 30', 'settings', { ...C.settings, name_min: 30 }, 'config:settings:name_min'],
    ['名字最短 > 最长', 'settings', { ...C.settings, name_min: 8, name_max: 6 }, 'config:settings:name_min'],
    ['设置不是整数', 'settings', { ...C.settings, sink_days: 2.5 }, 'config:settings:sink_days'],
    ['没有的设置项', 'settings', { ...C.settings, foo: 1 }, 'config:settings:foo'],
    ['话题名超过 12 字', 'topics', C.topics.map(t => t.id === 'ootd' ? { ...t, title: '一二三四五六七八九十一二三' } : t), 'config:topics:ootd'],
    ['话题重复', 'topics', [...C.topics, C.topics.find(t => t.id === 'ootd')], 'config:topics:ootd'],
    ['话题开头超过 16 字', 'topics', C.topics.map(t => t.id === 'ootd' ? { ...t, starters: ['一二三四五六七八九十一二三四五六七'] } : t), 'config:topics'],
    ['限时话题没有起止', 'topics', C.topics.map(t => t.id === 'ao' ? { ...t, starts_at: null } : t), 'config:topics'],
    ['下线一个时段还在用的话题', 'topics', C.topics.filter(t => t.id !== 'brain'), 'config:slots:topic'],
    ['相似词指向不存在的话题', 'alias', [...C.alias, ['发球', 'nope']], 'config:alias'],
    ['开头只能是球场 / 失物', 'starters', { ...C.starters, other: ['x'] }, 'config:starters:other'],
    ['特别安排没有起止', 'specials', [...C.specials, { topic_id: 'pet', trigger: 'date' }], 'config:specials'],
  ];
  for (const [name, part, value, det] of bad) { const x = await set(amy, part, value, 1); T('保存时就检查：' + name + ' → invalid ' + det, is(x, 'invalid', det), x) }
  T('检查失败不改草稿，正式的也没动', J((await draft()).changed) === J(['hints']) && J(await cfg()) === J(C));
  r = await set(amy, 'hints', C.hints, 1);
  T('改回和正式一样 → 草稿没了', r.ok && J(r.v.changed) === J([]) && !(await one(`select count(*) n from sb_config_draft`)).n === false && +(await one(`select count(*) n from sb_config_draft`)).n === 0);
  await set(amy, 'hints', hints2, 1);
  T('放弃草稿', (await amy(`select admin_sb_config_discard(1)`)).ok && +(await one(`select count(*) n from sb_config_draft`)).n === 0);

  // ---------- 发布 ----------
  await set(amy, 'hints', hints2, 1);
  T('发布要一句说明', is(await amy(`select admin_sb_config_publish('', 1)`), 'invalid', 'note'));
  r = await amy(`select admin_sb_config_publish('底栏加一句：今天的球感', 1) r`);
  T('发布 → 第 2 版，正式表生效，草稿清掉', r.ok && r.v === 2 && +(await one(`select count(*) n from sb_hints`)).n === 6 && +(await one(`select count(*) n from sb_config_draft`)).n === 0, r);
  r = await anon(`select sb_config(1) r`);
  T('前台拿到第 2 版', r.v.version === 2 && r.v.config.hints.some(h => h.text === '今天的球感怎么样？'));
  T('没有改动不能发布', is(await amy(`select admin_sb_config_publish('再发一次', 2)`), 'invalid', 'unchanged'));
  T('两个人同时发布：后发布的版本号对不上', (await set(own, 'hints', C.hints, 2)).ok && (await own(`select admin_sb_config_publish('去掉那句', 2)`)).ok && is(await amy(`select admin_sb_config_publish('我也发', 2)`), 'admin_config_stale', '3'));
  // 话题：改问题、加常驻、下线、转为常驻
  await q(`insert into users(id,phone_e164,nickname,utr,gender) values ('00000000-0000-0000-0000-000000000001','+61400000001','Yuki',5,'f')`);
  await q(`insert into sb_topics(id,title,kind,active,city,created_by,suggest) values ('u_back','反手终于开窍了','user',true,'melb','00000000-0000-0000-0000-000000000001',false)`);
  const C3 = await cfg();
  const T4 = [...C3.topics.filter(t => t.id !== 'trip').map(t => t.id === 'ootd' ? { ...t, ask: '今天穿了什么？' } : t),
    { id: 'serve', title: '发球日记', kind: 'evergreen', intro: '每天练一筐发球。', ask: '今天发了几个好球？', starters: ['今天发球'], photo_tags: [], suggest: true, active: true, sort: 110 },
    { id: 'u_back', title: '反手终于开窍了', kind: 'evergreen', intro: '', ask: '', starters: [], photo_tags: [], suggest: false, active: true, sort: 120 }];
  r = await set(own, 'topics', T4, 3);
  T('话题草稿：只改了「话题」', r.ok && J(r.v.changed) === J(['topics']), r);
  T('草稿里的时间写法和版本一致（写成 +11:00 也一样）', (await set(own, 'topics', T4.map(t => t.id === 'ao' ? { ...t, starts_at: '2027-01-12T00:00:00+11:00' } : t), 3)).v.changed.length === 1);
  r = await own(`select admin_sb_config_publish('话题：改问题、加发球日记、下线旅行、反手转常驻', 3) r`);
  const tp = id => one(`select kind, active, ask from sb_topics where id=$1`, [id]);
  T('发布后：改了问题、新话题上线、拿掉的下线、大家发起的转为常驻', r.v === 4 && (await tp('ootd')).ask === '今天穿了什么？' && (await tp('serve')).active && !(await tp('trip')).active && (await tp('u_back')).kind === 'evergreen', r);
  await q(`insert into sb_topics(id,title,kind,active,city,created_by,suggest) values ('u_lim','想改成限时','user',true,'melb','00000000-0000-0000-0000-000000000001',false)`);
  T('大家发起的话题不能改成限时', is(await set(own, 'topics', [...(await cfg()).topics, { id: 'u_lim', title: '想改成限时', kind: 'limited', starts_at: '2027-01-01T00:00:00Z', ends_at: '2027-02-01T00:00:00Z' }], 4), 'invalid', 'config:topics:u_lim'));
  T('新话题名和大家发起的话题重名不行', is(await set(own, 'topics', [...(await cfg()).topics, { id: 'dup', title: '想改成限时', kind: 'evergreen', active: true }], 4), 'invalid', 'config:topics'));
  // 排期：发布后今日推荐马上变
  const dow = +(await one(`select extract(isodow from (now() at time zone 'Australia/Melbourne'))::int d`)).d, today = (await one(`select (now() at time zone 'Australia/Melbourne')::date::text d`)).d;
  const W = (await cfg()).week.map(w => w.dow === dow ? { ...w, topic_id: 'serve', alt_topic_id: null, auto_hot: false } : w);
  await set(own, 'week', W, 4); r = await own(`select admin_sb_config_publish('今天推发球日记', 4) r`);
  T('改了排期 → 发布后今日推荐马上变（不用等每小时的任务）', r.v === 5 && (await one(`select topic_id from sb_today where city='melb' and day=$1`, [today])).topic_id === 'serve'
    && (await anon(`select sb_today_topic('melb') r`)).v.topic_id === 'serve', r);

  // ---------- 退回 ----------
  await set(amy, 'hints', hints2, 5);
  T('不能退回到当前版本 / 不存在的版本', is(await own(`select admin_sb_config_rollback(5, 5)`), 'invalid', 'unchanged') && is(await own(`select admin_sb_config_rollback(99, 5)`), 'not_found', 'version'));
  r = await own(`select admin_sb_config_rollback(1, 5) r`);
  const now = await cfg(), drop = c => ({ ...c, topics: undefined });
  T('退回到第 1 版 → 第 6 版（记从哪版退回）；草稿一起清掉', r.v === 6 && (await one(`select from_version, note from sb_config_versions where version=6`)).from_version === 1
    && (await one(`select note from sb_config_versions where version=6`)).note === '退回到 v1' && +(await one(`select count(*) n from sb_config_draft`)).n === 0, r);
  T('退回后：除话题外和第 1 版一模一样；第 1 版的话题原样恢复，之后加的话题下线', J(drop(now)) === J(drop(C)) && C.topics.every(t => J(now.topics.find(x => x.id === t.id)) === J(t))
    && now.topics.filter(t => !C.topics.some(x => x.id === t.id)).every(t => !t.active));
  T('退回后今日推荐回到周历', (await one(`select topic_id from sb_today where city='melb' and day=$1`, [today])).topic_id !== 'serve');
  const vs = (await own(`select * from admin_sb_config_versions()`)).rows;
  T('版本列表：最新在前，每版改了哪几块、谁发布的', vs.length === 6 && vs[0].version === 6 && vs[0].from_version === 1 && J(vs.find(v => v.version === 2).changed) === J(['hints'])
    && vs.find(v => v.version === 2).published_by === 'amy' && J(vs.find(v => v.version === 4).changed) === J(['topics']) && J(vs.find(v => v.version === 5).changed) === J(['week']) && J(vs.find(v => v.version === 1).changed.sort()) === J(Object.keys(C).sort()));

  // ---------- 提前放出 ----------
  await q(`insert into sb_topics(id,title,kind,active,city,created_by,suggest) values ('u_new','周末夜场','user',true,'melb','00000000-0000-0000-0000-000000000001',false),('u_syd','悉尼的话题','user',true,'syd','00000000-0000-0000-0000-000000000001',false)`);
  T('提前放出：大家发起的、没到门槛的马上放出', (await amy(`select admin_sb_topic_release('u_new')`)).ok && !!(await one(`select released_at from sb_topics where id='u_new'`)).released_at);
  T('放出过的、常驻的 → not_found', is(await amy(`select admin_sb_topic_release('u_new')`), 'not_found', 'topic') && is(await amy(`select admin_sb_topic_release('ootd')`), 'not_found', 'topic'));
  T('只负责墨尔本的运营能放墨尔本的、不能放悉尼的', is(await opm(`select admin_sb_topic_release('u_syd')`), 'admin_forbidden', 'city'));
  T('只读管理员不能放出', !(await vw(`select admin_sb_topic_release('u_syd')`)).ok);

  // ---------- 留痕 ----------
  const log = (await q(`select l.action, l.target, l.detail, u.name from admin_audit_log l join admin_users u on u.id = l.admin_id where l.action='sideline.config' order by l.id`)).rows;
  T('每次成功的改草稿 / 放弃 / 发布 / 退回 / 放出都记日志（被拦下的整笔回滚、不记）', log.filter(l => l.target === 'publish').length === 4 && log.filter(l => /^rollback/.test(l.target)).length === 1
    && log.filter(l => l.target === 'discard').length === 1 && log.filter(l => l.target === 'u_new').length === 1 && !log.some(l => l.name === 'melb' || l.name === 'view'), log.map(l => l.target));
  T('发布的日志写了说明和改了哪几块', (() => { const p = log.find(l => l.target === 'publish'); return p.detail.note === '底栏加一句：今天的球感' && J(p.detail.changed) === J(['hints']) && p.name === 'amy' })());
  T('退回的日志写了退回到哪版、有没有清掉草稿', (() => { const p = log.find(l => /^rollback/.test(l.target)); return p.detail.to === 1 && p.detail.draft_discarded === true })());
} catch (e) { T('未捕获的错误', false, e.stack) } finally { if (pool) await pool.end(); c.stop() }
console.log(`sb_config: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
