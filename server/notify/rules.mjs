// 南伴球 · 通知发送规则（第四批 4h）。纯函数，不碰数据库和网络，前台原型 nrDeliver / emQueue / emFlush 的同一套规则。
// 规则来源：进度记录 §3.6、schema.sql「路由规则 ①–⑧」与「邮件发送规则 ①–⑦」。
//   ① 收件箱只有一份；② 有设备正在用 → 只在这台设备的页面里提醒；③ 都没在用 → 有手机推送推手机，没有才推电脑；
//   ④ 出发类在电脑上看到时也推手机；⑤ 夜间（按收件人常用城市，默认 22:00–08:00）不紧急的顺延到当地 8 点，8 点同时到期的合成一条；
//   ⑥ 推送前再检查是否已过时；⑦ 同一局的申请 10 分钟内只推一次；⑧ 只推到电脑或推不到的，5 分钟后仍未读补发邮件。

export const URGENT = new Set(['soon', 'game_cancelled', 'changed', 'postponed', 'unfilled', 'unfilled_end']);   // 推送的 Urgency: high（Web Push 头）+ 夜里照常发
// 11-02 你定的：像短信一样，申请 / 同意 / 婉拒 / 邀约这类人对人的提醒夜里也立刻推（但不算 Urgency high）；只有 LOW（赛后回顾、徽章、等级…）夜里才顺延到 8 点
export const ANYTIME = new Set(['request', 'approved', 'rejected', 'full', 'player_left', 'joined', 'expired', 'invite', 'invite_counter', 'invite_accepted', 'invite_declined']);
export const LOW = new Set(['recap', 'follow_game', 'badge', 'levelup', 'reopen', 'invite_expired', 'noshow', 'account_status', 'sb_ball', 'sb_reply', 'sb_reply_to']);   // 场边互动（第七批 S2b+）：夜里顺延到 8 点
export const GO = new Set(['soon', 'game_cancelled', 'changed', 'postponed']);
// 邮件只发三类
export const EMAIL_KIND = { request: 'request', approved: 'result', rejected: 'result', full: 'result', expired: 'result', changed: 'change', game_cancelled: 'change', postponed: 'change' };
export const EMAIL_RANK = { change: 0, result: 1, request: 2 };
export const ACTIVE_MS = 60e3, MERGE_REQ_MS = 10 * 60e3, EMAIL_DELAY_MS = 5 * 60e3, EMAIL_MERGE_MS = 60 * 60e3, EMAIL_DAILY_CAP = 5;

// 时间按城市（地区扩展 R2）：夜间不打扰按「收提醒的人」常用城市的时区和时段；提醒里的开打时间按球局城市当地时间。
//   不给城市 = 墨尔本（与原来完全相同）
export const DEFAULT_TZ = 'Australia/Melbourne', DEFAULT_QUIET = { start: '22:00', end: '08:00' };
const fmt = (t, tz, opt) => new Intl.DateTimeFormat('en-AU', { timeZone: tz || DEFAULT_TZ, hourCycle: 'h23', ...opt }).formatToParts(new Date(t)).reduce((o, p) => (o[p.type] = p.value, o), {});
export function localParts(t, tz) { const p = fmt(t, tz, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute } }
export const localDay = (t, tz) => { const p = localParts(t, tz); return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` };
export const melParts = t => localParts(t, DEFAULT_TZ), melDay = t => localDay(t, DEFAULT_TZ);
const hm = x => { const [h, m] = String(x).split(':'); return +h * 60 + +m };
// 夜间（默认 22:00–08:00）→ 顺延到当地结束时刻（夏令时那夜按墙上时间对齐）。q = { tz, start, end }，start / end 是 'HH:MM'（可带秒）
export function inQuiet(t, q = {}) {
  const { h, mi } = localParts(t, q.tz), m = h * 60 + mi, s = hm(q.start || DEFAULT_QUIET.start), e = hm(q.end || DEFAULT_QUIET.end);
  return s > e ? (m >= s || m < e) : (m >= s && m < e);
}
export function quietUntil(t, q = {}) {
  if (!inQuiet(t, q)) return t;
  const { h, mi } = localParts(t, q.tz), e = hm(q.end || DEFAULT_QUIET.end);
  const u = t + (((e - h * 60 - mi) % 1440 + 1440) % 1440) * 60e3, p = localParts(u, q.tz);
  return u + (e - p.h * 60 - p.mi) * 60e3 - (u % 60e3);
}
// 0 = 紧急（照常发）· 1 = 普通 · 2 = 不紧急；12 小时内开打的球局相关提醒算紧急
export function priority(n, game, now) {
  if (URGENT.has(n.kind) || ANYTIME.has(n.kind)) return 0; if (LOW.has(n.kind)) return 2;
  if (game) { const d = +new Date(game.starts_at) - now; if (d > 0 && d < 12 * 36e5) return 0 } return 1;
}
// ⑥ 推送前再检查：返回过时原因，或 null
export function staleReason(n, ctx, now) {
  if (n.read_at) return 'read';
  if (ctx.blocked) return 'blocked';
  if (ctx.sb && ctx.sb.stale) return ctx.sb.stale;   // 场边：发布 / 回复被删或被隐藏（数据库 sb_notif_stale）
  const g = ctx.game;
  if (g) {
    if (g.status === 'cancelled' && n.kind !== 'game_cancelled') return 'cancelled';
    if (+new Date(g.starts_at) <= now && !['unfilled_end', 'recap', 'noshow', 'game_cancelled', 'badge', 'levelup'].includes(n.kind)) return 'started';
    if (n.kind === 'request' && ctx.applicantStatus !== 'pending') return 'handled';
    if (n.kind === 'soon' && ctx.myStatus !== 'approved') return 'not_in_game';
    if (n.kind === 'reopen' && (ctx.spotsLeft <= 0 || ['pending', 'approved'].includes(ctx.myStatus))) return 'full_or_joined';
    if (n.kind === 'follow_game' && (g.status !== 'open' || (ctx.myStatus && !['withdrawn', 'left'].includes(ctx.myStatus)))) return 'full_or_joined';
  }
  if (['invite', 'invite_counter'].includes(n.kind) && ctx.invite && (!['pending', 'counter'].includes(ctx.invite.status) || +new Date(ctx.invite.expires_at) <= now)) return 'invite_ended';
  return null;
}
// ②③④ 选设备。devices: [{id, platform, push_endpoint, last_active_at}]；返回 [{channel, device_id, reason}]
export function pickChannels(n, devices, now) {
  const active = devices.filter(d => d.last_active_at && now - +new Date(d.last_active_at) <= ACTIVE_MS).sort((a, b) => +new Date(b.last_active_at) - +new Date(a.last_active_at));
  const pushM = devices.find(d => d.platform === 'mobile' && d.push_endpoint), pushD = devices.find(d => d.platform === 'desktop' && d.push_endpoint);
  if (active.length) {
    const a = active[0], out = [{ channel: 'in_app', device_id: a.id, reason: 'active_device' }];
    if (pushM) out.push({ channel: 'push_mobile', device_id: pushM.id, reason: 'go_kind' });   // 11-02 你定的：手机订阅了推送，不管哪台设备在用，手机都收到系统横幅（像短信）；reason 沿用 go_kind
    return out;
  }
  if (pushM) return [{ channel: 'push_mobile', device_id: pushM.id, reason: 'mobile_first' }];
  if (pushD) return [{ channel: 'push_desktop', device_id: pushD.id, reason: 'no_mobile_push' }];
  return [];
}
// ⑧ 要不要排一封补发邮件：只推到电脑 / 推不到、这一类可以发、邮箱可用且没关；开场前 1 小时内的申请 / 结果类不进邮件
export function emailPlan(n, user, game, firstChannel, now) {
  const k = EMAIL_KIND[n.kind]; if (!k) return null;
  if (['in_app', 'push_mobile'].includes(firstChannel)) return null;
  if (!user.email || user.email_status !== 'ok' || (user.email_prefs || {})[k] === false) return null;
  if (game && k !== 'change' && +new Date(game.starts_at) - now < 36e5) return null;
  const soon = game && k === 'change' && +new Date(game.starts_at) - now < 2 * 36e5;   // 开场前 2 小时内的改动 / 取消：立刻发、不合并
  return { kind: k, mergeKey: `${n.user_id}:${n.game_id || ''}:${k}`, sendAfter: soon ? now : now + EMAIL_DELAY_MS, noMerge: !!soon };
}
// 推送 / 邮件的文字
// 开打时间按球局城市当地时间；收件人常用城市的时区不同时标「当地」（例：墨尔本的人收到珀斯的局 → 「当地 10/24 07:30」）
const when = (g, userTz) => { if (!g) return ''; const p = localParts(+new Date(g.starts_at), g.tz); return `${g.tz && userTz && g.tz !== userTz ? '当地 ' : ''}${p.mo}/${p.d} ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}${g.venue ? ' · ' + g.venue : ''}` };
// 场边：引用文字最多 24 个字
const cut = (t, k = 24) => { const a = [...String(t || '').trim()]; return a.length > k ? a.slice(0, k).join('') + '…' : a.join('') };
export function pushText(n, ctx) {
  const a = ctx.actorName || '球友', w = when(ctx.game, ctx.userTz), sb = ctx.sb || {}, k = n.sb_count || 1;
  const T = {
    request: [`${a} 申请加入你的球局`, w], joined: [`${a} 加入了你的球局`, w], approved: [`${a} 接受了你的申请 🎾`, w], rejected: ['这局没排上', w], full: ['这局已经满员啦', w],
    expired: ['申请已失效', w], player_left: [`${a} 取消了参加`, `${w} · 名额已重新开放`], game_cancelled: [`${a} 取消了球局`, w], changed: ['球局有改动', w], postponed: ['球局顺延了 1 小时', w],
    soon: ['30 分钟后开打', w], unfilled: ['还缺人', w], unfilled_end: ['这局没有凑齐', w], reopen: ['又有空位了', w], follow_game: [`${a} 发了新球局`, w], recap: ['打得怎么样？', w],
    invite: [`${a} 约你打球`, ''], invite_counter: [`${a} 想换个时间`, ''], invite_accepted: [`${a} 接受了你的邀约`, w], invite_declined: [`${a} 这次不方便`, ''], invite_expired: ['邀约已失效', ''],
    noshow: ['有球友反馈你没到场', '可以申诉'], badge: ['获得新徽章', ''], levelup: ['等级提升', ''], account_status: ['账号状态有变化', '点开查看'],
    // 场边（第七批 S2b+）：网球合并「Coco 和另外 4 人」；回复带内容，10 分钟内合并「Coco 等 3 人」
    sb_ball: [k > 1 ? `${a} 和另外 ${k - 1} 人给你点了网球 🎾` : `${a} 给你点了网球 🎾`, sb.post_body ? `「${cut(sb.post_body)}」` : sb.photos ? '你的照片' : ''],
    sb_reply: [k > 1 ? `${a} 等 ${k} 人回复了你` : `${a} 回复了你`, cut(sb.reply_body, 40)],
    sb_reply_to: [`${a} 回复了你`, cut(sb.reply_body, 40)],
  };
  const [title, body] = T[n.kind] || ['南伴球', ''];
  return { title, body, data: { notif_id: String(n.id), kind: n.kind, game_id: n.game_id, invite_id: n.invite_id } };
}
export function emailSubject(kind, items, ctx) {
  const w = when(ctx.game, ctx.userTz), n = items.length;
  if (kind === 'request') return n > 1 ? `又有 ${n} 位球友申请加入你 ${w} 的球局` : `${ctx.actorName || '有球友'} 申请加入你 ${w} 的球局`;
  if (kind === 'result') return items.some(x => x.kind === 'approved') ? `你的申请通过了：${w}` : `这局没排上：${w}`;
  return items.some(x => x.kind === 'game_cancelled') ? `球局取消了：${w}` : items.some(x => x.kind === 'postponed') ? `球局顺延了 1 小时：${w}` : `球局有改动：${w}`;
}
