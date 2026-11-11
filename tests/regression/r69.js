const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 for(const f of ['Web','PWA']){const ctx=await b.newContext({viewport:f==='Web'?{width:1440,height:900}:{width:390,height:844},deviceScaleFactor:2});
 await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));
 const w=await ctx.newPage();w.on('pageerror',x=>e.push(f+' '+x.message));await w.goto(`file:///mnt/user-data/outputs/南伴球_${f}.html`);await w.waitForTimeout(900);
 let r=await w.evaluate(()=>({pending:Object.values(BDG).reduce((a,o)=>a+Object.values(o).filter(x=>!x.seen).length,0),fx:!!document.getElementById('bdgFx')}));
 T(f+' seed: no burst of celebrations',r.pending===0&&!r.fx,JSON.stringify(r));
 await w.evaluate(()=>{const el=document.querySelector('[data-demo="badge"]');if(typeof runDemo==='function')runDemo('badge');else el.click()});await w.waitForTimeout(700);
 r=await w.evaluate(()=>({card:!!document.querySelector('.rc .rc-bdg'),txt:(document.querySelector('.rc .rc-bdg')||{}).textContent,rec:BDG[ME.id].ten,noFx:!document.getElementById('bdgFx')}));
 T(f+' recap shows new badge, no popup over card',r.card&&r.noFx&&r.rec&&r.rec.at&&!r.rec.seen,JSON.stringify(r));
 await w.screenshot({path:`r69_${f}_1.png`});
 await w.click('.rc [data-rc="done"]');await w.waitForTimeout(1300);
 r=await w.evaluate(()=>({fx:!!document.querySelector('#bdgFx.new'),n:(document.querySelector('.bfx-n')||{}).textContent,m:(document.querySelector('.bfx-m')||{}).textContent,nx:(document.querySelector('.bfx-nx')||{}).textContent,seen:BDG[ME.id].ten.seen}));
 T(f+' after 好了: ceremony auto, once',r.fx&&r.n==='十场'&&r.seen&&/获得/.test(r.m)&&/半百/.test(r.nx),JSON.stringify(r));
 await w.waitForTimeout(900);await w.screenshot({path:`r69_${f}_2.png`});
 await w.click('[data-bfx="share"]');await w.waitForTimeout(1500);r=await w.evaluate(()=>({w:BSH.cv&&BSH.cv.width,pv:!!document.querySelector('#bshBox .sc-mo img')}));T(f+' poster generated',r.w===1080&&r.pv,JSON.stringify(r));await w.screenshot({path:`r69_${f}_3.png`});
 await w.evaluate(()=>{typeof closeSheet==='function'?closeSheet():closeModal()});await w.waitForTimeout(400);
 r=await w.evaluate(()=>{render();return new Promise(res=>setTimeout(()=>res(!!document.getElementById('bdgFx')),1000))});T(f+' not shown again',r===false);
 // 永久保留：把这局取消，徽章还在
 r=await w.evaluate(()=>{const g=GAMES.filter(g=>PARTS.some(p=>p.game_id===g.id&&p.user_id===ME.id)).slice(-1)[0];g.status='cancelled';const b=stats(ME.id).badges.find(x=>x.code==='ten');return {got:b.got,cur:b.cur}});T(f+' badge kept after cancel',r.got&&!r.cur,JSON.stringify(r));
 // 通知：夜间顺延 / 白天送达
 r=await w.evaluate(()=>{RCQ.forEach(x=>{if(x.kind==='badge')x.at=0});rcTick();const n=NOTIFS.find(n=>n.kind==='badge'&&n.user_id===ME.id);return n&&ntfText(n).join(' / ')});T(f+' badge notification text',/获得新徽章「十场」/.test(r||''),r);
 // 连续周
 r=await w.evaluate(()=>{const u='han',mk=d=>{const id='sk'+(++NID);GAMES.push({id,share_code:'S'+NID,starts_at:new Date(Date.now()-d*864e5).toISOString(),duration_min:60,venue_id:'v1',game_type:'singles',ntrp_min:1,ntrp_max:16,capacity:2,host_id:u,status:'completed'});PARTS.push({game_id:id,user_id:u,role:'host',status:'approved'})};return bdgStreak(u)});
 T(f+' streak computed from real games',typeof r==='number'&&r>=1,r);
 // 查看他人徽章 / 未获得
 r=await w.evaluate(()=>{bdgShow(ME.id,'hundred');const t=document.querySelector('.bfx-m').textContent,lk=!!document.querySelector('.bfx-hx.lock'),sh=!!document.querySelector('[data-bfx="share"]');bdgClose(true);return {t,lk,sh}});T(f+' locked badge: progress, no share',r.lk&&!r.sh&&/还差/.test(r.t),JSON.stringify(r));
 await ctx.close()}
 console.log(e);await b.close()})();
