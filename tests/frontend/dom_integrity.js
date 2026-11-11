// 页面完整性（11-04，网页端聊天里头像变成空白方块、我发的气泡多一圈框之后加）：
//   ① 整个页面里 id 不重复（SVG 滤镜 / 裁剪的 id 重复，浏览器会找到隐藏的那份，头像画成空白方块）；
//   ② 每个 url(#x) / href="#x" 引用的东西都存在；
//   ③ 同一个人的头像连续画多次（含一份在隐藏容器里），每一份都画得出来；
//   ④ 聊天气泡 / 头像没有被别处的同名 class 串味（例如导航的 .me 药丸边框套到我发的气泡上）。
//   两端、几个主要界面（首页 / 聊天收件箱 / 私信 / 球局群聊 / 球员卡）各查一遍。
const { chromium } = require('playwright'); const path = require('path');
const DIR = process.env.NBQ_DIR || path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const T = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log('FAIL ' + n + (x !== undefined ? ' ' + JSON.stringify(x).slice(0, 600) : '')) };
const SCAN = () => {
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id), dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  const miss = [];
  document.querySelectorAll('svg *').forEach(e => { for (const a of ['filter', 'clip-path', 'mask', 'fill', 'stroke']) { const v = e.getAttribute(a), m = v && /url\(#([^)]+)\)/.exec(v); if (m && !document.getElementById(m[1])) miss.push(m[1]) }
    const h = e.getAttribute('href'); if (h && h[0] === '#' && !document.getElementById(h.slice(1))) miss.push(h) });
  return { dup: dup.slice(0, 8), miss: [...new Set(miss)].slice(0, 8) } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const f of ['南伴球_PWA.html', '南伴球_Web.html']) {
    const W = f.includes('Web'), ctx = await b.newContext({ viewport: W ? { width: 1360, height: 860 } : { width: 390, height: 844 } });
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('https://cdnjs.cloudflare.com/**', r => r.abort()); await pg.route('https://basemaps.cartocdn.com/**', r => r.abort());
    await pg.goto('file://' + path.join(DIR, f)); await pg.settle(900);
    const tag = s => `${f} ${s}`, scan = () => pg.evaluate(SCAN);
    let r = await scan(); T(tag('首页：id 不重复、引用都存在'), !r.dup.length && !r.miss.length, r);
    // 同一个人的头像连续画多次，其中一份放在隐藏容器里
    const ok = await pg.evaluate(() => { const u = { ...USERS.tom, id: 'zz', avatar_kind: 'letter', color: '#F4EFE3', name: 'Han' };
      const hid = document.createElement('div'); hid.style.display = 'none'; hid.innerHTML = av(u, 'sm') + av(u, 'sm'); document.body.appendChild(hid);
      const vis = document.createElement('div'); vis.id = '__v'; vis.style.cssText = 'position:fixed;left:10px;top:10px;z-index:99999;background:#fff;padding:12px;display:flex;gap:12px'; vis.innerHTML = av(u, 'sm') + av(u, 'sm') + av(u, 'sm'); document.body.appendChild(vis);
      return true });
    r = await scan(); T(tag('同一个人的头像连续画 5 次（2 份在隐藏容器里）：id 不重复'), !r.dup.length && !r.miss.length, r);
    await pg.settle(200);
    const px = await pg.evaluate(() => [...document.querySelectorAll('#__v .av')].map(a => { const r = a.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }));
    T(tag('每个头像都有尺寸'), px.length === 3 && px.every(([w, h]) => w > 20 && h > 20), px);
    const shot = async () => (await (await pg.$('#__v')).screenshot()).toString('base64');
    const a = await pg.evaluate(() => [...document.querySelectorAll('#__v .av')].map(x => x.outerHTML.replace(/sv\d+/g, '').length));
    T(tag('三份头像内容一样长（没有哪份少了东西）'), new Set(a).size === 1, a);
    await pg.evaluate(() => { document.querySelectorAll('#__v').forEach(e => e.remove()) });
    // 聊天：收件箱 / 球局群聊 / 私信
    await pg.evaluate(() => { ME = USERS.han; seedChat(); CX_INBOX() }); await pg.settle(300);
    r = await scan(); T(tag('聊天收件箱：id 不重复'), !r.dup.length && !r.miss.length, r);
    for (const kind of ['game', 'dm']) {
      await pg.evaluate(k => { const t = THREADS.find(x => x.type === k); openThread(t.id); cxSend('收到') }, kind); await pg.settle(500);
      r = await scan(); T(tag(`聊天 ${kind}：id 不重复、引用都存在`), !r.dup.length && !r.miss.length, r);
      const st = await pg.evaluate(() => { const m = document.querySelector('.cx-m.mine'); if (!m) return null; const c = getComputedStyle(m), p = getComputedStyle(m.querySelector('p'));
        return { border: c.borderTopWidth, radius: c.borderTopLeftRadius, bg: c.backgroundColor, pbg: p.backgroundColor } });
      T(tag(`聊天 ${kind}：我发的气泡外面没有边框 / 药丸（不被导航的 .me 串味）`), st && st.border === '0px' && st.radius === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(st.bg), st);
      const av2 = await pg.evaluate(() => [...document.querySelectorAll('.cx-m:not(.mine) .av')].map(a => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return [Math.round(r.width), Math.round(r.height), cs.borderTopLeftRadius] }));
      T(tag(`聊天 ${kind}：对方头像是正圆（宽高相等）`), av2.every(([w, h]) => w === h && w >= 24), av2);
    }
    // 球局群聊头像（11-04 方案 C2）：圆角方块里 2 / 3 / 4 个圆头像，都在方块里面、互相遮挡不超过 30%、不是空白
    const geo = await pg.evaluate(() => { const us = [USERS.han, USERS.tom, USERS.coco || USERS.han, USERS.tom].filter(Boolean); const out = {};
      for (const ctxCls of ['cx-item', 'cx-hd']) for (const n of [2, 3, 4]) { const w = document.createElement('div'); w.className = ctxCls; w.style.cssText = 'position:fixed;left:10px;top:10px;z-index:99999;background:#fff';
        w.innerHTML = `<span class="cx-gt n${n}">${us.slice(0, n).map(u => av(u)).join('')}</span>`; document.body.appendChild(w);
        const t = w.querySelector('.cx-gt').getBoundingClientRect(), a = [...w.querySelectorAll('.cx-gt .av')].map(x => x.getBoundingClientRect());
        const inside = a.every(r => r.left >= t.left - .5 && r.right <= t.right + .5 && r.top >= t.top - .5 && r.bottom <= t.bottom + .5);
        let maxOv = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const ox = Math.max(0, Math.min(a[i].right, a[j].right) - Math.max(a[i].left, a[j].left)), oy = Math.max(0, Math.min(a[i].bottom, a[j].bottom) - Math.max(a[i].top, a[j].top)); maxOv = Math.max(maxOv, ox * oy / (a[i].width * a[i].height)) }
        out[ctxCls + n] = { size: Math.round(t.width), radius: getComputedStyle(w.querySelector('.cx-gt')).borderTopLeftRadius, inside, maxOv: +maxOv.toFixed(2), minW: Math.round(Math.min(...a.map(r => r.width))), n: a.length }; w.remove() } return out });
    for (const [k, v] of Object.entries(geo)) T(tag(`群聊头像 ${k}：头像都在方块里、互相遮挡 ≤30%、不太小、方块是圆角`), v.inside && v.maxOv <= .3 && v.minW >= 12 && parseFloat(v.radius) > 8 && v.size >= 36, v);
    const gt = await pg.evaluate(() => { ME = USERS.han; seedChat(); const t = THREADS.find(x => x.type === 'game'); const h = cxAv(t); return { tile: /class="cx-gt n\d"/.test(h), n: (h.match(/class="av /g) || []).length, ball: h.includes('cx-gav') } });
    T(tag('球局会话头像：用头像方块（2–4 个成员头像），不再是网球图标'), gt.tile && gt.n >= 1 && gt.n <= 4 && !gt.ball, gt);
    // 球员卡
    await pg.evaluate(() => { try { UF_CLOSE() } catch (e) { } try { CX_CLOSE() } catch (e) { } }); await pg.settle(500);
    await pg.evaluate(() => { const u = USERS.tom; typeof openCard === 'function' ? openCard(u.id) : document.querySelector('[data-user]') && document.querySelector('[data-user]').click() }); await pg.settle(600);
    r = await scan(); T(tag('球员卡打开后：id 不重复、引用都存在'), !r.dup.length && !r.miss.length, r);
    T(tag('全程没有页面报错'), errs.length === 0, errs);
    await ctx.close();
  }
  await b.close(); console.log(`\ndom_integrity: ${pass} 通过, ${fail} 失败`); process.exit(fail ? 1 : 0);
})();
