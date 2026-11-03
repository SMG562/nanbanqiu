// 枚举覆盖（11-03）：库里允许的每个取值，前台都要有对应的处理——印色、卡面主题、头像类型、性别、场地。
// 起因：真实数据模式下库里存色名（paper），前台只认色值，默认纸白被画成黑色。以后库的约束加值 / 前台少值，这里会先红。
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const sch = rd('schema.sql');
const lineOf = (s, a) => { const i = s.indexOf(a); return i < 0 ? '' : s.slice(i, s.indexOf('\n', i)) };
const sets = (re) => [...sch.matchAll(re)].map(m => [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]));
const last = a => a[a.length - 1] || [];
// ---- 库里的取值（取最后生效的那一条约束）----
const DB = {
  avatar_color: last(sets(/avatar_color in \(([^)]*)\)/gi)),
  card_theme: last(sets(/card_theme in \(([^)]*)\)/gi)),
  avatar_kind: last(sets(/avatar_kind in \(([^)]*)\)/gi)),
  gender: last(sets(/gender in \(([^)]*)\)/gi)),
  surface: last(sets(/create type surface_type as enum \(([^)]*)\)/gi)),
};
for (const [k, v] of Object.entries(DB)) T('读得到库里 ' + k + ' 的取值', v.length >= 2, v);
// ---- 前台的表 ----
const ctx = {}; vm.createContext(ctx);
const S = f => rd('src/shared/script/' + f);
vm.runInContext([lineOf(S('0050-印章头像.js'), 'const ZAVC='), lineOf(S('0040-工具.js'), 'const AVC=['), lineOf(rd('src/pwa/script/0030-工具.js'), 'const SURF='), lineOf(S('0060-头像.js'), 'const AV_INK=')].join('\n') + ';this.t={ZAVC,AVC,SURF,AV_INK}', ctx);
const { ZAVC, AVC, SURF, AV_INK } = ctx.t;
const miss = (db, have) => db.filter(v => !have.includes(v));
T('印色：库里允许的每个色名，前台都有色值', miss(DB.avatar_color, [...ZAVC.map(c => c[0]), ...AVC.map(c => c[0])]).length === 0, miss(DB.avatar_color, [...ZAVC.map(c => c[0]), ...AVC.map(c => c[0])]));
T('卡面主题：每个值都有头像底色', miss(DB.card_theme, Object.keys(AV_INK)).length === 0, miss(DB.card_theme, Object.keys(AV_INK)));
T('场地：每个值都有中文名', miss(DB.surface, Object.keys(SURF)).length === 0, miss(DB.surface, Object.keys(SURF)));
// 转换口（nbqFromUser / nbqFromVenue）里写的「认得的名单」要覆盖库里的取值，否则合法值会被当成未知而被兜底掉
const api = S('0495-接口调用.js');
const allow = f => { const m = api.match(new RegExp("nbqEnum\\('" + f + "',[^\\[]*\\[([^\\]]*)\\]")); return m ? [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]) : [] };
for (const [f, k] of [['avatar_kind', 'avatar_kind'], ['card_theme', 'card_theme'], ['gender', 'gender'], ['surface', 'surface']]) {
  const a = allow(f); T('转换口认得库里每个 ' + f + ' 的值', a.length > 0 && miss(DB[k], a).length === 0 && miss(a, DB[k]).length === 0, { 库: DB[k], 转换口: a });
}
console.log(`enum_cover: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
