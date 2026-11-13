// 旧系统兜底（#51）：主脚本用了较新语法（可选链等），旧系统解析失败会整块不执行、白屏。
//   页面开头有一段老写法的兜底：主脚本第一行设 window.NBQ_UP=1，页面加载完还没有就显示升级提示。
//   两端各走两遍：① 正常打开 → 不出现提示、主脚本跑起来了；② 把主脚本改成旧浏览器解析不了的样子 → 出现提示（不白屏），且兜底脚本自己不报错。
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0;
const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 300) : '')) };
(async () => {
  const b = await chromium.launch({});
  for (const f of ['PWA', 'Web']) {
    const html = fs.readFileSync(path.join(DIR, '南伴球_' + f + '.html'), 'utf8');
    T(f + ' 页面里有兜底脚本和主脚本标记', html.includes("id='nbqOld'") && html.includes('window.NBQ_UP=1;'));
    // 模拟旧浏览器：主脚本第一行之后插一段它解析不了的语法 → 整块 SyntaxError、不执行
    const old = html.replace('window.NBQ_UP=1;', 'window.NBQ_UP=1; const __old = ) ;');
    for (const [tag, body, want] of [['正常打开', html, false], ['主脚本解析失败（模拟旧系统）', old, true]]) {
      const ctx = await b.newContext({ viewport: f === 'PWA' ? { width: 390, height: 844 } : { width: 1360, height: 860 } });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('https://nanbanqiu.test/**', r => r.request().resourceType() === 'document' ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }) : r.abort());
      await p.goto('https://nanbanqiu.test/'); await p.settle(800);
      const st = await p.evaluate(() => { const e = document.getElementById('nbqOld'); return { shown: !!(e && e.offsetHeight > 100), text: e ? e.innerText : '', up: !!window.NBQ_UP } });
      T(`${f} ${tag}：${want ? '显示升级提示' : '不显示提示'}`, st.shown === want, st);
      if (want) {
        T(`${f} ${tag}：提示说清怎么办（升级 / 换浏览器 / 微信里怎么开）`, /球拍有点旧了。/.test(st.text) && /Safari \/ Chrome/.test(st.text) && /在浏览器打开/.test(st.text), st.text);
        T(`${f} ${tag}：第一个报错是主脚本的语法错误，兜底脚本自己没报错`, errs.length >= 1 && /SyntaxError|Unexpected/i.test(errs[0]) && !errs.some(e => /nbqOld|appendChild|cssText/.test(e)), errs);   // 后面依赖主脚本的小段（如 CITY）跟着报错是预期的
      } else T(`${f} ${tag}：主脚本跑起来了、没有页面报错`, st.up && errs.length === 0, errs);
      await ctx.close();
    }
  }
  await b.close();
  console.log(`old_browser: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
