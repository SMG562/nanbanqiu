// 印色：库里存色名、前台画印用色值（11-03：真实数据模式漏了转换，默认纸白被画成黑色）。nbqColor 从源码取出来在 Node 里测
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || process.env.NBQ_DIR || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 200) : '')) };
const rd = f => fs.readFileSync(path.join(DIR, 'src/shared/script', f), 'utf8');
const sl = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); return s.slice(i, j) };
const ctx = {}; vm.createContext(ctx);
vm.runInContext(sl(rd('0050-印章头像.js'), 'const ZAVC=', '\n') + '\n' + sl(rd('0040-工具.js'), 'const AVC=[', '\n') + '\n' + sl(rd('0495-接口调用.js'), 'function nbqColor', '\n// 球友') + ';this.f=nbqColor;this.Z=ZAVC;this.A=AVC', ctx);
const f = ctx.f;
T('默认 paper → 纸白 #F4EFE3', f('paper') === '#F4EFE3');
T('印色 12 种：库里的色名都能换成色值（不是黑色）', ['paper', 'red', 'orange', 'olive', 'green', 'teal', 'sky', 'navy', 'violet', 'rose', 'cocoa', 'slate'].every(k => /^#[0-9A-F]{6}$/i.test(f(k))));
T('字母底色（coral / amber / wine）也能换', ['coral', 'amber', 'wine'].every(k => /^#[0-9A-F]{6}$/i.test(f(k))));
T('已经是色值 → 原样', f('#E3262B') === '#E3262B');
T('空 / 认不出 → 回到纸白，绝不把色名直接当颜色', f(null) === '#F4EFE3' && f(undefined) === '#F4EFE3' && f('???') === '#F4EFE3' && f('') === '#F4EFE3');
T('第一个印色就是纸白（默认色约定）', ctx.Z[0][0] === 'paper' && ctx.Z[0][1] === '#F4EFE3');
const sch = fs.readFileSync(path.join(DIR, 'schema.sql'), 'utf8');
const defs = [...sch.matchAll(/alter column avatar_color set default '(\w+)'/g)].map(m => m[1]);
T('schema.sql 里 avatar_color 的默认值最终是 paper（不能被后面的语句改掉）', defs.length > 0 && defs.at(-1) === 'paper' && /avatar_color\s+text not null default 'paper'/.test(sch), defs);
console.log(`avatar_color: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
