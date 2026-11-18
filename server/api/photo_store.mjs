// 场边照片的存储适配层（ADR 0015）：接口层和定时任务只通过这 5 个方法碰对象存储，日后换 Supabase Storage / S3 兼容服务只改这个文件。
//   bucket = Cloudflare R2 的绑定（env.PHOTOS）；没有任何密钥。键 = sb/<用户 id>/<名>[-t|-b].jpg
//   put(key, bytes) → true = 新写入；false = 键已存在，没有覆盖（不覆盖是硬规则：写入时带 onlyIf，不靠先查再写）
//   get(key) → Uint8Array | null；del(keys) ；list(prefix, cursor?) → { keys: [{ key, size, uploaded }], cursor | null }；head(key) → { size } | null
export function r2Store(bucket) {
  return {
    async put(key, bytes) {
      const r = await bucket.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'private, no-store' }, onlyIf: { etagDoesNotMatch: '*' } });
      return r !== null;
    },
    async get(key) { const o = await bucket.get(key); return o ? new Uint8Array(await o.arrayBuffer()) : null },
    async head(key) { const o = await bucket.head(key); return o ? { size: o.size } : null },
    async del(keys) { await bucket.delete(keys) },
    async list(prefix, cursor) {
      const r = await bucket.list({ prefix, cursor: cursor || undefined, limit: 500 });
      return { keys: r.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded })), cursor: r.truncated ? r.cursor : null };
    },
  };
}
