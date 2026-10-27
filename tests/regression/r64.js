const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const w=await b.newPage({viewport:{width:1440,height:900}});w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(800);
 for(const d of ['instant','timeout','recap','follow']){await w.evaluate(d=>runDemo(d),d);await w.waitForTimeout(600);await w.screenshot({path:`r64_${d}.png`})}
 console.log('web follow',await w.evaluate(()=>NOTIFS.filter(n=>n.user_id==='han'&&n.kind==='follow_game').length));
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});p.on('pageerror',x=>e.push('P '+x.message));
 await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(800);
 for(const d of ['instant','timeout','recap','follow']){await p.evaluate(d=>document.querySelector(`[data-demo="${d}"]`).click(),d);await p.waitForTimeout(800);await (await p.$('#dev')).screenshot({path:`r64p_${d}.png`})}
 console.log(e);await b.close()})();
