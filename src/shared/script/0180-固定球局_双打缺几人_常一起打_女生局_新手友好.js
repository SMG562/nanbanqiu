    case'lvinfo':LVINFO_OPEN(lvInfoHTML(),!!el.closest('.lvcard'));break;
    case'lvback':LV_BACK();break;
    case'softNo':SOFT_OPEN(softNoHTML(d.g,d.u));break;
    case'softNoGo':{const p=PARTS.find(p=>p.game_id===d.g&&p.user_id===d.u),nt=((document.getElementById('snNote')||{}).value||'').trim().slice(0,30);ugExpire();if(p&&p.status==='pending'){p.reason=d.v;p.note=nt;api.decide(d.g,d.u,false);toast('已婉拒')}else api.decide(d.g,d.u,false);SOFT_CLOSE();INV_RENDER();break}
    case'cardLink':copy(profileUrl(U(d.u),'link'),'球员卡链接已复制，可以发给朋友');break;
    case'cardShare':{const u=U(d.u);if(navigator.share)navigator.share({title:`${cardName(u)} 的南伴球球员卡`,url:profileUrl(u)}).catch(()=>{});else copy(profileUrl(u),'球员卡链接已复制');break}
    case'endSeries':{const s=seriesOf(G());s.active=false;toast('已停止 · 这一场照常进行');INV_RENDER();break}
    case'gender':if(!ME){toast('请先登录');return}GSTEP=null;openGender(null);break;
    case'pickG':if(d.v===ME.gender)return;if(gPick(d.v))break;GSTEP=d.v;openGender();break;
    case'gBack':GSTEP=null;openGender();break;
    case'gConfirm':{setGender(d.v);GSTEP=null;INV_CLOSE();INV_RENDER();toast('已保存');const n=GNEXT;GNEXT=null;if(n&&womenOK(ME))setTimeout(n,250);break}
    case'npg':NP.gender=d.v;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));break;
    case'impPick':{const k=ME.id+'|'+d.u+'|'+d.g,u=U(d.u),imp=impOf(u),g=KUDOS.get(k)||[],x=IMPK[d.v];
      if(g.includes(d.v)){KUDOS.set(k,g.filter(y=>y!==d.v));imp[d.v]=Math.max(0,(imp[d.v]||1)-1);toast('已撤回')}else{KUDOS.set(k,[...g,d.v]);imp[d.v]=(imp[d.v]||0)+1;toast(`已送出 ${x[1]} ${x[2]}`)}
      const box=el.closest('.impg');if(box)box.outerHTML=kudosHTML(d.u);const sm=document.querySelector('.imps[data-u="'+d.u+'"]');if(sm)sm.outerHTML=impressionsHTML(u,sm.dataset.t);INV_RENDER_SOFT();break}
    case'ftag':{F.tags=F.tags||new Set();const k=d.v;if(k==='women'&&ME&&!womenOK(ME)&&!F.tags.has(k)){if(!ME.gender)openGender(()=>{F.tags.add('women');SX_FILTER_REFRESH()});else toast('女生局只对女生开放');return}if(k==='women'&&!ME){toast('女生局需要登录并确认是女生');return}if(F.tags.has(k))F.tags.delete(k);else{if(k==='match')F.tags.delete('relax');if(k==='relax')F.tags.delete('match');F.tags.add(k)}SX_FILTER_REFRESH();break}
  }},true);

/* ---------- 演示数据 ---------- */
function seedSocial(){SERIES=[];KUDOS=new Map();IMPSEL=null;if(USERS.ryan)USERS.ryan.base.noshow=3;if(USERS.daniel)USERS.daniel.base.noshow=1;if(USERS.chris)USERS.chris.base.kudos=64;const GF={sarah:'f',mia:'f',grace:'f'};Object.values(USERS).forEach(u=>u.gender=GF[u.id]||'m');
  const tag=(id,t,note)=>{const g=GAMES.find(x=>x.id===id);if(g){g.tags=t;if(note!=null)g.note=note}};
  tag('g7',['newbie'],'慢节奏拉球，不计较失误，欢迎第一次来');tag('g15',['women'],'轻松单打，打完一起喝咖啡');tag('g5',['women'],'上班前拉球');
  const fill=(id,n)=>{const g=GAMES.find(x=>x.id===id);if(g)g.filled=n};fill('g10',1);fill('g17',1);
  let o1=GAMES.find(g=>g.id==='g6');o1=o1?dOff(new Date(o1.starts_at)):1;
  GAMES.push({id:'g20',share_code:'W2m5',starts_at:dayAt(o1,'10:00').toISOString(),duration_min:90,venue_id:'v1',game_type:'doubles',ntrp_min:3.0,ntrp_max:3.5,capacity:4,filled:1,host_id:'grace',note:'周末女生双打，节奏轻松',status:'open',tags:['women']});
  PARTS.push({game_id:'g20',user_id:'grace',role:'host',status:'approved',message:'',created_at:Date.now()-864e5},{game_id:'g20',user_id:'sarah',role:'player',status:'approved',message:'',created_at:Date.now()-5e7});
  for(let k=1,n=0;k<=40&&n<3;k++){if(dayAt(-k).getDay()!==0)continue;const id='wp'+n;GAMES.push({id,share_code:'WP'+n,starts_at:dayAt(-k,'10:00').toISOString(),duration_min:90,venue_id:'v1',game_type:'doubles',ntrp_min:3.0,ntrp_max:3.5,capacity:4,host_id:'grace',note:'',status:'completed',tags:['women']});
    ['grace','sarah','mia'].forEach((u,j)=>PARTS.push({game_id:id,user_id:u,role:j?'player':'host',status:'approved',message:'',created_at:0}));n++}
  {const gt=GAMES.find(g=>g.id==='g10');if(gt){const o=dOff(new Date(gt.starts_at));[['g21','08:00','singles','sarah',3.0,3.5],['g22','17:30','rally','david',3.0,3.5]].forEach(([id,t,ty,h,a,b])=>{GAMES.push({id,share_code:id.toUpperCase(),starts_at:dayAt(o,t).toISOString(),duration_min:90,venue_id:'v2',game_type:ty,ntrp_min:a,ntrp_max:b,capacity:CAP[ty],host_id:h,note:'',status:'open',tags:[]});PARTS.push({game_id:id,user_id:h,role:'host',status:'approved',message:'',created_at:0})})}}
  const s={id:'S1',host_id:'han',wd:3,t:'19:00',dur:90,venue_id:'v2',game_type:'doubles',filled:0,ntrp_min:3.0,ntrp_max:3.5,note:'周三晚上双打，节奏适中',tags:[],active:true};SERIES.push(s);
  let k=0;for(let o=-1;o>=-35&&k<3;o--){if(dayAt(o).getDay()!==3)continue;const id='sp'+k;
    GAMES.push({id,share_code:'SP'+k,starts_at:dayAt(o,'19:00').toISOString(),duration_min:90,venue_id:'v2',game_type:'doubles',ntrp_min:3.0,ntrp_max:3.5,capacity:4,host_id:'han',note:s.note,status:'completed',tags:[],series_id:'S1'});
    PARTS.push({game_id:id,user_id:'han',role:'host',status:'approved',message:'',created_at:0});['jason','grace','tom'].forEach(u=>PARTS.push({game_id:id,user_id:u,role:'player',status:'approved',message:'',created_at:0}));k++}
  housekeep();toUTR();seedChat()}
const N2U={2.5:2.5,3:3.5,3.5:4.5,4:6,4.5:7.5,5:9};
function toUTR(){const m=x=>N2U[x]??x;Object.values(USERS).forEach(u=>u.ntrp=m(u.ntrp));GAMES.forEach(g=>{g.ntrp_min=m(g.ntrp_min);g.ntrp_max=g.ntrp_max>=5?UTR_MAX:m(g.ntrp_max)});SERIES.forEach(x=>{x.ntrp_min=m(x.ntrp_min);x.ntrp_max=m(x.ntrp_max)})}

/* ---------- 社区印象：打完球给某一位球友留下 1–3 个印象（不是打分） ---------- */
var KUDOS=new Map(),IMPSEL=null;
const IMP=[['ontime','🌞','守时'],['kind','😊','友善'],['partner','🎾','好搭子'],['serious','💪','认真'],['fun','😄','有趣'],['share','🤝','乐于分享'],['newbie','❤️','新手友好']];
const IMPK=Object.fromEntries(IMP.map(x=>[x[0],x]));
function impOf(u){if(!u.imp){const t=(u.base&&u.base.kudos)||0,h=hashS(u.id),w=IMP.map((x,i)=>1+((h>>(i*3))&7)),W=w.reduce((a,b)=>a+b,0);u.imp={};IMP.forEach((x,i)=>{const n=Math.round(t*w[i]/W);if(n)u.imp[x[0]]=n})}return u.imp}
function impressionsHTML(u,title){const e=Object.entries(impOf(u)).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3);if(!e.length)return`<div class="imps" data-u="${u.id}" data-t="${title}"></div>`;
  return `<div class="imps" data-u="${u.id}" data-t="${title}"><div class="imps-t">${title}</div><div class="imps-c">${e.map(([k,n])=>`<span>${IMPK[k][1]} ${IMPK[k][2]}<em>${n}</em></span>`).join('')}</div></div>`}
function kudosTarget(uid){return gamesTogether(ME.id,uid).filter(g=>{const end=+new Date(g.starts_at)+g.duration_min*6e4;return end<+NOW&&+NOW-end<14*864e5}).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at))[0]}
function kudosHTML(uid){if(!ME||uid===ME.id||blockedPair(ME.id,uid))return'';const g=kudosTarget(uid);if(!g)return'';const k=ME.id+'|'+uid+'|'+g.id,given=KUDOS.get(k)||[],d=new Date(g.starts_at);
  const when=`${d.getMonth()+1}/${d.getDate()} ${WD[d.getDay()]} · ${venTxt(g.venue_id)}`;
  return `<div class="impg"><div class="impg-t">给 TA 留个印象<small>${esc(when)} 一起打过 · 点一下就送出，再点一下撤回</small></div>
    <div class="impg-c">${IMP.map(x=>`<button data-sx="impPick" data-u="${uid}" data-g="${g.id}" data-v="${x[0]}" class="${given.includes(x[0])?'on':''}">${x[1]} ${x[2]}</button>`).join('')}</div></div>`}

/* ---------- 球友等级：四个隐藏分（参与 · 可信 · 友善 · 贡献）→ 社区分 → Lv1–5。用户只看到等级，看不到分数 ---------- */
const JOURNEY=[{n:'初见',e:'🌱',cs:0,games:0,att:0,d:'欢迎来到社区，一切从这里开始'},
  {n:'相伴',e:'🤝',cs:40,games:3,att:0,kind:50,d:'开始与他人约球、建立连接'},
  {n:'常伴',e:'🌿',cs:60,games:10,att:.9,kind:65,d:'经常参与，是社区里的熟面孔'},
  {n:'挚友',e:'❤️',cs:80,games:30,att:.97,imp:25,kind:78,d:'被大家信任、乐于帮助他人'},
  {n:'南伴之光',e:'✨',cs:90,games:60,att:1,imp:60,kind:88,clean:1,d:'因为你的存在，社区变得更温暖、更值得回来'}];
function journey(u,s){const b=u.base||{},imp=impOf(u),ns=b.noshow||0,late=b.late||0,rep=b.reports||0,done=s.played;
  s.kudos=Object.values(imp).reduce((a,c)=>a+c,0);s.att=done+ns?done/(done+ns):1;s.late=late;s.noshow=ns;
  const cl=x=>Math.max(0,Math.min(100,x));
  const P=cl(22*Math.log(1+done)+4*Math.min(s.streak,8));                                   // 参与：完成的球局、持续每周来
  const T=done<3&&!ns?70:cl(40+60*s.att-15*ns-6*late-30*rep);                               // 可信：赴约率、爽约、临时退出、被核实的举报
  const K=cl(35+90*Math.min(s.kudos/Math.max(done,1),.7)+((imp.newbie||0)>2?5:0)-25*rep);    // 友善：收到的印象、被举报
  const C=cl(12*Math.log(1+s.hosted*2)+8*s.invites+((u.home_club_ids||[]).length?6:0)+(u.last?4:0)); // 贡献：组织球局、带新朋友、完善资料
  s.cs=Math.round(.3*P+.3*T+.25*K+.15*C);s.points=s.cs;
  s.kind=K;let i=0;JOURNEY.forEach((j,k)=>{if(K>=(j.kind||0)&&s.cs>=j.cs&&done>=j.games&&s.att>=j.att&&s.kudos>=(j.imp||0)&&(!j.clean||!rep))i=k});if(ns>=2)i=Math.min(i,2);if(ns>=4)i=Math.min(i,1);s.lv=i;   // 失信会让等级下降s.next=LV[i+1];
  const nx=JOURNEY[i+1];s.hint=!nx?'已是最高等级，谢谢你让这里变得更好':(K<(nx.kind||0)?'对球友多一分友善和耐心':done<nx.games?`再一起打 ${nx.games-done} 场球`:s.att<nx.att||ns>=2?'守约，不放鸽子':'多和球友打球，收获更多好评')+`，就能升到「${nx.n}」`}
function journeyPath(s){return `<div class="jpath">${JOURNEY.map((j,i)=>`<span class="${i<s.lv?'done':i===s.lv?'on':''}"><i></i><small>Lv${i+1}</small>${j.n}</span>`).join('')}</div>`}
function journeyHTML(u,s){const self=ME&&u.id===ME.id,J=JOURNEY[s.lv];
  return `${impressionsHTML(u,self?'大家最喜欢你的地方':'大家最喜欢 TA 的地方')}
    <div class="lvcard"><div class="lvc-h"><span class="lvc-e">${J.e}</span><div><small>球友等级 · Lv${s.lv+1}</small><b>${J.n}</b></div><button class="lvc-info" data-sx="lvinfo">等级说明 ›</button></div><p class="lvc-d">${J.d}</p>${journeyPath(s)}${self?`<div class="lvc-next">${s.hint}</div>`:''}</div>`}
const JOURNEY_RULES='';
const LV_REQ=['刚来到南伴球','完成 3 场球，球友觉得你友善','完成 10 场，赴约率 90% 以上，大家普遍觉得你友善','完成 30 场，赴约率 97% 以上，收到 25 次球友印象，友善度很高','完成 60 场，从不爽约，收到 60 次球友印象，友善度极高，零举报'];
function lvInfoHTML(){const s=ME?stats(ME.id):null;
  return `<div class="lvinfo"><div class="lvi-h">球友等级</div><p class="lvi-p">等级不看球技，也不看谁打得最多。<br><b>每一级都必须先满足「友善」</b>——打得再多，球友不觉得你友善，也不会升级。</p>
    <div class="lvi-list">${JOURNEY.map((j,i)=>`<div class="lvi-row${s&&s.lv===i?' on':''}"><span class="lvi-e">${j.e}</span><div><b>Lv${i+1} ${j.n}${s&&s.lv===i?'<em>你在这里</em>':''}</b><p>${j.d}</p><small>${LV_REQ[i]}</small></div></div>`).join('')}</div>
    <div class="lvi-sec"><b>友善从哪里来</b><p>打完球后，球友给你留下的印象：守时、友善、好搭子、新手友好……收到得越多、越稳定，友善度越高。被核实的辱骂、骚扰会直接扣除。</p></div>
    <div class="lvi-sec"><b>什么会让等级下降</b><p>放鸽子、开打前 24 小时内退出、被核实的辱骂或骚扰。改正之后，等级会慢慢回来。</p></div>
    <div class="lvi-sec"><b>看不到分数</b><p>等级由后台综合计算，不显示分数，也没有排行榜——它只回答一个问题：你是不是一个让人愿意再约的球友。</p></div></div>`}

/* ---------- 发起球局：和「约 TA 打球」同一套控件 ---------- */
/* 球局标签分两组，彼此不重叠：
 *   节奏（单选，选填）：认真比赛 match · 轻松随意 relax（原来的「轻松拉球」「养生局」合并成这一个；不选 = 正常对打）
 *   适合谁（可多选，选填）：新手友好 newbie · 女生局 women
 * 「拉球」本身是玩法（单打 / 双打 / 拉球），不再重复做标签；「开新球」挪到「想对球友说的」里 */
const NG_TAGS=['newbie','women'],PACE=[['match','认真比赛','会计分，希望对手水平接近'],['relax','轻松随意','不计分，拉拉球、动一动就好']];
function normTags(g){const t=new Set(g.tags||[]);if(['casual','easy','drill'].some(k=>t.has(k))){['casual','easy','drill'].forEach(k=>t.delete(k));if(!t.has('match'))t.add('relax')}
  if(t.has('newballs')){t.delete('newballs');if(!noteHas(g.note,'我带新球'))g.note=[...noteParts(g.note),'我带新球'].join('，')}t.delete('booked');g.tags=[...t]}
function ngInit(){const mine=ME.home_club_ids||[],o=firstFree(0)&&dayAt(0,'19:30')>NOW?0:1,t=dayAt(o,'18:00')>NOW?'18:00':firstFree(o);
  NG={o,t,per:perOf(t),dur:90,venue_id:mine[0]||null,search:!mine.length,q:'',type:'singles',miss:3,lv:'near',mn:null,mx:null,tags:new Set(),rep:false,hide:true,note:''};ngLv()}
function ngLv(){const a=UTR_MIN,z=UTR_MAX;
  if(NG.lv==='near'){NG.mn=Math.max(a,ME.ntrp-1);NG.mx=Math.min(z,ME.ntrp+1)}else if(NG.lv==='any'){NG.mn=a;NG.mx=z}}
function ngVenues(){const mine=ME.home_club_ids||[],l=[...mine];if(NG.venue_id&&!l.includes(NG.venue_id))l.push(NG.venue_id);return l}
function ngVenueList(){return vpList('ng',NG)}
function ngVenueListOld(){const q=NG.q.trim().toLowerCase(),shown=ngVenues(),ref=VEN[(ME.home_club_ids||[])[0]]||LOC;
  let vs=Object.values(VEN).filter(v=>!v.custom&&!shown.includes(v.id)&&(!q||(v.name+' '+v.short+' '+v.suburb).toLowerCase().includes(q))).sort((a,b)=>km(ref,a)-km(ref,b)).slice(0,12);
  const exact=q&&Object.values(VEN).some(v=>v.name.toLowerCase()===q||v.short.toLowerCase()===q);
  return vs.map(v=>`<button data-ng="pickVen" data-v="${v.id}">${esc(v.short||v.name)}<small>${surfTxt(v)} · ${km(ref,v).toFixed(1)} km</small></button>`).join('')
    +(q&&!exact?`<button data-ng="customVen">使用「${esc(NG.q.trim())}」<small>自己填写的场地</small></button>`:'')||'<span class="iv-hint">没有找到，换个关键词</span>'}
/* 「想对球友说的」：点一下加上一句最常用、最让人安心的话，再点一次去掉；也可以自己写 */
const NOTE_Q=['场地已订好','我带新球','灯光费 AA','新手也欢迎','会提前 10 分钟到','打完有空一起吃饭'];
const noteParts=n=>String(n||'').split(/[，,；;]\s*/).map(x=>x.trim()).filter(Boolean),noteHas=(n,q)=>noteParts(n).includes(q);
function ngFormHTML(){const f=NG,mine=ME.home_club_ids||[],w=ME.gender==='f';
  const d0=firstFree(0)?0:1,days=Array.from({length:7-d0},(_,k)=>d0+k);
  const P=PERIODS[f.per],slots=[];for(let m=P[1];m<=P[2];m+=30)slots.push(fromMin(m));
  const lvTxt=f.lv==='any'?'不限':`UTR ${f1(f.mn)} – ${f1(f.mx)}`;
  return `<div class="iv ngf">
    <div class="iv-l">哪天</div>
    <div class="iv-days">${days.map(o=>{const d=dayAt(o);return `<button data-ng="day" data-v="${o}" class="${f.o===o?'on':''}"><small>${o===0?'今天':o===1?'明天':WD[d.getDay()]}</small><b>${d.getDate()}</b></button>`}).join('')}</div>
    <div class="iv-l">几点开始</div>
    <div class="iv-tp"><div class="iv-per">${PERIODS.map((p,k)=>`<button data-ng="per" data-v="${k}" class="${f.per===k?'on':''}">${p[0]}${perOf(f.t)===k?'<i></i>':''}</button>`).join('')}</div>
      <div class="iv-slots">${slots.map(t=>`<button data-ng="tm" data-v="${t}" class="${f.t===t?'on':''}" ${dayAt(f.o,t)<=NOW?'disabled':''}>${t}</button>`).join('')}</div></div>
    <div class="iv-l">打多久</div>
    <div class="iv-seg">${DURS.map(m=>`<button data-ng="dur" data-v="${m}" class="${f.dur===m?'on':''}">${durLbl(m)}</button>`).join('')}</div>
    <div class="iv-sum"><b>${esc(dayTxt(f.o))}</b><span>${f.t} – ${fromMin(toMin(f.t)+f.dur)}</span></div>
    <div class="iv-l">在哪打</div>
    <div class="iv-chips">${ngVenues().map(v=>`<button data-ng="ven" data-v="${v}" class="${f.venue_id===v?'on':''}">${esc(venTxt(v))}<small>${VEN[v].pending?'待核实':surfTxt(VEN[v])}</small></button>`).join('')}<button data-ng="more" class="${f.search?'on2':''}">其他场地</button></div>
    ${f.search||f.adding?vpHTML('ng',f):''}
    <div class="iv-l">玩法</div>
    <div class="iv-seg">${['singles','doubles','rally'].map(k=>`<button data-ng="type" data-v="${k}" class="${f.type===k?'on':''}">${TYPE[k]}</button>`).join('')}</div>
    ${f.type==='doubles'?`<div class="iv-l">缺几人</div><div class="iv-seg">${[1,2,3].map(n=>`<button data-ng="miss" data-v="${n}" class="${f.miss===n?'on':''}">缺 ${n} 人</button>`).join('')}</div>
      <div class="seatline">${Array.from({length:4},(_,k)=>k===0?'<i class="me">我</i>':k<=3-f.miss?`<i class="an">${ANON_SVG}</i>`:'<i class="op"></i>').join('')}<span>${f.miss===3?'只有你':`已有 ${4-f.miss} 人`}</span></div>`:''}
    <div class="iv-l">希望球友的水平</div>
    <div class="iv-seg">${[['near','和我相近'],['any','不限'],['custom','自己选']].map(([k,l])=>`<button data-ng="lv" data-v="${k}" class="${f.lv===k?'on':''}">${l}</button>`).join('')}</div>
    ${f.lv==='custom'?`<div class="lvst">${[['mn','最低'],['mx','最高']].map(([k,l])=>`<div><small>${l}</small><button data-ng="${k}" data-v="-" ${f[k]<=UTR_MIN?'disabled':''}>−</button><b>${f1(f[k])}</b><button data-ng="${k}" data-v="+" ${f[k]>=UTR_MAX?'disabled':''}>+</button></div>`).join('<i>–</i>')}</div>`
      :`<div class="iv-lv"><b>${f.lv==='near'?`UTR ${f1(f.mn)} – ${f1(f.mx)}`:'不限水平'}</b><span>${f.lv==='near'?`你是 ${f1(ME.ntrp)}，上下 1 以内`:'任何水平都可以申请'}</span></div>`}
    <div class="iv-l">这局的节奏 <span>选填</span></div>
    <div class="iv-seg">${PACE.map(([k,l])=>`<button data-ng="pace" data-v="${k}" class="${f.tags.has(k)?'on':''}">${l}</button>`).join('')}</div>
    ${PACE.filter(p=>f.tags.has(p[0])).map(p=>`<div class="iv-hint">${p[2]}</div>`).join('')}
    <div class="iv-l">适合 <span>选填</span></div>
    <div class="iv-chips ngtg">${NG_TAGS.filter(k=>k!=='women'||womenOK(ME)).map(k=>`<button data-ng="tag" data-v="${k}" class="${f.tags.has(k)?'on':''}">${TAGS[k][0]}</button>`).join('')}</div>
    ${f.tags.has('women')?'<div class="iv-hint">女生局：只有女生能看到和报名</div>':f.lv==='any'&&f.tags.has('newbie')?'<div class="iv-hint">水平不限，已自动加上「新手友好」</div>':''}
    <div class="iv-l">想对球友说的 <span>选填</span></div>
    <input id="ngNote" class="iv-in" maxlength="80" placeholder="比如：场地已订好，我带新球，灯光费 AA" value="${esc(f.note)}">
    <div class="ntq">${NOTE_Q.map(q=>`<button data-ng="noteQ" data-v="${q}" class="${noteHas(f.note,q)?'on':''}">${noteHas(f.note,q)?'✓ ':'+ '}${q}</button>`).join('')}</div>
    ${ugToggleHTML(f)}<div class="tgl ngrep" data-ng="hide"><span>约满后不再公开<small>人满了或到了开打时间，发现页和分享链接里就看不到这局，只有参加的人能看到</small></span><span class="sw${f.hide?' on':''}"></span></div>
    <div class="tgl ngrep" data-ng="rep"${f.edit?' style="display:none"':''}><span>每周重复<small>每周这个时间自动发布一场。仅你可见，球友看到的是普通球局</small></span><span class="sw${f.rep?' on':''}"></span></div>
    <button class="iv-go" data-ng="publish">${f.edit?'保存修改':'发布'}</button>
    ${f.edit?'':'<div class="iv-foot">发布后可以直接分享到微信群、小红书</div>'}</div>`}
function ngPreview(){const v=VEN[NG.venue_id];if(!v)return'';return ogAHTML({v,start:dayAt(NG.o,NG.t),game_type:NG.type,ntrp_min:NG.mn,ntrp_max:NG.mx,spots:NG.type==='doubles'?NG.miss:1,host:ME})}
function ngKeep(){const n=document.getElementById('ngNote');if(n)NG.note=n.value;const q=document.getElementById('ngQ');if(q)NG.q=q.value;vpKeep('ng',NG)}
function drawCreate(){CREATE_OPEN(ngFormHTML(),ngPreview())}
function ngPublish(){if(NG.edit){geSave();return}ngKeep();const f=NG;if(!f.venue_id){toast('选一个场地吧');return}if(dayAt(f.o,f.t)<=NOW){toast('这个时间已经过了');return}
  const id=api.create({venue_id:f.venue_id,starts_at:dayAt(f.o,f.t).toISOString(),duration_min:f.dur,game_type:f.type,ntrp_min:f.mn,ntrp_max:f.mx,note:f.note.trim().slice(0,60)});
  const g=GAMES.find(x=>x.id===id);g.tags=[...f.tags];g.hide_done=!!f.hide;g.created_at=Date.now();g.join_mode=ugMode(f);if(f.type==='doubles')g.filled=3-f.miss;if(f.rep)makeSeries(id);CREATE_DONE(id,f.o)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-ng]');if(!el||!NG||NG.o==null)return;e.stopPropagation();const a=el.dataset.ng,v=el.dataset.v,f=NG;ngKeep();
  if(vpAct(f,a,el)){drawCreate();if(a==='addVen')setTimeout(()=>{const i=document.getElementById('ngAN');i&&i.focus()},60);return}
  switch(a){
    case'day':f.o=+v;if(dayAt(f.o,f.t)<=NOW){const t=firstFree(f.o);if(t){f.t=t;f.per=perOf(t)}}break;
    case'per':f.per=+v;break;case'tm':f.t=v;break;case'dur':f.dur=+v;break;
    case'ven':f.venue_id=v;break;case'more':f.search=!f.search;f.adding=null;f.q='';break;
    case'pickVen':f.venue_id=v;f.q='';f.search=false;break;
    case'customVen':{const id=customVenue(f.q);if(id){f.venue_id=id;f.q='';f.search=false}break}
    case'type':f.type=v;break;case'miss':f.miss=+v;break;
    case'lv':{const was=f.lv;f.lv=v;if(v==='custom'&&was==='any'){f.mn=Math.max(UTR_MIN,ME.ntrp-1);f.mx=Math.min(UTR_MAX,ME.ntrp+1)}ngLv();if(v==='any')f.tags.add('newbie');break}
    case'mn':f.mn=Math.min(UTR_MAX,Math.max(UTR_MIN,f.mn+(v==='+'?.5:-.5)));if(f.mn>f.mx)f.mx=f.mn;break;
    case'mx':f.mx=Math.min(UTR_MAX,Math.max(UTR_MIN,f.mx+(v==='+'?.5:-.5)));if(f.mx<f.mn)f.mn=f.mx;break;
    case'pace':{const on=f.tags.has(v);PACE.forEach(p=>f.tags.delete(p[0]));if(!on)f.tags.add(v);break}
    case'tag':{if(f.tags.has(v))f.tags.delete(v);else{f.tags.add(v);if(v==='match'){f.tags.delete('casual');f.tags.delete('drill')}if(v==='casual'||v==='drill')f.tags.delete('match')}break}
    case'noteQ':{const ps=noteParts(f.note);f.note=(noteHas(f.note,v)?ps.filter(x=>x!==v):[...ps,v]).join('，').slice(0,80);break}
    case'rep':f.rep=!f.rep;break;case'hide':f.hide=!f.hide;break;case'instant':f.instant=!f.instant;break;
    case'publish':ngPublish();return;
  }drawCreate()},true);
document.addEventListener('input',e=>{if(e.target.id!=='ngQ'||!NG)return;NG.q=e.target.value;const r=document.getElementById('ngRes');if(r)r.innerHTML=ngVenueList()});

/* ---------- UTR ---------- */
const UTR_MIN=1,UTR_MAX=16,UTR_NEWBIE=3;
const UB=[[1,2,'1–2'],[2,3,'2–3'],[3,5,'3–5'],[5,7,'5–7'],[7,16.1,'7+']];
const UTR_EST=[['刚开始学',1.5],['能稳定对拉',3],['会发球、打过比赛',5],['常打比赛',7],['校队 / 高水平',9]];
// 区间真正重叠才算（只碰到边界不算）：3.5–5.0 只算 3–5，不会出现在 5–7 里
const bandHit=c=>[...F.levels].some(i=>{const b=UB[i];return c.ntrp_min<b[1]&&(c.ntrp_max>b[0]||c.ntrp_min>=b[0])});

/* ---------- 场地 ---------- */
const surfTxt=v=>(v.surfaces||[v.surface]).map(k=>SURF[k]).join(' / ');
const courtTxt=v=>[v.courts?`${v.courts} 片场`:'',v.lights?'有夜灯':'',v.indoor?'室内':''].filter(Boolean).join(' · ');

/* ---------- 附近球局太多：每天最多显示最近的 30 局 ---------- */
var LIST_HIDDEN={};const DAY_CAP=30;
function capList(arr){LIST_HIDDEN={};const by={};arr.forEach(c=>{const d=dOff(c.start);(by[d]=by[d]||[]).push(c)});const keep=new Set();
  Object.entries(by).forEach(([d,l])=>{const s=[...l].sort((a,b)=>((b.isHost||b.mine)?1:0)-((a.isHost||a.mine)?1:0)||a.dist-b.dist);s.slice(0,DAY_CAP).forEach(c=>keep.add(c.id));if(l.length>DAY_CAP)LIST_HIDDEN[d]=l.length-DAY_CAP});
  return arr.filter(c=>keep.has(c.id))}

/* ---------- 选球场：搜索 → 候选列表 → 找不到就添加新球场（共用于发起球局、约 TA 打球） ---------- */
const autoShort=n=>String(n||'').replace(/\s+Lawn Tennis Club$/i,' LTC').replace(/\s+Tennis (Club|Centre|Center)$/i,' TC').trim().slice(0,18);
function vpList(a,f,theirs=[]){const q=(f.q||'').trim().toLowerCase(),pool=Object.values(VEN).filter(v=>!v.custom||v.owner===ME.id);
  // 每一行只显示两样：左边球场名，右边所在的区
  const row=v=>`<button class="vp-row${f.venue_id===v.id?' on':''}" data-${a}="pickVen" data-v="${v.id}"><span class="vp-t"><b>${esc(v.short)}</b></span><em>${esc(v.suburb)}</em></button>`;
  const addRow=`<button class="vp-row vp-new" data-${a}="addVen"><span class="vp-t"><b>＋ 添加球场</b></span><em>${q?'没找到':'列表里没有'}</em></button>`;
  if(q){const vs=pool.filter(v=>(v.name+' '+v.short+' '+v.suburb+' '+(v.pc||'')).toLowerCase().includes(q)).sort((x,y)=>(y.short.toLowerCase().startsWith(q))-(x.short.toLowerCase().startsWith(q))||x.short.localeCompare(y.short)).slice(0,8);
    const ps=q.length>=2&&vs.length<3?placeSearch(q,vs):[];
    return vs.map(row).join('')+(ps.length?`<div class="vp-sec">地图上的结果<span>Google 地图</span></div>`+ps.map(p=>`<button class="vp-row vp-map" data-${a}="pickPlace" data-v="${p.pid}"><span class="vp-t"><b>${esc(p.name)}</b></span><em>${esc(p.suburb)}</em></button>`).join(''):vs.length?'':`<div class="vp-none">没有找到「${esc(f.q.trim())}」</div>`)+addRow}
  if(f.letter){const vs=pool.filter(v=>v.short.toUpperCase().startsWith(f.letter)).sort((x,y)=>x.short.localeCompare(y.short));
    return `<button class="vp-back" data-${a}="vpLetter" data-v="">‹ ${f.letter}<span>${vs.length} 个球场</span></button>`+vs.map(row).join('')+addRow}
  // 常用：对方的 Club（约 TA 时）+ 我的 Club + 我最常去的；最近：最近选过的
  const often={};GAMES.forEach(g=>{if(PARTS.some(p=>p.game_id===g.id&&p.user_id===ME.id&&p.status==='approved'))often[g.venue_id]=(often[g.venue_id]||0)+1});
  const common=[...theirs,...(ME.home_club_ids||[]),...Object.entries(often).sort((x,y)=>y[1]-x[1]).map(x=>x[0])].filter((v,i,arr)=>VEN[v]&&arr.indexOf(v)===i).slice(0,5);
  const recent=VPR.recent.filter(v=>VEN[v]&&!common.includes(v)).slice(0,3);
  const letters=[...new Set(pool.map(v=>v.short[0].toUpperCase()))].sort();
  return (common.length?`<div class="vp-sec">常用</div>`+common.map(v=>row(VEN[v])).join(''):'')+(recent.length?`<div class="vp-sec">最近</div>`+recent.map(v=>row(VEN[v])).join(''):'')
    +`<div class="vp-sec">按首字母</div><div class="vp-az">${letters.map(l=>`<button data-${a}="vpLetter" data-v="${l}">${l}</button>`).join('')}</div>`+addRow}
var VPR={recent:[]};
/* 地图搜索：真实环境调用 Google Places Autocomplete（限澳大利亚、偏向当前城市 CITY、只要场所）——
 * 一次输入过程 = 1 个 session（选中后再取一次 Place Details，同属这个 session），每月前 5,000 个 session 免费。
 * 只在本站球场里搜不到、且输入 ≥ 2 个字时才去请求，输入停 300ms 再发；原型用下面的样例数据。 */
const PLACES=[
  {pid:'p_albert',name:'Albert Reserve Tennis Centre',addr:'Albert Rd, Melbourne VIC 3004',suburb:'Melbourne',lat:-37.8395,lng:144.9790},
  {pid:'p_bh',name:'Box Hill City Tennis Club',addr:'Box Hill VIC 3128',suburb:'Box Hill',lat:-37.8170,lng:145.1250},
  {pid:'p_bb',name:'Brighton Beach Tennis Club',addr:'Brighton VIC 3186',suburb:'Brighton',lat:-37.9180,lng:144.9890},
  {pid:'p_ntc',name:'National Tennis Centre',addr:'Olympic Blvd, Melbourne VIC 3000',suburb:'Melbourne',lat:-37.8218,lng:144.9781},
];
const placeSearch=(q,local)=>PLACES.filter(p=>(p.name+' '+p.addr).toLowerCase().includes(q)&&!Object.values(VEN).some(v=>v.place_id===p.pid||v.name.toLowerCase()===p.name.toLowerCase())).slice(0,5);
// 去重：同一个 place_id，或者 150 米内已经有收录的球场 → 直接用已有的
const placeDup=p=>Object.values(VEN).find(v=>v.place_id===p.pid||(!v.custom||v.owner===ME.id)&&km(p,v)<.15);
function vpHTML(a,f){if(f.adding){const d=f.adding;
  return `<div class="vp vp-add"><div class="vp-h"><b>添加新球场</b><button data-${a}="addCancel">取消</button></div>
    ${d.place?`<div class="vp-place"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg><div><b>${esc(d.name)}</b><span>${esc(d.place.addr)}</span></div></div>`:`
    <label>球场全称<input id="${a}AN" class="iv-in" value="${esc(d.name)}" placeholder="例如 Albert Park Tennis Centre" autocomplete="off"></label>`}
    <label>简称 <span>显示在球局里，最多 18 个字符</span><input id="${a}AS" class="iv-in" value="${esc(d.short)}" placeholder="例如 Albert Park TC" maxlength="18" autocomplete="off"></label>
    ${d.place?'':`    <label>所在区域 <span>输入邮编最快，比如 3163</span><input id="${a}AU" class="iv-in" value="${esc(d.suburb)}" placeholder="邮编或区名" autocomplete="off" inputmode="search"></label><div class="au-s" id="${a}AUs">${auSugg(a,d.suburb)}</div>`}
    <div class="vp-l">场地类型 <span>可多选</span></div><div class="iv-chips">${Object.entries(SURF).map(([k,l])=>`<button data-${a}="addSurf" data-v="${k}" class="${d.surf.includes(k)?'on':''}">${l}</button>`).join('')}</div>
    <button class="iv-go" data-${a}="addSave" style="margin-top:14px">添加并选用</button>
    <p class="iv-hint" style="margin-top:8px">核实之前，这个球场只会出现在你自己的球局里</p></div>`}
  return `<div class="vp"><div class="vp-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="${a}Q" placeholder="搜索球场名称或区域" value="${esc(f.q||'')}" autocomplete="off"></div><div class="vp-list" id="${a}Res">${a==='iv'?venueResults():vpList(a,f)}</div></div>`}
function vpKeep(a,f){if(!f.adding)return;const g=id=>{const e=document.getElementById(a+id);return e?e.value:null};const n=g('AN'),sh=g('AS'),u=g('AU');
  if(n!=null){if(f.adding.short===autoShort(f.adding.name)||!f.adding.short)f.adding.short=sh===f.adding.short?autoShort(n):sh;else f.adding.short=sh;f.adding.name=n}if(u!=null)f.adding.suburb=u}
function vpAct(f,act,el){const v=el.dataset.v;
  switch(act){
    case'pickVen':f.venue_id=v;f.q='';f.search=false;f.adding=null;f.letter=null;VPR.recent=[v,...VPR.recent.filter(x=>x!==v)].slice(0,5);return true;
    case'vpLetter':f.letter=v||null;return true;
    case'auPick':{const s=SUBURBS.find(x=>x.name===v);if(s&&f.adding){f.adding.suburb=s.name;f.adding.pc=s.pc}return true}
    case'addVen':f.adding={name:(f.q||'').trim(),short:autoShort((f.q||'').trim()),suburb:'',surf:['hard']};return true;
    case'pickPlace':{const p=PLACES.find(x=>x.pid===v);if(!p)return false;const dup=placeDup(p);
      if(dup){f.venue_id=dup.id;f.q='';f.search=false;f.adding=null;toast(`已收录为「${dup.short}」，直接选用了`);return true}
      f.adding={name:p.name,short:autoShort(p.name),suburb:p.suburb,surf:['hard'],place:p};return true}
    case'addCancel':f.adding=null;return true;
    case'addSurf':{const s=f.adding.surf;f.adding.surf=s.includes(v)?s.filter(x=>x!==v):[...s,v];return true}
    case'addSave':{const d=f.adding,name=d.name.trim(),short=(d.short||autoShort(name)).trim();
      if(name.length<3){toast('填一下球场全称');return false}if(!d.place&&!SUBURBS.some(x=>x.name===(d.suburb||'').trim())){toast('选一下所在区域，输入邮编最快');return false}if(!d.surf.length){toast('选一种场地类型');return false}
      const hit=Object.values(VEN).find(x=>x.name.toLowerCase()===name.toLowerCase()||x.short.toLowerCase()===short.toLowerCase());
      if(hit){f.venue_id=hit.id;f.adding=null;f.search=false;f.q='';toast(`已有「${hit.short}」，直接选用了`);return true}
      const base=VEN[(ME.home_club_ids||[])[0]]||{lat:LOC.lat,lng:LOC.lng},id='c'+(++NID);
      const pl=d.place;VEN[id]={id,name,short,suburb:(pl?pl.suburb:d.suburb.trim())||'—',lat:pl?pl.lat:base.lat,lng:pl?pl.lng:base.lng,place_id:pl?pl.pid:null,surface:d.surf[0],surfaces:[...d.surf],custom:true,pending:true,owner:ME.id};
      f.venue_id=id;f.adding=null;f.search=false;f.q='';toast('已添加，核实后会加入公共球场列表');return true}
  }return false}
document.addEventListener('input',e=>{const id=e.target.id;if(id==='ngAN'||id==='ivAN'){const a=id.slice(0,2),f=a==='ng'?NG:IVF,s=document.getElementById(a+'AS');if(f&&f.adding&&s&&(s.value===''||s.value===f.adding.short)){f.adding.short=autoShort(e.target.value);s.value=f.adding.short}if(f&&f.adding)f.adding.name=e.target.value}});
document.addEventListener('keydown',e=>{if(e.target.id==='ngQ'&&e.key==='Enter'){e.preventDefault();const b=document.querySelector('#ngRes [data-ng]');b&&b.click()}});

/* ---------- UTR 水平筛选：一条双滑块，可以选任意区间 ---------- */
const UR_MAX=13;
const urTxt=(lo,hi)=>lo<=UTR_MIN&&hi>=UR_MAX?'不限':`${f1(lo)} – ${hi>=UR_MAX?'13+':f1(hi)}`;
function utrRangeHTML(){const lo=F.utr?F.utr.lo:UTR_MIN,hi=F.utr?F.utr.hi:UR_MAX,p=x=>(x-UTR_MIN)/(UR_MAX-UTR_MIN)*100;
  return `<div class="urange"><div class="ur-v">UTR <b id="urV">${urTxt(lo,hi)}</b>${F.utr?'<button data-ur="clear">不限</button>':''}</div>
    <div class="ur-track"><i class="ur-fill" id="urFill" style="left:${p(lo)}%;right:${100-p(hi)}%"></i><input type="range" id="urLo" min="${UTR_MIN}" max="${UR_MAX}" step=".5" value="${lo}"><input type="range" id="urHi" min="${UTR_MIN}" max="${UR_MAX}" step=".5" value="${hi}"></div>
    <div class="ur-scale"><span>1</span><span>4</span><span>7</span><span>10</span><span>13+</span></div></div>`}
function urRead(){const a=document.getElementById('urLo'),b=document.getElementById('urHi');if(!a||!b)return null;let lo=+a.value,hi=+b.value;if(lo>hi){if(document.activeElement===a){lo=hi;a.value=lo}else{hi=lo;b.value=hi}}return{lo,hi}}
document.addEventListener('input',e=>{if(e.target.id!=='urLo'&&e.target.id!=='urHi')return;const r=urRead(),p=x=>(x-UTR_MIN)/(UR_MAX-UTR_MIN)*100;document.getElementById('urV').textContent=urTxt(r.lo,r.hi);const fl=document.getElementById('urFill');fl.style.left=p(r.lo)+'%';fl.style.right=(100-p(r.hi))+'%'});
document.addEventListener('change',e=>{if(e.target.id!=='urLo'&&e.target.id!=='urHi')return;const r=urRead();F.utr=r.lo<=UTR_MIN&&r.hi>=UR_MAX?null:r;SX_FILTER_REFRESH()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-ur]');if(!b)return;e.stopPropagation();F.utr=null;SX_FILTER_REFRESH()},true);
const utrHit=c=>!F.utr||(c.ntrp_max>=F.utr.lo&&c.ntrp_min<=(F.utr.hi>=UR_MAX?99:F.utr.hi));
const utrChip=()=>F.utr?`UTR ${urTxt(F.utr.lo,F.utr.hi)}`:'全部水平';

/* ---------- 小红书球票：日期写具体（发布可能不在当天），副券上一个小二维码，扫码直达这局 ---------- */
const xhsDate=d=>`${d.getMonth()+1}月${d.getDate()}日 ${WD[d.getDay()]}`;
function ticketHTML(c){const url=shareURL('https://nanbanqiu.app/g/'+(c.share_code||''),'qr');
  return `<div class="ogT"><div class="t-main"><div class="t-top"><svg><use href="#logo-mark"/></svg><b>南伴球</b><span>${esc(CITY.zh)}网球约球</span></div>
    <div class="t-body"><div class="t-date">${xhsDate(c.start)}</div><div class="t-time">${hm(c.start)}</div><div class="t-place">${esc(c.v.short)}</div>
    <div class="t-meta">${TYPE[c.game_type]}<i></i>UTR ${lvl(c)}</div><div class="t-line"></div><div class="t-need"><em></em>${c.spots>0?`缺 ${c.spots} 位球友`:'已满员'}</div></div></div>
    <div class="t-stub"><div class="t-qr">${qrSVG(url)}</div><b>扫码加入</b></div></div>`}
const xhsText=c=>`🎾 ${CITY.zh}约球 · ${xhsDate(c.start)} ${hm(c.start)}\n📍 ${c.v.name}\n${TYPE[c.game_type]} · UTR ${lvl(c)} · ${c.spots>0?'缺 '+c.spots+' 位':'已满'}\n\n扫图里的二维码就能加入，或打开 ${shareURL('nanbanqiu.app/g/'+c.share_code,'xhs')}\n\n#${CITY.tag} #${CITY.zh}约球 #网球搭子 #南伴球`;

/* ---------- 地图：同一个球场有多局 → 点击后列出这个球场的所有球局 ---------- */
function venueGamesHTML(vid,games){const v=VEN[vid],sameDay=new Set(games.map(c=>dOff(c.start))).size===1;
  return `<div class="vcs"><div class="vcs-h"><b>${esc(v.short)}</b><span>${surfTxt(v)}</span></div><div class="vcs-s">${sameDay?xhsDate(games[0].start)+' · ':''}${games.length} 局</div>
    <div class="vcs-items">${[...games].sort((a,b)=>a.start-b.start).map((c,i,L)=>(!sameDay&&(i===0||dOff(L[i-1].start)!==dOff(c.start))?`<div class="vcs-day">${xhsDate(c.start)}</div>`:'')+VC_ITEM(c)).join('')}</div></div>`}
document.addEventListener('click',e=>{const p=e.target.closest('[data-vc]');if(p){e.stopPropagation();const g=VC_GAMES(p.dataset.vc);if(g.length)VC_OPEN(venueGamesHTML(p.dataset.vc,g),g[0].id);return}
  const r=e.target.closest('[data-vgo],.vcs [data-sel]');if(r){e.stopPropagation();VC_GO(r.dataset.vgo||r.dataset.sel)}},true);

/* ---------- 婉拒：不说「拒绝」，选一句轻松的理由，让对方一笑而过 ---------- */
const SOFTNO=[['full','人已经约满了','手慢了一拍，这局已经凑齐啦'],['friends','这局是熟人局','这局是老球友的固定局，下次一起'],['level','想找水平更接近的','这局水平和你不太对路，帮你找了更合适的'],['next','这次先不了','这次先不了，下次一起打']];
function softNoHTML(g,uid){const u=U(uid);
  return `<div class="softno"><div class="sn-h">婉拒 ${esc(u.name.split(' ')[0])} 的申请</div>
    <input class="sn-note" id="snNote" maxlength="30" placeholder="想对 TA 说一句？（可选）比如：下周六还有一局"><div class="sn-list">${SOFTNO.map(([k,a,b])=>`<button data-sx="softNoGo" data-g="${g}" data-u="${uid}" data-v="${k}"><b>${a}</b><small>TA 会看到：「${b}」</small></button>`).join('')}</div></div>`}
function rejText(n){const p=PARTS.find(p=>p.game_id===n.game_id&&p.user_id===n.user_id),x=SOFTNO.find(x=>p&&x[0]===p.reason);const host=(()=>{const g=GAMES.find(g=>g.id===n.game_id);return g?U(g.host_id):null})();return (x?x[2]:'这局人已经凑齐啦')+(p&&p.note?` · ${host?host.name.split(' ')[0]:'发起人'}：「${p.note}」`:'')}

