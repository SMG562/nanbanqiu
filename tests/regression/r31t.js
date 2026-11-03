const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-07T14:40:00+11:00'));const p=await ctx.newPage();p.on('pageerror',x=>e.push('P '+x.message));
 await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(700);
 await p.evaluate(()=>{try{closeSheet()}catch(x){};document.querySelector('[data-demo="unfilled"]').click()});await p.waitForTimeout(500);
 await (await p.$('#dev')).screenshot({path:'r31_p1.png'});
 await p.evaluate(()=>{const n=NOTIFS.find(n=>n.kind==='unfilled'&&n.user_id==='han');ntfOpen(n)});await p.waitForTimeout(400);await (await p.$('#dev')).screenshot({path:'r31_p2.png'});
 await p.click('[data-uf="delay"]');await p.waitForTimeout(300);await (await p.$('#dev')).screenshot({path:'r31_p3.png'});
 await p.click('[data-uf="delayGo"]');await p.waitForTimeout(400);
 const r1=await p.evaluate(()=>{const g=GAMES[GAMES.length-1];return [hm(new Date(g.starts_at)),g.postponed,NOTIFS.filter(n=>n.kind==='postponed'&&n.user_id==='grace').length]});
 await p.evaluate(()=>{const g=GAMES[GAMES.length-1];openDetail(g.id)});await p.waitForTimeout(500);await (await p.$('#dev')).screenshot({path:'r31_p4.png'});
 // create form toggle
 await p.evaluate(()=>{closeDetail();openCreate()});await p.waitForTimeout(400);const tg=await p.$('[data-ng="hide"]');await tg.scrollIntoViewIfNeeded();await (await p.$('#dev')).screenshot({path:'r31_p5.png'});
 // hidden for others when full
 const r2=await p.evaluate(()=>{closeSheet();const g=GAMES[GAMES.length-1];PARTS.push({game_id:g.id,user_id:'jason',role:'player',status:'approved',message:'',created_at:Date.now()});g.status='full';
   setWho('mia',true);const vis=api.list().some(c=>c.id===g.id);openDetail(g.id,true);return [vis,!!document.querySelector('.dlock')]});await p.waitForTimeout(400);await (await p.$('#dev')).screenshot({path:'r31_p6.png'});
 const r3=await p.evaluate(()=>{const g=GAMES[GAMES.length-1];setWho('grace',true);return api.list().some(c=>c.id===g.id)});
 // unfilled_end
 await p.evaluate(()=>{closeDetail();setWho('han',true);const g=GAMES.find(x=>x.host_id==='han'&&x.status==='open'&&new Date(x.starts_at)>NOW&&V(x).spots>0);g.starts_at=new Date(+NOW-10*6e4).toISOString();housekeep();const n=NOTIFS.find(n=>n.kind==='unfilled_end'&&n.game_id===g.id);ntfOpen(n)});await p.waitForTimeout(400);await (await p.$('#dev')).screenshot({path:'r31_p7.png'});
 await p.click('[data-uf="again"]');await p.waitForTimeout(700);const r4=await p.evaluate(()=>[NG.venue_id,NG.type,NG.o,NG.t]);
 console.log(e,r1,r2,r3,r4);await b.close()})();
