// 分享链接卡片（微信 / iMessage / 小红书等抓取 /g/码、/p/编号 时看到的标题、描述、缩略图）。
// 纯函数，Node 和 Cloudflare Pages Functions 共用；文案规则必须和前台 ogTitle / ogDesc 一致（tests/frontend/og_parity 逐个核对）。
// 数据：预览站用 demo_data.json（演示数据快照，tools/og_demo.mjs 生成）；正式版改成从数据库按分享码读同样的字段。
export const BRAND = { title: '南伴球 · 墨尔本网球约局', desc: '找到同水平的网球搭子，申请加入附近球局', image: '/icons/icon-512.png' };
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], TYPE = { singles: '单打', doubles: '双打', rally: '拉球' };
const TZ = 'Australia/Melbourne';

// 墨尔本今天的 [年, 月, 日]
export function melbToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, +x.value]));
  return [p.year, p.month, p.day];
}
// 和前台 relDay 同一套：今晚 / 今天 / 明晚 / 明天 / 后天 / 昨天 / 周几（17 点后算「晚」）
export function relDay(o, t, now = new Date()) {
  const [y, m, d] = melbToday(now), dow = new Date(Date.UTC(y, m - 1, d + o)).getUTCDay(), ev = +t.slice(0, 2) >= 17;
  return o === 0 ? (ev ? '今晚' : '今天') : o === 1 ? (ev ? '明晚' : '明天') : o === 2 ? '后天' : o === -1 ? '昨天' : WD[dow];
}
export const ogTitle = (g, now) => `${relDay(g.o, g.t, now)} ${g.t} · ${g.v} · ${g.spots > 0 ? `缺${g.spots}位球友 · UTR ${g.lvl}` : '已满员'}`;
export const ogDesc = g => `${TYPE[g.type]}｜发起人 ${g.host} UTR ${g.hu} · 南伴球`;
export const profTitle = u => `${u.name.split(' ')[0]} · UTR ${u.ntrp}`;
export const profDesc = () => '墨尔本网球球友｜点开看看，约我一起打球 · 南伴球';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 把页面 <head> 里的卡片信息换成这一条链接自己的（没有的标签补上）
export function rewriteHead(html, m) {
  const set = (h, attr, name, val) => {
    const re = new RegExp(`<meta ${attr}="${name}"[^>]*>`, 'i'), tag = `<meta ${attr}="${name}" content="${esc(val)}">`;
    return re.test(h) ? h.replace(re, tag) : h.replace(/<\/head>/i, tag + '\n</head>');
  };
  let h = html;
  h = set(h, 'property', 'og:title', m.title); h = set(h, 'property', 'og:description', m.desc);
  h = set(h, 'property', 'og:image', m.image); h = set(h, 'property', 'og:url', m.url);
  h = set(h, 'property', 'og:type', 'website'); h = set(h, 'property', 'og:site_name', '南伴球');
  h = set(h, 'name', 'description', m.desc); h = set(h, 'name', 'twitter:card', 'summary');
  return h.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
}

// 一条分享链接 → 卡片信息。找不到就用品牌通用卡片
export function cardFor(kind, key, data, origin, pathname, now = new Date()) {
  const img = origin + BRAND.image;
  if (kind === 'g') { const g = (data.games || []).find(x => x.code === key); if (g) return { title: ogTitle(g, now), desc: ogDesc(g), image: img, url: origin + pathname } }
  if (kind === 'p') { const u = (data.users || []).find(x => String(x.no) === String(+key)); if (u) return { title: profTitle(u), desc: profDesc(u), image: img, url: origin + pathname } }
  return { title: BRAND.title, desc: BRAND.desc, image: img, url: origin + pathname };
}
