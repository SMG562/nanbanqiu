// 地区扩展 R3-2：城市网址的后端路由（server/routes.mjs + schema ㉓）。真 PostgreSQL：
//   / → /melbourne/；短链接 /g/码、/p/编号按球局 / 球员的城市跳；大小写、缺斜杠、认不出的网址；手机 PWA / 电脑网页端；
//   页面按城市替换标题、分享预览、安装配置；每个城市一份 PWA 安装配置；社群链接；「开放时通知我」的写入、去重、频率、权限、保存期限。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath, pathToFileURL } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const R = await import(pathToFileURL(path.join(DIR, 'server/routes.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const files = { pwa: fs.readFileSync(path.join(DIR, '南伴球_PWA.html'), 'utf8'), web: fs.readFileSync(path.join(DIR, '南伴球_Web.html'), 'utf8'), manifest: fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8') };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128 Safari/537.36';

const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = role => async (sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0], rows: r.rows } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message, detail: e.detail } } finally { cl.release() } };
  const svc = as('nbq_service'), usr = as('nbq_user');
  // 后端以 nbq_service 连接
  const svcPool = { query: async (s, p) => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_service'); const r = await cl.query(s, p); await cl.query('commit'); return r } finally { cl.release() } } };
  const db = R.pgLookup(svcPool, 0);
  const go = (p, search = '', ua = MAC) => R.handle({ pathname: p, search, ua }, { db, files });

  // 数据：墨尔本、阿德莱德各一个球局；一个常用城市阿德莱德的球员
  await q(`update cities set status='on' where key='adl'`);
  await q(`insert into suburbs(name,postcode,centroid,city,state) values ('Brighton','3186','POINT(145 -37.9)','melb','VIC'),('Brighton','5048','POINT(138.52 -35.02)','adl','SA')`);
  const V = async pc => (await one(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('B'||$1,'B','Brighton',$1,'POINT(145 -37.9)','{hard}','active') returning id`, [pc])).id;
  const Vm = await V('3186'), Va = await V('5048');
  const U = async city => (await one(`insert into users(phone_e164,nickname,utr,home_city) values ('+614'||lpad((floor(random()*1e8))::text,8,'0'),'x',5,$1) returning id, member_no`, [city]));
  let rr = await q(`insert into venues(name,short_name,suburb,postcode,location,surfaces,status) values ('B2','B','Brighton','3186','POINT(145 -37.9)','{hard}','active')`).then(() => ({ ok: true }), e => ({ ok: false, err: e.message }));
  T('同一个区里球场简称不能重复；不同城市的同名区可以各有同名球场', !rr.ok && /venues_short_name_suburb_pc_key/.test(rr.err) && !!Vm && !!Va, rr);
  const ua = await U('adl'), um = await U('melb');
  for (const [code, v] of [['MEL1', Vm], ['ADL1', Va]]) await q(`insert into games(share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max) values ($1,$2,$3,now()+interval '2 days',90,'doubles',4,3,7)`, [code, um.id, v]);

  // ---------- 跳转 ----------
  const loc = async (...a) => { const r = await go(...a); return r && r.status + ' ' + (r.headers.Location || '') };
  T('/ → 302 /melbourne/（参数保留）', await loc('/', '?utm_source=xhs') === '302 /melbourne/?utm_source=xhs');
  T('短链接：墨尔本的局 → /melbourne/g/码', await loc('/g/MEL1', '?s=xhs&f=0062') === '302 /melbourne/g/MEL1?s=xhs&f=0062');
  T('短链接：阿德莱德的局 → /adelaide/g/码', await loc('/g/ADL1') === '302 /adelaide/g/ADL1');
  T('短链接：不存在的局 → 按墨尔本（页面里显示已不存在）', await loc('/g/NOPE') === '302 /melbourne/g/NOPE');
  T('球员卡短链接：按常用城市', await loc('/p/' + ua.member_no) === `302 /adelaide/p/${ua.member_no}` && await loc('/p/' + um.member_no) === `302 /melbourne/p/${um.member_no}`);
  T('球员卡：带前导 0 的编号也认（/p/0062）', await loc('/p/' + String(ua.member_no).padStart(4, '0')) === `302 /adelaide/p/${String(ua.member_no).padStart(4, '0')}`);
  await q(`update users set status='deleted' where id=$1`, [ua.id]); T('已注销的球员 → 按墨尔本', (await loc('/p/' + ua.member_no)).startsWith('302 /melbourne/p/'));
  T('/melbourne → 301 /melbourne/', await loc('/melbourne') === '301 /melbourne/');
  T('/Melbourne/g/MEL1 → 301 统一成小写', await loc('/Melbourne/g/MEL1') === '301 /melbourne/g/MEL1');
  T('认不出的城市 /hobart/ → 302 /melbourne/', await loc('/hobart/') === '302 /melbourne/');
  T('旧的安装配置地址 → 墨尔本的', await loc('/manifest.webmanifest') === '301 /melbourne/manifest.webmanifest');
  T('接口、后台、图标、隐私政策、sw.js 不经过这里', await go('/api/games') === null && await go('/admin') === null && await go('/icons/icon-192.png') === null && await go('/privacy.html') === null && await go('/sw.js') === null);
  await q(`update cities set community_url='https://example.com/adl-wx' where key='adl'`);
  T('社群链接：配了 → 去城市自己的；没配 → /community', await loc('/adelaide/community') === '302 https://example.com/adl-wx' && await loc('/melbourne/community') === '302 /community');

  // ---------- 页面 ----------
  let r = await go('/melbourne/', '', IPHONE);
  T('手机 → PWA，电脑 → 网页端', r.status === 200 && r.body.includes("build:'pwa'") && (await go('/melbourne/')).body.includes("build:'web'") && r.headers.Vary === 'User-Agent');
  T('页面带安全响应头', /default-src 'self'/.test(r.headers['Content-Security-Policy']) && r.headers['X-Frame-Options'] === 'DENY');
  T('墨尔本：标题、分享预览、安装配置地址、canonical', /<title>南伴球 · 墨尔本网球约局<\/title>/.test(r.body) && /og:description" content="找到同水平的网球搭子，申请加入墨尔本附近的球局/.test(r.body) && r.body.includes('<link rel="manifest" href="/melbourne/manifest.webmanifest">') && r.body.includes('<link rel="canonical" href="https://nanbanqiu.app/melbourne/">'));
  r = await go('/sydney/g/ABC');
  T('未开放的悉尼：照常返回页面（页面自己显示即将开放），预览写「即将开放」', r.status === 200 && /<title>南伴球 · 悉尼网球约局<\/title>/.test(r.body) && /og:description" content="南伴球 · 悉尼即将开放/.test(r.body));
  T('页面里别的内容不变（只换了头部）', r.body.replace(/<head>[\s\S]*<\/head>/, '') === files.web.replace(/<head>[\s\S]*<\/head>/, ''));
  T('城市名会转义', R.cityPage('<title>x</title><meta property="og:description" content="y"></head>', { slug: 'x', name_zh: '<b>"', status: 'on' }).includes('&lt;b&gt;&quot;'));
  // ---------- 每个城市一份安装配置 ----------
  r = await go('/adelaide/manifest.webmanifest'); const m = JSON.parse(r.body), base = JSON.parse(files.manifest);
  T('阿德莱德的安装配置：名称、id、打开地址、范围都是 /adelaide/', m.name === '南伴球 · 阿德莱德网球约局' && m.id === '/adelaide/' && m.start_url === '/adelaide/?source=pwa' && m.scope === '/adelaide/' && /manifest\+json/.test(r.headers['Content-Type']), m);
  T('快捷方式也在城市里', m.shortcuts.every(s => s.url.startsWith('/adelaide/?source=shortcut#/')), m.shortcuts);
  T('图标、颜色等其余配置不变', JSON.stringify(m.icons) === JSON.stringify(base.icons) && m.theme_color === base.theme_color && m.display === base.display);

  // ---------- 开放时通知我 ----------
  r = await svc(`select api_city_waitlist('syd',' Amy@Example.com ','1.1.1.1') v`); T('悉尼（未开放）：登记成功', r.ok && r.v === true, r);
  r = await svc(`select api_city_waitlist('syd','amy@example.com','1.1.1.1') v`); T('同一城市同一邮箱（不分大小写）只记一次', r.ok && r.v === false && +(await one(`select count(*) from area_demand where kind='city_waitlist'`)).count === 1, r);
  T('存的是小写、去掉空格', (await one(`select email, city, notify_me from area_demand where kind='city_waitlist'`)).email === 'amy@example.com');
  r = await svc(`select api_city_waitlist('melb','b@x.com','1.1.1.2')`); T('已开放的城市不收', !r.ok && r.err === 'invalid' && r.detail === 'city', r);
  r = await svc(`select api_city_waitlist('xxx','b@x.com','1.1.1.2')`); T('不存在的城市不收', !r.ok && r.err === 'invalid', r);
  r = await svc(`select api_city_waitlist('syd','not-an-email','1.1.1.2')`); T('邮箱格式不对 → invalid email', !r.ok && r.err === 'invalid' && r.detail === 'email', r);
  let ok = 0; for (let i = 0; i < 7; i++) if ((await svc(`select api_city_waitlist('per',$1,'9.9.9.9')`, [`u${i}@x.com`])).ok) ok++;
  T('同一 IP 每小时 5 次', ok === 5, ok);
  r = await usr(`select api_city_waitlist('syd','c@x.com','1.1.1.3')`); T('前台不能直接调（要经后端）', !r.ok && /permission denied/.test(r.err), r);
  r = await usr(`insert into area_demand(kind, city, email) values ('city_waitlist','syd','d@x.com')`); T('前台不能直接写邮箱', !r.ok, r);
  r = await usr(`insert into area_demand(kind, query) values ('search_miss','Hobart')`); T('前台照常能记「搜索没找到」', r.ok, r);
  r = await usr(`select route_city('g','MEL1')`); T('前台不能调短链接查询', !r.ok, r);
  T('「开放时通知我」规则登记在频率限制表', !!(await one(`select 1 x from rate_rules where rule='waitlist_ip' and max_hits=5 and win='1 hour'`)));
  // 保存期限
  await q(`update area_demand set notified_at = now()-interval '31 days' where email='amy@example.com'`);
  await q(`update area_demand set created_at = now()-interval '25 months' where email='u0@x.com'`);
  await q(`update area_demand set notified_at = now()-interval '5 days' where email='u1@x.com'`);
  await q(`select job_nightly()`);
  const left = (await q(`select email from area_demand where kind='city_waitlist' order by email`)).rows.map(x => x.email);
  T('每晚清理：通知后满 30 天的、登记满 2 年的删掉，其余保留', !left.includes('amy@example.com') && !left.includes('u0@x.com') && left.includes('u1@x.com') && left.length === 4, left);
} catch (e) { console.log('FAIL 异常', e.stack); fail++ }
finally { await pool?.end().catch(() => { }); c.stop(); }
console.log(`routes: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
