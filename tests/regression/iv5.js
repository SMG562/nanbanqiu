const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [name,vw] of [['PWA',{width:390,height:844}],['Web',{width:1360,height:900}]]){
 const p=await b.newPage({viewport:vw,deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file:///mnt/user-data/outputs/南伴球_'+name+'.html');await p.waitForTimeout(600);
 const click=async s=>{const el=await p.$(s);if(!el){console.log(name,'MISSING',s);return}await el.click({force:true});await p.waitForTimeout(250)};
 await p.evaluate(()=>document.querySelector('[data-demo="invsend"]').click());await p.waitForTimeout(800);
 console.log(name,'days',await p.$$eval('.iv-days button',b=>b.length));
 const box=name==='PWA'?'#sheet':'.iv';
 await (await p.$(box)).screenshot({path:`v5_${name}_a.png`});
 await click('[data-iv="per"][data-v="3"]');await click('[data-iv="tm"][data-v="19:00"]');await click('[data-iv="dur"][data-v="120"]');
 console.log(name,await p.evaluate(()=>IVF.t+'-'+IVF.e+' per'+IVF.per));
 await (await p.$(box)).screenshot({path:`v5_${name}_b.png`});
 await click('.iv-days button:first-child');
 console.log(name,'today disabled',await p.$$eval('.iv-slots button:disabled',b=>b.length),await p.evaluate(()=>IVF.o+' '+IVF.t));
 await click('[data-iv="send"]');
 console.log(name,await p.evaluate(()=>JSON.stringify(INVITES[0])));
 // counter
 await p.evaluate(()=>document.querySelector('[data-demo="invite"]').click());await p.waitForTimeout(900);
 if(name==='PWA')await click('[data-iv="view"]');await click('[data-iv="counter"]');
 await click('[data-iv="dur"][data-v="60"]');await click('[data-iv="sendCounter"]');
 console.log(name,await p.evaluate(()=>JSON.stringify(INVITES.find(i=>i.status==='counter').counter)));
 console.log(name,'errors',errs);await p.close()}
await b.close()})();
