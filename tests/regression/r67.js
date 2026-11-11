const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));
 const w=await ctx.newPage();w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(800);
 const r=await w.evaluate(async()=>{const A='han';setWho(A);const o={};
   const free=Object.keys(USERS).filter(u=>u!==A&&gamesTogether(A,u).length===0&&!INVITES.some(i=>[i.from,i.to].includes(u))&&!blockedPair(A,u));const B=free[0],C=free[1];o.B=B;o.C=C;
   const past=(h,ps,agoH,extra={})=>{const id='p'+(++NID);GAMES.push({id,share_code:'P'+NID,starts_at:new Date(Date.now()-agoH*36e5).toISOString(),duration_min:90,venue_id:'v1',game_type:'singles',ntrp_min:1,ntrp_max:16,capacity:2,host_id:h,note:'',status:'completed',...extra});ps.forEach(u=>PARTS.push({game_id:id,user_id:u,role:u===h?'host':'player',status:'approved',created_at:0,approved_at:0}));return id};
   const fx=(u)=>{const m={};const ME0=ME;   // A 对 u 的各项效果
     const h=Object.assign({},GAMES.find(g=>g.host_id===u&&g.status==='open')||{});
     m.op=opinOf(A,u);setWho(u);m.uCanInvite=canInvite(A);const fake={...V(GAMES.find(g=>g.id===o.inst)),};m.uInstant=ugFits(api.get(o.inst),ME);setWho(A);
     const t=dmThread(u,true);const before=cxUnread(t);MSGS.push({tid:t.id,from:u,text:'x',at:Date.now()+5});m.dmRemind=msgQuiet(A,{from:u,at:Date.now()+5})===false;
     const fake2={...api.get(o.inst),host_id:u};m.rankPenalty=rank(fake2)-rank(api.get(o.inst));m.pals=partnersHTML().includes('data-user="'+u+'"');return m};
   // A 有一场「不用确认」的局，用来测直接加入
   o.inst=api.create({venue_id:'v2',starts_at:new Date(Date.now()+80*6e4).toISOString(),duration_min:60,game_type:'doubles',ntrp_min:1,ntrp_max:16});GAMES.find(g=>g.id===o.inst).join_mode='instant';
   // 场景 1：打完 → 少遇到 → A 主动约 B → 再打一场 → 赛后选多遇到
   const g1=past(A,[A,B],30);setOpin(A,B,'less',g1);o.s1_less=fx(B);
   newInvite(B);o.s1_canInv=canInvite(B);IVF.venue_id='v2';sendInvite();closeModal();o.s1_afterInvite=fx(B);
   const inv=INVITES[0];setWho(B);finishAccept(inv);setWho(A);const g2=inv.game_id,G2=GAMES.find(g=>g.id===g2);G2.starts_at=new Date(Date.now()-3*36e5).toISOString();G2.status='completed';
   rcOpen(g2);o.s1_prefill=document.querySelector(`#modal [data-rc].on[data-u="${B}"]`).textContent;
   document.querySelector(`#modal [data-rc="more"][data-u="${B}"]`).click();document.querySelector('#modal [data-rc="done"]').click();o.s1_more=fx(B);
   // B 发局 → A 收到一次提醒
   const c0=NOTIFS.filter(n=>n.user_id===A&&n.kind==='follow_game').length;setWho(B);api.create({venue_id:'v2',starts_at:new Date(Date.now()+2*864e5).toISOString(),duration_min:90,game_type:'singles',ntrp_min:3,ntrp_max:5});setWho(A);
   await new Promise(r=>setTimeout(r,30));RCQ.forEach(x=>x.at=0);rcTick();o.s1_followNotif=NOTIFS.filter(n=>n.user_id===A&&n.kind==='follow_game').length-c0;
   // 场景 2：A 对 C 少遇到；C 申请 A 的公开局；A 接受；打完 → 卡片里仍是少遇到；改成随缘
   const g3=past(A,[A,C],40);setOpin(A,C,'less',g3);
   const pub=api.create({venue_id:'v3',starts_at:new Date(Date.now()+4*36e5).toISOString(),duration_min:60,game_type:'singles',ntrp_min:1,ntrp_max:16});PARTS.push({game_id:pub,user_id:C,role:'player',status:'pending',message:'',created_at:Date.now()});
   select(pub);o.s2_tag=!!document.querySelector('#colR .lt');api.decide(pub,C,true);
   const t=dmThread(C,true);o.s2_dmBeforeGame=msgQuiet(A,{from:C,at:Date.now()});                 // 同局开场前 24h 内 → 照常提醒
   const P=GAMES.find(g=>g.id===pub);P.starts_at=new Date(Date.now()-3*36e5).toISOString();P.status='completed';   // 打完 1.5 小时
   o.s2_dmAfter1h=msgQuiet(A,{from:C,at:Date.now()});o.s2_dmAfter3h=msgQuiet(A,{from:C,at:Date.now()+90*6e4});
   rcOpen(pub);o.s2_prefill=document.querySelector(`#modal [data-rc].on[data-u="${C}"]`).textContent;
   const mutedMsgAt=Date.now()+60*6e4;MSGS.push({tid:t.id,from:C,text:'muted one',at:mutedMsgAt});
   document.querySelector(`#modal [data-rc="ok"][data-u="${C}"]`).click();document.querySelector('#modal [data-rc="done"]').click();
   o.s2_ok=fx(C);o.s2_oldMutedStaysQuiet=msgQuiet(A,{from:C,at:mutedMsgAt})===true||mutedMsgAt>Date.now();
   // 场景 3：少遇到 → 直接改成多遇到（球员卡）
   setOpin(A,C,'less',null);setOpin(A,C,'more',null);o.s3=fx(C);o.s3_iv=LESS_IV[A+'>'+C].map(x=>x[1]!==Infinity);
   return o});
 const L=r.s1_less;T('S1 少遇到生效',L.op==='less'&&L.uCanInvite==='TA 暂时不接受邀约'&&!L.uInstant&&L.rankPenalty>=4000&&!L.pals,JSON.stringify(L));
 T('S1 A 仍可以约 B',r.s1_canInv===null,r.s1_canInv);
 const I=r.s1_afterInvite;T('S1 约了之后自动随缘，限制全部解除',I.op==='ok'&&I.uCanInvite===null&&I.uInstant&&I.rankPenalty===0&&I.dmRemind,JSON.stringify(I));
 T('S1 再打一场的卡片预选「随缘」',r.s1_prefill==='随缘',r.s1_prefill);
 const M=r.s1_more;T('S1 选多遇到：靠前 + 常一起打 + 可约 + 可直接加入',M.op==='more'&&M.rankPenalty<0&&M.pals&&M.uCanInvite===null&&M.uInstant&&M.dmRemind,JSON.stringify(M));
 T('S1 B 发新局 → A 收到一次提醒',r.s1_followNotif===1,r.s1_followNotif);
 T('S2 申请卡片上有私人标记',r.s2_tag);
 T('S2 同局前后私信照常提醒，2 小时后恢复静音',r.s2_dmBeforeGame===false&&r.s2_dmAfter1h===false&&r.s2_dmAfter3h===true,JSON.stringify([r.s2_dmBeforeGame,r.s2_dmAfter1h,r.s2_dmAfter3h]));
 T('S2 卡片预选「少遇到」',r.s2_prefill==='少遇到',r.s2_prefill);
 const K=r.s2_ok;T('S2 改随缘：限制解除',K.op==='ok'&&K.uCanInvite===null&&K.uInstant&&K.rankPenalty===0&&K.dmRemind,JSON.stringify(K));
 T('S3 少遇到→多遇到：静音时段关闭',r.s3.op==='more'&&r.s3_iv.every(x=>x)&&r.s3.dmRemind&&r.s3.uInstant,JSON.stringify(r.s3));
 await w.evaluate(()=>{closeModal();runDemo("recap")});await w.waitForTimeout(500);await (await w.$("#modal")).screenshot({path:"r67_card.png"});
 console.log(e);await b.close()})();
