const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const w=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(700);
 const id=await w.evaluate(()=>{setWho('jason');UI.tab='mine';render();const inv=INV_DEMO();notifyInv('jason','invite',inv,'han');render();return inv.id});await w.waitForTimeout(300);
 await w.screenshot({path:'r29_1.png',clip:{x:0,y:60,width:1440,height:420}});
 await w.evaluate(id=>{setWho('han');UI.tab='mine';render();openInvite(id)},id);await w.waitForTimeout(300);const m=async f=>{const el=await w.$('#modal .card')||await w.$('#modal');await el.screenshot({path:f})};await m('r29_2.png');
 await w.evaluate(id=>{closeModal();setWho('jason');openInvite(id)},id);await w.waitForTimeout(200);await w.click('[data-iv="accept"]');await w.waitForTimeout(800);
 await w.evaluate(id=>{openInvite(id)},id);await w.waitForTimeout(300);await m('r29_3.png');
 // withdraw + expired
 const r=await w.evaluate(()=>{closeModal();setWho('han');const inv={id:++NID,from:'han',to:'grace',o:2,t:'18:00',e:'19:30',venue_id:'v1',game_type:'singles',note:'',status:'pending',at:Date.now(),countered:false};INVITES.unshift(inv);openInvite(inv.id);return inv.id});
 await w.waitForTimeout(200);await w.click('[data-iv="withdraw"]');await w.waitForTimeout(300);
 const st=await w.evaluate(id=>invOf(id).status,r);
 await w.evaluate(id=>{const i=invOf(id);i.status='pending';i.at=Date.now()-50*36e5;openInvite(id)},r);await w.waitForTimeout(300);await m('r29_4.png');
 await w.click('[data-iv="again"]');await w.waitForTimeout(500);const again=await w.evaluate(()=>!!(IVF&&IVF.to));
 console.log(e,st,again);await b.close()})();
