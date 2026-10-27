// 第八批 F1a：前台场边用的配置 = 数据库 sb_config()（第 1 版）；前台算的今日推荐 = 数据库 sb_pick_today（同一天、同一套规则）
//   两端（PWA / 网页）都内置了第 1 版配置（正式版开打时读 sb_config(手上的版本号)，版本没变就不重新下载）。
import fs from 'fs'; import vm from 'vm'; import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from './cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const J = JSON.stringify;
// 键排序后比较（数据库 jsonb 的键顺序和前台写法无关）
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const FILES = ['南伴球_PWA.html', '南伴球_Web.html'].filter(f => fs.readFileSync(path.join(DIR, f), 'utf8').includes('const SB_CONFIG='));
const c = startCluster(); let pool;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p);
  const anon = async sql => { const cl = await pool.connect(); try { await cl.query('begin'); await cl.query('set local role nbq_user'); const r = await cl.query(sql); await cl.query('commit'); return r.rows[0] } finally { cl.release() } };
  const db = (await anon('select sb_config() c')).c;
  T('前台至少有一端接入了场边', FILES.length >= 1, FILES);
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    const m = src.match(/const SB_CONFIG=(\{.*?\});\nconst SB=/s); T(f + ' 找到内置配置', !!m); if (!m) continue;
    const fe = JSON.parse(m[1]);
    T(f + ' 内置配置的版本 = 数据库当前版本', fe.version === db.version, [fe.version, db.version]);
    // 特别安排的 id 是建库时随机生成的，不比
    const noid = x => ({ ...x, specials: x.specials.map(({ id, ...r }) => r) });
    T(f + ' 内置配置 = 数据库 sb_config()（话题、问题、开头、时段、周历、特别安排、设置……）', J(canon(noid(fe.config))) === J(canon(noid(db.config))),
      Object.keys(db.config).filter(k => J(canon(noid(fe.config)[k])) !== J(canon(noid(db.config)[k]))));
    T(f + ' 前台只拿到上线的话题、没有后台说明（note）', fe.config.topics.every(t => t.active) && !J(fe.config.week).includes('"note"'));
    // 前台的今日推荐：把页面里那段规则放进沙盒，按指定日期跑
    const a = src.indexOf('const CFG=SB_CONFIG.config;'), b = src.indexOf('const sbApplyTopics', a);
    T(f + ' 找到今日推荐规则', a > 0 && b > a); if (!(a > 0 && b > a)) continue;
    const code = 'const SB_CONFIG=' + m[1] + ';\n' + src.slice(a, b) + '\n;globalThis.__today=sbToday;';
    const at = async (day, hot = null) => {
      const t0 = +new Date(day + 'T12:00:00+11:00'), RD = Date;
      class FD extends RD { constructor(...x) { x.length ? super(...x) : super(t0) } static now() { return t0 } }
      const ctx = { Date: FD, Intl, Math, JSON, Set, Object, Array, String, Number, CITY: { key: 'melb', tz: 'Australia/Melbourne' } }; vm.createContext(ctx); vm.runInContext(code, ctx);
      return ctx.__today(hot) };
    const days = []; for (let i = 0; i < 15; i++) { const d = new Date(Date.UTC(2026, 9, 26 + i)); days.push(d.toISOString().slice(0, 10)) }
    days.push('2027-01-13', '2027-01-17', '2027-01-24', '2027-02-03');
    const diff = [];
    for (const d of days) { const r = (await q(`select topic_id, source from sb_pick_today('melb', $1::date)`, [d])).rows[0], fr = await at(d);
      if (r.topic_id !== fr) diff.push([d, r.topic_id, r.source, fr]) }
    T(f + ' 今日推荐：前台 = 数据库（' + days.length + ' 天，含周三本周最热兜底、两个周日隔周轮换、澳网期间）', !diff.length, diff);
    T(f + ' 周日隔周轮换：两周不一样', (await at('2026-11-01')) !== (await at('2026-11-08')), [await at('2026-11-01'), await at('2026-11-08')]);
    T(f + ' 周三本周最热：有大家发起的热门话题时用它', (await at('2026-10-28', 'u2')) === 'u2');
  }
} catch (e) { T('运行出错', false, String(e.stack || e)) }
finally { if (pool) await pool.end(); c.stop() }
console.log(`sb_front: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
