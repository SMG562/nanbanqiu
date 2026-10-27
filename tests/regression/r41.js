const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const e=[];
 for(const f of ['PWA','Web']){const p=await b.newPage();p.on('pageerror',x=>e.push(f+' '+x.message));
 await p.goto(`file:///mnt/user-data/outputs/南伴球_${f}.html`);await p.waitForTimeout(700);
 const r=await p.evaluate(()=>{const out={};const T0=Date.now(),M=6e4;
  const reset=()=>{EMAIL_OUTBOX.length=0};
  const han=U('han');han.email='han@x.com';han.emPrefs={request:true,result:true,change:true};han.emailStatus='ok';
  const t=new Date(T0+2*864e5);t.setHours(10,0,0,0);const gid='T1';GAMES.push({id:gid,share_code:'tt1',starts_at:t.toISOString(),duration_min:90,venue_id:'v1',game_type:'doubles',ntrp_min:3,ntrp_max:5,capacity:4,host_id:'han',note:'',status:'open',tags:[],filled:0});
  PARTS.push({game_id:gid,user_id:'han',role:'host',status:'approved'});
  const req=(uid,at)=>{PARTS.push({game_id:gid,user_id:uid,role:'player',status:'pending'});const n={id:++NID,user_id:'han',kind:'request',game_id:gid,from:uid,at,read:false};NOTIFS.unshift(n);return emQueue('han','request',gid,n.id,at)};
  // 1 推送可用 → 不发
  ME=null;han.pushOK=true;reset();out.pushed=req('grace',T0)===null;han.pushOK=false;
  // 2 合并：0 分钟、10 分钟、40 分钟三个申请
  reset();req('jason',T0);emFlush(T0+5*M);req('mia',T0+10*M);req('chris',T0+40*M);emFlush(T0+30*M);
  const before=EMAIL_OUTBOX.map(x=>x.status+'/'+x.nids.length).join(' ');emFlush(T0+65*M);
  out.merge=[before,EMAIL_OUTBOX.map(x=>x.status+'/'+(x.subject||'')).join(' | ')];
  // 3 5 分钟内看过 → 不发
  reset();const m=req('ryan',T0+3*36e5);NOTIFS.find(n=>n.id===m.nids[0]).read=true;emFlush(T0+3*36e5+5*M);out.seen=m.status+'/'+m.reason;
  // 4 申请已经处理 → 不发
  reset();const m2=req('ben',T0+4*36e5);PARTS.find(p=>p.game_id===gid&&p.user_id==='ben').status='approved';emFlush(T0+4*36e5+5*M);out.handled=m2.status+'/'+m2.reason;
  // 5 每天 5 封 + 重要的先发
  reset();for(let i=0;i<6;i++){const g='C'+i;GAMES.push({id:g,share_code:'c'+i,starts_at:t.toISOString(),duration_min:60,venue_id:'v2',game_type:'singles',ntrp_min:3,ntrp_max:5,capacity:2,host_id:'han',status:'open'});PARTS.push({game_id:g,user_id:'grace',role:'player',status:'pending'});
    const n={id:++NID,user_id:'han',kind:i<3?'request':'changed',game_id:g,from:'grace',at:T0,read:false};NOTIFS.unshift(n);emQueue('han',n.kind,g,n.id,T0)}
  emFlush(T0+6*M);out.cap=EMAIL_OUTBOX.map(x=>x.kind[0]+':'+x.status+(x.reason?'('+x.reason+')':'')+(x.last?'*':'')).join(' ');
  return out});console.log(f,JSON.stringify(r,null,0));await p.close()}
 console.log(e);await b.close()})();
