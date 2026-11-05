// #27 第 2 步：后台举报队列接口（GET /admin/api/reports · POST /reports/handle · POST /reports/messages）。
// 真 PostgreSQL + 真的 nbq_admin_api 连接（和线上同一个角色）；夹具用超级用户建。
// 覆盖：权限（未登录 / 只读 / 运营）· 列表内容与不泄露（手机号、举报人 id）· 限城市 · 处理 / 忽略 · 审计 · 并发重复处理 ·
//       与前台闭环（处理后 /api/reports/mine 不再返回、可重新举报）· 查看对话必须填理由并留痕 · 输入校验。
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
const API = await import(pathToFileURL(path.join(DIR, 'server/admin/api.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const c = startCluster(); let su;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  c.psql('nbq', `-c "alter role nbq_admin_api login"`);
  su = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const connect = async () => { const cl = new pg.Client({ host: c.host, port: c.port, user: 'nbq_admin_api', database: 'nbq' }); await cl.connect(); return cl };
  const q = (s, p) => su.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const PW = 'correct horse battery', SEC = AU.newTotpSecret(), PH = AU.hashPassword(PW);
  const mk = async (email, role, cities = null) => (await one(`insert into admin_users(email,name,role,password_hash,totp_secret,recovery_hashes,cities) values ($1,$2,$3,$4,$5,'{}',$6) returning id`, [email, email.split('@')[0], role, PH, SEC, cities])).id;
  const OP = await mk('ops@x.com', 'operator'), VW = await mk('view@x.com', 'viewer'), SYD = await mk('syd@x.com', 'operator', ['syd']);
  let un = 0; const user = async (nick, city = 'melb') => (await one(`insert into users(phone_e164,nickname,utr,gender,pact_accepted_at,home_city) values ($1,$2,5,'m',now(),$3) returning id`, ['+6142' + String(++un).padStart(7, '0'), nick, city])).id;
  const A = await user('小A'), B = await user('小B'), C = await user('小C');
  let clock = 1_800_000_000_000; const deps = { connect, now: () => clock }; const ORIGIN = 'https://nanbanqiu.test';
  const call = async (method, p, { body, cookie } = {}) => {
    const h = { 'X-NBQ-Admin': '1', ...(method !== 'GET' ? { Origin: ORIGIN, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const r = await API.handleAdmin(new Request(ORIGIN + p, { method, headers: h, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }), deps);
    const text = await r.text(); let j = null; try { j = JSON.parse(text) } catch (_) { } return { s: r.status, j, text } };
  const login = async email => { clock += 30e3; const r = await API.handleAdmin(new Request(ORIGIN + '/admin/api/login', { method: 'POST', headers: { 'X-NBQ-Admin': '1', Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW, code: AU.totp(SEC, clock) }) }), deps); return 'nbq_admin=' + (r.headers.get('Set-Cookie').match(/nbq_admin=([^;]+)/) || [])[1] };
  const op = await login('ops@x.com'), vw = await login('view@x.com'), sy = await login('syd@x.com');
  const rep = async (reporter, target, o = {}) => (await one(`insert into reports(reporter_id,target_type,target_id,reason,note,source,via,context_ref) values ($1,$2,$3,$4,$5,'in_app',$6,$7) returning id`, [reporter, o.type || 'user', target, o.reason || 'harass', o.note ?? null, o.via || 'card', o.ctx ?? null])).id;
  // 前台「我举报过谁」那条查询，用真实的前台角色 + 登录身份跑（和 GET /api/reports/mine 同一句）
  const mine = async uid => { const cl = await su.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); await cl.query(`select set_config('nbq.uid',$1,true)`, [uid]);
    const x = (await cl.query(`select target_type, target_id from reports where reporter_id = nbq_uid() and status = 'open'`)).rows; await cl.query('commit'); return x } finally { cl.release() } };

  // ---------- 权限 ----------
  let r = await call('GET', '/admin/api/reports'); T('未登录读举报列表 → 401', r.s === 401 && r.j.error === 'admin_session_expired', r);
  r = await call('GET', '/admin/api/reports', { cookie: vw }); T('只读角色读举报列表 → 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await call('POST', '/admin/api/reports/handle', { cookie: vw, body: { id: '00000000-0000-0000-0000-000000000000', action: 'dismissed' } }); T('只读角色处理举报 → 403', r.s === 403, r);
  r = await call('POST', '/admin/api/reports/messages', { cookie: vw, body: { id: '00000000-0000-0000-0000-000000000000', reason: '核对举报内容' } }); T('只读角色看对话 → 403', r.s === 403, r);

  // ---------- 列表 ----------
  const R1 = await rep(A, B, { note: '一直骚扰我', via: 'card' });
  const th = (await one(`insert into threads(kind,user_a,user_b) values ('dm',$1,$2) returning id`, [A < C ? A : C, A < C ? C : A])).id;
  await q(`insert into messages(thread_id,sender_id,body,created_at) values ($1,$2,'你好呀',now() - interval '2 days'),($1,$3,'滚开',now() - interval '1 day'),($1,$2,'很久以前的消息',now() - interval '30 days')`, [th, A, C]);
  const R2 = await rep(A, C, { reason: 'pact_violation', via: 'chat', ctx: th });
  r = await call('GET', '/admin/api/reports', { cookie: op });
  const L = r.j?.reports || [], l1 = L.find(x => x.id === R1), l2 = L.find(x => x.id === R2);
  T('运营读举报列表 → 200，两条处理中的都在', r.s === 200 && !!l1 && !!l2 && l1.status === 'open', r);
  T('列表带昵称、原因、说明、来源、对话标记', l1.reporter === '小A' && l1.target === '小B' && l1.reason === 'harass' && l1.note === '一直骚扰我' && l1.via === 'card' && l1.has_chat === false && l2.has_chat === true && l2.via === 'chat', [l1, l2]);
  T('列表不泄露手机号和举报人 / 被举报人 id', !/\+614|phone|reporter_id|target_id/.test(r.text) && !r.text.includes(A) && !r.text.includes(B), r.text.slice(0, 300));
  r = await call('GET', '/admin/api/reports', { cookie: sy }); T('只负责悉尼的运营：看不到墨尔本用户的举报', r.s === 200 && r.j.reports.length === 0, r);
  const syU = await user('悉尼人', 'syd'); const R3 = await rep(syU, B);
  r = await call('GET', '/admin/api/reports', { cookie: sy }); T('只负责悉尼的运营：看得到举报人在悉尼的那条', r.j.reports.length === 1 && r.j.reports[0].id === R3, r);
  r = await call('GET', '/admin/api/reports', { cookie: op }); T('不限城市的运营两条城市的都看得到', r.j.reports.length === 3, r.j.reports.length);

  // ---------- 处理 ----------
  T('处理前：举报人在前台读得到「已举报」', (await mine(A)).some(x => x.target_id === B));
  for (const [b, n] of [[{ id: 'nope', action: 'dismissed' }, 'id 不是 uuid'], [{ id: R1, action: 'delete' }, 'action 不认识'], [{ id: R1, action: 'actioned', note: 5 }, 'note 不是字符串'], [{ id: R1, action: 'actioned', note: 'x'.repeat(501) }, 'note 超长'], [{ action: 'actioned' }, '缺 id']]) {
    r = await call('POST', '/admin/api/reports/handle', { cookie: op, body: b }); T('处理：' + n + ' → 422', r.s === 422 && r.j.error === 'invalid', r) }
  T('输入有误时举报状态没变', (await one(`select status from reports where id=$1`, [R1])).status === 'open');
  const [h1, h2] = await Promise.all([call('POST', '/admin/api/reports/handle', { cookie: op, body: { id: R1, action: 'actioned', note: '已警告对方' } }), call('POST', '/admin/api/reports/handle', { cookie: op, body: { id: R1, action: 'dismissed' } })]);
  T('两个人同时处理同一条：一个 200，另一个 409 state_changed', [h1.s, h2.s].sort().join() === '200,409' && [h1, h2].some(x => x.s === 409 && x.j.error === 'state_changed'), [h1, h2]);
  const row = await one(`select status, handled_by, handled_at from reports where id=$1`, [R1]);
  T('处理后：状态、处理人、处理时间都写了', ['actioned', 'dismissed'].includes(row.status) && row.handled_by === OP && !!row.handled_at, row);
  T('处理留痕：操作日志有 report.handle，且只有一条（失败的那次不留）', +(await one(`select count(*) n from admin_audit_log where action='report.handle' and target=$1`, [R1])).n === 1);
  r = await call('POST', '/admin/api/reports/handle', { cookie: op, body: { id: R1, action: 'dismissed' } }); T('已处理的再处理 → 409', r.s === 409 && r.j.error === 'state_changed', r);
  r = await call('POST', '/admin/api/reports/handle', { cookie: sy, body: { id: R1, action: 'dismissed' } }); T('悉尼运营处理墨尔本的举报 → 403', r.s === 403, r);
  r = await call('GET', '/admin/api/reports', { cookie: op }); const done = r.j.reports.find(x => x.id === R1);
  T('列表里已处理的排在后面，带处理人名字，状态变了', done.status !== 'open' && done.handled_by_name === 'ops' && r.j.reports.findIndex(x => x.id === R1) > r.j.reports.findIndex(x => x.id === R2), done);
  // 前台闭环
  T('处理后：举报人在前台读不到「已举报」了（刷新后不再显示）', !(await mine(A)).some(x => x.target_id === B), await mine(A));
  let again = null; try { again = await rep(A, B) } catch (e) { again = e.message }
  T('处理后：同一个人可以重新举报同一对象（业务规则 §3.9b）', typeof again === 'string' && /^[0-9a-f-]{36}$/.test(again), again);
  r = await call('POST', '/admin/api/reports/handle', { cookie: op, body: { id: R2, action: 'dismissed' } }); T('忽略 → 200，状态 dismissed', r.s === 200 && (await one(`select status from reports where id=$1`, [R2])).status === 'dismissed', r);

  // ---------- 看被举报的对话 ----------
  const R4 = await rep(A, C, { reason: 'pact_violation', via: 'chat', ctx: th });
  r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: R4 } }); T('看对话不填理由 → 422', r.s === 422, r);
  r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: R4, reason: '短' } }); T('理由太短（少于 4 个字）→ 422 admin_reason_required', r.s === 422 && r.j.error === 'admin_reason_required', r);
  T('填理由失败时不留「看过」的痕迹', +(await one(`select count(*) n from admin_audit_log where action='message.read'`)).n === 0);
  r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: R4, reason: '核对骚扰举报' } });
  const bodies = (r.j?.messages || []).map(m => m.body);
  T('看对话 → 200，只含举报前 7 天到举报后 1 天的消息（30 天前的不给）', r.s === 200 && bodies.join('|') === '你好呀|滚开', r);
  T('消息带发送人昵称，不带手机号', r.j.messages[0].sender_name === '小A' && !/\+614|phone/.test(r.text), r.text.slice(0, 200));
  T('看过留痕：message.read 一条，带理由', (await one(`select detail->>'reason' reason, count(*) over () n from admin_audit_log where action='message.read'`)).reason === '核对骚扰举报');
  r = await call('POST', '/admin/api/reports/messages', { cookie: sy, body: { id: R4, reason: '核对骚扰举报' } }); T('悉尼运营看墨尔本举报的对话 → 403', r.s === 403, r);
  r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: 'x', reason: '核对骚扰举报' } }); T('看对话：id 不是 uuid → 422', r.s === 422, r);
  r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: '00000000-0000-0000-0000-000000000000', reason: '核对骚扰举报' } }); T('看对话：举报不存在 → 404', r.s === 404, r);
  const R5 = await rep(C, B); r = await call('POST', '/admin/api/reports/messages', { cookie: op, body: { id: R5, reason: '核对骚扰举报' } }); T('举报人和对方之间没有私信时 → 200 空列表', r.s === 200 && r.j.messages.length === 0, r);
} finally { try { await su?.end() } catch (_) { } c.stop() }
console.log(`admin_reports: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
