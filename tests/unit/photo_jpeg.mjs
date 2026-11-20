// 场边照片上传的 JPEG 校验（#393 P1，server/api/photo_jpeg.mjs）：魔数 / 结尾 / 拼接 / EXIF·XMP·IPTC / 宽高与像素 / 大小。
//   不解码像素，只造「结构正确」的最小 JPEG；每条「拒绝」用例都对应一类真实攻击或误传（PNG、改了后缀的文本、JPEG 后面拼数据、两张图拼在一起、带 GPS 的 EXIF）。
import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { checkJpeg, PHOTO_MAX_PIXELS, PHOTO_VARIANTS } = await import(path.join(DIR, 'server/api/photo_jpeg.mjs'));
const { seg, asc, jpeg } = await import(path.join(HERE, '..', 'lib', 'jpeg_sample.mjs'));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };

const ok = (u, v = 'f') => checkJpeg(u, v), code = (u, v = 'f') => ok(u, v).code;

// ---- 正常的 ----
let r = ok(jpeg());
T('干净的 JPEG（480×320）→ ok，宽高读对', r.ok && r.w === 480 && r.h === 320, r);
T('熵编码数据里的 FF00 转义和重启标记 FFD0 不当成结构', ok(jpeg({ scan: [0x11, 0xFF, 0x00, 0x22, 0xFF, 0xD0, 0x33, 0xFF, 0xFF, 0xFF, 0xD1, 0x44] })).ok);
T('渐进式 JPEG（多个 SOS，中间夹 DHT）→ ok', ok(jpeg({ scan: [0x11, ...seg(0xC4, [0x10, ...Array(16).fill(0), 0]), ...seg(0xDA, [1, 1, 0, 1, 5, 0]), 0x22] })).ok);
T('三个变体的长边上限正好放行：1600 / 960 / 48', ok(jpeg({ w: 1600, h: 900 }), 'f').ok && ok(jpeg({ w: 960, h: 720 }), 't').ok && ok(jpeg({ w: 36, h: 48 }), 'b').ok);
T('带 ICC 配置文件（APP2）和注释（COM）的放行（客户端重绘不会有，但它们不含位置）', ok(jpeg({ extra: [...seg(0xE2, [...asc('ICC_PROFILE\0'), 1, 1, 9, 9]), ...seg(0xFE, asc('hello'))] })).ok);
T('APP13 但不是 Photoshop 资源块 → 放行', ok(jpeg({ extra: seg(0xED, asc('NotPhotoshop')) })).ok);

// ---- 不是 JPEG / 拼接 ----
const text = s => new TextEncoder().encode(s);
for (const [n, u] of [['PNG', Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0xD, ...asc('IHDR')])], ['GIF', text('GIF89a\x01\0\x01\0\0\0\0;')], ['SVG', text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
  ['HEIC（ftyp）', Uint8Array.from([0, 0, 0, 0x18, ...asc('ftypheic'), 0, 0, 0, 0, ...asc('mif1heic')])], ['WebP', text('RIFF\x24\0\0\0WEBPVP8 ')], ['改了后缀的文本', text('这不是图片，只是一段文字')], ['空文件', new Uint8Array(0)], ['只有 SOI', Uint8Array.from([0xFF, 0xD8])], ['3 字节', Uint8Array.from([0xFF, 0xD8, 0xFF])]])
  T(`${n} → photo_bad_format`, code(u) === 'photo_bad_format', code(u));
const good = jpeg();
T('JPEG 后面拼了别的数据（zip 头）→ photo_bad_format（结尾不是 FFD9）', code(Uint8Array.from([...good, 0x50, 0x4B, 3, 4, 0, 0])) === 'photo_bad_format');
T('两张 JPEG 首尾拼接（结尾仍是 FFD9）→ photo_bad_format', code(Uint8Array.from([...good, ...jpeg()])) === 'photo_bad_format');
T('缺 EOI（被截断）→ photo_bad_format', code(good.slice(0, good.length - 2)) === 'photo_bad_format');
T('没有帧头 SOF → photo_bad_format', code(jpeg({ sof: false })) === 'photo_bad_format');
T('两个帧头 → photo_bad_format', code(jpeg({ extra: seg(0xC0, [8, 0, 8, 0, 8, 1, 1, 0x11, 0]) })) === 'photo_bad_format');
T('宽或高为 0 → photo_bad_format', code(jpeg({ w: 0 })) === 'photo_bad_format' && code(jpeg({ h: 0 })) === 'photo_bad_format');
T('段长度超出文件 → photo_bad_format', code(Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0x7F, 0xFF, 1, 2, 3, 0xFF, 0xD9])) === 'photo_bad_format');
T('段长度小于 2 → photo_bad_format', code(Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 1, 0xFF, 0xD9])) === 'photo_bad_format');
T('未知变体 → photo_bad_format', code(good, 'x') === 'photo_bad_format');

// ---- 位置信息 ----
const gps = [...asc('Exif\0\0'), 0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8, 0, 1, 0x88, 0x25, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0x1A];   // 含 GPS 标签指针（0x8825）的 EXIF
T('EXIF（APP1，含 GPS 指针）→ photo_exif', code(jpeg({ extra: seg(0xE1, gps) })) === 'photo_exif');
T('只有 EXIF 头的空 APP1 也拒', code(jpeg({ extra: seg(0xE1, asc('Exif\0\0')) })) === 'photo_exif');
T('XMP（APP1，http://ns.adobe.com/xap/1.0/）→ photo_exif', code(jpeg({ extra: seg(0xE1, asc('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>')) })) === 'photo_exif');
T('扩展 XMP（APP1）→ photo_exif', code(jpeg({ extra: seg(0xE1, asc('http://ns.adobe.com/xmp/extension/\0abc')) })) === 'photo_exif');
T('IPTC（APP13 Photoshop 3.0 + 8BIM）→ photo_exif', code(jpeg({ extra: seg(0xED, [...asc('Photoshop 3.0\0'), ...asc('8BIM'), 4, 4, 0, 0]) })) === 'photo_exif');
T('EXIF 放在帧头之后也查得到', code(Uint8Array.from([...jpeg({ scan: [0x12] }).slice(0, -2), ...seg(0xE1, gps), 0xFF, 0xD9])) === 'photo_exif');

// ---- 尺寸与大小 ----
T('长边超限：原图 1601 / 缩略 961 / 极小图 49 → photo_too_big', code(jpeg({ w: 1601, h: 10 }), 'f') === 'photo_too_big' && code(jpeg({ w: 10, h: 961 }), 't') === 'photo_too_big' && code(jpeg({ w: 49, h: 10 }), 'b') === 'photo_too_big');
T('像素炸弹（65535×65535）→ photo_too_big', code(jpeg({ w: 65535, h: 65535 })) === 'photo_too_big');
T(`像素上限 ${PHOTO_MAX_PIXELS} 不依赖边长上限：2001×2000 在原图变体本来就超边长`, code(jpeg({ w: 2001, h: 2000 })) === 'photo_too_big');
T('字节超限：原图 > 1.5 MB / 缩略 > 250 KB / 极小图 > 4 KB → photo_too_big（先于解析）', code(jpeg({ scan: new Array(PHOTO_VARIANTS.f.bytes).fill(1) }), 'f') === 'photo_too_big' && code(jpeg({ w: 960, h: 720, scan: new Array(PHOTO_VARIANTS.t.bytes).fill(1) }), 't') === 'photo_too_big' && code(jpeg({ w: 48, h: 36, scan: new Array(PHOTO_VARIANTS.b.bytes).fill(1) }), 'b') === 'photo_too_big');
T('恰好在字节上限内的放行', ok(jpeg({ w: 48, h: 36, scan: new Array(PHOTO_VARIANTS.b.bytes - 200).fill(1) }), 'b').ok);
T('不是 JPEG 的超大文件先报 photo_too_big（不读内容）', code(new Uint8Array(PHOTO_VARIANTS.b.bytes + 1).fill(0x41), 'b') === 'photo_too_big');
T('耗时：1.5 MB 数据里没有标记，也在毫秒级（线性扫描，不会被卡住）', (() => { const big = jpeg({ scan: new Array(1_400_000).fill(0x55) }), t0 = Date.now(), x = ok(big); return x.ok && Date.now() - t0 < 500 })());

console.log(`photo_jpeg: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
