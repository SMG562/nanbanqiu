// 第三批 3a：后台模拟数据层（DB）和查询（Q）的完整性检查。
// DB 的表和 schema.sql 同名同取值；这里核对：取值都在 schema 允许范围内、引用都存在、时间先后合理、状态之间不矛盾、
// 查询结果互相一致（去重 ≤ 相加、按设备拆开 ≤ 合计、人齐 ≤ 开打……）、同一时刻打开结果完全一样、生成足够快。
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
const FILE = path.join(DIR, '南伴球_后台.html');
const sch = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8');
const enumOf = n => { const m = sch.match(new RegExp(`create type ${n}\\s+as enum \\(([^)]*)\\)`)); const v = m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]) : [];
  [...sch.matchAll(new RegExp(`alter type ${n} add value if not exists '([a-z_]+)'`, 'g'))].forEach(x => v.push(x[1])); return v };
const lastCheck = (re) => { const all = [...sch.matchAll(re)]; return all.length ? [...all[all.length - 1][1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]) : [] };
const ENUM = {
  game_status: enumOf('game_status'), part_status: enumOf('part_status'), game_type: enumOf('game_type'), invite_status: enumOf('invite_status'), impression_kind: enumOf('impression_kind'),
  decline: lastCheck(/check\s*\(\s*decline_reason\s+in\s*\(([^)]*)\)/gi).filter(x => !['week', 'rest'].includes(x)),
  feel: lastCheck(/feel text check \(feel in \(([^)]*)\)\)/g), pref: lastCheck(/pref\s+text not null check \(pref in \(([^)]*)\)\)/g),
  user_status: lastCheck(/alter table users add column if not exists status text[^;]*?status\s+in\s*\(('active'[^)]*)\)/g), report_reason: lastCheck(/create table reports \([\s\S]*?reason\s+text not null check \(reason in \(([^)]*)\)\)/g),
};
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
(async () => {
  T('schema 取值都能读到', Object.values(ENUM).every(v => v.length >= 2), ENUM);
  const b = await chromium.launch({});
  const run = async () => { const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('file://' + FILE); await p.waitForTimeout(500);
    const r = await p.evaluate(E => {
      const D = DB, now = +NOW, bad = {}, B = (k, ok, x) => { if (!ok) { (bad[k] = bad[k] || []).length < 3 && bad[k].push(x) } };
      const U = D.users, G = D.games, P = D.game_participants;
      // ---- 取值在 schema 范围内 ----
      G.forEach(g => { B('games.status', E.game_status.includes(g.status), g.status); B('games.game_type', E.game_type.includes(g.game_type), g.game_type); B('games.capacity', g.capacity === (g.game_type === 'doubles' ? 4 : 2), g);
        B('games.ntrp', g.ntrp_min <= g.ntrp_max && g.ntrp_min >= 1 && g.ntrp_max <= 16.5, g); B('games.cancelled_at', (g.status === 'cancelled') === (g.cancelled_at != null), g);
        B('games.time', g.created_at <= now && g.created_at < g.starts_at, g); B('games.host', !!U[g.host_id], g.host_id); B('games.venue', g.venue_id == null || VENUES.some(v => v[0] === g.venue_id), g.venue_id);
        B('games.completed', g.status !== 'completed' || g.starts_at + g.duration_min * 6e4 < now, g); B('games.open/full 未结束', !['open', 'full'].includes(g.status) || g.starts_at + g.duration_min * 6e4 >= now, g) });
      P.forEach(p => { const g = G[p.game_id]; B('parts.status', E.part_status.includes(p.status), p.status); B('parts.ref', !!g && !!U[p.user_id], p);
        B('parts.decline', p.decline_reason == null || E.decline.includes(p.decline_reason), p.decline_reason);
        B('parts.timeout=expired', (p.decline_reason === 'timeout') === (p.status === 'expired'), p);
        B('parts.left_at', ['withdrawn', 'left'].includes(p.status) === (p.left_at != null), p); B('parts.time', p.created_at <= now && (p.decided_at == null || p.decided_at >= p.created_at - 1) && (p.left_at == null || p.left_at <= now), p);
        B('parts.申请在开打前', p.role === 'host' || p.created_at < g.starts_at, p); B('parts.pending 没有结果', p.status !== 'pending' || p.decided_at == null, p);
        B('parts.女生局只有女生', !g.tags.includes('women') || U[p.user_id].gender === 'f', p) });
      const per = {}; P.forEach(p => { const k = p.game_id + '|' + p.user_id; per[k] = (per[k] || 0) + 1 }); B('parts.一人一局一行', Object.values(per).every(n => n === 1), Object.entries(per).find(x => x[1] > 1));
      G.forEach(g => { const ps = D.byGame.get(g.id) || [], ap = ps.filter(p => p.status === 'approved').length; B('games.通过人数 ≤ 容量', ap <= g.capacity, [g.id, ap, g.capacity]); B('games.有发起人一行', ps.filter(p => p.role === 'host').length === 1, g.id);
        B('games.人齐 = 通过人数够', g.status === 'cancelled' || g.visibility === 'private' || g.filled_at_start === (ap >= g.capacity) || g.starts_at > now, [g.id, ap, g.capacity, g.filled_at_start, g.status]) });
      D.invites.forEach(i => { B('invites.status', E.invite_status.includes(i.status), i.status); B('invites.ref', !!U[i.from_user] && !!U[i.to_user] && i.from_user !== i.to_user, i); B('invites.accepted 有球局', (i.status === 'accepted') === (i.game_id != null), i);
        B('invites.time', i.created_at <= now && (i.decided_at == null || i.decided_at <= now), i) });
      D.game_feel.forEach(f => { B('game_feel.feel', E.feel.includes(f.feel), f.feel); B('game_feel.完成的局', G[f.game_id].status === 'completed', f); B('game_feel.time', f.closed_at <= now, f) });
      D.player_prefs.forEach(x => B('player_prefs.pref', E.pref.includes(x.pref) && x.user_id !== x.target_id, x));
      D.impressions.forEach(x => B('impressions', x.from_id !== x.to_id && x.kinds.every(k => E.impression_kind.includes(k)), x));
      D.noshow_reports.forEach(x => B('noshow', x.target_id !== x.reporter_id && G[x.game_id].status === 'completed', x));
      D.reports.forEach(x => { B('reports.reason', E.report_reason.includes(x.reason), x.reason); B('reports.站内只用 5 个原因', x.source !== 'in_app' || ['pact_violation', 'harass', 'no_show', 'fake_profile', 'other'].includes(x.reason), x); B('reports.via', (x.source === 'in_app') === (x.via != null), x) });
      U.forEach(u => { B('users.status', E.user_status.includes(u.status), u.status); B('users.暂停有到期', u.status !== 'suspended' || u.status_until > now, u); B('users.created', u.created_at <= now, u);
        B('users.utr', u.utr >= 1 && u.utr <= 16.5, u.utr); B('users.gender', ['f', 'm', null].includes(u.gender), u.gender) });
      // ---- 访问记录 ----
      D.activity.forEach((A, d) => { for (let i = 0; i < A.u.length; i++) { const u = U[A.u[i]]; B('activity.注册之后才活跃', u && u.day <= d, [d, A.u[i]]); B('activity.dev', A.dev[i] >= 1 && A.dev[i] <= 3, A.dev[i]); B('activity.ses', A.ses[i] >= 1, A.ses[i]) }
        B('activity.一天一人一行', new Set(A.u).size === A.u.length, d) });
      // ---- 查询自洽 ----
      const L = D.L, rngs = [[L, L], [L - 7, L - 1], [L - 30, L - 1], [0, L]], q = [];
      rngs.forEach(([a, b2]) => { const all = Q.active_users(a, b2), mo = Q.active_users(a, b2, 'mobile'), de = Q.active_users(a, b2, 'desktop'), sum = Q.days(a, b2).reduce((s, d) => s + Q.dau(d), 0);
        B('Q.去重 ≤ 每天相加', all <= sum, [a, b2, all, sum]); B('Q.按设备 ≤ 合计 ≤ 两者之和', mo <= all && de <= all && all <= mo + de, [a, b2, all, mo, de]); B('Q.访客 ≥ 球友', Q.visitors(a, b2) >= all, [a, b2]);
        const f = Q.fill_rate(a, b2); B('Q.人齐 ≤ 开打 ≤ 球局', f.full <= f.started && f.started <= f.games && f.games === f.started + f.cancelled, f);
        const ap = Q.applications(a, b2); B('Q.申请人 ≤ 申请', ap.applicants <= ap.apps, ap);
        B('Q.看过发现 ≤ 访客', Q.distinct_people('disc', a, b2) <= Q.visitors(a, b2), [a, b2]); B('Q.新注册 ≤ 活跃（区间内注册当天都活跃）', Q.new_users(a, b2) <= Q.active_users(a, b2) + 1e-9, [a, b2]);
        q.push([all, mo, de, f.rate, ap.apps]) });
      // 新注册当天一定出现在活跃里
      let missReg = 0; U.forEach(u => { const A = D.activity[u.day]; if (!A.u.includes(u.id)) missReg++ }); B('注册当天算活跃', missReg === 0, missReg);
      const hash = JSON.stringify([U.length, G.length, P.length, D.invites.length, D.reports.length, q, P.slice(-5).map(p => p.status), G.slice(-3).map(g => g.starts_at)]);
      const sizes = { users: U.length, games: G.length, parts: P.length, invites: D.invites.length, dau: Q.dau(L - 1), wau: Q.active_users(L - 7, L - 1), fill7: Q.fill_rate(L - 7, L - 1).rate, ms: D.ms };
      return { bad, hash, sizes }
    }, ENUM);
    await p.close(); return { ...r, errs } };
  const r1 = await run(), r2 = await run();
  for (const [k, v] of Object.entries(r1.bad)) T(k, false, v);
  T('所有完整性检查通过', Object.keys(r1.bad).length === 0, Object.keys(r1.bad));
  T('同一时刻打开两次，数据完全一样', r1.hash === r2.hash);
  T('生成用时 < 1.5 秒（只在原型里模拟；上线后换成真实接口）', r1.sizes.ms < 1500, r1.sizes.ms);
  T('规模合理（球友 ≥ 1000、球局 ≥ 3000、昨天活跃 200–1500、近 7 天开打人齐率 40–90%）', r1.sizes.users >= 1000 && r1.sizes.games >= 3000 && r1.sizes.dau >= 200 && r1.sizes.dau <= 1500 && r1.sizes.fill7 > .4 && r1.sizes.fill7 < .9, r1.sizes);
  T('没有页面错误', !r1.errs.length && !r2.errs.length, r1.errs.concat(r2.errs));
  console.log('INFO ' + JSON.stringify(r1.sizes));
  console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
