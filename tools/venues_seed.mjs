// 球场 + 区导入脚本生成器（5g-3 前台接入第 1 项）。
//   node tools/venues_seed.mjs [邮编库.csv]   → 写 server/seed/venues_seed.sql 和 server/seed/venues_seed_report.md
// 数据来源：src/shared/script/0080-数据.js 里的 290 个球场（坐标核对结果 GEO_OK 一并带上）；
// 区的邮编来自公开邮编库 matthewproctor/australianpostcodes（CSV，只取 VIC 的 Delivery Area），同名区有多个邮编时取离这个区里球场最近的一个。
// 生成的 SQL 可重复执行（on conflict do nothing）；没对上邮编的球场照样导入但 status='nosub'（只在后台显示，等人工补区）。
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = process.argv[2] || path.join(ROOT, 'tools/out/australian_postcodes.csv');
if (!fs.existsSync(csvPath)) { console.error('缺邮编库 CSV：' + csvPath + '\n  下载：https://raw.githubusercontent.com/matthewproctor/australianpostcodes/master/australian_postcodes.csv'); process.exit(1) }

// ---- 读球场数据（在空沙盒里跑 0080，只取 VEN / VX / GEO_OK）----
const src = fs.readFileSync(path.join(ROOT, 'src/shared/script/0080-数据.js'), 'utf8');
const ctx = vm.createContext({ Set, Object, Math, Array, Map }); vm.runInContext(src + '\n;globalThis.__x={VEN,GEO_OK,SUBURBS}', ctx);
const { VEN, GEO_OK } = ctx.__x; const vens = Object.values(VEN);

// ---- 邮编库 ----
const parseCsv = t => { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i];
  if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
  else if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = '' } else f += c }
  if (f || row.length) { row.push(f); rows.push(row) } return rows };
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8')), H = rows[0], ix = n => H.indexOf(n);
const byName = new Map();   // 大写区名 → [{pc, lat, lng}]
for (const r of rows.slice(1)) { if (r[ix('state')] !== 'VIC' || !/Delivery Area/i.test(r[ix('type')] || 'Delivery Area')) continue;
  const lat = +r[ix('Lat_precise')] || +r[ix('lat')], lng = +r[ix('Long_precise')] || +r[ix('long')]; if (!lat || !lng) continue;
  const k = r[ix('locality')].toUpperCase(); (byName.get(k) || byName.set(k, []).get(k)).push({ pc: r[ix('postcode')], lat, lng }) }
// 我们的区名 → 邮编库里的名字（只列对不上的）
const ALIAS = { 'Melbourne CBD': 'MELBOURNE', 'Docklands': 'DOCKLANDS', 'St Kilda': 'ST KILDA', 'Mt Waverley': 'MOUNT WAVERLEY' };
const d2 = (a, b) => { const dx = (a.lat - b.lat) * 111, dy = (a.lng - b.lng) * 111 * Math.cos(a.lat * Math.PI / 180); return dx * dx + dy * dy };

// ---- 每个区：球场平均位置 → 选最近的邮编 ----
const subs = new Map();   // 区名 → {pc, lat, lng}（lat/lng 取邮编库里这个区的位置）
const miss = new Set();
const names = [...new Set(vens.map(v => v.suburb))].sort();
for (const n of names) { const vs = vens.filter(v => v.suburb === n), c = { lat: vs.reduce((a, v) => a + v.lat, 0) / vs.length, lng: vs.reduce((a, v) => a + v.lng, 0) / vs.length };
  const cand = byName.get((ALIAS[n] || n).toUpperCase()); if (!cand) { miss.add(n); continue }
  const best = cand.map(x => ({ ...x, d: d2(c, x) })).sort((a, b) => a.d - b.d)[0];
  const same = cand.filter(x => x.pc === best.pc); subs.set(n, { pc: best.pc, lat: same.reduce((a, x) => a + x.lat, 0) / same.length, lng: same.reduce((a, x) => a + x.lng, 0) / same.length, far: Math.sqrt(best.d) > 8 }) }

// ---- 输出 SQL ----
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const SURF = new Set(['hard', 'clay', 'synclay', 'grass', 'synthetic']), VT = new Set(['club', 'public', 'school', 'commercial']);
const out = ['-- 球场 + 区导入（tools/venues_seed.mjs 生成，请勿手改）。可重复执行。', '-- 位置：GEO_OK 的球场来自 OpenStreetMap（© OpenStreetMap contributors，ODbL）；其余为区中心估值（geo_source = suburb_centroid，待核实）。',
  '-- 区的邮编来自 matthewproctor/australianpostcodes。', 'begin;', ''];
out.push('insert into suburbs(name, postcode, centroid, city, state) values');
out.push([...subs].map(([n, s]) => `  (${q(n)}, ${q(s.pc)}, st_setsrid(st_makepoint(${s.lng.toFixed(5)}, ${s.lat.toFixed(5)}), 4326)::geography, 'melb', 'VIC')`).join(',\n'));
out.push('on conflict (name, postcode) do nothing;', '');
out.push('insert into venues(name, short_name, suburb, postcode, location, surface, surfaces, courts, lights, indoor, venue_type, geo_source, status, city) values');
const vals = vens.map(v => { const s = subs.get(v.suburb), main = SURF.has(v.surface) ? v.surface : 'hard', all = (v.surfaces || [main]).filter(x => SURF.has(x)),
  vt = VT.has(v.vtype) ? v.vtype : 'club', geo = GEO_OK.has(v.id) ? 'admin' : 'suburb_centroid';
  return `  (${q(v.name)}, ${q(v.short)}, ${q(v.suburb)}, ${s ? q(s.pc) : 'null'}, st_setsrid(st_makepoint(${v.lng.toFixed(6)}, ${v.lat.toFixed(6)}), 4326)::geography, '${main}', array[${all.map(q).join(',')}]::text[], ${v.courts > 0 ? v.courts : 'null'}, ${!!v.lights}, ${!!v.indoor}, '${vt}', '${geo}', '${s ? 'active' : 'nosub'}', 'melb')` });
out.push(vals.join(',\n'), 'on conflict on constraint venues_short_name_suburb_pc_key do nothing;', '', 'commit;', '');
fs.mkdirSync(path.join(ROOT, 'server/seed'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'server/seed/venues_seed.sql'), out.join('\n'));
const far = [...subs].filter(([, s]) => s.far).map(([n, s]) => `${n} ${s.pc}`);
fs.writeFileSync(path.join(ROOT, 'server/seed/venues_seed_report.md'), `# 球场 + 区导入报告（生成于脚本运行时）\n\n- 球场 ${vens.length} 家，区 ${names.length} 个；对上邮编 ${subs.size} 个。\n- 坐标已核对（geo_source=admin）${vens.filter(v => GEO_OK.has(v.id)).length} 家，其余 ${vens.length - vens.filter(v => GEO_OK.has(v.id)).length} 家为区中心估值。\n- **没对上邮编的区**（球场 status=nosub，只在后台显示）：${[...miss].join('、') || '无'}（球场 ${vens.filter(v => miss.has(v.suburb)).length} 家）\n- 邮编库位置离球场超过 8 公里的区（请人工看一眼）：${far.join('、') || '无'}\n`);
console.log(`球场 ${vens.length} · 区 ${names.length}（对上 ${subs.size}，没对上 ${miss.size}：${[...miss].join('、')}）· 远：${far.join('、')}`);
