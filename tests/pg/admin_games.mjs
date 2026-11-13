// #27 第 3 步：后台球局列表接口（GET /admin/api/games，只读）。
// 真 PostgreSQL + 真的 nbq_admin_api 连接（和线上同一个角色）；夹具用超级用户建。
// 覆盖：权限（未登录 / 只读 / 运营）· 列表内容与不泄露（手机号、举报人 id）· 限城市 · 处理 / 忽略 · 审计 · 并发重复处理 ·
//       与前台闭环（处理后 /api/reports/mine 不再返回、可重新举报）· 查看对话必须填理由并留痕 · 输入校验。
import { adminKit } from './admin_kit.mjs';
const K = await adminKit('admin_games'), { T, call, q, one, su } = K;   // 夹具：tests/pg/admin_kit.mjs（运营 ops / 只读 view / 限悉尼的运营 syd，和原来内联的同名同角色）
try {
  const OP = K.ids.operator, VW = K.ids.viewer, SYD = K.ids.syd, op = K.as.operator, vw = K.as.viewer, sy = K.as.syd;
  const user = async (nick, city = 'melb') => (await K.user(nick, { city })).id;
  const A = await user('小A'), B = await user('小B'), C = await user('小C');


  await q(`insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)')`);
  const mkv = async (name, city = 'melb') => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status,geo_source,city) values ($1,$1,'Brighton','3186','POINT(145 -37.9)'::geography,'{hard}','active','admin',$2) returning id`, [name, city])).id;
  const VM = await mkv('Glen Court'), VS = await mkv('Syd Court', 'syd');
  let gn = 0;
  const mkg0 = async (host, venue, hours, o = {}) => (await one(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,note,status,visibility,venue_name) values ($1,$2,$3,now()+($4||' hours')::interval,90,$5,$6,3,6,$7,$8,$9,$10) returning id`,
    ['G' + String(++gn).padStart(4, '0'), host, venue, String(hours), o.type ?? 'doubles', o.cap ?? 4, o.note ?? null, 'open', o.vis ?? 'public', o.vn ?? null])).id;
  const mkg = async (host, venue, hours, o = {}) => { const id = await mkg0(host, venue, hours, o); if (o.status) await q(`update games set status=$2::game_status where id=$1`, [id, o.status]); return id };
  const join = (g, u, st) => q(`insert into game_participants(game_id,user_id,role,status,decided_at,left_at) values ($1,$2,'player',$3::part_status,case when $3::text in ('approved','rejected') then now() end,case when $3::text in ('withdrawn','left') then now() end)`, [g, u, st]);
  const G1 = await mkg(A, VM, 5, { note: '周末双打' });
  await join(G1, B, 'approved'); await join(G1, C, 'pending');
  const G2 = await mkg(B, VM, 30, { status: 'full', type: 'singles', cap: 2 });
  const G3 = await mkg(C, VM, -48, { status: 'completed' });
  const G4 = await mkg(A, VM, 48, { status: 'cancelled', note: '下雨' });
  const G5 = await mkg(A, VM, 10, { vis: 'private', note: '只有我们知道的话', vn: '私人家后院', cap: 2, type: 'singles' });
  const G6 = await mkg(B, VS, 6, { note: '悉尼球局' });
  for (let i = 0; i < 55; i++) await mkg(C, VM, 100 + i);   // 凑翻页

  let r = await call('GET', '/admin/api/games'); T('未登录 → 401', r.s === 401, r);
  r = await call('GET', '/admin/api/games', { cookie: vw }); T('只读角色（库里只有统计）→ 403', r.s === 403 && r.j.error === 'admin_forbidden', r);
  r = await call('GET', '/admin/api/games', { cookie: op });
  T('运营读：默认「未开始」，50 个 + more', r.s === 200 && r.j.games.length === 50 && r.j.more === true, [r.s, r.j?.games?.length]);
  T('未开始按开场时间从近到远', r.j.games[0].share_code === 'G0001' && r.j.games[1].share_code === 'G0006', r.j.games.slice(0, 3).map(x => x.share_code));
  T('统计按状态（只算未开始）：招募中 G1 G5 G6 + 55，已满 1，已取消 1，已结束 0', r.j.counts.open === 58 && r.j.counts.full === 1 && r.j.counts.cancelled === 1 && !r.j.counts.completed, r.j.counts);
  const g1 = r.j.games.find(x => x.share_code === 'G0001');
  T('字段：发起人、球场、类型、人数、待处理申请、备注', g1.host === '小A' && g1.venue === 'Glen Court' && g1.game_type === 'doubles' && g1.capacity === 4 && g1.joined === 2 &&   // 发起人自己也算一个
     g1.pending === 1 && g1.note === '周末双打' && g1.status === 'open' && g1.visibility === 'public', g1);
  const g5 = r.j.games.find(x => x.share_code === 'G0005');
  T('私人球局：不给备注和自填场地', g5.visibility === 'private' && g5.note === null && g5.venue === null && !r.text.includes('私人家后院') && !r.text.includes('只有我们知道的话'), g5);
  T('不泄露手机号 / 微信 / 邮箱 / 用户 id', !/\+614|phone_e164|wechat|email|host_id|user_id|auth_id/.test(r.text), r.text.slice(0, 200));
  r = await call('GET', '/admin/api/games?offset=50', { cookie: op }); T('翻页：第二页剩余的，more 为 false', r.s === 200 && r.j.games.length === 10 && r.j.more === false, [r.s, r.j?.games?.length]);
  r = await call('GET', '/admin/api/games?when=past', { cookie: op }); T('已过：只有 G0003', r.j.games.length === 1 && r.j.games[0].share_code === 'G0003' && r.j.games[0].status === 'completed', r.j);
  r = await call('GET', '/admin/api/games?when=all&status=cancelled', { cookie: op }); T('状态筛：已取消，带取消时间', r.j.games.length === 1 && r.j.games[0].share_code === 'G0004' && !!r.j.games[0].cancelled_at && r.j.games[0].note === '下雨', r.j);
  r = await call('GET', '/admin/api/games?when=all', { cookie: op }); T('全部：统计包含四种状态', r.j.counts.open > 0 && r.j.counts.full === 1 && r.j.counts.completed === 1 && r.j.counts.cancelled === 1, r.j.counts);
  r = await call('GET', '/admin/api/games?q=' + encodeURIComponent('小B'), { cookie: op }); T('搜发起人昵称', r.j.games.length === 2 && r.j.games.every(x => x.host === '小B'), r.j.games.map(x => x.share_code));
  r = await call('GET', '/admin/api/games?q=Glen', { cookie: op }); T('搜球场名', r.j.games.length > 0 && r.j.games.every(x => x.venue === 'Glen Court'), r.j.games.length);
  r = await call('GET', '/admin/api/games?q=' + encodeURIComponent('私人家后院') + '&when=all', { cookie: op }); T('私人球局的自填场地搜不到（不能用搜索反推）', r.j.games.length === 0, r.j.games);
  r = await call('GET', '/admin/api/games?q=G0006', { cookie: op }); T('按分享码精确搜', r.j.games.length === 1 && r.j.games[0].host === '小B' && r.j.games[0].city === 'syd', r.j.games);
  r = await call('GET', '/admin/api/games?q=' + encodeURIComponent('%'), { cookie: op }); T('搜「%」按字面量，不当通配符', r.s === 200 && r.j.games.length === 0, r.j.games.length);
  for (const qs of ['status=hacked', 'when=never', 'offset=-1', 'offset=abc']) { r = await call('GET', '/admin/api/games?' + qs, { cookie: op }); T('参数不合法 ' + qs + ' → 422', r.s === 422, r) }
  r = await call('GET', '/admin/api/games?q=' + encodeURIComponent("' or 1=1 --"), { cookie: op }); T('注入式搜索词：当普通文字', r.s === 200 && r.j.games.length === 0, r);
  r = await call('GET', '/admin/api/games?when=all', { cookie: sy }); T('只负责悉尼的运营：只看到悉尼的球局，统计也只算悉尼', r.s === 200 && r.j.games.length === 1 && r.j.games[0].share_code === 'G0006' && r.j.games[0].host === null && r.j.counts.open === 1 && Object.keys(r.j.counts).length === 1, r.j);
  T('只读：球局没有任何改动', (await one(`select count(*)::int n from games where status='cancelled'`)).n === 1);
  await K.done();
} catch (e) { await K.done(e) }
