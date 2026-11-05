// Pages Functions 入口：/admin/api/*（后台接口；规则在 server/admin/api.mjs）。
// 需要在 Pages 项目里设置密钥 ADMIN_DB_URL（登录角色 nbq_admin_api 的连接串）；不用前台接口的 DB_URL / HYPERDRIVE。
import { handleAdmin } from '../../../server/admin/api.mjs';
import { connectAdminFromEnv } from '../../../server/admin/connect.mjs';

let deps;
export const onRequest = ({ request, env }) => handleAdmin(request, (deps ||= { connect: connectAdminFromEnv(env) }));
