// Cloudflare Workers 入口（预览站现在的部署方式：wrangler.jsonc + `wrangler deploy`，静态文件在 site/）。
// 只接管 /g/码、/p/编号（wrangler.jsonc 的 run_worker_first），其余全部交给静态资源。
// Pages 部署方式用的是 functions/ 目录（同一个处理函数 server/og/page.mjs）——两边都留着，哪种部署都生效。
import data from '../server/og/demo_data.json';
import { sharePage } from '../server/og/page.mjs';
import { siteRoute } from '../server/site_route.mjs';
import { handleApi } from '../server/api/handler.mjs';
import { makeVerifier, makeSession } from '../server/api/jwt.mjs';
import { makeDb } from '../server/api/db.mjs';
import { connectFromEnv } from '../server/api/connect.mjs';
import { SUPABASE } from '../server/headers.mjs';
import { handleAdmin, isAdminPath, parseHosts } from '../server/admin/api.mjs';
import { connectAdminFromEnv } from '../server/admin/connect.mjs';

// /api/*：令牌验证 + 连数据库（Hyperdrive 或密钥 DB_URL；都没配时 /api/health 正常、要数据库的接口返回 503 db_unavailable）
let deps;
const apiDeps = env => (deps ||= { verify: makeVerifier({ url: env.SUPABASE_URL || SUPABASE }), db: makeDb(connectFromEnv(env)), vapid: env.VAPID_PUBLIC || null, minBuild: env.NBQ_MIN_BUILD || null, session: makeSession(env.NBQ_SESSION_KEY), asset: env.ASSETS ? p => env.ASSETS.fetch(new Request('https://assets.invalid' + p)) : null });   // 最低前端版本（ADR 0013），默认不设

let adminDeps;
export default {
  async fetch(request, env) {
    if (isAdminPath(new URL(request.url).pathname)) return handleAdmin(request, (adminDeps ||= { connect: connectAdminFromEnv(env), hosts: parseHosts(env.ADMIN_HOSTS) }));
    if (/^\/api(\/|$)/.test(new URL(request.url).pathname)) return handleApi(request, apiDeps(env));
    const m = new URL(request.url).pathname.match(/^\/(g|p)\/([A-Za-z0-9]+)\/?$/);
    if (m && (request.method === 'GET' || request.method === 'HEAD')) return sharePage(m[1], m[2], request, env, data);
    return (await siteRoute(request)) || env.ASSETS.fetch(request);
  },
};
