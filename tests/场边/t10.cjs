// T10 选球场行与底栏芯片（#335 后续，11-17）：选球场列表行不带「区」（挡住球场名）；选中长球场名后，底栏提示不压在芯片下面，芯片不超过输入框一半。
const {open,ok,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open('pwa');console.log('T10 选球场行与底栏芯片');
const q=(f,a)=>pg.evaluate(new Function('a',`const r=document.querySelector('#sbHost').shadowRoot;return (${f})(r,a)`),a);
await q(`r=>{r.querySelector('[data-place]').click()}`);await W(800);
const rows=await q(`r=>[...r.querySelectorAll('.lp [data-lq]')].filter(e=>e.dataset.lq!=='none'&&!e.hasAttribute('data-clocate')).map(e=>({n:e.querySelector('b').textContent,s:(e.querySelector('small')||{}).textContent||''}))`);
ok(rows.length>0,'选球场有真实球场行',rows.length);
ok(rows.every(r=>!/·|\bVIC\b/.test(r.s)&&!/[A-Za-z]{4,}$/.test(r.s.replace(/[\d.,\s]*(km|m)\s*$/,''))),'行右侧只有距离，不带区名',JSON.stringify(rows.slice(0,3)));
// 选一个名字最长的球场
const nm=await q(`r=>{const bs=[...r.querySelectorAll('.lp [data-lq]')].filter(e=>e.dataset.lq!=='none'&&!e.hasAttribute('data-clocate')).sort((a,c)=>c.querySelector('b').textContent.length-a.querySelector('b').textContent.length);const t=bs[0].querySelector('b').textContent;bs[0].click();return t}`);await W(1200);
for(const w of [390,320]){await pg.setViewportSize({width:w,height:844});await W(500);
  const m=await q(`r=>{const R=s=>r.querySelector(s).getBoundingClientRect(),b=R('.bar .box'),h=R('[data-hint]'),c=R('[data-place]'),a=R('[data-att]');return {b:b.width,hr:h.right,cl:c.left,cw:c.width,hl:h.left,al:a.left,ar:a.right,hs:r.querySelector('[data-hint]').textContent}}`);
  ok(m.hr<=m.cl+0.5,`${w}px：底栏提示的右边没压到芯片（${nm}）`,JSON.stringify(m));
  ok(m.cw<=m.b*0.5,`${w}px：芯片不超过输入框一半`,Math.round(m.cw)+'/'+Math.round(m.b));
  ok(m.hl>=m.ar-0.5||m.al>=m.hl,`${w}px：提示和相机/其它元素不重叠`,JSON.stringify(m))}
await done(b,errs,'T10')})();
