const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const p=await ctx.newPage();const e=[];p.on('pageerror',x=>e.push(x.message+' '+(x.stack||'').split('\n')[1]));
await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(1200);
const info=await p.evaluate(()=>{ME=USERS.han;closeSheet();const g=GAMES.find(g=>g.host_id==='han'&&new Date(g.starts_at)>NOW&&g.status==='open'&&V(g).spots>=2&&V(g).game_type!=='singles')||GAMES.find(g=>g.host_id==='han'&&new Date(g.starts_at)>NOW&&g.status==='open');
  const ids=Object.keys(USERS).filter(u=>u!=='han'&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===u)).slice(0,12);
  setOpin('han',ids[3],'more');setOpin('han',ids[5],'less');
  ids.forEach((u,i)=>{PARTS.push({game_id:g.id,user_id:u,role:'player',status:'pending',message:i%4==0?'周六正好有空，带新球':'',created_at:Date.now()-(12-i)*6e5});notify('han','request',g.id,u)});
  return {g:g.id,spots:V(g).spots,type:V(g).game_type,n:ids.length,banners:0}});
console.log(info);
await p.evaluate(()=>go('notif'));await p.waitForTimeout(500);await p.evaluate(()=>{UI.msgTab='ntf';render()});await p.waitForTimeout(300);await p.screenshot({path:'t1_ntf.png'});
await p.click(`[data-ntfo="rg${info.g}"]`);await p.waitForTimeout(900);await p.screenshot({path:'t1_det.png'});
await p.evaluate(()=>document.querySelector('#dBody .rq-h').scrollIntoView());await p.waitForTimeout(200);await p.screenshot({path:'t1_det2.png'});
await p.click('[data-rq="more"]');await p.waitForTimeout(300);console.log('rows',await p.$$eval('#dBody .req',x=>x.length));
await p.click('[data-rq="sort"][data-v="lvl"]');await p.waitForTimeout(200);
// 婉拒
await p.click('#dBody [data-sx="softNo"]');await p.waitForTimeout(500);await p.screenshot({path:'t1_no.png'});
await p.fill('#snNote','下周三晚上还有一局');await p.click('[data-sx="softNoGo"][data-v="level"]');await p.waitForTimeout(400);
// 接受直到满
for(let k=0;k<6;k++){const a=await p.$('#dBody [data-a="approve"]');if(!a)break;await a.click();await p.waitForTimeout(400);const s=await p.$('text=确认接受');if(s)await s.click().catch(()=>{});}
const r=await p.evaluate(g=>({spots:V(GAMES.find(x=>x.id===g)).spots,st:PARTS.filter(p=>p.game_id===g).map(p=>p.status+':'+(p.reason||'')),rej:NOTIFS.filter(n=>n.game_id===g&&['rejected','full'].includes(n.kind)).map(n=>n.kind+' '+ntfText(n).join(' / ')).slice(0,4)}),info.g);console.log(JSON.stringify(r,null,1));
await p.screenshot({path:'t1_after.png'});console.log(e);await b.close()})();
