// 南伴球 · 接口层入口：/api/*（5g-3 第 1 步：骨架 + 令牌验证 + 健康检查 + /api/me）。
//   handleApi(request, { verify, db }) → Response。纯函数风格，Node / Workers 都能用；同域调用，不开 CORS。
//   错误一律 { error: '<码>' }，码和前台 API_ERR 对照；没登录 401 unauthorized；数据库没配 / 连不上 503 db_unavailable。
//   后续步骤在 ROUTES 里加路由（球局、申请……），都经过同一个 auth + db 流程。
const JSON_H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const send = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: { ...JSON_H, ...extra } });

const ME_COLS = 'id, nickname, last_initial, member_no, utr, utr_estimated, avatar_kind, avatar_animal, avatar_color, card_theme, created_at';

// 登录令牌 → 球友 id（没有对应的球友 = 还没注册，返回 null）
async function whoIs(request, { verify, db }) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!m) return { err: send(401, { error: 'unauthorized' }) };
  const v = await verify(m[1]);
  if (!v.ok) return { err: send(401, { error: 'unauthorized' }, { 'X-Auth-Reason': v.code }) };
  const uid = await db.asService(async q => (await q('select id from users where auth_id = $1', [v.sub])).rows[0]?.id || null);
  return { sub: v.sub, uid };
}

const ROUTES = {
  'GET /api/health': async (req, d) => {
    const out = { ok: true, db: null };
    if (new URL(req.url).searchParams.get('db') === '1') {
      try { await d.db.asService(q => q('select 1')); out.db = true } catch (_) { out.db = false; out.ok = false }
    }
    return send(out.ok ? 200 : 503, out);
  },
  'GET /api/me': async (req, d) => {
    const w = await whoIs(req, d); if (w.err) return w.err;
    if (!w.uid) return send(200, { registered: false });
    const user = await d.db.asUser(w.uid, async q => (await q(`select ${ME_COLS} from users where id = nbq_uid()`)).rows[0] || null);
    return send(200, user ? { registered: true, user } : { registered: false });
  },
};

export async function handleApi(request, deps) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const key = request.method + ' ' + path, h = ROUTES[key] || (request.method === 'HEAD' && ROUTES['GET ' + path]);
  if (!h) return Object.keys(ROUTES).some(k => k.endsWith(' ' + path)) ? send(405, { error: 'method_not_allowed' }) : send(404, { error: 'not_found' });
  try { return await h(request, deps) }
  catch (e) { console.error('api_error', key, e && (e.code || e.message)); return send(503, { error: 'db_unavailable' }) }   // 细节不外露（数据库地址、报错原文）；排查看 Workers 日志
}
