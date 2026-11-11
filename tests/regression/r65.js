const {chromium}=require('playwright');
const T=(n,ok,x='')=>console.log((ok?'PASS ':'FAIL ')+n,x);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 const ctx=await b.newContext({viewport:{width:1440,height:900}});await ctx.addInitScript(ts=>{const off=ts-Date.now(),D=Date;class FD extends D{constructor(...a){a.length?super(...a):super(D.now()+off)}static now(){return D.now()+off}};window.Date=FD},+new Date('2026-10-12T15:10:00+11:00'));
 const w=await ctx.newPage();w.on('pageerror',x=>e.push('W '+x.message));
 await w.goto('file:///mnt/user-data/outputs/南伴球_Web.html');await w.waitForTimeout(800);
 const r=await w.evaluate(()=>{setWho('han');const o={};const B=Object.keys(USERS).find(u=>u!=='han'&&gamesTogether('han',u).length===0&&!INVITES.some(i=>[i.from,i.to].includes(u))&&!blockedPair('han',u));
   const id='tz';GAMES.push({id,share_code:'TZ',starts_at:new Date(Date.now()-5*36e5).toISOString(),duration_min:90,venue_id:'v1',game_type:'singles',ntrp_min:3,ntrp_max:4,capacity:2,host_id:'han',note:'',status:'completed'});['han',B].forEach(x=>PARTS.push({game_id:id,user_id:x,role:'player',status:'approved',created_at:0}));
   const t=dmThread(B,true),say=(txt,dt=0)=>MSGS.push({tid:t.id,from:B,text:txt,at:Date.now()+dt});const t0=Date.now();LASTREAD['han|'+t.id]=t0-60000;
   say('before mute',-20000);o.before=cxUnread(t);                                       // 1
   setOpin('han',B,'less',id);LESS_IV['han>'+B][0][0]=t0-10000;o.afterMuteOld=cxUnread(t);                          // 静音前的未读仍算（往后才不提醒）
   say('during mute',-5000);o.during=cxUnread(t);                                   // 1（新的不算）
   // 共同球局窗口：明天一局，开场前 24h 内
   const id2='tz2';GAMES.push({id:id2,share_code:'TZ2',starts_at:new Date(Date.now()+5*36e5).toISOString(),duration_min:90,venue_id:'v1',game_type:'singles',ntrp_min:3,ntrp_max:4,capacity:2,host_id:'han',note:'',status:'full'});['han',B].forEach(x=>PARTS.push({game_id:id2,user_id:x,role:'player',status:'approved',created_at:0}));
   say('晚到 10 分钟',-4000);o.shared=cxUnread(t);                                   // 2（同局窗口内照常）
   GAMES.find(g=>g.id===id2).status='cancelled';o.cancelled=cxUnread(t);           // 取消后窗口消失 → 1
   setOpin('han',B,'ok',null);o.unmuted=cxUnread(t);                               // 静音期间的不会冒出来 → 1
   say('after unmute',1000);o.after=cxUnread(t);                                   // 2
   o.quietLast=msgQuiet('han',{from:B,at:Date.now()+1000});
   // 请求上的标记
   setOpin('han',B,'less',id);const gid=api.create({venue_id:'v2',starts_at:new Date(Date.now()+3*36e5).toISOString(),duration_min:60,game_type:'singles',ntrp_min:1,ntrp_max:16});
   PARTS.push({game_id:gid,user_id:B,role:'player',status:'pending',message:'',created_at:Date.now()});select(gid);o.tag=!!document.querySelector('#colR .lt');
   o.reqNotif=true;
   // 主动约 TA → 自动改回随缘
   o.inv=canInvite(B);return o});
 T('unread before mute stays',r.before===1&&r.afterMuteOld===1,JSON.stringify(r));
 T('new DMs during mute not counted',r.during===1);
 T('shared upcoming game: DMs remind',r.shared===3);
 T('cancelled shared game: quiet again',r.cancelled===1);
 T('unmute: muted msgs stay quiet',r.unmuted===1);
 T('after unmute: normal',r.after===2&&r.quietLast===false);
 T('host sees private tag on request',r.tag);
 T('A can still invite B',r.inv===null,r.inv);
 console.log(e);await b.close()})();
