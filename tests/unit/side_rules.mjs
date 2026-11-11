// E2 测试分层：场边的规则（频率、链接、话题名、通知合并、通知文字）在 Node 里直接测，不开浏览器，1 秒内跑完。
//   被测 = src/shared/side 里的两个规则文件（两个前台 HTML 是它们逐字拼出来的，static/build 保证）。
//   放进空沙盒跑：页面里的东西（CFG、NOTIFS、ME、document……）一个都不给，用到了就会报错 → 证明是纯函数。
//   对照：频率 = schema.sql 的 rate_rules；链接 = schema.sql api_sb_post 的正则；合并 = sb_notify_ball / sb_notify_reply 的写法；文字 = server/notify/rules.mjs pushText。
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 600))) };
const J = JSON.stringify, rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const SIDE = 'src/shared/side/';

// ---- 载入：空沙盒 ----
const load = (files, names, extra = {}) => { const ctx = vm.createContext({ ...extra }); vm.runInContext(files.map(f => rd(SIDE + f)).join('\n') + `\n;globalThis.__x={${names}}`, ctx); return ctx.__x };
const P = load(['0065-发布规则.js'], 'SB_LINK,SB_RATE,sbRateHit,sbTopicPick');
const N = load(['0085-场边通知规则.js'], 'SB_MERGE_MS,sbCut,sbNtfText,sbBallTally,sbReplyMergeable,sbReplyCount');
T('两个规则文件在空沙盒里能载入（不依赖页面）', !!P.sbTopicPick && !!N.sbBallTally);
T('两端都拼进了这两个文件', ['pwa', 'web'].every(e => { const l = rd(`src/${e}.list`); return l.includes('shared/side/0065-发布规则.js') && l.includes('shared/side/0085-场边通知规则.js') && l.indexOf('0085-场边通知规则') < l.indexOf('0090-场边通知') }));

// ---- 频率 = 数据库 rate_rules ----
const schema = rd('schema.sql');
const MS = { '1 minute': 6e4, '60 seconds': 6e4, '1 hour': 36e5, '24 hours': 864e5 };
const dbRules = [...schema.matchAll(/^\s*\('(\w+)',\s*'(\w+)',\s*'([^']+)',\s*(\d+),\s*(true|false),\s*'(\w+)'/gm)].map(m => ({ rule: m[1], grp: m[2], win: MS[m[3]], max: +m[4], perKey: m[5] === 'true', code: m[6] }));
const GRP = { sb_post: 'sb_post', sb_topic: 'sb_topic', sb_reply: 'sb_reply', sb_ball: 'sb_ball', sb_report: 'report' };
for (const [k, g] of Object.entries(GRP)) {
  const db = dbRules.filter(r => r.grp === g && !r.perKey).sort((a, b) => a.win - b.win).map(r => [r.win, r.max, r.code]);
  T(`频率 ${k} = 数据库 ${g}（窗口、次数、错误码、先查短窗口）`, db.length > 0 && J(P.SB_RATE[k]) === J(db), { 前台: P.SB_RATE[k], 数据库: db });
}
T('前台的频率规则没有多出数据库没有的', Object.keys(P.SB_RATE).every(k => k in GRP), Object.keys(P.SB_RATE));
const NOW = 1_800_000_000_000;
for (const [k, rules] of Object.entries(P.SB_RATE)) for (const [w, n, code] of rules) {
  // 只放这个窗口里的次数，且放在比更短的窗口还早的位置，免得先撞到更短的规则
  const at = NOW - w + 1000, shorter = rules.filter(r => r[0] < w);
  const before = shorter.length ? at : NOW - 1000;
  T(`${k} ${w / 6e4} 分钟 ${n} 次：第 ${n} 次还行，第 ${n + 1} 次 → ${code}`, P.sbRateHit(Array(n - 1).fill(before), k, NOW) === null && P.sbRateHit(Array(n).fill(before), k, NOW) === code);
  T(`${k} ${w / 6e4} 分钟：正好过了窗口的不算`, P.sbRateHit(Array(n).fill(NOW - w), k, NOW) !== code);
}
{ const L = [NOW - 1]; P.sbRateHit(L, 'sb_post', NOW); T('sbRateHit 不改传进去的记录', L.length === 1) }
{ // sbRate（带记录的那层）：dry 只看不记、被拦下的不记、超过一天的清掉
  let t = NOW; const R = load(['0065-发布规则.js'], 'sbRate', { Date: { now: () => t } }).sbRate, S = {};
  R(S, 'sb_topic', true); T('dry 只看不记', (S.rl.sb_topic || []).length === 0);
  const got = [1, 2, 3, 4, 5].map(() => R(S, 'sb_topic'));
  T('新建话题：前 3 个放行，后面的被拦、而且不记', J(got) === J([null, null, null, 'sb_topic_daily_limit', 'sb_topic_daily_limit']) && S.rl.sb_topic.length === 3, [got, S.rl.sb_topic.length]);
  t += 864e5; T('一天后恢复，旧记录清掉', R(S, 'sb_topic') === null && S.rl.sb_topic.length === 1);
}

// ---- 链接 = 数据库 ----
const dbLink = schema.match(/sb_post[\s\S]*?if b ~\* '([^']+)' then perform nbq_err\('message_link'\)/)[1];
T('链接正则 = 数据库 api_sb_post（\\M 对应 \\b）', P.SB_LINK.source.replace(/\\\//g, '/') === dbLink.replace('\\M', '\\b'), { 前台: P.SB_LINK.source, 数据库: dbLink });
const LINKS = [['看这个 www.abc.com', true], ['http://x', true], ['HTTPS://X.CO', true], ['abc.com', true], ['abc.com/x', true], ['my-site.au 见', true], ['a.io', true],
  ['abc.company', false], ['3.5 级', false], ['今天 7.30 开打', false], ['打完去 cn 吃饭', false], ['邮箱 a@b', false], ['.com', false], ['', false]];
const lbad = LINKS.filter(([s, w]) => P.SB_LINK.test(s) !== w);
T(`链接：${LINKS.length} 个例子（是 / 不是链接）`, lbad.length === 0, lbad);

// ---- 话题名 = 数据库 sb_topic_resolve 的顺序 ----
const CFG = JSON.parse(rd(SIDE + '0020-场边_24h.js').match(/const SB_CONFIG=(\{.*?\});\n/s)[1]).config;
const st = CFG.settings, TOP = Object.fromEntries(CFG.topics.map(t => [t.id, { t: t.title }]));
const bads = []; const bad = t => { bads.push(t); return /微信|官方|\.com/.test(t) ? 'x' : '' };
const pick = q => P.sbTopicPick(q, TOP, CFG, bad);
const one = id => Object.keys(TOP).find(k => k !== id) && id;
const al = CFG.alias.find(([, id]) => TOP[id]), gen = CFG.generic[0], any = Object.keys(TOP)[0];
const zh = n => '一二三四五六七八九十甲乙丙丁戊己庚辛'.slice(0, n);
T('配置里有相似词、太宽的词、话题', !!al && !!gen && !!any && st.name_min === 2 && st.name_max === 12, st);
T(`字数：${st.name_min - 1} 字 / ${st.name_max + 1} 字 → invalid；${st.name_min} 字 / ${st.name_max} 字可以`, pick(zh(st.name_min - 1)).err === 'invalid' && pick(zh(st.name_max + 1)).err === 'invalid' && pick(zh(st.name_min)).title === zh(st.name_min) && pick(zh(st.name_max)).title === zh(st.name_max));
T('字数按字符算（= 数据库 char_length）：带表情的 12 个字可以，13 个不行', pick(zh(11) + '🎾').title === zh(11) + '🎾' && pick(zh(12) + '🎾').err === 'invalid' && pick('🎾🎾').title === '🎾🎾' && pick('🎾').err === 'invalid');
T('# / ＃ / 空格去掉后再算', pick('  ##' + zh(3) + '  ').title === zh(3) && pick('＃' + zh(3)).title === zh(3) && pick('#').err === 'invalid' && pick('').err === 'invalid' && pick(null).err === 'invalid');
T('太宽的词（不分大小写、带 #）→ topic_too_generic', pick('#' + gen.toUpperCase()).err === 'topic_too_generic' && pick(gen).err === 'topic_too_generic');
{ const c = { ...CFG, generic: ['Tennis'], alias: [['ShotS', any]] };
  T('太宽的词、相似词：英文不分大小写（配置里写 Tennis，输入 tennis / TENNIS）', P.sbTopicPick('tennis', TOP, c, null).err === 'topic_too_generic' && P.sbTopicPick('#TENNIS', TOP, c, null).err === 'topic_too_generic' && P.sbTopicPick('shots', TOP, c, null).id === any) }
T('相似词 → 并入它指向的话题（不分大小写）', pick(al[0]).id === al[1] && pick(al[0].toUpperCase()).id === al[1]);
T('相似词指向的话题不在 → 不并（照新建走）', P.sbTopicPick(al[0], {}, CFG, () => '').title === al[0].replace(/^\s*[#＃]+/, '').trim());
T('同名（不分大小写、前后空格）→ 并入已有话题', pick(TOP[any].t.toUpperCase()).id === any && P.sbTopicPick('Abc', { z: { t: ' abc ' } }, CFG, null).id === 'z');
bads.length = 0; pick(TOP[any].t); pick(gen);
T('并入已有的、太宽的：不查昵称规则（和数据库一样先查这些）', bads.length === 0, bads);
T('昵称规则不让用 → topic_name_not_allowed', pick('加微信聊球').err === 'topic_name_not_allowed' && pick('官方活动').err === 'topic_name_not_allowed');
T('全都过了 → 新建，名字去掉 #', J(pick('＃反手终于开窍')) === J({ title: '反手终于开窍' }));
T('没给昵称规则也能用（只是不查）', P.sbTopicPick('加微信聊球', TOP, CFG, null).title === '加微信聊球');

// ---- 网球合并 = sb_notify_ball ----
const B = (n, t) => ({ n, c: '#' + n, t });
T('网球：都取消了 → null（拿掉没看的那条）', N.sbBallTally([], 0) === null && N.sbBallTally([B('A', 5)], 10) === null);
T('网球：人数 = 起点之后还点着的；名字 = 最近点的', J(N.sbBallTally([B('A', 10), B('B', 30), B('C', 20)], 10)) === J({ count: 3, an: 'B', ac: '#B' }));
T('网球：起点之前点的不算（看过之后的新一条）', J(N.sbBallTally([B('A', 5), B('B', 30)], 10)) === J({ count: 1, an: 'B', ac: '#B' }));
T('网球：正好在起点那一下也算', N.sbBallTally([B('A', 10)], 10).count === 1);
T('网球：同一时间点的取后面那个（稳定）', N.sbBallTally([B('A', 10), B('B', 10)], 0).an === 'B');

// ---- 回复合并 = sb_notify_reply ----
const M = N.SB_MERGE_MS;
T('合并窗口 10 分钟', M === 600000);
T('回复：没看、10 分钟内 → 并', N.sbReplyMergeable({ read: false, at: NOW - M + 1 }, NOW));
T('回复：正好 10 分钟 → 新的一条（数据库 created_at > now() - 10 分钟）', !N.sbReplyMergeable({ read: false, at: NOW - M }, NOW));
T('回复：看过了 → 新的一条', !N.sbReplyMergeable({ read: true, at: NOW }, NOW));
const Rp = (n, t, o = {}) => ({ n, t, ...o });
const rs = [Rp('A', 10), Rp('B', 20), Rp('A', 30), Rp('我', 40, { me: true }), Rp('C', 5), Rp('D', 50, { to: 'Nana' })];
T('回复人数 = 那条之后的不同的人，不算自己、不算之前的', N.sbReplyCount(rs, 10, null) === 3, N.sbReplyCount(rs, 10, null));
T('回复我（sb_reply_to）只算回复我的', N.sbReplyCount(rs, 10, 'Nana') === 1 && N.sbReplyCount(rs, 60, 'Nana') === 1);
T('人数至少 1', N.sbReplyCount([], 0, null) === 1);

// ---- 文字 = server/notify/rules.mjs ----
const { pushText } = await import(pathToFileURL(path.join(DIR, 'server', 'notify', 'rules.mjs')).href);
const names = ['Coco', '小明', '🎾王', '', null], bodies = ['', '  ', '短', 'x'.repeat(24), 'x'.repeat(25), '一'.repeat(40), '一'.repeat(41), '🎾'.repeat(30), ' 前后有空格 ', null];
let n = 0; const tbad = [];
for (const kind of ['sb_ball', 'sb_reply', 'sb_reply_to']) for (const k of [undefined, 1, 2, 5]) for (const an of names) for (const b of bodies) for (const ph of [null, ['p1']]) {
  const f = N.sbNtfText({ kind, sb_count: k, an, pb: b, rb: b, ph }), s = pushText({ kind, sb_count: k }, { actorName: an, sb: { post_body: b, reply_body: b, photos: ph } }); n++;
  if (f[0] !== s.title || f[1] !== s.body) tbad.push({ kind, k, an, b, ph, 前台: f,推送: [s.title, s.body] });
}
T(`通知文字和推送（rules.mjs）逐字一致：${n} 种组合（3 种 × 人数 × 名字 × 内容长短 / 表情 / 空 × 有没有照片）`, tbad.length === 0, tbad.slice(0, 3));
T('截断：24 / 40 个字符加 …，表情算 1 个', N.sbCut('🎾'.repeat(30)) === '🎾'.repeat(24) + '…' && N.sbCut('一'.repeat(41), 40).length === 41 && N.sbCut('一'.repeat(40), 40) === '一'.repeat(40));

console.log(`\nside_rules: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
