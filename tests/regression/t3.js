const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
// --- PWA: 申请人视角 + 性别 + 分享
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on('pageerror',x=>e.push('P '+x.message+' '+(x.stack||'').split('\n')[1]));
await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(1000);
const r=await p.evaluate(()=>{closeSheet();const g=GAMES.find(g=>g.host_id==='han'&&new Date(g.starts_at)>NOW&&g.status==='open');ME=USERS.jason;PARTS=PARTS.filter(p=>!(p.game_id===g.id&&p.user_id==='jason'));api.apply(g.id,'hi');
 ME=USERS.han;const q=PARTS.find(p=>p.game_id===g.id&&p.user_id==='jason');q.reason='level';q.note='下周三还有一局';api.decide(g.id,'jason',false);ME=USERS.jason;
 const n=NOTIFS.find(n=>n.user_id==='jason'&&n.kind==='rejected'&&n.game_id===g.id);openDetail(g.id);return {g:g.id,ntf:n&&ntfText(n)}});
console.log(JSON.stringify(r));await p.waitForTimeout(600);console.log('band',await p.$eval('#dBody .pass-band',x=>x.textContent).catch(()=>'-'));await p.screenshot({path:'t3_rej.png'});
// gender
const G=[];await p.evaluate(()=>{closeDetail&&closeDetail();ME=USERS.jason;ME.gender=null;ME.g_m2f=null;ME.g_changes=0;go('me')});await p.waitForTimeout(300);
const step=async(lbl,fn)=>{await p.evaluate(fn);await p.waitForTimeout(350);G.push(lbl+': '+(await p.evaluate(()=>{const s=document.querySelector('.iv');return s?s.innerText.replace(/\n+/g,' | '):'(closed)'}))+' || ME.gender='+(await p.evaluate(()=>ME.gender)))};
await step('open',()=>(openSettings(),document.querySelector('[data-sx="gender"]').click()));
await step('pick m (first)',()=>document.querySelector('[data-sx="pickG"][data-v="m"]').click());
await step('reopen',()=>(openSettings(),document.querySelector('[data-sx="gender"]').click()));
await p.screenshot({path:'t3_g1.png'});
await step('pick f',()=>document.querySelector('[data-sx="pickG"][data-v="f"]').click());
await p.screenshot({path:'t3_g2.png'});
await step('confirm',()=>document.querySelector('[data-sx="gConfirm"]').click());
await step('reopen',()=>(openSettings(),document.querySelector('[data-sx="gender"]').click()));
await step('pick m',()=>document.querySelector('[data-sx="pickG"][data-v="m"]').click());
await p.screenshot({path:'t3_g3.png'});
await step('confirm',()=>document.querySelector('[data-sx="gConfirm"]').click());
await step('reopen',()=>(openSettings(),document.querySelector('[data-sx="gender"]').click()));
await p.screenshot({path:'t3_g4.png'});
await step('pick f locked',()=>document.querySelector('[data-sx="pickG"][data-v="f"]').click());
console.log(G.join('\n'));console.log('womenOK',await p.evaluate(()=>womenOK(ME)),'li',await p.evaluate(()=>{INV_CLOSE();render();openSettings();return document.querySelector('[data-sx="gender"]').innerText}));
// share: navigator.share 被拒 → fallback
await p.evaluate(()=>{ME=USERS.han;navigator.canShare=()=>true;navigator.share=()=>Promise.reject(Object.assign(new Error('x'),{name:'NotAllowedError'}));window.html2canvas=null;saveCard('han')});await p.waitForTimeout(300);
console.log('btn',await p.$eval('#scBox [data-sc="go"]',x=>x.textContent+' disabled='+x.disabled));
await p.click('#scBox [data-sc="go"]');await p.waitForTimeout(500);console.log('toast',await p.evaluate(()=>(document.querySelector('.toast,#toast')||{}).textContent));
await p.close();
// --- Web
const w=await b.newPage({viewport:{width:1360,height:860}});w.on('pageerror',x=>e.push('W '+x.message+' '+(x.stack||'').split('\n')[1]));
await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(1000);
const wg=await w.evaluate(()=>{closeModal&&closeModal();ME=USERS.han;const g=GAMES.find(g=>g.host_id==='han'&&new Date(g.starts_at)>NOW&&g.status==='open'&&V(g).spots>=2)||GAMES.find(g=>g.host_id==='han'&&new Date(g.starts_at)>NOW&&g.status==='open');
 Object.keys(USERS).filter(u=>u!=='han'&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===u)).slice(0,9).forEach((u,i)=>{PARTS.push({game_id:g.id,user_id:u,status:'pending',message:i==1?'可以带球':'' ,created_at:Date.now()-i*6e5});notify('han','request',g.id,u)});render();return g.id});
await w.evaluate(g=>{UI.sel=g;if(typeof selectGame==='function')selectGame(g);render()},wg);await w.waitForTimeout(400);
const sel=await w.$(`[data-sel="${wg}"]`);if(sel)await sel.click();await w.waitForTimeout(500);
await w.screenshot({path:'t3_web.png'});
await w.evaluate(()=>togglePop(true));await w.waitForTimeout(300);await w.screenshot({path:'t3_webpop.png'});
console.log('web rows',await w.$$eval('.req',x=>x.length));
console.log(e);await b.close()})();
