// 第八批 T1：后台发布新版本 → 前台读到（联合测试）
//   数据库里：后台账号改话题 / 排期 → 发布成第 2 版；前台读 sb_config(1) 拿到第 2 版的整份配置；
//   把这份配置交给两端页面（PWA / 网页）：话题名、问题、今日推荐卡片、底栏轮播都变了，且今日推荐 = 数据库 sb_pick_today；
//   退回第 1 版（第 3 版内容 = 第 1 版）后页面又变回原样。前台目前内置第 1 版、还没接真后端，所以这里用「换掉内置配置」代替网络下载。
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { startCluster, loadSchema } from '../pg/cluster.mjs';
const require = createRequire(import.meta.url); const pg = require('pg'); const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 500) : '')) };
const J = JSON.stringify;
const c = startCluster(); let pool, browser;
try {
  c.createdb('nbq');
  const errs = loadSchema(c, 'nbq', path.join(DIR, 'schema.sql')); T('schema 执行无错误', !errs.length, errs.slice(0, 3));
  pool = new pg.Pool({ host: c.host, port: c.port, user: 'postgres', database: 'nbq', max: 4 });
  const q = (s, p) => pool.query(s, p), one = async (s, p) => (await q(s, p)).rows[0];
  const as = (role, id) => async (sql, params) => { const cl = await pool.connect();
    try { await cl.query('begin'); await cl.query(`set local role ${role}`); if (id) await cl.query(`select set_config('${role === 'nbq_user' ? 'nbq.uid' : 'nbq.admin'}', $1, true)`, [id]);
      const r = await cl.query(sql, params); await cl.query('commit'); return { ok: true, v: r.rows[0] && Object.values(r.rows[0])[0] } }
    catch (e) { await cl.query('rollback').catch(() => { }); return { ok: false, err: e.message } } finally { cl.release() } };
  const O = (await one(`insert into admin_users(email,name,role,password_hash,totp_secret) values ('han@x.com','han','owner','x','x') returning id`)).id;
  const own = as('nbq_admin', O), anon = as('nbq_user', null);

  // ---- 后台：发布第 2 版 ----
  const v1 = (await anon(`select sb_config(null) r`)).v; T('前台读到第 1 版', v1.version === 1);
  const C = (await one(`select sb_config_export() c`)).c;
  const topics = [...C.topics.map(t => t.id === 'ootd' ? { ...t, title: '今天的球鞋', ask: '今天穿哪双上场？' } : t),
    { id: 'serve', title: '发球日记', kind: 'evergreen', intro: '每天练一筐发球。', ask: '今天发了几个好球？', starters: ['今天发球'], photo_tags: [], suggest: true, active: true, sort: 110 }];
  let r = await own(`select admin_sb_config_set('topics', $1::jsonb, 1) r`, [J(topics)]); T('改话题草稿', r.ok, r);
  const week = C.week.map(w => w.dow === 3 ? { ...w, topic_id: 'serve', auto_hot: false, alt_topic_id: null } : w);
  r = await own(`select admin_sb_config_set('week', $1::jsonb, 1) r`, [J(week)]); T('改排期草稿（周三推发球日记）', r.ok, r);
  r = await own(`select admin_sb_config_publish('改球鞋话题、周三推发球日记', 1) r`); T('发布 → 第 2 版', r.ok && r.v === 2, r);
  const v2 = (await anon(`select sb_config(1) r`)).v;
  T('前台带着旧版本号来读 → 拿到第 2 版整份配置', v2.version === 2 && !!v2.config && !v2.same, Object.keys(v2));
  T('前台拿到的配置里新话题上线、没有后台说明', v2.config.topics.some(t => t.id === 'serve' && t.active) && !J(v2.config.week).includes('"note"'));
  T('带着最新版本号来读 → 只回 same', (await anon(`select sb_config(2) r`)).v.same === true);
  const dbToday = (await one(`select topic_id from sb_pick_today('melb', '2026-10-14'::date)`)).topic_id; T('数据库周三的今日推荐 = 发球日记', dbToday === 'serve', dbToday);
  r = await own(`select admin_sb_config_rollback(1, 2) r`); T('退回第 1 版（成为第 3 版）', r.ok && r.v === 3, r);
  const v3 = (await anon(`select sb_config(2) r`)).v;

  // ---- 前台：两端页面换上配置 ----
  browser = await chromium.launch({ executablePath: process.env.NBQ_CHROMIUM || '/opt/pw-browsers/chromium' });
  const pageWith = async (file, payload, w, h) => {
    const full = path.join(DIR, file), html = fs.readFileSync(full, 'utf8');
    const m = html.match(/const SB_CONFIG=(\{.*?\});\nconst SB=/s); if (!m) throw new Error(file + ' 找不到内置配置');
    const body = payload ? html.replace(m[1], () => J({ config: payload.config, version: payload.version, published_at: payload.published_at })) : html;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); await ctx.addInitScript(() => { window.AN_LOG = [] });
    const page = await ctx.newPage(); const pe = []; page.on('pageerror', e => pe.push(e.message));
    await page.route(u => u.protocol === 'file:' && decodeURIComponent(u.pathname) === full, rt => rt.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }));
    await page.goto('file://' + full); await page.waitForFunction(() => typeof SB !== 'undefined' && document.querySelector('#sbHost'), null, { timeout: 15000 });
    return { page, pe };
  };
  const read = page => page.evaluate(() => { const sr = document.querySelector('#sbHost').shadowRoot, id = SB.today(), T = SB.topics();
    return { ver: SB_CONFIG.version, today: id, name: T.ootd && T.ootd.t, ask: T.ootd && T.ootd.ask, serve: T.serve && T.serve.t, card: ((sr.querySelector('.itc') || sr.querySelector('.rail .rs1 .tpc') || {}).textContent) || '', slots: SB.CFG.slots.length } });
  for (const [file, w, h] of [['南伴球_PWA.html', 390, 844], ['南伴球_Web.html', 1440, 900]]) {
    const tag = file.replace(/南伴球_|\.html/g, '');
    const open = async p => { const x = await pageWith(file, p, w, h); await x.page.evaluate(() => { try { if (typeof LOC !== 'undefined') LOC.asked = true; if (typeof closeSheet === 'function') closeSheet(); if (typeof setWho === 'function') setWho('jason', true) } catch (e) { } });
      const tab = await x.page.$('#tabbar [data-tab="side"], [data-nav="side"], [data-tab="side"]'); if (tab) await tab.click(); await x.page.waitForTimeout(1200); return x };
    const a = await open(null), ra = await read(a.page);
    T(tag + ' 对照：内置第 1 版 → 话题叫「网球人的OOTD」、没有发球日记', ra.name === '网球人的OOTD' && !ra.serve && ra.today !== 'serve', ra);
    const b2 = await open(v2), rb = await read(b2.page);
    T(tag + ' 第 2 版：话题名、问题变了', rb.name === '今天的球鞋' && rb.ask === '今天穿哪双上场？', rb);
    T(tag + ' 第 2 版：新话题「发球日记」出现', rb.serve === '发球日记', rb);
    T(tag + ' 第 2 版：今日推荐 = 数据库（周三 → 发球日记）', rb.today === dbToday, [rb.today, dbToday]);
    T(tag + ' 第 2 版：今日推荐卡片写着 #发球日记', rb.card.includes('#发球日记'), rb.card.slice(0, 60));
    const c3 = await open(v3), rc = await read(c3.page);
    T(tag + ' 退回第 1 版内容后：页面变回原样', rc.name === '网球人的OOTD' && !rc.serve && rc.today === ra.today, rc);
    for (const x of [a, b2, c3]) { T(tag + ' 没有脚本错误', x.pe.length === 0, x.pe.slice(0, 2)); await x.page.context().close() }
  }
} catch (e) { T('运行出错', false, String(e.stack || e)) }
finally { if (browser) await browser.close(); if (pool) await pool.end(); c.stop() }
console.log(`sb_publish: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
