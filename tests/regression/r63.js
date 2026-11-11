const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));
 const w=await ctx.newPage();w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(800);
 let r=await w.evaluate(()=>{setWho('han');const mk=(h,others,agoH,type='singles')=>{const st=new Date(Date.now()-agoH*36e5);const id='t'+(++NID);GAMES.push({id,share_code:'X'+NID,starts_at:st.toISOString(),duration_min:90,venue_id:'v1',game_type:type,ntrp_min:3,ntrp_max:4,capacity:CAP[type],host_id:h,note:'',status:'completed'});
     [h,...others].forEach(u=>PARTS.push({game_id:id,user_id:u,role:u===h?'host':'player',status:'approved',message:'',created_at:0}));return id};
   const fresh=Object.keys(USERS).filter(u=>u!=='han'&&gamesTogether('han',u).length===0&&!INVITES.some(i=>[i.from,i.to].includes(u))&&!blockedPair('han',u));window._A=fresh[0];window._B=fresh[1]||'jason';
   window._g1=mk('han',[_A,_B],3,'doubles');window._gold=mk('han',[_B],72);api.list();api.list();
   return {n:NOTIFS.filter(n=>n.kind==='recap'&&n.game_id===_g1).length,old:NOTIFS.filter(n=>n.kind==='recap'&&n.game_id===_gold).length,A:_A,B:_B}});
 T('recap once each, none for old',r.n===3&&r.old===0,JSON.stringify(r));
 // 对方视角快照
 const snap=()=>w.evaluate(()=>{const me=ME;setWho(_A);const v={inv:invBtnHTML('han'),can:canInvite('han'),n:NOTIFS.filter(n=>n.user_id===_A&&!['badge','levelup','recap'].includes(n.kind)).length,k:NOTIFS.filter(n=>n.user_id===_A).map(n=>n.kind).join()};ME=me;setWho('han');return v});
 const before=await snap();
 await w.evaluate(()=>rcOpen(_g1));await w.waitForTimeout(200);await (await w.$('#modal')).screenshot({path:'r63_card.png'});
 r=await w.evaluate(()=>$$('#modal .rc-p').map(p=>[...p.querySelectorAll('.rc-seg button')].map(b=>b.textContent).join('/')));T('3 options per player',r.every(x=>x==='多遇到/随缘/少遇到'),JSON.stringify(r));
 await w.click(`#modal [data-rc="more"][data-u="${await w.evaluate(()=>_A)}"]`);await w.click(`#modal [data-rc="less"][data-u="${await w.evaluate(()=>_B)}"]`);await w.waitForTimeout(100);
 await (await w.$('#modal')).screenshot({path:'r63_card2.png'});
 await w.click('#modal [data-rc="done"]');await w.waitForTimeout(200);
 const after=await snap();
 T('more: other side sees nothing different',before.inv===after.inv&&before.can===after.can&&before.n===after.n,JSON.stringify([before,after]).slice(0,300));
 r=await w.evaluate(()=>({f:followHas('han',_A),l:lessHas('han',_B),pals:/pals/.test(partnersHTML())&&partnersHTML().includes(_A)}));T('saved more/less, pals shows followed',r.f&&r.l&&r.pals,JSON.stringify(r));
 // less: B 视角
 r=await w.evaluate(()=>{const me=ME;setWho(_B);const inv=invBtnHTML('han'),can=canInvite('han');setWho('han');return {inv,can}});
 T('less: B sees same as invites-off',/TA 暂时不接受邀约/.test(r.inv)&&r.can==='TA 暂时不接受邀约',JSON.stringify(r));
 r=await w.evaluate(()=>{const t=dmThread(_B,true);MSGS.push({tid:t.id,from:_B,text:'hi',at:Date.now()});return {u:cxUnread(t),dm:canDM(_B)}});T('less: DM right after shared game still reminds',r.u===1&&r.dm===true,JSON.stringify(r));
 r=await w.evaluate(()=>{const st=new Date(Date.now()+60*6e4);const id=api.create({venue_id:'v2',starts_at:st.toISOString(),duration_min:60,game_type:'doubles',ntrp_min:1,ntrp_max:16});const g=GAMES.find(x=>x.id===id);g.join_mode='instant';setWho(_B);const c=api.get(id);const o={fits:ugFits(c,ME),lv:ugLvFit(c,ME)};setWho('han');return o});
 T('less: no instant join',!r.fits&&r.lv,JSON.stringify(r));
 // follow: A 发局
 r=await w.evaluate(async()=>{const c0=NOTIFS.filter(n=>n.user_id==='han'&&n.kind==='follow_game').length;setWho(_A);const st=new Date(Date.now()+2*864e5);st.setHours(18,0,0,0);
   api.create({venue_id:'v2',starts_at:st.toISOString(),duration_min:90,game_type:'singles',ntrp_min:3,ntrp_max:4.5});api.create({venue_id:'v2',starts_at:new Date(+st+864e5).toISOString(),duration_min:90,game_type:'singles',ntrp_min:3,ntrp_max:4.5});setWho('han');
   await new Promise(r=>setTimeout(r,50));api.list();const L=NOTIFS.filter(n=>n.user_id==='han'&&n.kind==='follow_game');return {n:L.length-c0,txt:L[0]&&ntfText(L[0]).join(' / ')}});
 T('follow: one heads-up per week',r.n===1,JSON.stringify(r));
 r=await w.evaluate(async()=>{const c0=NOTIFS.filter(n=>n.user_id==='han'&&n.kind==='follow_game').length;delete FG_LAST['han>'+_A];setWho(_A);api.create({venue_id:'v2',starts_at:new Date(Date.now()+3*864e5).toISOString(),duration_min:90,game_type:'singles',ntrp_min:6,ntrp_max:8});setWho('han');await new Promise(r=>setTimeout(r,50));api.list();return NOTIFS.filter(n=>n.user_id==='han'&&n.kind==='follow_game').length-c0});
 T('follow: not for unsuitable level',r===0,r);
 r=await w.evaluate(()=>{const c=api.list().find(c=>c.host_id===_A);return c?rank(c)<0||true:null});
 // ok: 改回随缘
 r=await w.evaluate(()=>{setOpin('han',_A,'ok',null);return {f:followHas('han',_A),has:!!OPIN['han>'+_A]}});T('随缘 clears',!r.f&&!r.has);
 // player card private row (web)
 await w.evaluate(()=>openCard(_A));await w.waitForTimeout(300);r=await w.evaluate(()=>!!$('#modal .pcp'));T('player card row',r);
 await w.click('#modal .pcp [data-pcp="more"]');r=await w.evaluate(()=>[followHas('han',_A),$('#modal .pcp .on').textContent]);T('player card set',r[0]&&r[1]==='多遇到',JSON.stringify(r));
 await (await w.$('#modal')).screenshot({path:'r63_pcard.png'});
 // quiet hours: follow_game at night
 r=await w.evaluate(()=>{const x=rcQuiet(+new Date('2026-10-12T23:10:00+11:00'));return new Date(x).getHours()});T('quiet till 8',r===8,r);
 // other users never notified of choices
 r=await w.evaluate(()=>NOTIFS.filter(n=>[_A,_B].includes(n.user_id)&&!['recap'].includes(n.kind)&&n.from==='han').map(n=>n.kind));T('no notifications to others about choices',r.length===0,JSON.stringify(r));
 console.log(e);await b.close()})();
