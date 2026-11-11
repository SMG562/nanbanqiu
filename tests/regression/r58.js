const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));
 const p=await ctx.newPage();p.on('pageerror',x=>e.push('P '+x.message));
 await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(800);
 let r=await p.evaluate(()=>{setWho('han',true);openCreate();Object.assign(NG,{o:0,t:'16:30',per:perOf('16:30'),venue_id:'v1',mn:3,mx:4,lv:'custom'});drawCreate();return !!document.querySelector('[data-ng="instant"]')});T('pwa toggle',r);
 await p.evaluate(()=>{const el=document.querySelector('[data-ng="instant"]');el.scrollIntoView({block:'center'})});await p.waitForTimeout(300);await (await p.$('#dev')).screenshot({path:'r58_form.png'});
 await p.evaluate(()=>{document.querySelector('[data-ng="instant"]').click();})
 r=await p.evaluate(()=>{NG.mn=3;NG.mx=4;ngPublish();return GAMES[GAMES.length-1].id});const gid=r;await p.waitForTimeout(1500);
 r=await p.evaluate(id=>{closeSheet&&closeSheet();setWho('jason',true);openDetail(id);return GAMES.find(g=>g.id===id).join_mode},gid);await p.waitForTimeout(600);
 r=await p.evaluate(()=>[document.querySelector('#dAct [data-a="apply"]').textContent,(document.querySelector('#dAct .cap')||{}).textContent]);T('pwa button',r[0]==='直接加入',r.join('|'));
 await (await p.$('#dev')).screenshot({path:'r58_detail.png'});
 await p.click('#dAct [data-a="apply"]');await p.waitForTimeout(500);await (await p.$('#dev')).screenshot({path:'r58_join.png'});
 await p.click('[data-ug="join"]');await p.waitForTimeout(500);await (await p.$('#dev')).screenshot({path:'r58_joined.png'});
 r=await p.evaluate(id=>stateOf(api.get(id)),gid);T('pwa joined',r==='approved',r);
 await p.click('[data-ug="done"]');await p.waitForTimeout(400);await (await p.$('#dev')).screenshot({path:'r58_after.png'});
 console.log(e);await b.close()})();
