const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));const w=await ctx.newPage();w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(800);
 // 1 表单开关
 let r=await w.evaluate(()=>{setWho('han');openCreate();const st=new Date(Date.now()+50*6e4);st.setMinutes(st.getMinutes()<30?30:0);if(st.getMinutes()===0)st.setHours(st.getHours()+1);
   const o=dOff(st),t=hm(st);Object.assign(NG,{o,t,per:perOf(t),venue_id:'v1'});drawCreate();const a=!!document.querySelector('[data-ng="instant"]');
   const far=new Date(Date.now()+5*36e5);Object.assign(NG,{o:dOff(far),t:'23:30'});NG.o=2;drawCreate();const bb=!!document.querySelector('[data-ng="instant"]');
   Object.assign(NG,{o,t});drawCreate();document.querySelector('[data-ng="instant"]').click();const on=NG.instant;
   return {a,bb,on,left:Math.round((st-Date.now())/6e4),t}});
 T('toggle shows within 2h',r.a,JSON.stringify(r));T('toggle hidden far',!r.bb);T('toggle on',r.on);
 r=await w.evaluate(()=>{NG.mn=3;NG.mx=4;ngPublish();const g=GAMES[GAMES.length-1];closeModal();return {id:g.id,mode:g.join_mode,ca:!!g.created_at,mn:g.ntrp_min,mx:g.ntrp_max}});
 T('published instant',r.mode==='instant'&&r.ca,JSON.stringify(r));const gid=r.id;
 await w.waitForTimeout(400);await w.evaluate(()=>closeModal());
 // 9 不提醒还缺人
 r=await w.evaluate(id=>{api.list();return NOTIFS.filter(n=>n.game_id===id&&n.kind==='unfilled').length},gid);T('no unfilled reminder for fresh game',r===0,r);
 r=await w.evaluate(id=>{UI.sel=id;const c=api.get(id);return ufHostCard(c)},gid);T('host card instant note & no ufc',r.includes('不用你确认')&&!r.includes('看看办法'),r.slice(0,120));
 // 2 合适的人直接加入
 await w.evaluate(id=>{const u=Object.values(USERS).find(u=>u.id!=='han'&&u.ntrp>=3&&u.ntrp<=4&&!blockedPair('han',u.id));window._fit=u.id;setWho(u.id);select(id)},gid);await w.waitForTimeout(300);
 r=await w.evaluate(()=>[$('#colR [data-a="apply"]').textContent,$('#colR [data-a="apply"]').nextElementSibling.textContent]);T('button 直接加入',r[0]==='直接加入',r.join(' | '));
 await w.click('#colR [data-a="apply"]');await w.waitForTimeout(300);r=await w.evaluate(()=>!!$('#modal [data-ug="join"]'));T('join modal',r);
 await (await w.$('#modal')).screenshot({path:'r57_join.png'});
 await w.click('#modal [data-ug="join"]');await w.waitForTimeout(300);await (await w.$('#modal')).screenshot({path:'r57_joined.png'});
 r=await w.evaluate(id=>{const p=PARTS.find(p=>p.game_id===id&&p.user_id===ME.id);const n=NOTIFS.find(n=>n.game_id===id&&n.kind==='joined');return {st:p.status,at:!!p.approved_at,n:!!n,txt:n&&ntfText(n).join(' / '),state:stateOf(api.get(id))}},gid);
 T('joined approved & host notified',r.st==='approved'&&r.at&&r.n&&r.state==='approved',JSON.stringify(r));
 // 5 10 分钟内退出不算
 r=await w.evaluate(id=>{const late0=ME.base.late||0;const t=ugLeaveTxt(api.get(id));api.leave(id);return {t,late:(ME.base.late||0)-late0}},gid);T('grace leave not late',r.late===0&&r.t.includes('10 分钟'),JSON.stringify(r));
 r=await w.evaluate(id=>{api.join(id);const p=PARTS.find(p=>p.game_id===id&&p.user_id===ME.id);p.approved_at=Date.now()-11*6e4;const late0=ME.base.late||0;api.leave(id);return (ME.base.late||0)-late0},gid);T('late leave after 10min counted',r===1,r);
 await w.evaluate(()=>closeModal());
 // 3 不合适的人
 r=await w.evaluate(id=>{const u=Object.values(USERS).find(u=>u.id!=='han'&&(u.ntrp<3||u.ntrp>4)&&!blockedPair('han',u.id));setWho(u.id);select(id);return u.ntrp},gid);await w.waitForTimeout(300);
 r=await w.evaluate(()=>[$('#colR [data-a="apply"]').textContent,$('#colR [data-a="apply"]').nextElementSibling.textContent]);T('nonfit sees 申请加入 + reason',r[0]==='申请加入'&&r[1].includes('不在'),r.join(' | '));
 await w.click('#colR [data-a="apply"]');await w.waitForTimeout(300);r=await w.evaluate(()=>$$('#modal .ugn').map(x=>x.textContent));T('apply notes',r.length===2,JSON.stringify(r));
 await (await w.$('#modal')).screenshot({path:'r57_apply.png'});
 await w.click('#modal [data-a="doApply"]');await w.waitForTimeout(300);await w.evaluate(()=>closeModal());
 r=await w.evaluate(id=>{const p=PARTS.find(p=>p.game_id===id&&p.user_id===ME.id);return {st:p.status,band:(document.querySelector('#colR .pass-band')||{}).textContent}},gid);T('pending band deadline',r.st==='pending'&&/前没确认会自动失效/.test(r.band),JSON.stringify(r));
 const nonfit=await w.evaluate(()=>ME.id);
 // 12 host request notif text
 r=await w.evaluate((a)=>{const n=NOTIFS.find(n=>n.game_id===a.id&&n.kind==='request'&&n.from===a.u);return ntfText(n).join(' / ')},{id:gid,u:nonfit});T('request notif has deadline',/前处理/.test(r),r);
 // 4 满员：单打 → 合适的人加入后满员，待确认的被婉拒
 r=await w.evaluate((a)=>{setWho(window._fit);api.join(a.id);const g=GAMES.find(g=>g.id===a.id);const p=PARTS.find(p=>p.game_id===a.id&&p.user_id===a.u);return {gs:g.status,ps:p.status,full:NOTIFS.some(n=>n.user_id===a.u&&n.kind==='full'&&n.game_id===a.id),inst:ugInstant(api.get(a.id))}},{id:gid,u:nonfit});
 T('full closes & rejects pending',r.gs==='full'&&r.ps==='rejected'&&r.full&&!r.inst,JSON.stringify(r));
 // join race: full
 r=await w.evaluate(id=>{const u=Object.values(USERS).find(u=>u.id!=='han'&&u.id!==window._fit&&u.ntrp>=3&&u.ntrp<=4);setWho(u.id);select(id);ugOpenJoin(id);document.querySelector('[data-ug="join"]').click();return PARTS.filter(p=>p.game_id===id&&p.status==='approved').length},gid);T('race: no overfill',r===2,r);
 await w.evaluate(()=>closeModal());
 // 6 超时失效
 r=await w.evaluate(()=>{setWho('han');const st=new Date(Date.now()+40*6e4);const id=api.create({venue_id:'v2',starts_at:st.toISOString(),duration_min:60,game_type:'doubles',ntrp_min:1,ntrp_max:16});
   const g=GAMES.find(x=>x.id===id);g.created_at=Date.now()-3*36e5;const u1=Object.values(USERS).find(u=>u.id!=='han'),u2=Object.values(USERS).filter(u=>u.id!=='han')[1];
   PARTS.push({game_id:id,user_id:u1.id,role:'player',status:'pending',message:'',created_at:Date.now()-16*6e4});
   PARTS.push({game_id:id,user_id:u2.id,role:'player',status:'pending',message:'',created_at:Date.now()-5*6e4});
   const c=api.get(id);const p1=PARTS.find(p=>p.game_id===id&&p.user_id===u1.id),p2=PARTS.find(p=>p.game_id===id&&p.user_id===u2.id);
   return {id,u1:u1.id,u2:u2.id,p1:p1.status+'/'+p1.reason,p2:p2.status,n:NOTIFS.filter(n=>n.game_id===id&&n.kind==='expired').length,card:ufHostCard(c),ok:api.decide(id,u1.id,true)}});
 T('expired after 15min, other stays',r.p1==='rejected/timeout'&&r.p2==='pending'&&r.n===1,JSON.stringify(r));T('host card counts timeout & deadline',r.card.includes('超过 15 分钟')&&r.card.includes('前没处理'),r.card);T('decide on expired refused',r.ok===false);
 const eg=r;
 r=await w.evaluate(a=>{setWho(a.u1);select(a.id);const n=NOTIFS.find(n=>n.user_id===a.u1&&n.kind==='expired');return {band:(document.querySelector('#colR .pass-band')||{}).textContent,ntf:ntfText(n).join(' / '),pill:stateOf(api.get(a.id))}},eg);
 T('applicant band timeout text',r.band.includes('没来得及确认'),JSON.stringify(r));
 await (await w.$('#colR')).screenshot({path:'r57_expired.png'});
 // deadline at start: apply 10 min before start
 r=await w.evaluate(()=>{const st=Date.now()+10*6e4;return ugDeadline({created_at:Date.now()},{starts_at:new Date(st).toISOString()})-st});T('deadline capped at start',r===0,r);
 r=await w.evaluate(()=>{const st=Date.now()+3*36e5;return (ugDeadline({created_at:Date.now()},{starts_at:new Date(st).toISOString()})-st)/6e4});T('deadline st-45 for early apply',r===-45,r);
 // 10 email
 r=await w.evaluate(a=>{const u=U(a.u2);u.email='x@y.com';u.pushOK=false;u.emPrefs={};const m0=emQueue(a.u2,'game_cancelled',a.id,0);EMAIL_OUTBOX.length=0;return m0},eg);
 T('email: 默认不发（11-03：有邮箱但没在「提醒方式 → 邮件」打开 → 不排邮件）',r===null,JSON.stringify(r));
 r=await w.evaluate(a=>{const u=U(a.u2);u.emPrefs=Object.fromEntries(Object.values(EM_KIND).map(k=>[k,true]));const m1=emQueue(a.u2,'approved',a.id,1);const m2=emQueue(a.u2,'game_cancelled',a.id,2);return {m1,m2:m2&&{after:Math.round((m2.after-Date.now())/1e3),urgent:m2.urgent}}},eg);
 T('email: result within 1h skipped',r.m1===null,JSON.stringify(r));T('email: change immediate',r.m2&&r.m2.urgent&&Math.abs(r.m2.after)<1000);
 // 11 edit
 r=await w.evaluate(id=>{setWho('han');const g=GAMES.find(x=>x.id===id);g.status='open';PARTS=PARTS.filter(p=>!(p.game_id===id&&p.user_id!=='han'));geOpen(id);const a=NG.instant;NG.instant=false;const d=geDiff(api.get(id),NG);return {a,lite:d.lite}},gid);
 T('edit keeps instant & diff 加入方式',r.a===true&&r.lite.includes('加入方式'),JSON.stringify(r));
 r=await w.evaluate(id=>{const c=api.get(id);geApply(c,NG,geDiff(c,NG));return GAMES.find(x=>x.id===id).join_mode},gid);T('edit applies approve',r==='approve',r);
 // old game reminder still works
 r=await w.evaluate(()=>{const st=new Date(Date.now()+90*6e4);const id=api.create({venue_id:'v3',starts_at:st.toISOString(),duration_min:60,game_type:'singles',ntrp_min:1,ntrp_max:16});GAMES.find(x=>x.id===id).created_at=Date.now()-5*36e5;api.list();return NOTIFS.filter(n=>n.game_id===id&&n.kind==='unfilled').length});T('old game still reminded',r===1,r);
 console.log(e);await b.close()})();
