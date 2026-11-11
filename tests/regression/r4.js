const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [name,vw] of [['PWA',{width:390,height:844}],['Web',{width:1400,height:900}]]){
 const p=await b.newPage({viewport:vw,deviceScaleFactor:name==='PWA'?2:1});const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///mnt/user-data/outputs/南伴球_'+name+'.html');await p.waitForTimeout(700);
 const demo=async d=>{await p.evaluate(d=>{const el=document.querySelector(`[data-demo="${d}"]`);el?el.click():runDemo(d)},d);await p.waitForTimeout(900)};
 const shot=async n=>{await p.waitForTimeout(250);const el=name==='PWA'?await p.$('#dev'):p;await el.screenshot({path:`r4_${name}_${n}.png`})};
 const click=async s=>{const el=await p.$(s);if(!el){console.log(name,'MISSING',s);return false}await el.click({force:true});await p.waitForTimeout(300);return true};
 await shot('0home');
 await demo('duo');
 await p.evaluate(()=>{const e=document.querySelector('[data-ng="lv"]');e&&e.scrollIntoView({block:'center'})});await shot('1create');
 await click('[data-ng="lv"][data-v="custom"]');await click('[data-ng="mx"][data-v="+"]');await click('[data-ng="mx"][data-v="+"]');await click('[data-ng="mn"][data-v="-"]');
 await p.evaluate(()=>{const e=document.querySelector('.lvst');e&&e.scrollIntoView({block:'center'})});await shot('2custom');
 console.log(name,'lv',await p.evaluate(()=>NG.mn+'-'+NG.mx));
 await click('[data-ng="lv"][data-v="any"]');console.log(name,'any tags',await p.evaluate(()=>[...NG.tags].join()));
 await click('[data-ng="publish"]');await p.waitForTimeout(900);await shot('3share');
 if(name==='PWA')await p.evaluate(()=>closeSheet());else await p.evaluate(()=>closeModal());
 // gender: jason m -> f
 await p.evaluate(()=>{ME=USERS.jason;INV_CLOSE&&INV_CLOSE();openGender(null)});await p.waitForTimeout(300);await shot('4gender');
 await click('[data-sx="pickG"][data-v="f"]');await shot('5gconfirm');await click('[data-sx="gConfirm"]');
 console.log(name,'jason after change',await p.evaluate(()=>JSON.stringify({g:ME.gender,c:ME.g_changes,ok:womenOK(ME),sees:api.list().some(c=>c.id==='g20')})));
 await p.evaluate(()=>{ME.g_changes=2;GSTEP='m';openGender()});await p.waitForTimeout(300);await shot('6gover');
 await click('[data-sx="gConfirm"]');console.log(name,'flag',await p.evaluate(()=>ME.g_flag));
 await demo('wlock');await shot('7wlock');
 // card
 await demo('card');await shot('8card');
 // onboarding
 await p.evaluate(()=>{ME=null;NP={ntrp:3.0,clubs:[]};openNewProfile()});await p.waitForTimeout(400);await shot('9onboard');
 // cap test
 console.log(name,'cap',await p.evaluate(()=>{ME=USERS.jason;F.radius=50;const n=api.list().length;return n+' hidden '+JSON.stringify(LIST_HIDDEN)}));
 console.log(name,'errors',errs);await p.close()}
await b.close()})();
