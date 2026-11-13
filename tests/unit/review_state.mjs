// 独立复核留言的唯一解析入口（tools/review_state.mjs，#201 / #214 阶段 2b）：只认第一行；看板、pr_merge、pr_say 三处口径一致。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { parse, collect } from '../../tools/review_state.mjs'; import { reviewState } from '../../tools/collab_board.mjs';
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
const ROOT = path.resolve(import.meta.dirname, '../..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
T('第一行「独立复核：通过 <提交号>」→ pass（取前 7 位）', parse('独立复核：通过 abcdef1234\n\n看了：x').pass === 'abcdef1');
T('带 nbq-say 注释标记的第一行照认；pr_say.sh 的形状「【独立复核：通过 751eb80】」也认（#114 真实留言）', parse('<!-- nbq-say:独立复核:751eb80:abc -->\n【独立复核：通过 751eb80】 看了…').pass === '751eb80');
T('要改：第一行「独立复核（提交号，说明）：**要改」→ fix', parse('独立复核（e76b202）：要改\n@A').fix === 'e76b202' && parse('独立复核（abcdef1，另开的只读会话）：**要改，1 条阻断**').fix === 'abcdef1');
T('反例：正文中间引用 / 举例', parse('核对数据如下：\n独立复核：通过 abcdef1').pass === null);
T('反例：引用行（> …）、代码块里', parse('> 独立复核：通过 abcdef1').pass === null && parse('```\n独立复核：通过 abcdef1\n```').pass === null);
T('反例：第一行有别的话在前面（#114 作者侧引用的形状）', parse('复核方留言原文是「独立复核：通过 abcdef1」').pass === null && parse('已改，请重新复核。独立复核：通过 abcdef1').pass === null);
T('反例：提交号太短 / 不是十六进制 / 空', parse('独立复核：通过 abc').pass === null && parse('独立复核：通过 zzzzzzz').pass === null && parse('').pass === null && parse(null).pass === null);
T('边界：提交号后紧跟字母数字（超长 / 粘连）不算；后面是空白、】、行尾才算', parse('独立复核：通过 abcdef1g').pass === null && parse('独立复核：通过 abcdef1zz').pass === null && parse('独立复核（abcdef1g）：要改').fix === null && parse('独立复核：通过 abcdef1】').pass === 'abcdef1' && parse('独立复核：通过 abcdef1').pass === 'abcdef1');
const c = collect(['独立复核：通过 aaaaaaa', '独立复核：通过 aaaaaaa1', '独立复核（bbbbbbb）：要改', '> 独立复核：通过 ccccccc']);
T('collect：去重（前 7 位相同只算一个）、引用的不算', JSON.stringify(c) === JSON.stringify({ pass: ['aaaaaaa'], fix: ['bbbbbbb'] }), c);
const SHA = 'abcdef1234567890', cm = (body, bot = false) => ({ body, bot });
T('看板 reviewState 和它同口径：正文引用不算通过；第一行才算；机器人不算', reviewState([cm('引用：\n独立复核：通过 abcdef1')], SHA) === 'none' && reviewState([cm('独立复核：通过 abcdef1')], SHA) === 'pass' && reviewState([cm('独立复核：通过 abcdef1', true)], SHA) === 'none' && reviewState([cm('独立复核（1111111）：要改')], SHA) === 'rereview');
// 三个出口都走同一个解析：pr_merge 不再 grep -F 全文；看板工作流的 sparse-checkout 要带上这个新文件（否则线上看板会 import 失败）
const pm = rd('tools/pr_merge.sh');
T('pr_merge.sh 用 review_state.mjs 取通过的提交号，不再在全文里 grep 这句话', /node tools\/review_state\.mjs pass/.test(pm) && !/grep -qF "独立复核：通过/.test(pm) && !/grep -oE '独立复核：通过/.test(pm));
const wf = rd('.github/workflows/collab-board.yml'), imports = [...rd('tools/collab_board.mjs').matchAll(/from '\.\/([\w-]+\.mjs)'/g)].map(m => 'tools/' + m[1]);
T('collab-board.yml 的 sparse-checkout 含 collab_board.mjs 所有相对 import（以后加 import 忘了改工作流会在这里红）', imports.includes('tools/review_state.mjs') && imports.every(f => wf.includes(f)), imports);
// pr_say.sh：非复核标签的正文里出现复核句式 → 拒发（不碰网络：守卫在第一次 gh 调用之前）
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nbq-say-')); fs.writeFileSync(path.join(d, 'gh'), '#!/usr/bin/env bash\necho GH_CALLED "$@"\n'); fs.chmodSync(path.join(d, 'gh'), 0o755);
const say = (tag, body) => spawnSync('bash', ['tools/pr_say.sh', '1', tag, 'abcdef1', body], { cwd: ROOT, env: { ...process.env, PATH: d + ':' + process.env.PATH }, encoding: 'utf8' });
let r = say('补充', '引用一下：独立复核：通过 abcdef1 是格式');
T('pr_say：非复核标签 + 正文含「独立复核：通过 <提交号>」→ 退出码 3、没调 gh', r.status === 3 && !/GH_CALLED/.test(r.stdout + r.stderr) && /请换个说法/.test(r.stderr), r);
r = say('补充', '独立复核（abcdef1，x）：要改 这种也拦');
T('pr_say：「独立复核（提交号）：要改」同样拦', r.status === 3, r.status);
r = say('接手 PR', '正常说明，没有复核句式');
T('pr_say：正常正文不拦（走到 gh）', r.status !== 3 && /GH_CALLED/.test(r.stdout), r);
r = say('说明', '独立复核（abcdef1 见上）已沿用；另（说明）：无');
T('pr_say：括号被隔开的正常句子不误拦（旧守卫的 .* 会跨括号匹配）', r.status !== 3 && /GH_CALLED/.test(r.stdout), r);
console.log(`review_state: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
