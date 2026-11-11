// Pages Functions 入口：/api/*（预览站是 Cloudflare Pages，走这里；Workers 部署走 worker/index.mjs，两边共用 server/api）。
// 需要在 Pages 项目里：Settings → Runtime → Compatibility flags 加 nodejs_compat（Production），并设置密钥 DB_URL（nbq_api 的连接串）。
import { handleApi } from '../../server/api/handler.mjs';
import { makeVerifier } from '../../server/api/jwt.mjs';
import { makeDb } from '../../server/api/db.mjs';
import { connectFromEnv } from '../../server/api/connect.mjs';
import { SUPABASE } from '../../server/headers.mjs';

let deps;
const apiDeps = env => (deps ||= { verify: makeVerifier({ url: env.SUPABASE_URL || SUPABASE }), db: makeDb(connectFromEnv(env)), vapid: env.VAPID_PUBLIC || null });
export const onRequest = ({ request, env }) => handleApi(request, apiDeps(env));
