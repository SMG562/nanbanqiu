// 南伴球 · 后台接口怎么连数据库：只认密钥 ADMIN_DB_URL（登录角色 nbq_admin_api 的连接串）。
//   故意不看 env.HYPERDRIVE / env.DB_URL：那两个是前台接口的连接（nbq_api，带 nbq_service 权限），后台接口绝不能误用。没配 = null（接口返回 503 db_unavailable）。
export function connectAdminFromEnv(env) {
  const cs = env?.ADMIN_DB_URL;
  if (!cs || typeof cs !== 'string') return null;
  return async () => { const { default: pg } = await import('pg'); const c = new pg.Client({ connectionString: cs }); await c.connect(); return c };
}
