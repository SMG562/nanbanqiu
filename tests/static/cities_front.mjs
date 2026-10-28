// 地区扩展 R3：前台两端的城市配置 CITIES = 数据库 cities 表（key、网址、州、名称、时区、中心、半径、默认位置名、状态、话题、夜间时段）；
// 两端完全相同；页面代码里不再写死墨尔本（名称、时区、中心坐标、话题），只能出现在 CITIES、注释、和由服务器按城市替换的 <title> / og 里。
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const sql = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8');

// 数据库：⑲ 的种子 + ㉒ 的网址和默认位置名 + 夜间时段默认值
const seed = sql.slice(sql.indexOf('insert into cities(key, state, name_zh'), sql.indexOf('on conflict (key) do nothing', sql.indexOf('insert into cities(key, state, name_zh')));
const rows = [...seed.matchAll(/\('([a-z]+)','([A-Z]+)','([^']+)','([^']+)','([^']+)','POINT\(([\d.-]+) ([\d.-]+)\)',(\d+),'([a-z]+)','([^']+)',(\d+)\)/g)];
const s22 = sql.slice(sql.indexOf('update cities c set slug = v.slug'), sql.indexOf('where c.key = v.key and c.slug is null'));
const slug = Object.fromEntries([...s22.matchAll(/\('([a-z]+)','([a-z]+)','([^']+)'\)/g)].map(m => [m[1], [m[2], m[3]]]));
const qs = sql.match(/quiet_start\s+time not null default '(\d\d:\d\d)'/)[1], qe = sql.match(/quiet_end\s+time not null default '(\d\d:\d\d)'/)[1];
const DB = rows.map(m => ({ key: m[1], slug: slug[m[1]]?.[0], state: m[2], zh: m[3], en: m[4], tz: m[5], lat: +m[7], lng: +m[6], km: +m[8], center: slug[m[1]]?.[1], status: m[9], tag: m[10], quiet: [qs, qe] }));
T(`数据库 6 个城市，都有网址和默认位置名`, DB.length === 6 && DB.every(d => d.slug && d.center), DB.map(d => d.key + ':' + d.slug));
T('只有墨尔本开放', DB.filter(d => d.status === 'on').map(d => d.key).join() === 'melb');

const blocks = {};
for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
  const h = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = h.match(/const CITIES=(\[[\s\S]*?\]);\n/); T(`${f}：有 CITIES`, !!m); if (!m) continue;
  blocks[f] = m[1];
  const FE = vm.runInNewContext('(' + m[1] + ')');
  T(`${f}：CITIES 与数据库逐条相同`, JSON.stringify(FE) === JSON.stringify(DB), { 页面: FE.filter(x => !DB.some(d => JSON.stringify(d) === JSON.stringify(x))), 库: DB.filter(d => !FE.some(x => JSON.stringify(d) === JSON.stringify(x))) });
  T(`${f}：网址决定城市，认不出 → 第一个（墨尔本）`, /const CITY=\(\(\)=>\{const s=\(location\.pathname\.split\('\/'\)\[1\]\|\|''\)\.toLowerCase\(\);return CITIES\.find\(c=>c\.slug===s\)\|\|CITIES\[0\]\}\)\(\);/.test(h));
  // 写死的地方：逐行看可执行代码（去掉注释、CITIES 定义、<title> / og、data-city-slogan 的兜底文字、区和球场数据）
  const bad = { 墨尔本: [], 时区: [], 中心坐标: [], 话题: [] };
  h.split('\n').forEach((l, i) => {
    const code = l.replace(/\/\*.*?\*\//g, '').replace(/\/\/ .*$/, '');
    if (/^\s*(\/\*|\*)/.test(l) || /^\s*\{key:'[a-z]+',slug:/.test(l) || /<title>|og:title|og:description|data-city-slogan>/.test(l) || /^const SB_CONFIG=/.test(l)) return;   // 第八批：内置的服务器配置 sb_config()（太宽的词里有城市名，是数据不是代码）
    if (/墨尔本/.test(code)) bad.墨尔本.push(i + 1);
    if (/Australia\/Melbourne/.test(code)) bad.时区.push(i + 1);
    if (/-37\.8136,\s*(lng:)?144\.9631/.test(code) && !/^const SUBURBS=/.test(l)) bad.中心坐标.push(i + 1);
    if (/#墨尔本|墨尔本网球/.test(code)) bad.话题.push(i + 1);
  });
  for (const [k, v] of Object.entries(bad)) T(`${f}：代码里没有写死的${k}`, !v.length, v.slice(0, 10));
  T(`${f}：埋点公共字段带城市`, (h.match(/os:AENV\.os,city:CITY\.key,/g) || []).length === 2);
  T(`${f}：分享链接保持短链接 /g/、/p/（不带城市）`, /nanbanqiu\.app\/g\//.test(h) && /nanbanqiu\.app\/p\//.test(h) && !/nanbanqiu\.app\/\$\{CITY\.slug\}\/(g|p)\//.test(h));
  T(`${f}：夜间顺延和早上合并读城市的夜间时段`, /cityHM\(CITY\.quiet\[0\]\)/.test(h) && /cityHM\(CITY\.quiet\[1\]\)/.test(h));
}
// 号码按国家：前台 COUNTRIES = 数据库 countries 里已开放的国家（代码、名称、国家代码、格式、提示）
const cr = sql.match(/insert into countries\(code, name_zh, status, dial, phone_re, phone_hint, sms_sender, otp_template\) values\s*\n\s*\('([A-Z]+)', '([^']+)', '(on|off)', '([^']+)', '([^']+)', '([^']+)'/);
const CDB = cr ? [{ code: cr[1], zh: cr[2], dial: cr[4], re: cr[5], hint: cr[6] }] : [];
for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
  const h = fs.readFileSync(path.join(DIR, f), 'utf8'), m = h.match(/const COUNTRIES=(\[[^\n]*\]);/);
  const FE = m ? vm.runInNewContext('(' + m[1] + ')') : null;
  T(`${f}：COUNTRIES 与数据库已开放的国家相同`, cr && cr[3] === 'on' && JSON.stringify(FE) === JSON.stringify(CDB), { FE, CDB });
  T(`${f}：登录的国家代码从 COUNTRIES 来（不再写死 +61 / +86）`, /<select class="inp" id="cc"[^>]*>\$\{COUNTRIES\.map/.test(h) && !/<option>\+86<\/option>/.test(h));
  T(`${f}：发验证码前按国家格式检查`, /case'sendCode':\{const p=\$\('#ph'\);if\(p\)\{const e=phoneE164\(/.test(h));
  T(`${f}：未开放城市显示「即将开放」`, /addEventListener\('DOMContentLoaded',\(\)=>setTimeout\(citySoon,0\)\)/.test(h) && /if\(\['on','beta'\]\.includes\(CITY\.status\)/.test(h));
  T(`${f}：球局列表和详情标当地时间`, (h.match(/\$\{hm\(c\.start\)\}(<\/b>)?\$\{lt\(c\.start\)\}|<span>– \$\{hm\(c\.end\)\}<\/span>\$\{lt\(c\.start\)\}/g) || []).length >= 3);
}
// 后台城市页（R4）：CITY_ADM 的 key、名称、网址、状态 = 数据库
{ const h = fs.readFileSync(path.join(DIR, '南伴球_后台.html'), 'utf8'), m = h.match(/var CITY_ADM=(\[[\s\S]*?\]);\n/);
  const A = m ? vm.runInNewContext('(' + m[1] + ')').map(c => [c.key, c.zh, c.slug, c.status]) : null;
  T('后台 CITY_ADM 与数据库相同（key、名称、网址、状态）', JSON.stringify(A) === JSON.stringify(DB.map(d => [d.key, d.zh, d.slug, d.status])), { A }) }
T('两端 CITIES 一字不差', Object.keys(blocks).length === 2 && blocks['南伴球_PWA.html'] === blocks['南伴球_Web.html']);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
