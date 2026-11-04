// 11-04 开打后 30 分钟内仍可申请：发送程序的「已开打就不推」规则要和数据库、前台的 30 分钟一致。
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const R = await import(pathToFileURL(path.join(DIR, 'server/notify/rules.mjs')).href);
const rd = f => fs.readFileSync(path.join(DIR, f), 'utf8');
const now = Date.parse('2026-11-04T02:31:00Z'), at = m => new Date(now - m * 6e4).toISOString();   // 开打 m 分钟前
const stale = (kind, startedMinAgo, ctx = {}) => R.staleReason({ kind }, { game: { status: 'open', starts_at: at(startedMinAgo) }, applicantStatus: 'pending', ...ctx }, now);

T('常量 = 30 分钟', R.LATE_JOIN_MS === 30 * 6e4);
T('开打 1 分钟后：有人申请照常推（13:31 发起人打开前就该收到）', stale('request', 1) === null, stale('request', 1));
T('开打 29 分钟后：申请 / 加入 / 通过 / 婉拒 / 失效 / 满员 / 有人退出 都照推',
  ['request', 'joined', 'approved', 'rejected', 'expired', 'full', 'player_left'].every(k => stale(k, 29, { applicantStatus: 'pending' }) === null));
T('开打 31 分钟后：申请通知过时（已开打）', stale('request', 31) === 'started', stale('request', 31));
T('开打后：别的类型（开打前提醒 / 还缺人）仍然不推', stale('soon', 1, { myStatus: 'approved' }) === 'started' && stale('unfilled', 1) === 'started');
T('「没有凑齐」「赛后」等仍可在开打后推', ['unfilled_end', 'recap', 'noshow', 'game_cancelled'].every(k => stale(k, 40) === null));
T('申请已被处理 → 仍判已处理', stale('request', 5, { applicantStatus: 'approved' }) === 'handled');
const A = R.pushText({ kind: 'request' }, { actorName: 'Han', applicantEta: 15, game: { starts_at: at(1), tz: 'Australia/Melbourne', venue: 'TW' }, now });
T('开打后的申请推送：标题带预计到场分钟', A.title === 'Han 想加入，预计 15 分钟到', A.title);
T('开打前的申请推送：不带预计分钟（保持原样）', R.pushText({ kind: 'request' }, { actorName: 'Han', applicantEta: 15, game: { starts_at: at(-60), tz: 'Australia/Melbourne' }, now }).title === 'Han 申请加入你的球局');
T('申请超时的推送文案不再写「失效」', !R.pushText({ kind: 'expired' }, { game: { starts_at: at(1), tz: 'Australia/Melbourne' } }).title.includes('失效'));
// 和数据库 / 前台写同一个数
const sql = rd('server/migrations/20261104_late_join.sql'), schema = rd('schema.sql');
T('迁移和 schema.sql 都用「开打 + 30 分钟」', sql.includes("starts_at + interval '30 minutes' <= now()") && schema.includes("starts_at + interval '30 minutes' <= now()"));
T('申请截止不再被开打截断（迁移、schema 都没有 least(…, p_start)）', !/least\(greatest\(p_created/.test(sql) && !/least\(greatest\(p_created/.test(schema));
T('迁移带上预计到场分钟列、开打后不能直接加入、人齐了只许改 filled', sql.includes('eta_min smallint') && sql.includes("join_not_allowed', 'started'") && sql.includes("p - 'filled' = '{}'::jsonb"));
T('前台 LATE_JOIN = 30 分钟', /const LATE_JOIN=30\*6e4/.test(rd('src/shared/script/0110-数据.js')));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
