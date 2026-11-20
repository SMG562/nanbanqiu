// 场边照片上传的 JPEG 校验（#393 P1）：纯函数，不依赖运行环境，单测见 tests/unit/photo_jpeg.mjs。
//   只看结构、不解码像素（Worker 里不做图片处理）：魔数 FFD8FF、以 FFD9 结尾且中间没有第二张图、读 SOF 取宽高、拒含位置信息的段。
//   客户端已经用 canvas 重绘（不含 EXIF）；这里是二道防线，保证 GPS 不会落进存储。
//   返回 { ok: true, w, h } 或 { ok: false, code }；code：photo_bad_format（不是干净的 JPEG）/ photo_exif（带 EXIF·XMP·IPTC）/ photo_too_big（像素或边长超限）。
export const PHOTO_MAX_PIXELS = 4_000_000;
// 三个变体：f 原图（key = <名>.jpg）、t 缩略（<名>-t.jpg）、b 极小图（<名>-b.jpg）。大小为字节上限，edge 为长边上限
export const PHOTO_VARIANTS = { f: { suffix: '', bytes: 1.5 * 1024 * 1024, edge: 1600 }, t: { suffix: '-t', bytes: 250 * 1024, edge: 960 }, b: { suffix: '-b', bytes: 4 * 1024, edge: 48 } };

const SOF = new Set([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF]);   // C4 = DHT、C8 = JPG、CC = DAC 不是帧头
const has = (u, at, s) => { for (let i = 0; i < s.length; i++) if (u[at + i] !== s.charCodeAt(i)) return false; return true };

export function checkJpeg(u, variant) {
  const v = PHOTO_VARIANTS[variant], bad = { ok: false, code: 'photo_bad_format' };
  if (!v) return bad;
  if (u.length < 4) return bad;
  if (u.length > v.bytes) return { ok: false, code: 'photo_too_big' };
  if (u[0] !== 0xFF || u[1] !== 0xD8 || u[2] !== 0xFF || u[u.length - 2] !== 0xFF || u[u.length - 1] !== 0xD9) return bad;
  let i = 2, w = 0, h = 0, scan = false;
  while (i < u.length) {
    if (scan) {   // 熵编码数据：找下一个真正的标记（FF00 是转义、FFD0–D7 是重启、FFFF 是填充）
      while (i < u.length - 1 && !(u[i] === 0xFF && u[i + 1] !== 0 && u[i + 1] !== 0xFF && !(u[i + 1] >= 0xD0 && u[i + 1] <= 0xD7))) i++;
      if (i >= u.length - 1) return bad;
      scan = false;
    }
    if (u[i] !== 0xFF) return bad;
    while (u[i + 1] === 0xFF) i++;   // 填充
    const m = u[i + 1]; i += 2;
    if (m === 0xD9) return i === u.length && w && h ? size(w, h, v) : bad;   // EOI 必须正好是最后两个字节，且前面出现过帧头（防「两张图拼在一起」）
    if (m === 0xD8 || m === 0x00 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) return bad;   // 第二个 SOI / 孤立的重启标记 = 拼接或损坏
    if (i + 2 > u.length) return bad;
    const L = (u[i] << 8) | u[i + 1]; if (L < 2 || i + L > u.length) return bad;
    if (m === 0xE1) return { ok: false, code: 'photo_exif' };                                  // APP1：EXIF 或 XMP（含扩展 XMP），一律拒
    if (m === 0xED && has(u, i + 2, 'Photoshop 3.0')) return { ok: false, code: 'photo_exif' };   // APP13：Photoshop 资源块（IPTC 在这里）
    if (SOF.has(m)) { if (w || L < 8) return bad; h = (u[i + 3] << 8) | u[i + 4]; w = (u[i + 5] << 8) | u[i + 6]; if (!w || !h) return bad }
    i += L;
    if (m === 0xDA) scan = true;
  }
  return bad;
}
const size = (w, h, v) => w * h > PHOTO_MAX_PIXELS || Math.max(w, h) > v.edge ? { ok: false, code: 'photo_too_big' } : { ok: true, w, h };
