// 类名撞车闸门（#443：发布页聚焦时加的 .typing 和样式里「对方正在输入」气泡的 .typing{height:30px;position:absolute} 重名，
//   整张发布页被压成 30px，手机端 / 网页端「输入框不见了」，测试没抓到）。
//   规则：场边 JS 里用 classList.add / toggle 动态加的类名，在场边样式（SB_CSS）里不许有「裸规则」（以 .名 开头、没有祖先限定、也没有同元素的别的类）。
//   要给状态类写样式，就写成 .父类.状态类 或加前缀（如 cmp-ty）。有意作为根类的登记在 ALLOW。
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), DIR = process.argv[2] || path.join(HERE, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x).slice(0, 400))) };
const ALLOW = new Set(['desk', 'xfade']);   // desk：Shadow DOM 里 .dev 的桌面模式根类；xfade：换页淡出层，样式只用于这一个临时节点
const dir = path.join(DIR, 'src/shared/side'), files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const js = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const css = fs.readFileSync(path.join(dir, files.find(f => f.startsWith('0010'))), 'utf8').replace(/\\n/g, '\n');
const dyn = new Set([...js.matchAll(/classList\.(?:add|toggle)\(\s*['"]([A-Za-z][\w-]*)['"]/g)].map(m => m[1]));
T('扫描到动态类名（防扫描失效）', dyn.size >= 8, [...dyn]);
const bare = n => new RegExp('(?:^|[},;\\n])\\s*\\.' + n.replace(/-/g, '\\-') + '\\s*(?:\\{|,)', 'm').test(css);
const bad = [...dyn].filter(n => !ALLOW.has(n) && bare(n));
T('动态加的类名在场边样式里没有裸规则（会和同名组件撞车）', bad.length === 0, bad);
T('cmp-ty（发布页打字态）存在且只出现在 .compose.cmp-ty 之下', /\.compose\.cmp-ty/.test(css) && !bare('cmp-ty'));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
