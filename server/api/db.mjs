// 南伴球 · 接口层：连数据库（5g-3 第 1 步）。设计见 schema.sql「权限」一节：API 用 nbq_api 登录（属于 nbq_user + nbq_service），
//   每个请求在一个事务里 set local role 切身份：
//     asService：nbq_service（内部查询，例如由 Supabase 登录 id 找到球友）
//     asUser(uid)：nbq_user + nbq.uid（前台用户的请求，之后的读写全部受数据库的策略约束）
//   connect() 返回 { query(sql, params), end() }（pg 的 Client 或同样接口的东西）；没配置数据库时 connect 为 null。
export function makeDb(connect) {
  const run = async (role, uid, fn) => {
    if (!connect) { const e = new Error('db_not_configured'); e.code = 'db_not_configured'; throw e }
    const cl = await connect();
    try {
      await cl.query('begin'); await cl.query(`set local role ${role}`);
      if (uid) await cl.query(`select set_config('nbq.uid', $1, true)`, [uid]);
      const r = await fn(cl.query.bind(cl)); await cl.query('commit'); return r;
    } catch (e) { await cl.query('rollback').catch(() => { }); throw e }
    finally { await cl.end().catch(() => { }) }
  };
  return { asService: fn => run('nbq_service', null, fn), asUser: (uid, fn) => run('nbq_user', uid, fn), configured: !!connect };
}
