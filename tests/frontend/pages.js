// page_view / page_time：底下的页面 + 盖在上面的面板，关掉后回到底下的页面
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let bad=0;
for(const p of ['PWA','Web']){const W=p==='Web',ctx=await b.newContext({viewport:W?{width:1360,height:860}:{width:390,height:844}});await ctx.addInitScript(()=>{window.AN_LOG=[]});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',x=>errs.push(x.message));await pg.goto('file:///mnt/user-data/outputs/南伴球_'+p+'.html');await pg.waitForTimeout(800);
 await pg.evaluate(W=>{W?closeModal():closeSheet();setWho('jason',true)},W);await pg.waitForTimeout(200);
 const c=s=>pg.locator(s).first().click();
 if(W){await c('[data-tab="mine"]');await pg.waitForTimeout(200);await c('[data-a="notif"]');await pg.waitForTimeout(200);await pg.locator('#colC').click({position:{x:3,y:3}});   // 点空白处关掉消息面板（点正中央可能点到当天的球局卡片）
 await pg.waitForTimeout(200);await c('.btn-new[data-a="create"]');await pg.waitForTimeout(300);await c('#modal [data-a="closeModal"]');await pg.waitForTimeout(300);await c('[data-tab="disc"]')}
 else{await c('[data-tab="me"]');await pg.waitForTimeout(200);await c('#tabbar [data-a="create"]');await pg.waitForTimeout(300);await c('#sheet [data-a="close"]');await pg.waitForTimeout(500);await c('[data-tab="notif"]:visible');await pg.waitForTimeout(200);await c('#tabbar [data-tab="disc"]')}   // 第八批：消息在右上角
 await pg.waitForTimeout(300);const L=await pg.evaluate(()=>AN_LOG.filter(e=>e.ev==='page_view'||e.ev==='page_time').map(e=>e.ev==='page_view'?e.props.screen:'('+e.props.screen+')'));
 console.log(p,L.join(' '),errs);const want=W?'disc mine notif mine create mine disc':'disc me create me notif disc';const got=L.filter(x=>!x.startsWith('(')).join(' ');if(got!==want){bad++;console.log('FAIL want',want,'got',got)}
 await ctx.close()}
console.log(bad?'FAIL':'PASS pages');await b.close()})();
