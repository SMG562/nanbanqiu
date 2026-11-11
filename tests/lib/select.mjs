// 选测试的规则（10-30）：run_all.mjs 的 --changed / --failed 用。全是纯函数，tests/unit/select.mjs 直接测。
//
// --changed  按改动的文件挑「相关的」测试（取代每轮手选 --grep）。规则在下面的 RULES：
//            [文件路径的正则, [测试名里含的字, ...]]；测试名用 substring 匹配，和 --grep 一样。
//            新增源文件目录、新增测试时，同步改这里（unit/select 会核对每个「字」至少匹配一个真实的测试名）。
// --failed   只重跑「失败过、之后还没通过」的项。名单存在 tests/reports/failed.json，每次跑完按结果更新。

// 任何改动都跑的基础项（和提交前检查一样，几秒）
export const BASE = ['static/', 'unit/'];

// 改了这些就影响所有测试：不挑了，跑整个范围（--changed 隐含快速档）
const HARNESS = /^tests\/(run_all\.mjs|lib\/)/;

// 不对应任何测试：文档、图片、物料、CI 配置（CI 自己跑自己）、回归快照（回归只在完整档）
const IGNORE = /(\.(md|png|webp|jpe?g|svg|zip)|^\.gitignore)$|^(marketing|icons|site|备份)\/|^(privacy|terms)\.html$|^\.github\/|^tests\/(snapshots|reports)\/|^wrangler\.jsonc$/;

// 顺序无关：一个文件匹配多条就取并集
export const RULES = [
  // 前台
  [/^vendor\//, ['frontend/vendor_load', 'frontend/csp', 'frontend/site', 'unit/vendor_local']],   // 第三方库本站托管（L5）
  [/^src\/(shared|pwa|web)\/side\/|^src\/(pwa|web)\/side\//, ['side', 'e2e/sb', 'visual/']],
  [/^src\/shared\/script\/0490/, ['unit/sb_auth', 'sb_login', 'frontend/real_data', 'frontend/real_write']],
  [/^src\/shared\/script\/0495/, ['frontend/e2e_fullstack', 'unit/nbq_net', 'frontend/real_data', 'frontend/real_write', 'frontend/real_invite', 'frontend/real_chat', 'frontend/real_safety', 'frontend/real_after']],
  [/^src\/shared\/script\/0290/, ['frontend/real_after']],
  [/^src\/shared\/script\/0150/, ['frontend/real_invite']],
  [/^src\/shared\/script\/0190/, ['frontend/real_chat', 'frontend/dom_integrity']],
  [/^src\/shared\/script\/0(050|060)/, ['frontend/dom_integrity']],
  [/^src\/(shared|pwa|web)\/style\//, ['frontend/dom_integrity']],
  [/^src\/shared\/script\/0420/, ['frontend/real_safety']],
  [/^src\/(pwa|web)\/script\/0(260|270)/, ['frontend/real_safety']],
  [/^src\/(shared|pwa|web)\//, ['frontend/', 'visual/']],
  [/^南伴球_(PWA|Web)\.html$/, ['frontend/', 'visual/']],
  [/^南伴球_场边设计稿/, ['side_design']],
  // 后台
  [/^src\/admin\/|^南伴球_后台/, ['admin/', 'e2e/sb', 'e2e_admin_login']],
  // 数据库
  [/^schema\.sql$/, ['schema/', 'pg/', 'frontend/e2e_fullstack']],
  [/^server\/api\//, ['pg/api', 'frontend/e2e_fullstack']],
  // 服务端
  [/^server\/seed\/|^tools\/venues_seed\.mjs$|^src\/shared\/script\/0080-数据\.js$/, ['pg/venues_seed']],
  [/^server\/api\/|^functions\/api\/|^worker\/|^package(-lock)?\.json$/, ['unit/api', 'pg/api', 'frontend/site']],
  [/^server\/(notify|ops|admin)\/|^server\/(routes|headers)\./, ['pg/', 'admin/']],
  [/^server\/admin\/|^functions\/admin\/|^worker\/|^tools\/site\.mjs$/, ['pg/admin_api', 'pg/admin_reports', 'pg/admin_venues', 'pg/admin_users', 'pg/admin_games', 'static/admin_api_routes', 'e2e_admin_login']],   // #27：后台接口
  [/^tools\/(lib\/qr|admin_create)\.mjs$/, ['static/qr_encode']],                                         // #27：二维码
  [/^server\/og\/|^functions\/(g|p)\//, ['unit/og', 'unit/site_route', 'frontend/wx_share', 'frontend/site']],
  [/^server\/site_route\.mjs$|^functions\/_middleware\.js$/, ['unit/site_route', 'frontend/site']],
  [/^sw\.js$|^manifest\.webmanifest$/, ['frontend/a2hs', 'frontend/site', 'unit/site_route']],
  [/^tools\/(site|build|lint)\./, ['static/build', 'static/lint', 'frontend/site', 'unit/site_route']],
  [/^tools\/weekly_metrics\.mjs$/, ['unit/weekly_metrics']],                                              // 11-07：研发周报
  [/^tests\/spec\//, ['static/check', 'schema/', 'admin/consist']],
  [/^tests\/visual\//, ['visual/']],
  [/^tests\/场边\//, ['side_design']],
  [/^tests\/(schema|pg|lint)\//, ['schema/', 'pg/']],
];

// 测试文件本身：tests/<套件>/<名>.<后缀> → 同名的测试
const TEST_FILE = /^tests\/([a-z_]+)\/([^/]+?)\.(?:mjs|js|cjs|py)$/;

export function selectByChanged(files) {
  const tokens = new Set(BASE), unmatched = [], ignored = [];
  let all = false;
  for (const f of files) {
    if (HARNESS.test(f)) { all = true; continue }
    if (IGNORE.test(f)) { ignored.push(f); continue }
    let hit = false;
    for (const [re, ts] of RULES) if (re.test(f)) { ts.forEach(t => tokens.add(t)); hit = true }
    const m = f.match(TEST_FILE);
    if (m) { tokens.add(m[1] + '/' + m[2]); hit = true }
    if (!hit) unmatched.push(f);
  }
  return { all, tokens: [...tokens], unmatched, ignored };
}

// 这个测试名是否被选中
export const matches = (id, tokens) => tokens.some(t => id.includes(t));

// 跑完后更新「失败过、还没通过」的名单：这次跑了的，通过 → 移出，失败 → 加入；没跑的原样保留
export function updateFailed(prev, results) {
  const set = new Set(prev || []);
  for (const r of results) r.ok ? set.delete(r.id) : set.add(r.id);
  return [...set].sort();
}

// --failed 要重跑的名单里，有哪些在这一档里不存在（比如完整档才有的项，却加了 --quick）
export const missingFrom = (failed, allIds) => failed.filter(id => !allIds.includes(id));

// ---------- 回归测试也按改动挑（11-04） ----------
// 回归测试（tests/regression，22 个）平时只在完整档跑。11-03 改了「邮件默认不发、不问邮箱」，r40 / r57 还按旧规则断言，
// 直到 11-04 跑完整档才发现。现在 --changed 读改动的 diff：改动行和 hunk 标题（git 自动带上所在函数那一行）里的标识符
// ——函数名、变量名、元素 id、data-属性值——哪个回归测试的源码里出现了，就把它也选上（快速档里也跑）。
// 只取「定义」类的名字：改动行和上下文行里定义的函数和常量（function X、const X=、X=function）、hunk 标题里所在的函数、元素 id、data-属性值。
// 再去掉通用名字：在一半以上回归测试里都出现的（setWho、GAMES 这类每个测试都用），不然一改就全选。
export function touchedNames(diff) {
  const out = new Set(), add = x => { if (x && x.length >= 4) out.add(x) };
  for (const line of String(diff).split('\n')) {
    const h = line.match(/^@@[^@]*@@ ?(.*)$/);
    const s = h ? h[1] : /^[+\- ](?![+-]{2})/.test(line) ? line.slice(1) : null;   // 改动行 + 紧挨着的上下文行（被改的往往是上一行定义的函数体）
    if (!s) continue;
    for (const m of s.matchAll(/(?:function\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)/g)) add(m[1]);
    for (const m of s.matchAll(/(?:^|[;{,\s])([A-Za-z_$][\w$]*)\s*=\s*(?:\(|function|async)/g)) add(m[1]);
    for (const m of s.matchAll(/\bid=["'`]([\w-]+)/g)) add(m[1]);
    for (const m of s.matchAll(/\bdata-[\w-]+=["'`]([\w-]+)/g)) add(m[1]);
  }
  return [...out];
}
// 哪些回归测试用到了这些名字（整词匹配）。sources：{ 'regression/r40': 源码文本, ... }
export function regressionHits(names, sources) {
  const ids = Object.keys(sources); if (!names.length || !ids.length) return [];
  const words = Object.fromEntries(ids.map(id => [id, new Set(sources[id].match(/[A-Za-z_$][\w$-]*/g) || [])]));
  const keep = names.filter(n => ids.filter(id => words[id].has(n)).length <= Math.max(1, ids.length / 2));
  return ids.filter(id => keep.some(n => words[id].has(n))).sort();
}
