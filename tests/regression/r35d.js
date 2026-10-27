const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const e=[];p.on('pageerror',x=>e.push(x.message+' '+(x.stack||'').split('\n')[1]));
 await p.goto('file:///mnt/user-data/outputs/南伴球_PWA.html');await p.waitForTimeout(800);console.log(e.slice(0,3));await b.close()})();
