#!/usr/bin/env node
/**
 * 生成 server/og/demo_data.json：预览站分享链接卡片用的演示数据快照（从手机端页面里的演示球局 / 球友取）。
 *   node tools/og_demo.mjs        需要 Playwright 的 Chromium
 * 演示球局里有几条按「今天星期几」生成的（每周日系列等），换天码就变——用两个不同日期各取一次，只留两次完全一致的。
 * 正式版不用这个文件：分享码对应的球局从数据库读，字段一样（见 server/og/card.mjs 开头）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATES = ['2026-10-14T13:10:00+11:00', '2026-10-17T13:10:00+11:00'];   // 一个周三、一个周六

export async function extract(b, when, html = path.join(ROOT, '南伴球_PWA.html')) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Australia/Melbourne' });
  await ctx.addInitScript(ts => { const off = ts - Date.now(), D = Date; class FD extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off) } static now() { return D.now() + off } } window.Date = FD }, +new Date(when));
  await ctx.route(/^https?:\/\//, r => r.abort());
  const pg = await ctx.newPage(); await pg.goto('file://' + html); await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => ({
    games: GAMES.filter(g => g.share_code).map(g => { const c = api.get(g.id); return c && c.host && { code: g.share_code, o: dOff(c.start), t: hm(c.start), v: c.v.short, type: c.game_type, spots: c.spots, lvl: lvl(c), host: c.host.name, hu: f1(c.host.ntrp) } }).filter(Boolean),
    users: Object.values(USERS).filter(u => u.no != null && u.name).map(u => ({ no: +u.no, name: u.name, ntrp: f1(u.ntrp) })) }));
  await ctx.close(); return r;
}
export function stable(a, b2) {
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y), byG = new Map(b2.games.map(g => [g.code, g])), byU = new Map(b2.users.map(u => [u.no, u]));
  return { games: a.games.filter(g => same(g, byG.get(g.code))).sort((x, y) => x.code < y.code ? -1 : 1), users: a.users.filter(u => same(u, byU.get(u.no))).sort((x, y) => x.no - y.no) };
}
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const d = stable(await extract(b, DATES[0]), await extract(b, DATES[1])); await b.close();
  fs.writeFileSync(path.join(ROOT, 'server', 'og', 'demo_data.json'), JSON.stringify(d, null, 1) + '\n');
  console.log(`server/og/demo_data.json：${d.games.length} 个球局 · ${d.users.length} 位球友`);
}
