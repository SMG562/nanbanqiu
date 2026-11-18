// Pages Functions 入口：/api/*（预览站是 Cloudflare Pages，走这里；Workers 部署走 worker/index.mjs，两边共用 server/api）。
// 需要在 Pages 项目里：Settings → Runtime → Compatibility flags 加 nodejs_compat（Production），并设置密钥 DB_URL（nbq_api 的连接串）。
import { handleApi } from '../../server/api/handler.mjs';
import { makeVerifier, makeSession } from '../../server/api/jwt.mjs';
import { makeDb } from '../../server/api/db.mjs';
import { r2Store } from '../../server/api/photo_store.mjs';
import { connectFromEnv } from '../../server/api/connect.mjs';
import { SUPABASE } from '../../server/headers.mjs';

let deps;
const apiDeps = env => (deps ||= { verify: makeVerifier({ url: env.SUPABASE_URL || SUPABASE }), db: makeDb(connectFromEnv(env)), vapid: env.VAPID_PUBLIC || null, minBuild: env.NBQ_MIN_BUILD || null,
  photos: env.PHOTOS ? r2Store(env.PHOTOS) : null,   // 场边照片的 R2 绑定（wrangler.jsonc 的 env.production / env.preview）；没绑 = 上传接口 503
  session: makeSession(env.NBQ_SESSION_KEY),   // 登录交接的签名密钥（EC P-256 JWK）；不设 = 不启用
  asset: p => env.ASSETS.fetch(new Request('https://assets.invalid' + p)) });   // 最低前端版本（ADR 0013），默认不设
export const onRequest = ({ request, env }) => handleApi(request, apiDeps(env));
