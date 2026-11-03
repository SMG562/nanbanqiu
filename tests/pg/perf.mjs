// 第四批 4d：在真实 PostgreSQL + PostGIS 上造「上线一年」的数据量，测后台每张卡片的数据源和前台常用查询的速度。
//   NBQ_PERF_SCALE：数据量倍数（默认 1 = 一年）。≤ 0.2 时另外核对「改写前后结果逐行相同」（reference.sql）
//   run_all：pg/perf@对照（×0.05，快速和完整都跑）、pg/perf@一年（×1，只在完整测试里跑，约 10 分钟）
//   每条查询跑 3 次取后 2 次的较慢值（先热一次缓存）；超过上限算失败。结果另存 perf.md（tests/reports 里能看到）。
//   上限见 queries.mjs：前台接口 50ms；后台卡片「近 30 天」2s、「全部（一年）」5s；名单 / 按天汇总 3s。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
import { Q } from './queries.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
const SCALE = +(process.env.NBQ_PERF_SCALE || 1);
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };


// 与上线时 2 vCPU / 4–8 GB 的托管数据库同一档的设置
const c = startCluster({ shared_buffers: '1GB', work_mem: '64MB', maintenance_work_mem: '512MB', max_wal_size: '8GB', effective_cache_size: '4GB' });
const report = [`# 4d 查询速度（${new Date().toLocaleString('sv-SE', { timeZone: 'Australia/Melbourne' })}，数据量 ×${SCALE}）`, ''];
let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  const t0 = Date.now();
  const sz = c.psql('nbq', `-q -v scale=${SCALE} -f "${path.join(HERE, 'seed_year.sql')}" -tA -F' | '`).trim().split('\n').pop();
  const [users, games, parts, notifs, sessions, events, dbsize] = sz.split(' | ');
  const info = `数据：球友 ${users} · 球局 ${games} · 申请与参加 ${parts} · 通知 ${notifs} · 会话 ${sessions} · 事件 ${events} · 库 ${dbsize}（生成 ${Math.round((Date.now() - t0) / 1000)} 秒）`;
  console.log('INFO ' + c.version().split(',')[0]); console.log('INFO ' + info); report.push(info, '', '| 查询 | 类别 | 用时 ms | 上限 ms | 结果 |', '|---|---|---|---|---|');
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 2 });
  const pool0 = async () => (await pool.query('select now() as now')).rows[0];
  // 改写前后结果逐行相同：reference.sql 是改写之前的定义（ref 模式），同一时刻、同一区间各算一遍对比
  // 改写之前的版本在一年量上要跑几十分钟，所以只在小数据量（≤ ×0.2，或 NBQ_PERF_EQ=1）时对照
  if (process.env.NBQ_PERF_EQ === '1' || (SCALE <= 0.2 && process.env.NBQ_PERF_EQ !== '0')) {
  c.psql('nbq', `-q -v ON_ERROR_STOP=1 -f "${path.join(HERE, 'reference.sql')}"`);
   const now = (await pool0()).now, a30 = `'${new Date(+now - 30 * 864e5).toISOString()}'::timestamptz, '${now.toISOString()}'::timestamptz`, ay = `'${new Date(+now - 366 * 864e5).toISOString()}'::timestamptz, '${now.toISOString()}'::timestamptz`;
    const fns = ['active_users', 'user_activity', 'visit_funnel', 'entry_sources', 'game_view_via', 'page_traffic', 'card_views', 'env_usage', 'device_compare', 'inapp_handoff_funnel', 'notification_route'];
    const cmp = [...fns.flatMap(f => [[`${f}() · 30 天`, `public.${f}(${a30})`, `ref.${f}(${a30})`], [`${f}() · 一年`, `public.${f}(${ay})`, `ref.${f}(${ay})`]]),
      ['distinct_people() · 30 天', `(select public.distinct_people('game_view', ${a30}) as n) z`, `(select ref.distinct_people('game_view', ${a30}) as n) z`],
      ...['v_counted_games', 'user_kudos_v2', 'player_cards', 'v_user_retention', 'v_invite_outcomes', 'v_level_stuck'].map(v => [v, `public.${v}`, `ref.${v}`])];
    const cl = await pool.connect(); await cl.query('set statement_timeout = 0');
    for (const [n, A, B] of cmp) { const sa = A.startsWith('(') ? A : `(select * from ${A}) a`, sb = B.startsWith('(') ? B : `(select * from ${B}) b`;
      try { const r = (await cl.query(`select (select count(*) from (select * from ${sa} except all select * from ${sb}) x) + (select count(*) from (select * from ${sb} except all select * from ${sa}) y) as d, (select count(*) from ${sa}) as n`)).rows[0];
        T(`改写前后结果相同：${n}（${r.n} 行）`, +r.d === 0, r) } catch (e) { T(`改写前后结果相同：${n}`, false, e.message) } }
    cl.release(); report.push(`改写前后结果逐行相同：${cmp.length} 项对照（同一时刻、近 30 天和一年两个区间）`, '') }
  const U = (await pool.query(`select user_id from game_participants group by 1 order by count(*) desc limit 1`)).rows[0].user_id;
  const G = (await pool.query(`select share_code from games where visibility='public' and starts_at > now() order by starts_at limit 1`)).rows[0].share_code;
  const lit = s => `'${s}'`;
  for (const [name, sql0, cat, lim] of Q) {
    const sql = sql0.replace(/\$U/g, lit(U)).replace(/\$G/g, lit(G)), ms = [];
    try { for (let i = 0; i < 3; i++) { const t = process.hrtime.bigint(); await pool.query(sql); ms.push(Number(process.hrtime.bigint() - t) / 1e6) } }
    catch (e) { T(name, false, e.message); report.push(`| ${name} | ${cat} | 出错 | ${lim} | ${e.message} |`); continue }
    const v = Math.max(ms[1], ms[2]), ok = v <= lim;
    T(`${name}：${v.toFixed(0)} ms ≤ ${lim} ms`, ok, { ms: ms.map(x => Math.round(x)) });
    report.push(`| ${name} | ${cat} | ${v.toFixed(v < 10 ? 1 : 0)} | ${lim} | ${ok ? '✓' : '**超时**'} |`);
    console.log(`INFO ${ok ? '  ' : '✗ '}${String(Math.round(v)).padStart(6)} ms  ${name}`);
  }
  const big = (await pool.query(`select relname, pg_size_pretty(pg_total_relation_size(c.oid)) sz from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') order by pg_total_relation_size(c.oid) desc limit 6`)).rows;
  report.push('', '最大的表：' + big.map(r => `${r.relname} ${r.sz}`).join(' · '));
} catch (e) { T('运行', false, e.stack || String(e)) }
finally { if (pool) await pool.end().catch(() => { }); c.stop() }
try { fs.writeFileSync(path.join(process.cwd(), 'perf.md'), report.join('\n') + '\n') } catch (_) { }
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
