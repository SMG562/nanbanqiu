// Pages Functions 入口：/admin/api/*（后台接口；规则在 server/admin/api.mjs）。
// 需要在 Pages 项目里设置：密钥 ADMIN_DB_URL（登录角色 nbq_admin_api 的连接串；不用前台接口的 DB_URL / HYPERDRIVE）；
//   变量 ADMIN_HOSTS（生产环境 = nanbanqiu.app；预览环境 = *.nanbanqiu-preview.pages.dev）。没配 ADMIN_HOSTS = 后台接口全部 404。
import { handleAdmin, parseHosts } from '../../../server/admin/api.mjs';
import { connectAdminFromEnv } from '../../../server/admin/connect.mjs';

let deps;
export const onRequest = ({ request, env }) => handleAdmin(request, (deps ||= { connect: connectAdminFromEnv(env), hosts: parseHosts(env.ADMIN_HOSTS) }));
