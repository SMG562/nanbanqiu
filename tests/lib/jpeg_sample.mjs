// 造「结构完整」的最小 JPEG（不含可解码的像素），给 unit/photo_jpeg 和 unit/sb_photo_put 用。
export const seg = (m, d) => [0xFF, m, (d.length + 2) >> 8, (d.length + 2) & 255, ...d];
export const asc = s => [...s].map(c => c.charCodeAt(0));
// SOI · JFIF · extra · DQT · SOF0 · DHT · SOS · 数据 · EOI · tail
export const jpeg = ({ w = 480, h = 320, extra = [], scan = [0x12, 0x34, 0xFF, 0x00, 0x56], tail = [], sof = true } = {}) => Uint8Array.from([0xFF, 0xD8,
  ...seg(0xE0, [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...extra, ...seg(0xDB, [0, ...Array(64).fill(8)]),
  ...(sof ? seg(0xC0, [8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]) : []), ...seg(0xC4, [0, ...Array(16).fill(0), 0]), ...seg(0xDA, [1, 1, 0, 0, 63, 0]), ...scan, 0xFF, 0xD9, ...tail]);
