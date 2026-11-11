// tools/lib/qr.mjs（二维码生成）的正确性：用 OpenCV 的二维码解码器把生成的图读回来，必须读出原文。
// 覆盖：短文本、真实的 otpauth 地址（含中文，约 200 字节）、不同版本（1–10）的边界长度、版本 7 以上才有的「版本信息」区。
// 没有 Python + OpenCV 的机器上，退而检查结构（尺寸 / 三个定位角 / 最大长度报错），并明说没验解码，不当成通过解码。
import { execFileSync } from 'child_process'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
const { qrMatrix, qrTerminal } = await import(pathToFileURL(path.join(DIR, 'tools/lib/qr.mjs')));
const AU = await import(pathToFileURL(path.join(DIR, 'server/admin/auth.mjs')));
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && x !== undefined ? ' ' + JSON.stringify(x).slice(0, 400) : '')) };
const texts = [['短文本', 'hi'], ['真实的 otpauth 地址（中文名）', AU.totpURI(AU.newTotpSecret(), 'someone@example.com')], ['100 个字符（版本 6）', 'x'.repeat(100)], ['150 个字符（版本 8）', 'https://example.com/' + 'a'.repeat(130)], ['190 个字符（版本 10）', 'y'.repeat(190)], ['版本 7 边界（有版本信息区）', 'z'.repeat(110)]];
for (const [n, t] of texts) { const m = qrMatrix(t), size = m.length; T(`${n}：尺寸合法（17+4v）`, (size - 17) % 4 === 0 && size >= 21 && size <= 57, size);
  const fin = (ox, oy) => [0, 6].every(d => m[oy][ox + d] && m[oy + 6][ox + d] && m[oy + d][ox] && m[oy + d][ox + 6]) && !m[oy + 1][ox + 1] && m[oy + 3][ox + 3];
  T(`${n}：三个定位角都在`, fin(0, 0) && fin(size - 7, 0) && fin(0, size - 7)); T(`${n}：定位角旁边的格子是白的（分隔带）`, !m[7][0] && !m[0][7] && !m[7][size - 8]) }
let tooLong = false; try { qrMatrix('q'.repeat(300)) } catch (e) { tooLong = e.message === 'qr_too_long' } T('超过版本 10 的容量：明确报错，不画错的码', tooLong);
const term = qrTerminal('hello'); T('终端画法：白底黑块，一行一个 ANSI 重置，行数 = (尺寸 + 6) / 2 向上取整', term.split('\n').length === Math.ceil((qrMatrix('hello').length + 6) / 2) && term.split('\n').every(l => l.startsWith('\x1b[30;47m') && l.endsWith('\x1b[0m')));
let cv = true; try { execFileSync('python3', ['-c', 'import cv2, numpy'], { stdio: 'ignore' }) } catch (_) { cv = false }
if (!cv) console.log('SKIP 解码核对：这台机器没有 Python + OpenCV（只检查了结构）');
else {
  const py = `
import sys, json, cv2, numpy as np
d = cv2.QRCodeDetector(); bad = []
for t in json.load(sys.stdin):
    n = len(t['m']); S = 8; Q = 4; W = (n + 2*Q) * S
    img = np.full((W, W), 255, np.uint8)
    for y in range(n):
        for x in range(n):
            if t['m'][y][x]: img[(y+Q)*S:(y+Q+1)*S, (x+Q)*S:(x+Q+1)*S] = 0
    v, _, _ = d.detectAndDecode(img)
    if v != t['t']: bad.append([t['name'], v[:30]])
print(json.dumps(bad))`;
  const out = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(texts.map(([name, t]) => ({ name, t, m: qrMatrix(t) }))), maxBuffer: 1 << 26 }).toString());
  T(`解码核对：${texts.length} 段文本都能被 OpenCV 读回原文`, out.length === 0, out) }
console.log(`qr_encode: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
