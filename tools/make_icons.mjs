#!/usr/bin/env node
/**
 * 生成主屏幕图标 icons/*.png（从 icons/icon.svg 渲染，需要 Playwright 的 Chromium）。
 *   node tools/make_icons.mjs
 * icon-180（iOS apple-touch-icon，全出血方形，iOS 自己加圆角）· icon-192 / icon-512（Android / manifest）
 * · icon-maskable-512（内容缩到安全区 80% 以内，Android 圆形 / 圆角遮罩不切到球）。
 * 图标样式改了（icons/icon.svg）→ 重新跑一次并提交 PNG。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
// 去掉 <svg ...> 外壳，取里面的内容
const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// 背景渐变满铺不缩放，只缩两个球（否则缩小后四周会露出一圈底色）
const BGRECT = '<rect width="100" height="100" fill="url(#lgs501)"/>';
if (!body.includes(BGRECT)) throw new Error('icon.svg 里找不到背景矩形，make_icons 要跟着改');
const make = (inner, scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${BGRECT}<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${inner.replace(BGRECT, '')}</g></svg>`;
const bg = '#0E5139';   // 缩小后四周露出的底色（和渐变深端一致）
const OUT = [['icon-180.png', 180, 1], ['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['icon-maskable-512.png', 512, 0.9]];
const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
for (const [name, px, sc] of OUT) {
  const pg = await b.newPage({ viewport: { width: px, height: px } });
  await pg.setContent(`<body style="margin:0;background:${bg}">${make(body, sc).replace('<svg ', `<svg width="${px}" height="${px}" style="display:block" `)}</body>`);
  await pg.screenshot({ path: path.join(ROOT, 'icons', name), omitBackground: false });
  await pg.close();
}
await b.close();
console.log('icons/ 已生成：' + OUT.map(o => o[0]).join(' · '));
