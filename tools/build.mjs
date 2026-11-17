#!/usr/bin/env node
/**
 * 从 src/ 拼出 南伴球_PWA.html、南伴球_Web.html（R0，2026-10-27）和 南伴球_后台.html（E3，2026-10-28）。
 *
 *   node tools/build.mjs           拼出来写回仓库根目录（内容没变的不写）
 *   node tools/build.mjs --check   只核对：仓库里的 HTML 和重新拼出来的完全一样，否则退出码 1
 *
 * 改代码只改 src/，改完跑一次本脚本；不要直接改这三个 HTML（测试 static/build 会抓到）。
 * src/pwa.list、src/web.list、src/admin.list 是拼接顺序：一行一个文件（相对 src/），# 开头是注释。
 *   src/shared/  手机端、网页端共用（只有一份）· src/pwa/、src/web/  各自独有 · src/admin/  后台（单独一份，不和前台共用）
 *   page/ 页面（head、骨架、结尾）· style/ 样式 · script/ 主脚本 · side/ 场边（PWA 第二个脚本）
 * 新加一个小文件：放进对应目录，在 list 里写到该在的位置。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TARGETS = { pwa: '南伴球_PWA.html', web: '南伴球_Web.html', admin: '南伴球_后台.html' };

export function readList(name, root = ROOT) {
  const listFile = path.join(root, 'src', name + '.list');
  return fs.readFileSync(listFile, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}

/** 拼一个目标；返回 { text, parts:[{ rel, start(从 1 起的行号), lines }] }，供代码检查把行号对回源文件 */
export function assemble(name, root = ROOT) {
  const parts = [];
  let text = '', line = 1;
  const rels = readList(name, root);
  // 拼接清单按 union 合并（.gitattributes）：两边都加同一行会合出重复行 → 同一段代码拼两遍；这里直接报错（#172）
  const dup = rels.filter((r, i) => rels.indexOf(r) !== i);
  if (dup.length) throw new Error(`src/${name}.list 里有重复的行：${[...new Set(dup)].join('、')}（多半是两个分支都加了同一行，删掉一行）`);
  for (const [i, rel] of rels.entries()) {
    const f = path.join(root, 'src', rel);
    if (!fs.existsSync(f)) throw new Error(`src/${name}.list 里的 ${rel} 不存在`);
    const s = fs.readFileSync(f, 'utf8');
    // 只有整个文件的最后一段可以不带换行（后台 HTML 原本就没有结尾换行）
    if (s && !s.endsWith('\n') && i < rels.length - 1) throw new Error(`src/${rel} 最后一行要有换行`);
    const n = (s.match(/\n/g) || []).length;
    parts.push({ rel, start: line, lines: n });
    text += s; line += n;
  }
  return { text, parts };
}

/** src 里没被任何 list 用到的文件（多半是忘了写进 list） */
export function orphans(root = ROOT) {
  const used = new Set(Object.keys(TARGETS).flatMap(k => readList(k, root)));
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!e.name.endsWith('.list')) {
        const rel = path.relative(path.join(root, 'src'), p).split(path.sep).join('/');
        if (!used.has(rel)) out.push(rel);
      }
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

function where(parts, lineNo) {
  const p = parts.find(p => lineNo >= p.start && lineNo < p.start + p.lines);
  return p ? `src/${p.rel} 第 ${lineNo - p.start + 1} 行` : '末尾';
}

function main() {
  const check = process.argv.includes('--check');
  let bad = 0;
  const orph = orphans();
  if (orph.length) { bad++; console.log('没写进 list 的源文件：\n  ' + orph.join('\n  ')); }
  for (const [name, file] of Object.entries(TARGETS)) {
    const { text, parts } = assemble(name);
    const out = path.join(ROOT, file);
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
    if (cur === text) { console.log(`${file}：一致`); continue; }
    if (check) {
      bad++;
      const a = (cur ?? '').split('\n'), b = text.split('\n');
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      console.log(`${file}：和 src 拼出来的不一样，从第 ${i + 1} 行开始（对应 ${where(parts, i + 1)}）。` +
        `改 src 后要跑 node tools/build.mjs；不要直接改 HTML。`);
    } else {
      fs.writeFileSync(out, text);
      console.log(`${file}：已重新拼出`);
    }
  }
  if (check) console.log(bad ? 'build check: FAIL' : 'build check: OK');
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
