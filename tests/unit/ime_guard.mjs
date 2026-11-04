// 中文输入法保护（11-05）：所有前台「按回车」的监听，必须排除输入法拼写中的回车（isComposing / keyCode 229），
// 否则在手机上打拼音时按「确认」就会把表单提交、邀约发出去。后台（电脑端、管理员用）不查。
// 确实不需要的（如纯快捷键）在同一行写 /* ime-ok: 原因 */。
import fs from 'fs'; import path from 'path';
const DIR = process.argv[2] || process.cwd();
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x ? ' ' + JSON.stringify(x) : '')) };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let n = 0;
for (const f of walk(path.join(DIR, 'src')).filter(f => f.endsWith('.js') && !f.includes(path.sep + 'admin' + path.sep))) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    if (!/key\s*===?\s*['"]Enter['"]|keyCode\s*===?\s*13/.test(l) || /^\s*(\/\/|\/\*|\*)/.test(l)) return; n++;
    T(`${path.relative(DIR, f)}:${i + 1} 回车监听要排除输入法拼写（isComposing / 229）`, /isComposing|229|nbqImeEnter|ime-ok/.test(l), l.trim().slice(0, 120)) }) }
T('找到的回车监听数量合理（防止扫描失效）', n >= 6, n);
console.log(`\nime_guard: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
