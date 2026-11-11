// 冒烟：两端加载 + 逐个点演示按钮（每个之间重新加载），统计 pageerror 和非字典事件
// E2：点完不再固定等，pg.settle(原来的毫秒) = 页面安静了就继续、最多等原来那么久（tests/lib/preload.js 第 7 条）
const {chromium}=require('playwright');const fs=require('fs');
const SPEC=new Set(fs.readFileSync(require('path').join(__dirname,'..','spec','events_spec.md'),'utf8').split('\n').map(l=>(l.match(/^\| ([a-z0-9_]+) \|/)||[])[1]).filter(Boolean));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let total=0,errs=0;const bad=new Set();
for(const [p,vp] of [['PWA',{width:390,height:844}],['Web',{width:1360,height:860}]].filter(([p])=>!process.env.SMOKE_ONLY||process.env.SMOKE_ONLY===p)){   // SMOKE_ONLY=PWA|Web：只跑一端（run_all 把两端拆成两项并行）
 const ctx=await b.newContext({viewport:vp});await ctx.addInitScript(()=>{window.AN_LOG=[]});const pg=await ctx.newPage();const e=[];pg.on('pageerror',x=>e.push(x.message));
 const url='file:///mnt/user-data/outputs/南伴球_'+p+'.html';
 await pg.goto(url);await pg.settle(700);
 const demos=await pg.evaluate(()=>[...document.querySelectorAll('[data-demo]')].map(x=>x.dataset.demo));
 for(const d of demos){await pg.goto(url);await pg.settle(500);
   await pg.evaluate(p=>{p==='PWA'?closeSheet():closeModal()},p);
   await pg.evaluate(d=>document.querySelector(`[data-demo="${d}"]`).click(),d);await pg.settle(1600);
   // 点一下页面上的几个常见按钮，确保包装函数不报错
   await pg.evaluate(()=>{for(const s of ['[data-a="share"]','[data-rc="done"]','[data-iv="accept"]','[data-sx="softNo"]']){const x=document.querySelector(s);if(x&&x.offsetParent){x.click();break}}});await pg.settle(400);
   const ev=await pg.evaluate(()=>AN_LOG.map(x=>x.ev));ev.forEach(x=>{if(!SPEC.has(x)&&x!=='ui_action')bad.add(x)});total++;
   if(e.length){console.log('ERR',p,d,e.splice(0));errs++}}
 console.log(p,'demos',demos.length,demos.join(' '));await ctx.close()}
console.log('runs',total,'with errors',errs,'non-spec events',[...bad]);await b.close()})();
