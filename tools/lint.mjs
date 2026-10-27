#!/usr/bin/env node
/**
 * 代码检查（R0，2026-10-27）：两个前台 HTML 里的脚本用 ESLint（版本固定在 tests/lint/package.json）检查，
 * 报出来的行号对回 src/ 里的源文件。
 *
 *   node tools/lint.mjs            检查；有问题退出码 1
 *   node tools/lint.mjs --json     机器可读（测试 static/lint 用）
 *
 * ESLint 装在测试缓存目录（默认 ~/.cache/nbq-tests/lint，NBQ_CACHE 可改）；没装时 run_all 会自动装，
 * 也可以手动：mkdir -p ~/.cache/nbq-tests/lint && cp tests/lint/package.json ~/.cache/nbq-tests/lint/ && (cd ~/.cache/nbq-tests/lint && npm install)
 *
 * 规则（只开会是真错的几条）：
 *   no-undef 用了没定义的名字（拼错的函数名、变量名）· no-redeclare / no-dupe-keys / no-dupe-class-members 重复声明
 *   no-const-assign · no-unreachable · no-self-assign · no-dupe-else-if · no-duplicate-case · use-isnan · valid-typeof
 * 不开：no-func-assign（本项目有意用后面的模块覆盖前面的函数，见 进度记录 §3「以最后一次定义为准」）。
 * 同一个 HTML 的几个 <script> 共用全局作用域，所以合在一起检查（其他行替换成空行，行号 = HTML 行号）。
 * window.X = … 定义的名字算这一端的全局；共用文件（src/shared/）里引用「另一端有定义」的名字不报——
 * 共用代码按平台分支调用（NR_PLAT、AN_BUILD、typeof …），这些调用由前台测试在两端真实跑过。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assemble, TARGETS, ROOT } from './build.mjs';

export const RULES = {
  'no-undef': 'error',
  'no-redeclare': ['error', { builtinGlobals: false }],
  'no-dupe-keys': 'error',
  'no-dupe-class-members': 'error',
  'no-const-assign': 'error',
  'no-unreachable': 'error',
  'no-self-assign': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
};

// 各端独有文件里，和另一端几乎相同的代码段：另一端的分支被 NR_PLAT / typeof 守着，在这一端不会执行。
// 新加一条要写清楚守着它的条件；能挪进 shared/ 的就挪进去，不加到这里。
export const CROSS_OK = {
  'pwa/script/0180-两端同步_v2.js': { names: ['renderPop', 'renderNav', 'select'], why: '整段在 if(typeof renderPop===\'function\') 里，PWA 没有 renderPop，不执行' },
  'pwa/script/0190-通知_v2.js': { names: ['select'], why: 'nrToGame 的 else 分支（NR_PLAT 不是 mobile 才走），PWA 不执行' },
  'web/script/0200-通知_v2.js': { names: ['openDetail', 'focusApplicant', 'closeDetail', 'go'], why: 'nrToGame / nrToDay 的 NR_PLAT===\'mobile\' 分支，网页端不执行' },
};

// 页面从 CDN 引入的库
const LIB_GLOBALS = { L: 'readonly', QRCode: 'readonly', html2canvas: 'readonly' };

export function lintModules() {
  const cache = path.resolve(process.env.NBQ_CACHE || path.join(os.homedir(), '.cache', 'nbq-tests'));
  return path.join(cache, 'lint', 'node_modules');
}

/** 只保留内联 <script> 里的行，其余行换成空行 */
export function scriptText(html) {
  const lines = html.split('\n'), out = [];
  let inside = false;
  for (const ln of lines) {
    const t = ln.trim();
    if (!inside && t === '<script>') { inside = true; out.push(''); continue; }
    if (inside && t === '</script>') { inside = false; out.push(''); continue; }
    out.push(inside ? ln : '');
  }
  return out.join('\n');
}

export function lint(root = ROOT, mods = lintModules()) {
  const req = createRequire(path.join(mods, '_.js'));
  const { Linter } = req('eslint'), globals = req('globals');
  const linter = new Linter({ configType: 'flat' });
  const config = [{
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser, ...LIB_GLOBALS } },
    rules: RULES,
  }];
  const out = [], code = {}, declared = {}, funcOnly = {};
  for (const [name, file] of Object.entries(TARGETS)) {
    const { text, parts } = assemble(name, root);
    const js = scriptText(text);
    // window.X = … 定义的名字也算这一端的全局
    const winG = Object.fromEntries([...js.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)].map(m => [m[1], 'writable']));
    const cfg = [{ ...config[0], languageOptions: { ...config[0].languageOptions, globals: { ...config[0].languageOptions.globals, ...winG } } }];
    const msgs = linter.verify(js, cfg, { filename: file + '.js' });
    const g = linter.getSourceCode().scopeManager.globalScope;
    declared[name] = new Set([...g.variables.filter(v => v.defs.length).map(v => v.name), ...Object.keys(winG)]);
    funcOnly[name] = new Set(g.variables.filter(v => v.defs.length > 1 && v.defs.every(d => d.type === 'FunctionName')).map(v => v.name));
    code[name] = { msgs, parts, file };
  }
  for (const [name, { msgs, parts, file }] of Object.entries(code)) {
    const other = Object.keys(TARGETS).find(k => k !== name);
    for (const m of msgs) {
      const p = parts.find(p => m.line >= p.start && m.line < p.start + p.lines);
      const shared = !!p && p.rel.startsWith('shared/');
      // 共用代码里引用另一端才有的名字：运行时按平台分支（NR_PLAT、AN_BUILD、typeof …），不算错
      const undefName = m.ruleId === 'no-undef' && (m.message.match(/^'(.+)' is not defined/) || [])[1];
      if (shared && undefName && declared[other].has(undefName)) continue;
      if (undefName && p && CROSS_OK[p.rel]?.names.includes(undefName)) continue;
      // 同名函数声明两次 = 本项目有意的「后面的模块覆盖前面的」（进度记录 §3），不算重复声明；let / const / var 照报
      const redecl = m.ruleId === 'no-redeclare' && (m.message.match(/^'(.+)' is already defined/) || [])[1];
      if (redecl && funcOnly[name].has(redecl)) continue;
      out.push({ file, line: m.line, src: p ? `src/${p.rel}` : '?', srcLine: p ? m.line - p.start + 1 : 0,
        col: m.column, rule: m.ruleId || 'parse', message: m.message, shared });
    }
  }
  // 共用文件在两个 HTML 里都会报一次，合并成一条
  const seen = new Set();
  return out.filter(x => { const k = x.shared ? `${x.src}:${x.srcLine}:${x.col}:${x.rule}:${x.message}` : JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

function main() {
  const json = process.argv.includes('--json');
  const mods = lintModules();
  if (!fs.existsSync(path.join(mods, 'eslint'))) { console.error('没装 ESLint：见 tools/lint.mjs 开头的说明'); process.exit(2); }
  const res = lint(ROOT, mods);
  if (json) console.log(JSON.stringify(res));
  else {
    for (const r of res) console.log(`${r.src}:${r.srcLine}:${r.col}  ${r.rule}  ${r.message}`);
    console.log(res.length ? `lint: ${res.length} 个问题` : 'lint: 没有问题');
  }
  process.exit(res.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
