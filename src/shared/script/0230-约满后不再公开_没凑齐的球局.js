/* ===================== 约满后不再公开 · 没凑齐的球局 =====================
 * 1) 发布时可选「约满后不再公开」（默认打开）：人满了、或者开打时间到了，这局就从发现页、地图、分享链接里消失，
 *    只有发起人和已加入的人还能看到。分享链接打开只显示「这局已经约满了」，不露时间地点和球友。
 * 2) 没凑齐：开打前 2 小时还缺人 → 提醒发起人，给三个最有用的办法：再分享一次 / 放宽水平 / 顺延 1 小时（只能顺延一次，
 *    要先确认场地能续订，已加入的人会收到通知、可以退出）。开打时间到了还没凑齐 → 这局自动结束，提醒发起人一键用同样设置再发一局。 */
function doneHidden(c){if(!c||!c.hide_done)return false;if(ME&&inGame(c,ME.id))return false;return c.status==='full'||c.spots<=0||+new Date(c.starts_at||c.start)+LATE_JOIN<=NOW}
function doneLock(c){if(!doneHidden(c))return'';const ended=+new Date(c.starts_at||c.start)+LATE_JOIN<=NOW;
  return `<div class="wlock dlock"><span class="wl-i">✓</span><b>${ended?'这局已经结束了':'这局已经约满了'}</b><p>发起人设置了约满后不再公开，<br>时间、地点和球友信息不再显示。</p></div>`}
function womenLock(c){return doneLock(c)||womenLock0(c)}
const ufLeft=c=>{const m=Math.max(1,Math.round((c.start-NOW)/6e4));if(m<60)return `${m} 分钟`;const h=Math.floor(m/60),r=Math.round(m%60/5)*5;return r>=60?`${h+1} 小时`:r?`${h} 小时 ${r} 分`:`${h} 小时`};
const ufCan=c=>c.isHost&&c.status!=='cancelled'&&c.status!=='full'&&c.spots>0&&c.visibility!=='private';
function ufKeep(){GAMES.forEach(g=>{if(g.status==='cancelled'||g.status==='full'||g.visibility==='private')return;const t=new Date(g.starts_at)-NOW;if(t>2*36e5||t<-6*36e5)return;
  const hasPend=PARTS.some(p=>p.game_id===g.id&&p.status==='pending');const sp=g.capacity-PARTS.filter(p=>p.game_id===g.id&&p.status==='approved').length-(g.filled||0);if(sp<=0)return;const push=k=>notify(g.host_id,k,g.id,g.host_id);
  if(t>0&&!g.ufRemind){g.ufRemind=true;push('unfilled')}else if(t<=-LATE_JOIN&&!g.ufEnd&&!hasPend){g.ufEnd=true;push('unfilled_end')}})}
const UF_OPEN=h=>typeof openSheet==='function'?openSheet(h):openModal(`<div class="m-b">${h}</div>`,'sm');
const UF_CLOSE=()=>typeof closeSheet==='function'?closeSheet():closeModal();
const UF_RENDER=()=>{render();if(typeof renderDetail==='function'&&UI.detail)renderDetail()};
const ufRow=(k,id,t,s,cls='')=>`<button class="uf-r ${cls}" data-uf="${k}" data-g="${id}"><b>${t}</b><small>${s}</small></button>`;
function openUnfilled(id){const c=api.get(id);if(!c)return;const g=GAMES.find(x=>x.id===id),ended=+c.start+LATE_JOIN<=NOW,n=c.appr.filter(p=>p.user_id!==c.host_id).length;
  if(ended||c.spots<=0||g.status==='cancelled'){
    UF_OPEN(`<div class="uf"><div class="uf-h">${c.spots<=0?'这局已经凑齐了 🎾':g.status==='cancelled'?'这局已取消':'这局没有凑齐'}</div><p class="uf-s">${esc(relDay(c.start))} ${hm(c.start)} · ${esc(c.v.short)} · ${TYPE[c.game_type]}</p>
      <div class="uf-l">${c.spots>0?ufRow('again',id,'用同样的设置再发一局','场地、玩法、水平都帮你填好，选个新时间就行','p'):''}${ufRow('close',id,'知道了',c.spots>0?'这局已经从发现页撤下':'')}</div></div>`);return}
  const wide=c.ntrp_min<=UTR_MIN&&c.ntrp_max>=UTR_MAX,nmn=Math.max(UTR_MIN,c.ntrp_min-1),nmx=Math.min(UTR_MAX,c.ntrp_max+1);
  const ns=new Date(+c.start+36e5),ne=new Date(+c.end+36e5),late=ne.getHours()+ne.getMinutes()/60>23||ne.getHours()<6||ne.getDate()!==ns.getDate();
  UF_OPEN(`<div class="uf"><div class="uf-h">${c.start<=NOW?`还缺 ${c.spots} 位，已开打 · ${hm(new Date(+c.start+LATE_JOIN))} 前别人还能申请`:`还缺 ${c.spots} 位，${ufLeft(c)}后开打`}</div><p class="uf-s">${esc(relDay(c.start))} ${hm(c.start)} · ${esc(c.v.short)} · ${TYPE[c.game_type]}</p>
    <div class="uf-l">${c.start<=NOW?ufRow('closeFull',id,'人齐了，不再接受申请','现场已经凑齐了 / 不想再等'):''}${ufRow('share',id,'再分享一次','发到微信群，附近的球友更容易看到','p')}
      ${wide?'':ufRow('widen',id,'放宽水平要求',`UTR ${f1(c.ntrp_min)}–${f1(c.ntrp_max)} → ${f1(nmn)}–${f1(nmx)}`)}
      ${g.postponed||late||c.start<=NOW?'':ufRow('delay',id,'顺延 1 小时',`改到 ${hm(ns)}–${hm(ne)}${n?` · 已加入的 ${n} 位会收到通知`:''}`)}
      ${ufRow('cancel',id,'取消这局',n?`${n} 位球友会收到通知`:'还没有人加入','d')}</div></div>`)}
function ufCloseConfirm(id){const c=api.get(id),n=c.pend.length;
  UF_OPEN(`<div class="uf"><div class="uf-h">人齐了？</div><p class="uf-s">这局会标为满员，不再接受申请。${n?`还没处理的 ${n} 个申请会结束，对方会收到通知。`:''}</p>
    <div class="uf-l">${ufRow('closeFullGo',id,'确认人齐了','','p')}${ufRow('open',id,'返回','')}</div></div>`)}
function ufDelayConfirm(id){const c=api.get(id),ns=new Date(+c.start+36e5),ne=new Date(+c.end+36e5),n=c.appr.filter(p=>p.user_id!==c.host_id);
  UF_OPEN(`<div class="uf"><div class="uf-h">顺延到 ${hm(ns)}–${hm(ne)}？</div><p class="uf-s">先确认场地 ${hm(c.end)} 之后还能续订。${n.length?`${n.map(p=>esc(U(p.user_id).name.split(' ')[0])).join('、')} 会收到通知，时间不合适可以退出。`:''}只能顺延一次。</p>
    <div class="uf-l">${ufRow('delayGo',id,'确认顺延','','p')}${ufRow('open',id,'返回','')}</div></div>`)}
function ufAgain(id){const g=GAMES.find(x=>x.id===id);UF_CLOSE();if(typeof closeDetail==='function'&&UI.detail)closeDetail();
  setTimeout(()=>{openCreate();const s0=new Date(g.starts_at);s0.setMinutes(s0.getMinutes()<30?0:30);let t=hm(s0);if(perOf(t)<0)t=firstFree(1)||'18:00';Object.assign(NG,{o:1,t,per:perOf(t),dur:g.duration_min,venue_id:g.venue_id,search:false,type:g.game_type,miss:g.game_type==='doubles'?3-(g.filled||0):3,lv:'custom',mn:g.ntrp_min,mx:g.ntrp_max,tags:new Set(g.tags||[]),note:g.note||'',hide:g.hide_done!==false});
    if(dayAt(NG.o,NG.t)<=NOW){const f=firstFree(NG.o);if(f){NG.t=f;NG.per=perOf(f)}}drawCreate()},220)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-uf]');if(!b)return;e.stopPropagation();const k=b.dataset.uf,id=b.dataset.g,g=GAMES.find(x=>x.id===id);
  const pop=document.getElementById('pop');if(pop)pop.classList.remove('show');
  const n=NOTIFS.find(x=>x.game_id===id&&['unfilled','unfilled_end'].includes(x.kind));if(n)n.read=true;
  switch(k){
    case'open':openUnfilled(id);break;
    case'close':UF_CLOSE();UF_RENDER();break;
    case'share':UF_CLOSE();setTimeout(()=>openShare(id),180);break;
    case'widen':if(NBQ_NET){const mn=Math.max(UTR_MIN,g.ntrp_min-1),mx=Math.min(UTR_MAX,g.ntrp_max+1);nbqEdit(id,{utr_min:mn,utr_max:mx}).then(r=>{if(r){UF_CLOSE();toast(`已放宽到 UTR ${f1(mn)}–${f1(mx)}`);UF_RENDER()}});break}
      g.ntrp_min=Math.max(UTR_MIN,g.ntrp_min-1);g.ntrp_max=Math.min(UTR_MAX,g.ntrp_max+1);UF_CLOSE();toast(`已放宽到 UTR ${f1(g.ntrp_min)}–${f1(g.ntrp_max)}`);UF_RENDER();break;
    case'closeFull':ufCloseConfirm(id);break;
    case'closeFullGo':{const c=api.get(id),nf=(g.filled||0)+Math.max(0,c.spots),np=c.pend.length;
      const done=()=>{UF_CLOSE();toast(np?`已标记人齐了，其余 ${np} 个申请已结束`:'已标记人齐了');UF_RENDER()};
      if(NBQ_NET){nbqEdit(id,{filled:nf}).then(r=>{if(r)done()});break}
      g.filled=nf;g.status='full';c.pend.forEach(q=>{q.status='rejected';q.reason='full_auto';notify(q.user_id,'full',id,g.host_id)});done();break}
    case'delay':ufDelayConfirm(id);break;
    case'delayGo':{if(NBQ_NET){nbqPostpone(id).then(r=>{if(r){UF_CLOSE();toast('已顺延 1 小时');UF_RENDER()}});break}
      g.starts_at=new Date(+new Date(g.starts_at)+36e5).toISOString();g.postponed=true;g.ufRemind=false;g.time_set_at=Date.now();
      PARTS.filter(p=>p.game_id===id&&['approved','pending'].includes(p.status)&&p.user_id!==g.host_id).forEach(p=>{if(p.status==='approved')p.chg={lines:[`时间改为 ${hm(new Date(g.starts_at))} 开打（顺延 1 小时）`],ack:false};notify(p.user_id,'postponed',id,g.host_id)});
      UF_CLOSE();toast('已顺延 1 小时');UF_RENDER();break}
    case'cancel':UF_CLOSE();setTimeout(()=>openCancelGame(id),180);break;
    case'again':ufAgain(id);break;
  }},true);
// 发起人在球局详情里看到的提示
function ufHostCard(c){if(!c.isHost)return'';let h='';
  if(ufCan(c)&&c.start>NOW&&c.start-NOW<=3*36e5)h+=`<div class="ufc"><div><b>还缺 ${c.spots} 位 · ${ufLeft(c)}后开打</b><small>${c.postponed?'已顺延 1 小时 · 可以再分享一次，或者放宽水平':'再分享一次、放宽水平，或者顺延 1 小时'}</small></div><button data-uf="open" data-g="${c.id}">看看办法</button></div>`;
  if(ufCan(c)&&c.lateOpen)h+=`<div class="ufc"><div><b>已开打 · 还缺 ${c.spots} 位</b><small>${hm(new Date(+c.start+LATE_JOIN))} 前别人还能申请，申请来了可以直接处理</small></div><button data-uf="closeFull" data-g="${c.id}">人齐了</button></div>`;
  if(c.hide_done)h+=`<div class="ufh">🔒 约满或开打后，这局不再公开，只有参加的人能看到</div>`;return h}

function ufDemo(){const t=new Date(+NOW+80*6e4);t.setMinutes(t.getMinutes()<30?30:60,0,0);const id=api.create({venue_id:'v1',starts_at:t.toISOString(),duration_min:90,game_type:'doubles',ntrp_min:3.5,ntrp_max:5,note:''});
  const g=GAMES.find(x=>x.id===id);g.tags=[];g.filled=1;g.hide_done=true;PARTS.push({game_id:id,user_id:'grace',role:'player',status:'approved',message:'',created_at:Date.now()});housekeep();return id}
