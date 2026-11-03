// 地区扩展 R2：后端按城市 / 国家（schema ㉑ + server/notify）。
//   发送程序：夜间不打扰按收提醒的人常用城市（珀斯、阿德莱德半小时时区、布里斯班无夏令时、城市自己的时段）；每天 5 封按他那边的自然日；
//   提醒里的开打时间按球局城市当地时间、时区不同标「当地」；手机号和验证码按国家；系统状态的业务指标按城市；每晚任务的时间对所有城市都安全。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { dispatch, flushEmail } = await import(pathToFileURL(path.join(DIR, 'server/notify/sender.mjs')));
const R = await import(pathToFileURL(path.join(DIR, 'server/notify/rules.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const iso = t => new Date(t).toISOString(), P = s => Date.parse(s);

// ---------- 纯规则 ----------
const PER = { tz: 'Australia/Perth' }, ADL = { tz: 'Australia/Adelaide' }, BNE = { tz: 'Australia/Brisbane' };
T('不给城市 = 墨尔本（原来的结果）', iso(R.quietUntil(P('2027-01-15T12:30:00Z'))) === '2027-01-15T21:00:00.000Z' && iso(R.quietUntil(P('2027-01-15T12:30:00Z'), {})) === '2027-01-15T21:00:00.000Z');
T('墨尔本 23:30 = 珀斯 20:30：珀斯的人不算夜间', R.quietUntil(P('2027-01-15T12:30:00Z'), PER) === P('2027-01-15T12:30:00Z'));
T('珀斯 23:30 → 珀斯 08:00（UTC 00:00）', iso(R.quietUntil(P('2027-01-15T15:30:00Z'), PER)) === '2027-01-16T00:00:00.000Z');
T('阿德莱德 23:00（半小时时区）→ 当地 08:00 = UTC 21:30', iso(R.quietUntil(P('2027-01-15T12:30:00Z'), ADL)) === '2027-01-15T21:30:00.000Z');
T('布里斯班夏天不改时：墨尔本 23:00 = 布里斯班 22:00 → 夜间，顺延到布里斯班 08:00 = UTC 22:00', iso(R.quietUntil(P('2027-01-15T12:00:00Z'), BNE)) === '2027-01-15T22:00:00.000Z');
T('布里斯班 21:59 不算夜间（同一时刻墨尔本 22:59 算）', R.quietUntil(P('2027-01-15T11:59:00Z'), BNE) === P('2027-01-15T11:59:00Z') && R.quietUntil(P('2027-01-15T11:59:00Z')) > P('2027-01-15T11:59:00Z'));
T('城市自己的时段：21:00–07:00 时 21:30 → 07:00', iso(R.quietUntil(P('2027-01-15T13:30:00Z'), { tz: 'Australia/Perth', start: '21:00:00', end: '07:00:00' })) === '2027-01-15T23:00:00.000Z');
T('不跨午夜的时段（13:00–14:00）也能算', iso(R.quietUntil(P('2027-01-15T05:30:00Z'), { tz: 'Australia/Perth', start: '13:00', end: '14:00' })) === '2027-01-15T06:00:00.000Z'
  && R.quietUntil(P('2027-01-15T06:00:00Z'), { tz: 'Australia/Perth', start: '13:00', end: '14:00' }) === P('2027-01-15T06:00:00Z'));
T('墨尔本夏令时开始那夜，珀斯的人照常（珀斯 22:00 → 08:00，10 小时）', R.quietUntil(P('2026-10-03T14:00:00Z'), PER) - P('2026-10-03T14:00:00Z') === 10 * 36e5);
const gPer = { starts_at: '2027-01-15T23:30:00Z', tz: 'Australia/Perth', venue: 'Subiaco TC' };
T('提醒文字：墨尔本的人收到珀斯的局 → 「当地 1/16 07:30」', R.pushText({ id: 1, kind: 'approved' }, { game: gPer, userTz: 'Australia/Melbourne' }).body === '当地 1/16 07:30 · Subiaco TC');
T('提醒文字：珀斯的人收到珀斯的局 → 不标「当地」', R.pushText({ id: 1, kind: 'approved' }, { game: gPer, userTz: 'Australia/Perth' }).body === '1/16 07:30 · Subiaco TC');
T('提醒文字：没有城市信息时按墨尔本（与原来相同）', R.pushText({ id: 1, kind: 'approved' }, { game: { starts_at: '2027-01-15T23:30:00Z', venue: 'X' } }).body === '1/16 10:30 · X');
T('邮件标题同样按球局当地时间', R.emailSubject('result', [{ kind: 'approved' }], { game: gPer, userTz: 'Australia/Sydney' }) === '你的申请通过了：当地 1/16 07:30 · Subiaco TC');
T('墨尔本和堪培拉同一时区：不标「当地」', !R.pushText({ id: 1, kind: 'approved' }, { game: { ...gPer, tz: 'Australia/Sydney' }, userTz: 'Australia/Sydney' }).body.includes('当地'));

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 6 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = role => async (sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const svc = as('nbq_service'), usr = as('nbq_user');
  const is = (r, code) => !r.ok && r.err === code;

  // ---------- 国家：手机号和验证码 ----------
  T('澳洲一行、已开放', (await one(`select status, dial from countries where code='AU'`)).dial === '+61');
  let r = await q(`insert into countries(code,name_zh,dial,phone_re,phone_hint,sms_sender,otp_template) values ('NZ','新西兰','+64','^\\+642[0-9]{7,9','02x','NBQ','{code}')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('手机号格式写错不能保存', !r.ok && /regular expression/.test(r.err), r);
  r = await q(`insert into countries(code,name_zh,dial,phone_re,phone_hint,sms_sender,otp_template) values ('NZ','新西兰','+64','^\\+642[0-9]{7,9}$','02x xxx xxxx','NanBanQiu','验证码')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('短信模板里必须有 {code}', !r.ok && /otp_template/.test(r.err), r);
  await q(`insert into countries(code,name_zh,dial,phone_re,phone_hint,sms_sender,otp_template) values ('NZ','新西兰','+64','^\\+642[0-9]{7,9}$','02x xxx xxxx','NanBanQiu','NBQ code {code}')`);
  r = await q(`insert into cities(key,country,state,name_zh,name_en,tz,center,hashtag,slug,center_label) values ('xx','JP','VIC','x','x','Asia/Tokyo','POINT(0 0)','x','tokyo','x')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('城市的国家必须在国家表里', !r.ok && /cities_country_fk/.test(r.err), r);
  r = await svc(`select auth_otp_send('+61412345678','10.0.0.1') j`);
  T('澳洲号码：发验证码，返回澳洲的短信配置', r.ok && r.v.country === 'AU' && r.v.sender === 'NanBanQiu' && r.v.template.includes('{code}') && r.v.provider === 'supabase', r);
  r = await svc(`select auth_otp_send('+64211234567','10.0.0.2')`); T('国家没开放（新西兰 off）→ invalid', is(r, 'invalid') && r.detail === 'phone', r);
  await q(`update countries set status='on' where code='NZ'`);
  r = await svc(`select auth_otp_send('+64211234567','10.0.0.3') j`); T('开放后：新西兰号码按新西兰的配置', r.ok && r.v.country === 'NZ' && r.v.template === 'NBQ code {code}', r);
  r = await svc(`select auth_otp_send('+61212345678','10.0.0.4')`); T('澳洲座机号 → invalid', is(r, 'invalid'), r);
  r = await svc(`select nbq_phone_country('+61498765432') a, nbq_phone_country('+8613800138000') b`); T('按号码认国家', r.ok && r.rows[0].a === 'AU' && r.rows[0].b === null, r);
  r = await usr(`select code, dial, phone_hint, phone_re from countries order by code`); T('前台读得到已开放国家的号码格式和提示', r.ok && r.rows.map(x => x.code).join() === 'AU,NZ' && r.rows[0].phone_hint === '04xx xxx xxx', r);
  r = await usr(`select otp_template from countries`); T('前台读不到短信配置', !r.ok && /permission denied/.test(r.err), r);
  r = await usr(`select auth_otp_send('+61412345670','10.0.0.5')`); T('前台不能直接发验证码', !r.ok && /permission denied/.test(r.err), r);
  await q(`update countries set status='off' where code='NZ'`);

  // ---------- 城市网址（㉒，R3） ----------
  r = await svc(`select city_by_slug('melbourne') a, city_by_slug('MELBOURNE') b, city_by_slug('sydney') c, city_by_slug('nowhere') d`);
  T('网址 → 城市（不分大小写；未开放的城市也认得出，用来显示「即将开放」；认不出 = 空）', r.ok && r.rows[0].a === 'melb' && r.rows[0].b === 'melb' && r.rows[0].c === 'syd' && r.rows[0].d === null, r);
  r = await q(`update cities set slug='g' where key='syd'`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('网址不能用保留的路径（g、p、api、admin…）', !r.ok && /cities_slug_check/.test(r.err), r);
  r = await q(`update cities set slug='melbourne' where key='syd'`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message })); T('两个城市不能同一个网址', !r.ok && /cities_slug_key/.test(r.err), r);
  T('6 个城市都有网址和默认位置名', +(await one(`select count(*) from cities where slug is not null and center_label is not null and key in ('melb','syd','bne','per','adl','cbr')`)).count === 6);

  // ---------- 发送程序：夜间按收件人城市 ----------
  await q(`update cities set status='on' where key in ('per','adl','bne')`);
  await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3186','POINT(145 -37.9)','melb','VIC'),('Subiaco','6008','POINT(115.82 -31.95)','per','WA')`);
  const VP = (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('Subiaco TC','Subiaco TC','Subiaco','6008','POINT(115.82 -31.95)','{hard}','active') returning id`)).id;
  let un = 0; const user = async (city, email = null) => (await one(`insert into users(phone_e164,nickname,utr,pact_accepted_at,email,home_city) values ($1,'U'||$2,5,now(),$3,$4) returning id`, ['+6145' + String(++un).padStart(7, '0'), un, email, city])).id;
  const dev = async u => q(`insert into user_devices(user_id,platform,push_endpoint,push_p256dh,push_auth) values ($1,'mobile',$2,'p','a')`, [u, 'ep' + u]);
  const push = { calls: [], async send(sub, p) { this.calls.push({ sub, p }); return { status: 201 } } };
  const N = async (u, kind, at, g = null) => (await one(`insert into notifications(user_id,kind,created_at,game_id) values ($1,$2,$3,$4) returning id`, [u, kind, at, g])).id;
  const NR = id => one(`select * from notifications where id=$1`, [id]);
  const Um = await user('melb'), Up = await user('per'), Ua = await user('adl'), Ub = await user('bne');
  for (const u of [Um, Up, Ua, Ub]) await dev(u);
  await q(`update notifications set pushed_at=now() where pushed_at is null`);
  let TQ = P('2027-01-15T12:30:00Z');   // 墨尔本 23:30 · 珀斯 20:30 · 阿德莱德 23:00 · 布里斯班 22:30
  const nm = await N(Um, 'badge', iso(TQ - 60e3)), np = await N(Up, 'badge', iso(TQ - 60e3)), na = await N(Ua, 'badge', iso(TQ - 60e3)), nb = await N(Ub, 'badge', iso(TQ - 60e3));
  let s = await dispatch(pool, { push, now: TQ });
  T('同一时刻：珀斯的人照常推，其他三个城市顺延', s.delivered === 1 && s.deferred === 3 && push.calls.length === 1 && push.calls[0].sub.endpoint === 'ep' + Up, s);
  T('墨尔本的顺延到墨尔本 08:00', iso((await NR(nm)).send_after) === '2027-01-15T21:00:00.000Z');
  T('阿德莱德的顺延到阿德莱德 08:00', iso((await NR(na)).send_after) === '2027-01-15T21:30:00.000Z');
  T('布里斯班的顺延到布里斯班 08:00', iso((await NR(nb)).send_after) === '2027-01-15T22:00:00.000Z');
  const np2 = await N(Up, 'badge', iso(P('2027-01-15T15:30:00Z') - 60e3));
  s = await dispatch(pool, { push, now: P('2027-01-15T15:30:00Z') });
  T('珀斯 23:30 → 顺延到珀斯 08:00', iso((await NR(np2)).send_after) === '2027-01-16T00:00:00.000Z');
  await q(`update cities set quiet_start='20:00' where key='per'`);
  const np3 = await N(Up, 'badge', iso(TQ - 60e3)); await dispatch(pool, { push, now: TQ });
  T('城市改了夜间时段（20:00 起）→ 按新的时段', (await NR(np3)).deferred === true && iso((await NR(np3)).send_after) === '2027-01-16T00:00:00.000Z');
  await q(`update cities set quiet_start='22:00' where key='per'`);
  s = await dispatch(pool, { push, now: P('2027-01-15T21:00:00Z') });
  T('墨尔本 08:00：只有墨尔本那条到期发出', (await NR(nm)).pushed_at !== null && (await NR(na)).pushed_at === null && (await NR(nb)).pushed_at === null, s);
  // 提醒里的开打时间
  const Ho = await user('per');
  const g = (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ('c1',$1,$2,'2027-01-17T23:30:00Z',90,'doubles',4,3,7) returning id`, [Ho, VP])).id;
  await q(`update notifications set pushed_at=now() where pushed_at is null`);
  push.calls.length = 0; const TD = P('2027-01-15T03:00:00Z');   // 白天
  await N(Um, 'approved', iso(TD - 60e3), g); await N(Up, 'approved', iso(TD - 60e3), g);
  await dispatch(pool, { push, now: TD });
  const body = u => push.calls.find(x => x.sub.endpoint === 'ep' + u)?.p.body;
  T('推送：墨尔本的人看到「当地 1/18 07:30」，珀斯的人看到「1/18 07:30」', body(Um) === '当地 1/18 07:30 · Subiaco TC' && body(Up) === '1/18 07:30 · Subiaco TC', [body(Um), body(Up)]);

  // ---------- 每天 5 封：按收件人城市的自然日 ----------
  const Ep = await user('per', 'p@x.com'), Em = await user('melb', 'm@x.com');
  const sent5 = u => q(`insert into email_outbox(user_id,to_email,kind,merge_key,notification_ids,subject,send_after,status,sent_at) select $1,'x@x.com','result','k'||i,'{}','s','2027-01-15T12:00:00Z','sent','2027-01-15T12:00:00Z' from generate_series(1,5) i`, [u]);
  await sent5(Ep); await sent5(Em);   // 珀斯 20:00 / 墨尔本 23:00（1/15）
  const TE = P('2027-01-15T15:00:00Z');   // 珀斯 1/15 23:00 · 墨尔本 1/16 02:00
  for (const u of [Ep, Em]) { const n = await N(u, 'approved', iso(TE - 36e5)); await q(`update notifications set pushed_at=now() where id=$1`, [n]);
    await q(`insert into email_outbox(user_id,to_email,kind,merge_key,notification_ids,subject,send_after) values ($1,'x@x.com','result',$4,$2,'s',$3)`, [u, [n], iso(TE - 60e3), 'q' + u]) }
  const mail = { sent: [], async send(m) { this.sent.push(m); return { id: 'r' + this.sent.length } } };
  s = await flushEmail(pool, { mail, now: TE });
  const st = async u => (await one(`select status, skip_reason from email_outbox where user_id=$1 and merge_key like 'q%'`, [u]));
  T('珀斯的人：当地还是同一天，已发 5 封 → daily_cap', (await st(Ep)).skip_reason === 'daily_cap', await st(Ep));
  T('墨尔本的人：当地已是第二天 → 照常发', (await st(Em)).status === 'sent', await st(Em));

  // ---------- 系统状态：业务指标按城市 ----------
  await q(`update cities set status='off' where key in ('per','adl','bne')`);
  const rows = async () => (await q(`select * from monitor_checks()`)).rows;
  let ck = await rows();
  T('只有墨尔本正式开放：16 行，业务类带城市、系统类不带', ck.length === 16 && ck.filter(x => x.area === '业务').every(x => x.city === 'melb' && x.city_name === '墨尔本') && ck.filter(x => x.area === '系统').every(x => x.city === null), ck.map(x => x.code + ':' + x.city));
  await q(`update cities set status='on' where key='syd'`);
  ck = await rows(); T('悉尼正式开放 → 20 行（业务类每个城市一行）', ck.length === 20 && ck.filter(x => x.city === 'syd').length === 4);
  await q(`update cities set status='beta' where key='per'`); T('试运行的城市不算', (await rows()).length === 20);
  const signups = (city, n, ago) => q(`insert into users(phone_e164,nickname,utr,home_city,created_at) select '+6147'||lpad((nextval('users_seq_t'))::text,7,'0'),'S',5,$1,now()-$3::interval from generate_series(1,$2)`, [city, n, ago]);
  await q(`create sequence users_seq_t`);
  for (const w of [1, 2, 3, 4]) { await signups('syd', 12, `${7 * w} days 1 hour`); await signups('melb', 12, `${7 * w} days 1 hour`) }
  await signups('melb', 12, '1 hour');
  ck = await rows(); const sd = k => ck.find(x => x.code === 'signup_drop' && x.city === k);
  T('悉尼最近 24 小时 0 个新注册（平时 12）→ 严重；墨尔本照常 → 正常', sd('syd').level === 'crit' && +sd('syd').value === 0 && sd('melb').level === 'ok' && +sd('melb').value >= 1, [sd('syd'), sd('melb')]);
  const old = async () => { const u = await user('syd'); await q(`update users set created_at=now()-interval '60 days' where id=$1`, [u]); return u };   // 老用户，不影响新注册
  const R1 = await old(); const tg = []; for (let i = 0; i < 6; i++) tg.push(await old());
  for (const t of tg) await q(`insert into reports(reporter_id,target_type,target_id,reason,source,via) values ($1,'user',$2,'harass','in_app','card')`, [R1, t]);
  ck = await rows(); const rs = k => ck.find(x => x.code === 'reports_spike' && x.city === k);
  T('悉尼的人 24 小时举报 6 条 → 悉尼严重；墨尔本不受影响', rs('syd').level === 'crit' && rs('melb').level === 'ok' && rs('melb').value === null, [rs('syd'), rs('melb')]);
  let a = (await svc(`select job_monitor() j`)).v;
  const sa = a.find(x => x.code === 'signup_drop');
  T('报警带城市：「新注册骤降 · 悉尼」', sa && sa.city === 'syd' && sa.label === '新注册骤降 · 悉尼' && sa.kind === 'new', a.filter(x => x.city));
  await q(`delete from users where home_city='melb' and created_at > now()-interval '2 hours' and nickname='S'`);
  a = (await svc(`select job_monitor() j`)).v;
  T('墨尔本也出现 → 同一项两个城市各一条报警', a.some(x => x.code === 'signup_drop' && x.city === 'melb' && x.kind === 'new') && +(await one(`select count(*) from monitor_alerts where code='signup_drop' and resolved_at is null`)).count === 2);
  a = (await svc(`select job_monitor() j`)).v; T('没变化 → 不重复通知', !a.some(x => x.code === 'signup_drop'));
  await q(`update cities set status='beta' where key='syd'`); a = (await svc(`select job_monitor() j`)).v;
  T('悉尼退回试运行 → 悉尼的报警自动关掉，墨尔本的还在', !(await one(`select 1 x from monitor_alerts where city='syd' and resolved_at is null`)) && !!(await one(`select 1 x from monitor_alerts where city='melb' and code='signup_drop' and resolved_at is null`)) && (await rows()).length === 16);
  const MON = await import(pathToFileURL(path.join(DIR, 'server/ops/monitor.mjs')));
  T('报警邮件标题带城市', MON.alertMail([sa]).subject === '[南伴球] 严重：新注册骤降 · 悉尼');

  // ---------- 每晚任务的时间 ----------
  const cron = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8').match(/cron\.schedule\('nbq_nightly', '(\d+) (\d+) \* \* \*'/);
  T('每晚任务登记在 16:10 UTC', cron && cron[1] === '10' && cron[2] === '16', cron && cron[0]);
  for (const day of ['2027-01-15', '2027-07-15']) {
    const at = `${day}T16:10:00Z`;
    const loc = (await q(`select key, (($1::timestamptz) at time zone tz)::date::text d, (($1::timestamptz) at time zone tz)::time t from cities`, [at])).rows;
    const next = new Date(P(day) + 864e5).toISOString().slice(0, 10);
    T(`${day.slice(5)} 16:10 UTC：6 个城市都已过当地午夜、都早于当地 06:00`, loc.length === 6 && loc.every(x => x.d === next && x.t < '06:00'), loc);
    await q(`delete from rollup_days`); await q(`select job_nightly($1)`, [at]);
    const rd = (await q(`select distinct day::text d from rollup_days where city='per' order by 1`)).rows.map(x => x.d);
    T(`${day.slice(5)} 每晚任务：珀斯刚结束的那天也汇总了`, rd.includes(day) && rd.length === 3, rd);
  }
} catch (e) { console.log('FAIL 异常', e.stack); fail++ }
finally { await pool?.end().catch(() => { }); c.stop(); }
console.log(`cities_backend: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
