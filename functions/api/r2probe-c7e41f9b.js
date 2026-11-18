// 临时探针（P1 spike，只在草稿分支，合并前必须删除）：确认预览站读得到 env.PHOTOS，并核对 onlyIf 不覆盖的语义。路径带随机后缀，只在草稿分支预览站存在。
export const onRequest = async ({ env }) => {
  const b = env.PHOTOS, j = (o, s = 200) => new Response(JSON.stringify(o, null, 1), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!b) return j({ bound: false, hint: '环境里没有 PHOTOS 绑定' }, 200);
  const out = { bound: true, methods: ['put', 'get', 'head', 'delete', 'list'].filter(m => typeof b[m] === 'function') };
  try {
    const k = 'probe/spike-' + Date.now();
    out.put1 = (await b.put(k, new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/jpeg' }, onlyIf: { etagDoesNotMatch: '*' } })) !== null;   // 期望 true
    out.put2_overwrite_refused = (await b.put(k, new Uint8Array([9, 9]), { onlyIf: { etagDoesNotMatch: '*' } })) === null;                              // 期望 true（已存在 → null）
    const g = await b.get(k); out.get_bytes = g ? [...new Uint8Array(await g.arrayBuffer())] : null;                                                   // 期望 [1,2,3]（没被覆盖）
    out.head_size = (await b.head(k))?.size ?? null;
    out.list_count = (await b.list({ prefix: 'probe/', limit: 50 })).objects.length;
    await b.delete(k); out.deleted = (await b.head(k)) === null;
    const mk = 'probe/identity-marker'; await b.put(mk, new Uint8Array([1]));   // 留一个标记对象：在 Cloudflare 控制台看它出现在哪个桶，就知道预览站绑的是哪个桶
    out.marker = mk;
  } catch (e) { out.error = String(e && e.message || e) }
  return j(out);
};
