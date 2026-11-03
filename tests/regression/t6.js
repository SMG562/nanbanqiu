const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
async function run(file,vp,pre){const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-13T15:10:00+11:00'));const p=await ctx.newPage();p.on('pageerror',x=>e.push(file.slice(0,3)+' '+x.message+' '+(x.stack||'').split('\n')[1]));await p.goto('file:///mnt/user-data/outputs/'+file);await p.waitForTimeout(900);await p.evaluate(()=>{try{closeSheet()}catch(e){}try{closeModal()}catch(e){}});return p}
const R={};
for(const [file,vp,tag] of [['南伴球_PWA.html',{width:390,height:844},'p'],['南伴球_Web.html',{width:1360,height:860},'w']]){
 const p=await run(file,vp);const S=async n=>{await p.waitForTimeout(500);await p.screenshot({path:`v70/${tag}_${n}.png`})};
 // 1 开打前 30 分钟
 await p.evaluate(()=>document.querySelector('[data-demo="soon"]').click());await p.waitForTimeout(700);
 R[tag+'_soon']=await p.evaluate(()=>{const lg=NR_LOG.slice(0,3).map(x=>x.t+'>'+x.dest);const n=NOTIFS.find(n=>n.kind==='soon'&&n.user_id===ME.id);return n?ntfText(n).join(' | ')+' ROUTE '+n.route:'none '+JSON.stringify(lg)+' me='+(ME&&ME.id)});await S('soon_banner');
 await p.evaluate(()=>{const n=NOTIFS.find(n=>n.kind==='soon'&&n.user_id===ME.id);nrOpen(n)});await S('soon_sheet');
 await p.evaluate(()=>{try{UF_CLOSE()}catch(e){}});
 // 2 约定门槛
 await p.evaluate(()=>document.querySelector('[data-demo="pact"]').click());await p.waitForTimeout(900);await S('pact');
 R[tag+'_pact']=await p.evaluate(()=>!!document.querySelector('.pactsh [data-pact="ok"]'));
 await p.evaluate(()=>document.querySelector('.pactsh [data-pact="ok"]').click());await p.waitForTimeout(700);
 R[tag+'_pact_after']=await p.evaluate(()=>({pact:!!ME.pact_at,apply:!!document.querySelector('#applyMsg')}));await S('pact_after');
 await p.evaluate(()=>{try{UF_CLOSE()}catch(e){}try{closeSheet()}catch(e){}try{closeModal()}catch(e){}});
 // 3 设置面板
 await p.evaluate(()=>{setWho('han');nrSettings()});await S('settings');await p.evaluate(()=>{try{UF_CLOSE()}catch(e){}});
 // 4 路由：另一台设备开推送 + 这台离开 → 申请提醒
 R[tag+'_route']=await p.evaluate(()=>{const out=[];const g=GAMES.find(g=>g.host_id==='han'&&g.status==='open'&&new Date(g.starts_at)>NOW);
   const t=(lbl,fn)=>{fn();const u=Object.keys(USERS).find(u=>u!=='han'&&!PARTS.some(p=>p.game_id===g.id&&p.user_id===u));PARTS.push({game_id:g.id,user_id:u,role:'player',status:'pending',message:'',created_at:Date.now()});RQ_BN[g.id]=null;notify('han','request',g.id,u);out.push(lbl+' → '+NR_LOG[0].dest)};
   PUSH.enabled=false;t('都在用这台',()=>{NR_AWAY=false;nrDevSet('off')});
   t('这台离开·另一台开推送',()=>{NR_AWAY=true;nrDevSet('push')});
   t('这台离开·另一台没开',()=>{NR_AWAY=true;nrDevSet('off')});
   t('这台离开·另一台正在用',()=>{NR_AWAY=true;nrDevSet('active')});
   PUSH.enabled=true;t('这台离开·这台开推送·另一台没开',()=>{NR_AWAY=true;nrDevSet('off')});
   NR_AWAY=false;nrDevSet('off');return out});
 // 5 出发类：在电脑上正在看，也推到手机
 R[tag+'_go']=await p.evaluate(()=>{ME.dev.mobile.push=true;ME.dev.desktop.push=true;NR_AWAY=false;const g=GAMES.find(g=>g.host_id!=='han'&&PARTS.some(p=>p.game_id===g.id&&p.user_id==='han'&&p.status==='approved')&&new Date(g.starts_at)>NOW);if(!g)return 'nogame';notify('han','game_cancelled',g.id,g.host_id);return NR_LOG[0].dest});
 // 6 已读：待处理的申请保持未读
 R[tag+'_read']=await p.evaluate(async()=>{if(typeof go==='function'&&document.getElementById('notifBody')){UI.msgTab='ntf';go('notif')}else togglePop(true);await new Promise(r=>setTimeout(r,1800));const L=nrList();return {unread:L.filter(n=>!n.read).map(n=>n.kind),badge:document.getElementById('nBadge').textContent}});
 await S('list');
 // 7 夜间
 R[tag+'_quiet']=await p.evaluate(()=>{const t=new Date();t.setHours(23,10,0,0);const q=nrQuiet(+t);return new Date(q).toString().slice(16,21)+' / day+'+((new Date(q).getDate()-t.getDate()))});
 // 8 爽约：系统头像，不显示是谁反馈
 R[tag+'_noshow']=await p.evaluate(()=>{const g=GAMES.find(g=>new Date(g.starts_at)<NOW&&PARTS.some(p=>p.game_id===g.id&&p.user_id==='han'));notify('han','noshow',g.id,null);const n=NOTIFS[0];return n.kind+' from='+n.from+' av='+(nrAv(n,{})?'sys':'user')+' '+ntfText(n)[0]});
 // 9 邀约过期
 R[tag+'_invexp']=await p.evaluate(()=>{const i=INV_DEMO();i.at=Date.now()-49*36e5;i.created_at=i.at;invExpTick();const n=NOTIFS.find(n=>n.kind==='invite_expired');return n?invText(n).join(' | ')+' to='+n.user_id:'none('+i.status+','+invExpired(i)+')'});
 await p.close()}
console.log(JSON.stringify(R,null,1));console.log(e);await b.close()})();
