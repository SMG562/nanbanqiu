// 球场坐标核对：用 OpenStreetMap Nominatim（可合法存库，ODbL）逐家查，输出对照表。
// 用法（在你电脑上，需联网）：node tools/geocode_venues.mjs   → 生成 tools/out/venues_geo.json 与 .csv
// 约 290 家 × 1.1 秒 ≈ 6 分钟；中断后重跑会接着做（读已有 json）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = fs.readFileSync(new URL('../src/shared/script/0080-数据.js', import.meta.url), 'utf8');
const list = JSON.parse(src.match(/\[\["v1"[\s\S]*?\]\](?=\.forEach)/)[0]);
const out = fileURLToPath(new URL('./out/', import.meta.url));
fs.mkdirSync(out, { recursive: true });
const jf = path.join(out, 'venues_geo.json');
const done = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {};
const km = (a, b, c, d) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r * Math.cos(a * r); return Math.hypot(x, y) * 6371; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const word = s => s.toLowerCase().replace(/\b(tennis|club|centre|center|tc|inc|the)\b/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
async function ask(q) {
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=au&viewbox=144.4,-37.4,145.8,-38.5&bounded=1&q=' + encodeURIComponent(q);
  const r = await fetch(u, { headers: { 'User-Agent': 'nanbanqiu-venue-check/1.0 (liuhan213@gmail.com)' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
for (const [id, name, short, suburb, lat, lng] of list) {
  if (done[id] && !done[id].error) continue;
  const rec = { id, name, suburb, old: [lat, lng], cand: [] };
  try {
    for (const q of [`${name}, ${suburb}, Victoria`, `${name}, Victoria`]) {
      const rs = await ask(q); await sleep(1100);
      for (const x of rs) {
        const la = +x.lat, lo = +x.lon, w = word(name), hit = w.filter(t => x.display_name.toLowerCase().includes(t)).length;
        rec.cand.push({ lat: la, lng: lo, osm: x.osm_type + '/' + x.osm_id, type: x.type, name: x.display_name.slice(0, 120), hit: hit + '/' + w.length, km_from_old: +km(lat, lng, la, lo).toFixed(2) });
      }
      if (rec.cand.length) break;
    }
    rec.cand.sort((a, b) => parseInt(b.hit) - parseInt(a.hit) || a.km_from_old - b.km_from_old);
    rec.best = rec.cand[0] || null;
  } catch (e) { rec.error = String(e.message || e); await sleep(3000); }
  done[id] = rec;
  fs.writeFileSync(jf, JSON.stringify(done, null, 1));
  process.stdout.write(`${id} ${name} → ${rec.best ? rec.best.lat + ',' + rec.best.lng + ' (' + rec.best.hit + ', 离旧坐标 ' + rec.best.km_from_old + 'km)' : rec.error || '没查到'}\n`);
}
const esc = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
const rows = [['id', '名称', '区', '旧纬度', '旧经度', '新纬度', '新经度', '名称命中', '离旧坐标km', 'OSM', '匹配到的名字']];
for (const [id] of list) { const r = done[id]; if (!r) continue; const b = r.best; rows.push([id, r.name, r.suburb, ...r.old, b?.lat, b?.lng, b?.hit, b?.km_from_old, b?.osm, b?.name]); }
fs.writeFileSync(path.join(out, 'venues_geo.csv'), '﻿' + rows.map(r => r.map(esc).join(',')).join('\n'));
console.log('完成：tools/out/venues_geo.csv、venues_geo.json');
