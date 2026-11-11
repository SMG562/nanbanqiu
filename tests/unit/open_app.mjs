// 页面测试公共函数 tests/lib/app.js（11-11，#172 第 4 项）：选项 → 打开方式（appPlan，纯函数），页面初始化脚本（空沙盒里跑）。
// 11-11 实测：pageerror 已含没人处理的 Promise 拒绝，所以不另外监听。
// 浏览器里真打开由改写过的 frontend/intro 覆盖。
import { createRequire } from 'module'; import path from 'path'; import vm from 'vm';
const require = createRequire(import.meta.url);
const { appPlan, pageInit } = require('../lib/app.js');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? '  ✓ ' : 'FAIL ') + n + (ok || x === undefined ? '' : ' ' + JSON.stringify(x))); };
const throws = (o, re) => { try { appPlan(o); return false } catch (e) { return re.test(e.message) } };

const d = appPlan();
T('默认：手机端、390×844、墨尔本、https 假域名、开关全关、等 900ms', d.end === 'PWA' && d.context.viewport.width === 390 && d.context.viewport.height === 844 && d.context.timezoneId === 'Australia/Melbourne'
  && d.url === 'https://nanbanqiu.test/' && d.flagKeys.length === 0 && d.settle === 900 && path.basename(d.file) === '南伴球_PWA.html', d);
const w = appPlan({ end: 'Web' });
T('网页端默认 1360×860、读 南伴球_Web.html', w.context.viewport.width === 1360 && w.context.viewport.height === 860 && path.basename(w.file) === '南伴球_Web.html', w);
const o = appPlan({ end: 'Web', tz: 'Asia/Shanghai', flags: ['intro', 'utr'], width: 1024, height: 700, hash: '#g=Ab3k', origin: 'https://nanbanqiu.app/', settle: 0 });
T('选项都生效：时区 / 开关 / 屏宽 / 地址尾巴 / 域名（去掉结尾斜杠）/ 不等', o.context.timezoneId === 'Asia/Shanghai' && o.flagKeys.join() === 'nbq_ff_intro,nbq_ff_utr' && o.context.viewport.width === 1024
  && o.context.viewport.height === 700 && o.url === 'https://nanbanqiu.app/#g=Ab3k' && o.origin === 'https://nanbanqiu.app' && o.settle === 0, o);
T('只给屏宽：屏高仍按端默认', appPlan({ width: 320 }).context.viewport.height === 844);
// 写错不能悄悄不生效
T('拼错的选项名 → 报错并列出能用的', throws({ flag: ['intro'] }, /不认识的选项：flag.*能用的/));
T('end 只能 PWA / Web', throws({ end: 'pwa' }, /PWA \/ Web/));
T('flags 写成字符串 → 报错', throws({ flags: 'intro' }, /flags/));
T('flags 写成完整键名 → 报错（只写开关名）', throws({ flags: ['nbq_ff_intro'] }, /flags/));
T('origin 不是 https://域名 → 报错', throws({ origin: 'file:///x' }, /origin/) && throws({ origin: 'http://nanbanqiu.test' }, /origin/));
T('hash 不以 # / ? 开头 → 报错', throws({ hash: 'g=1' }, /hash/));
T('屏宽不是数 → 报错', throws({ width: '390' }, /width/) && throws({ settle: -1 }, /settle/));
// 页面初始化脚本：空沙盒（假 localStorage）
const ls = {}, run = (store, keys) => { const c = vm.createContext({ localStorage: store, ARGS: keys }); vm.runInContext('(' + pageInit.toString() + ')(ARGS)', c) };
run({ setItem: (k, v) => { ls[k] = v } }, ['nbq_ff_intro', 'nbq_ff_utr']);
T('初始化：开关写进 localStorage =1', ls.nbq_ff_intro === '1' && ls.nbq_ff_utr === '1', ls);
let ok = true; try { run({ setItem: () => { throw new Error('quota') } }, ['nbq_ff_x']) } catch (_) { ok = false }
T('本机存储报错时初始化不抛错', ok);
console.log(`open_app: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
