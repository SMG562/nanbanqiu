// 南伴球 · 通知发送程序（第四批 4h）。后端常驻进程每 15 秒调用一次 dispatch()、每分钟调用一次 flushEmail()。
//   读 notifications（数据库 api_ / job_ 函数写入的）→ 按 rules.mjs 决定去处 → 推送 / 页面里提醒 / 排邮件 → 写 notification_deliveries。
//   以 nbq_service 身份连接；多个进程同时跑也不会重复发（for update skip locked）；每一步都可重复执行。
//   推送服务和邮件服务从外面传进来（adapters.mjs 是真实的 Web Push / Resend；测试用假的）：
//     push.send({endpoint, p256dh, auth, platform}, payload) → {status}（201 成功；404 / 410 订阅失效；其他 = 失败）
//     mail.send({to, subject, text, unsubscribe}) → {id}；onEmailEvent() 处理退信 / 投诉回调
import { priority, quietUntil, staleReason, pickChannels, emailPlan, pushText, emailSubject, EMAIL_RANK, EMAIL_MERGE_MS, EMAIL_DAILY_CAP, MERGE_REQ_MS, localDay } from './rules.mjs';

const ts = t => new Date(t).toISOString();

// 读一条通知判断规则需要的全部信息
async function loadCtx(db, n) {
  const ctx = {};
  // 收件人常用城市：夜间不打扰的时区和时段（地区扩展 R2）
  ctx.user = (await db.query(`select u.id, u.email, u.email_status, u.email_prefs, u.status, u.home_city, c.tz, c.quiet_start::text qs, c.quiet_end::text qe
      from users u left join cities c on c.key = u.home_city where u.id=$1`, [n.user_id])).rows[0];
  ctx.userTz = ctx.user?.tz || undefined; ctx.quiet = { tz: ctx.userTz, start: ctx.user?.qs, end: ctx.user?.qe };
  ctx.devices = (await db.query(`select id, platform, push_endpoint, push_p256dh, push_auth, last_active_at from user_devices where user_id=$1`, [n.user_id])).rows;
  if (n.actor_id) {
    ctx.actorName = (await db.query(`select nickname from users where id=$1`, [n.actor_id])).rows[0]?.nickname;
    ctx.blocked = (await db.query(`select is_blocked($1,$2) b`, [n.user_id, n.actor_id])).rows[0].b;
  }
  if (n.game_id) {
    ctx.game = (await db.query(`select g.id, g.status::text, g.starts_at, g.capacity, g.filled, v.short_name venue, ct.tz,
        (select count(*)::int from game_participants p where p.game_id=g.id and p.status='approved') ap from games g left join venues v on v.id=g.venue_id left join cities ct on ct.key=g.city where g.id=$1`, [n.game_id])).rows[0];
    if (ctx.game) {
      ctx.spotsLeft = ctx.game.capacity - ctx.game.ap - ctx.game.filled;
      ctx.myStatus = (await db.query(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [n.game_id, n.user_id])).rows[0]?.s || null;
      if (n.actor_id) ctx.applicantStatus = (await db.query(`select status::text s from game_participants where game_id=$1 and user_id=$2`, [n.game_id, n.actor_id])).rows[0]?.s || null;
    }
  }
  if (n.invite_id) ctx.invite = (await db.query(`select status::text, expires_at from invites where id=$1`, [n.invite_id])).rows[0];
  if (n.sb_post_id) ctx.sb = (await db.query(`select p.body post_body, p.photo_count photos, r.body reply_body, sb_notif_stale($1) stale
      from sb_posts p left join sb_replies r on r.id=$3 where p.id=$2`, [n.id, n.sb_post_id, n.sb_reply_id])).rows[0] || { stale: 'removed' };   // 场边（第七批 S2b+）
  return ctx;
}
const deliver = (db, nid, channel, reason, device, at) => db.query(`insert into notification_deliveries(notification_id, channel, reason, device_id, at) values ($1,$2,$3,$4,$5)`, [nid, channel, reason, device || null, ts(at)]);

// 真正推送：成功记 push_ok_at；404 / 410 清掉这个订阅；返回是否送达
async function pushTo(db, push, dev, payload, now) {
  let r; try { r = await push.send({ endpoint: dev.push_endpoint, p256dh: dev.push_p256dh, auth: dev.push_auth, platform: dev.platform }, payload) } catch (e) { r = { status: 0, error: String(e) } }
  if (r.status >= 200 && r.status < 300) { await db.query(`update user_devices set push_ok_at=$2 where id=$1`, [dev.id, ts(now)]); return true }
  if (r.status === 404 || r.status === 410) await db.query(`update user_devices set push_endpoint=null, push_p256dh=null, push_auth=null where id=$1`, [dev.id]);
  else await db.query(`insert into delivery_errors(channel, status, detail, at) values ($1,$2,$3,$4)`, [dev.platform === 'mobile' ? 'push_mobile' : 'push_desktop', r.status || 0, String(r.error || '').slice(0, 200), ts(now)]);   // 5d：送达失败率（订阅失效不算失败）
  return false;
}

// 排一封补发邮件（⑧ / 邮件规则 ④：同一人同一局同一类 1 小时内合并）
async function queueEmail(db, n, ctx, plan, now) {
  if (!plan.noMerge) {
    const q = (await db.query(`select id from email_outbox where merge_key=$1 and status='queued' order by created_at desc limit 1 for update`, [plan.mergeKey])).rows[0];
    if (q) { await db.query(`update email_outbox set notification_ids = array_append(notification_ids, $2::bigint) where id=$1`, [q.id, n.id]); return }
    const last = (await db.query(`select sent_at from email_outbox where merge_key=$1 and status='sent' and sent_at > $2 order by sent_at desc limit 1`, [plan.mergeKey, ts(now - EMAIL_MERGE_MS)])).rows[0];
    if (last) plan.sendAfter = +new Date(last.sent_at) + EMAIL_MERGE_MS;          // 1 小时内已经发过一封：攒到满 1 小时
  }
  await db.query(`insert into email_outbox(user_id, to_email, kind, game_id, merge_key, notification_ids, subject, send_after) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [n.user_id, ctx.user.email, plan.kind, n.game_id, plan.mergeKey, [n.id], emailSubject(plan.kind, [n], ctx), ts(plan.sendAfter)]);
}

// 处理到期的通知
export async function dispatch(pool, { push, now = Date.now(), limit = 200 } = {}) {
  const db = await pool.connect(); const stats = { delivered: 0, deferred: 0, stale: 0, merged: 0, emailQueued: 0 };
  try {
    await db.query('begin'); await db.query('set local role nbq_service');
    const due = (await db.query(`select * from notifications where pushed_at is null and coalesce(send_after, created_at) <= $1 order by created_at, id limit $2 for update skip locked`, [ts(now), limit])).rows;
    const digest = new Map();   // 8 点同时到期的不紧急提醒：同一人合成一条
    const done = (n, at) => db.query(`update notifications set pushed_at=$2 where id=$1`, [n.id, ts(at)]);   // 这条处理完了（不管去了哪）
    for (const n of due) {
      const ctx = await loadCtx(db, n);
      // ⑤ 夜间顺延
      if (priority(n, ctx.game, now) > 0) {
        const q = quietUntil(now, ctx.quiet);
        if (q > now) { await db.query(`update notifications set send_after=$2, deferred=true where id=$1`, [n.id, ts(q)]); stats.deferred++; continue }
      }
      // ⑥ 过时的不提醒（收件箱照常保留）
      const st = staleReason(n, ctx, now);
      if (st) { await deliver(db, n.id, 'none', 'stale:' + st, null, now); await done(n, now); stats.stale++; continue }
      // ⑦ 同一局的申请 10 分钟内只推一次
      if (n.kind === 'request') {
        const recent = (await db.query(`select 1 from notifications x join notification_deliveries d on d.notification_id=x.id
            where x.user_id=$1 and x.game_id=$2 and x.kind='request' and x.id<>$3 and d.channel<>'none' and d.at > $4 limit 1`, [n.user_id, n.game_id, n.id, ts(now - MERGE_REQ_MS)])).rows.length;
        if (recent) {   // 不再推，但并进还没发出的那封申请邮件（「又有 2 位球友申请…」）
          await deliver(db, n.id, 'none', 'merged', null, now); await done(n, now); stats.merged++;
          await db.query(`update email_outbox set notification_ids = array_append(notification_ids, $2::bigint) where merge_key=$1 and status='queued'`, [`${n.user_id}:${n.game_id}:request`, n.id]);
          continue
        }
      }
      // ⑤ 8 点合成一条：同一人这一轮里第二条起记为合并
      if (n.deferred) { const k = n.user_id; if (digest.has(k)) { digest.get(k).push(n); await deliver(db, n.id, 'none', 'merged', null, now); await done(n, now); stats.merged++; continue } digest.set(k, [n]) }
      // ②③④ 选设备并发出；推送失败按顺序换下一个
      let chans = pickChannels(n, ctx.devices, now), first = null;
      const payload = pushText(n, ctx);
      for (const c of chans) {
        if (c.channel === 'in_app') { await deliver(db, n.id, 'in_app', c.reason, c.device_id, now); first = first || 'in_app'; continue }   // 页面通过 Realtime 收到
        const dev = ctx.devices.find(d => d.id === c.device_id); let ok = await pushTo(db, push, dev, payload, now);
        if (!ok && c.reason !== 'go_kind' && c.channel === 'push_mobile') {   // 手机推送失败：试电脑
          const pd = ctx.devices.find(d => d.platform === 'desktop' && d.push_endpoint);
          if (pd && await pushTo(db, push, pd, payload, now)) { await deliver(db, n.id, 'push_desktop', 'mobile_failed', pd.id, now); first = first || 'push_desktop'; continue }
        }
        if (ok) { await deliver(db, n.id, c.channel, n.deferred && c.reason !== 'go_kind' ? 'deferred_night' : c.reason, c.device_id, now); first = first || c.channel }
      }
      // ⑧ 只推到电脑或推不到 → 排补发邮件（推不到的，第一去向等邮件发出时记为 email / no_push）；推不到又没有邮件 → 只进消息列表
      const plan = emailPlan(n, ctx.user, ctx.game, first, now);
      if (plan) { await queueEmail(db, n, ctx, plan, now); stats.emailQueued++ }
      else if (!first) await deliver(db, n.id, 'none', 'no_push', null, now);
      await done(n, now);
      stats.delivered++;
    }
    await db.query(`insert into ops_heartbeats(name, at) values ('sender', $1) on conflict (name) do update set at = excluded.at`, [ts(now)]);   // 5d：发送程序心跳
    await db.query('commit');
  } catch (e) { await db.query('rollback').catch(() => { }); throw e } finally { db.release() }
  return stats;
}

// 发出到期的邮件（重要的先发：change > result > request；每人每天最多 5 封）
export async function flushEmail(pool, { mail, now = Date.now(), baseUrl = 'https://nanbanqiu.app' } = {}) {
  const db = await pool.connect(); const stats = { sent: 0, skipped: 0, failed: 0 };
  try {
    await db.query('begin'); await db.query('set local role nbq_service');
    const due = (await db.query(`select o.*, u.email, u.email_status, u.email_prefs, u.email_unsub_token, c.tz user_tz from email_outbox o join users u on u.id=o.user_id left join cities c on c.key=u.home_city
        where o.status='queued' and o.send_after <= $1 order by o.send_after for update of o skip locked`, [ts(now)])).rows
      .sort((a, b) => EMAIL_RANK[a.kind] - EMAIL_RANK[b.kind] || +new Date(a.send_after) - +new Date(b.send_after));
    for (const m of due) {
      // 不发：推不到又没发邮件的通知补记第一去向 none
      const skip = async r => {
        await db.query(`update email_outbox set status='skipped', skip_reason=$2 where id=$1`, [m.id, r]); stats.skipped++;
        await db.query(`insert into notification_deliveries(notification_id, channel, reason, at) select n.id, 'none', $2, $3 from notifications n
            where n.id = any($1) and n.first_at is null`, [m.notification_ids, r === 'stale' ? 'stale:email' : r === 'seen' ? 'seen' : 'no_push', ts(now)]);
      };
      if (!m.email || m.email_status !== 'ok') { await skip('email_bad'); continue }
      if ((m.email_prefs || {})[m.kind] === false) { await skip('pref_off'); continue }
      const ns = (await db.query(`select * from notifications where id = any($1)`, [m.notification_ids])).rows;
      // 期间手机推送送达了，或已经看过 → 不发
      if ((await db.query(`select 1 from notification_deliveries where notification_id = any($1) and channel in ('push_mobile','in_app') limit 1`, [m.notification_ids])).rows.length) { await skip('pushed'); continue }
      const open = ns.filter(n => !n.read_at); if (!open.length) { await skip('seen'); continue }
      // 过时：申请 / 结果类的球局已开打；球局已取消（取消通知本身除外）；申请已被处理
      const g = m.game_id && (await db.query(`select g.status::text, g.starts_at, (select short_name from venues where id=g.venue_id) venue, ct.tz from games g left join cities ct on ct.key=g.city where g.id=$1`, [m.game_id])).rows[0];
      if (g && m.kind !== 'change' && +new Date(g.starts_at) <= now) { await skip('stale'); continue }
      if (g && g.status === 'cancelled' && !ns.some(n => n.kind === 'game_cancelled')) { await skip('stale'); continue }
      let live = open;
      if (m.kind === 'request') {
        const st = (await db.query(`select user_id, status::text from game_participants where game_id=$1`, [m.game_id])).rows;
        live = open.filter(n => st.some(p => p.user_id === n.actor_id && p.status === 'pending')); if (!live.length) { await skip('stale'); continue }
      }
      // 每人每天最多 5 封（收件人常用城市的自然日）
      const tz = m.user_tz || 'Australia/Melbourne';
      const sentToday = +(await db.query(`select count(*) from email_outbox where user_id=$1 and status='sent' and (sent_at at time zone $3)::date = $2::date`, [m.user_id, localDay(now, tz), tz])).rows[0].count;
      if (sentToday >= EMAIL_DAILY_CAP) { await skip('daily_cap'); continue }
      const actor = live[0].actor_id && (await db.query(`select nickname from users where id=$1`, [live[0].actor_id])).rows[0]?.nickname;
      const subject = emailSubject(m.kind, live, { game: g, actorName: actor, userTz: m.user_tz || undefined });
      const last = sentToday === EMAIL_DAILY_CAP - 1 ? '\n\n今天的邮件提醒已达上限，其余的请在南伴球里查看。' : '';
      const text = `${subject}\n\n打开南伴球查看：${baseUrl}\n\n不想再收到这类邮件：${baseUrl}/unsub/${m.email_unsub_token}?k=${m.kind}${last}`;
      try {
        const r = await mail.send({ to: m.email, subject, text, unsubscribe: `${baseUrl}/unsub/${m.email_unsub_token}?k=${m.kind}` });
        await db.query(`update email_outbox set status='sent', sent_at=$2, provider_id=$3, subject=$4 where id=$1`, [m.id, ts(now), r && r.id || null, subject]);
        for (const n of ns) {
          if (live.includes(n)) await deliver(db, n.id, 'email', n.first_at ? 'unread_5min' : 'no_push', null, now);
          else if (!n.first_at) await deliver(db, n.id, 'none', n.read_at ? 'seen' : 'stale:email', null, now);
        }
        stats.sent++;
      } catch (e) { await db.query(`update email_outbox set status='failed' where id=$1`, [m.id]); await db.query(`insert into delivery_errors(channel, status, detail, at) values ('email', 0, $1, $2)`, [String(e.message || e).slice(0, 200), ts(now)]); stats.failed++ }
    }
    await db.query('commit');
  } catch (e) { await db.query('rollback').catch(() => { }); throw e } finally { db.release() }
  return stats;
}

// 邮件服务回调：退信 / 投诉 → 这个邮箱不再发（设置页提示换一个）
export async function onEmailEvent(pool, { type, email, provider_id }) {
  const st = type === 'complained' ? 'complained' : type === 'bounced' ? 'bounced' : null; if (!st) return 0;
  const db = await pool.connect();
  try {
    await db.query('begin'); await db.query('set local role nbq_service');
    const r = await db.query(`update users set email_status=$2 where lower(email)=lower($1) and email_status='ok'`, [email, st]);
    if (provider_id) await db.query(`update email_outbox set status='bounced' where provider_id=$1`, [provider_id]);
    await db.query('commit'); return r.rowCount;
  } catch (e) { await db.query('rollback').catch(() => { }); throw e } finally { db.release() }
}
