// 一次性下载墨尔本范围内 OpenStreetMap 里所有网球相关地物（场地、俱乐部、中心），存 tools/out/osm_tennis.json。
// 比逐家搜索可靠：之后在本地按名字 + 位置匹配。用法：node tools/osm_tennis.mjs（在你电脑上，需联网，约 1 分钟）
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('./out/', import.meta.url));
fs.mkdirSync(out, { recursive: true });
const bb = '-38.55,144.4,-37.4,145.9';
const q = `[out:json][timeout:240];(nwr["sport"~"tennis"](${bb});nwr["name"~"tennis",i](${bb});nwr["club"="sport"]["name"~"tennis|lawn",i](${bb}););out center tags;`;
const hosts = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let data;
for (const h of hosts) {
  try {
    console.log('请求', h);
    const r = await fetch(h, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'nanbanqiu-venue-check/1.0 (liuhan213@gmail.com)' } });
    if (!r.ok) { console.log('  HTTP', r.status); continue; }
    data = await r.json(); break;
  } catch (e) { console.log('  失败', e.message); }
}
if (!data) { console.log('三个服务器都没成功，过几分钟再试'); process.exit(1); }
const items = data.elements.map(e => ({ id: e.type + '/' + e.id, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, tags: e.tags || {} })).filter(x => x.lat != null);
fs.writeFileSync(out + 'osm_tennis.json', JSON.stringify(items));
console.log('完成：', items.length, '条，其中有名字的', items.filter(x => x.tags.name).length, '→ tools/out/osm_tennis.json');
