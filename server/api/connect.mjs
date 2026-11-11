// 南伴球 · 接口层：Workers 里怎么连数据库。优先 Hyperdrive（env.HYPERDRIVE），其次密钥 env.DB_URL（nbq_api 的连接串）；都没有 = 没配置。
// 只在 Workers 里用（需要 nodejs_compat）；测试直接给 makeDb 传自己的 connect。pg 在第一次连接时才载入。
export function connectFromEnv(env) {
  const cs = env?.HYPERDRIVE?.connectionString || env?.DB_URL;
  if (!cs) return null;
  return async () => { const { default: pg } = await import('pg'); const c = new pg.Client({ connectionString: cs }); await c.connect(); return c };
}
