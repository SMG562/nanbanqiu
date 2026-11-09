/* 南伴球测试 · 「等到条件成立」的唯一写法（#118 第 7 条：同一处在 4 个 real_* 里各改一遍 → 抽到这里）
 * 按真实时间等满 ms，不按次数：pg.settle 在页面只等接口时会提前返回，按次数数实际只等 1–2 秒，CI 慢时会偶发红（#109）。
 * 用法：const { waitUntil } = require('../lib/wait');  const until = fn => waitUntil(pg, fn);
 *   fn 返回真值即停；返回 true / false（等满还不成立），由调用方后面的断言给出失败信息，这里不抛错。
 *   ignoreErrors：fn 抛错当成「还没成立」（页面导航中途 evaluate 会抛）。 */
async function waitUntil(pg, fn, { ms = 6000, step = 300, ignoreErrors = false } = {}) {
  const end = Date.now() + ms;
  for (;;) {
    try { if (await fn()) return true } catch (e) { if (!ignoreErrors) throw e }
    if (Date.now() >= end) return false;
    await pg.settle(step);
  }
}
module.exports = { waitUntil };
