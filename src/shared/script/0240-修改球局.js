/* ===================== 修改球局 =====================
 * 保留「修改」，不用「取消再发」：取消重发会让已加入的人掉队、待审核的申请作废、微信群里的链接失效，发起人还背一次取消记录。
 * 按影响分两类：
 *   · 小改（水平、标签、备注、缺几人、公开设置）：直接保存，不打扰任何人
 *   · 大改（时间、时长、地点、玩法）：保存前列出改了什么、会通知谁；已加入的人收到通知，在球局页确认「还能来」或「来不了」，
 *     来不了直接退出，不算临时退出、不影响赴约率；待审核的申请保留，也会收到通知
 * 开打后不能改；已加入的人数超过新玩法的人数时不能改玩法。 */
function geOpen(id){const c=api.get(id);if(!c||!c.isHost||c.start<=NOW)return;
  if(typeof UI!=='undefined'&&UI.detail&&typeof closeSheet==='function')closeSheet();
  openCreate();const t=hm(c.start),o=dOff(c.start);
  Object.assign(NG,{edit:id,o,t,per:perOf(t),dur:c.duration_min,venue_id:c.venue_id,search:false,adding:null,q:'',type:c.game_type,miss:c.game_type==='doubles'?Math.max(1,c.spots):3,
    lv:'custom',mn:c.ntrp_min,mx:c.ntrp_max,tags:new Set(c.tags||[]),note:c.note||'',hide:!!c.hide_done,instant:c.join_mode==='instant',rep:false});drawCreate()}
const geWhen=(st,dur)=>`${relDay(st)} ${hm(st)}–${hm(new Date(+st+dur*6e4))}`;
function geDiff(c,f){const ns=dayAt(f.o,f.t),key=[],lite=[];
  if(+ns!==+c.start||f.dur!==c.duration_min)key.push(['时间',geWhen(c.start,c.duration_min),geWhen(ns,f.dur)]);
  if(f.venue_id!==c.venue_id)key.push(['地点',c.v.short,VEN[f.venue_id].short]);
  if(f.type!==c.game_type)key.push(['玩法',TYPE[c.game_type],TYPE[f.type]]);
  if(f.mn!==c.ntrp_min||f.mx!==c.ntrp_max)lite.push('水平');
  if([...f.tags].sort().join()!==[...(c.tags||[])].sort().join())lite.push('标签');
  if(f.note.trim()!==(c.note||''))lite.push('备注');
  if(!!f.hide!==!!c.hide_done)lite.push('公开设置');if(ugMode(f)!==(c.join_mode||'approve'))lite.push('加入方式');
  if(f.type==='doubles'&&c.game_type==='doubles'&&f.miss!==c.spots)lite.push('缺几人');
  return {key,lite,ns}}
function geSave(){ngKeep();const f=NG,c=api.get(f.edit);if(!c)return;
  if(!f.venue_id){toast('选一个场地吧');return}if(dayAt(f.o,f.t)<=NOW){toast('这个时间已经过了');return}
  const others=c.appr.filter(p=>p.user_id!==c.host_id).length+(c.filled||0);
  if(f.type!==c.game_type&&others+1>CAP[f.type]){toast(`已经有 ${others+1} 人，不能改成${TYPE[f.type]}`);return}
  if(f.type==='doubles'&&f.miss>CAP.doubles-1-others){f.miss=CAP.doubles-1-others}
  const d=geDiff(c,f);if(!d.key.length&&!d.lite.length){toast('没有改动');return}
  const aff=c.appr.filter(p=>p.user_id!==c.host_id),pend=c.pend;
  if(!d.key.length||!aff.length&&!pend.length){geApply(c,f,d);return}
  const names=aff.map(p=>esc(U(p.user_id).name.split(' ')[0])).join('、');
  UF_OPEN(`<div class="uf ge"><div class="uf-h">保存修改？</div>
    <div class="ge-d">${d.key.map(x=>`<div><span>${x[0]}</span><s>${esc(x[1])}</s><b>${esc(x[2])}</b></div>`).join('')}</div>
    <p class="uf-s" style="margin:12px 0 14px">${aff.length?`${names} 会收到通知，可以确认还能来，或者直接退出（不算临时退出）。`:''}${pend.length?`${pend.length} 个待审核的申请会保留，也会收到通知。`:''}</p>
    <div class="uf-l"><button class="uf-r p" data-ge="go"><b>保存并通知</b></button><button class="uf-r" data-ge="back"><b>返回修改</b></button></div></div>`)}
function geApply(c,f,d){const g=GAMES.find(x=>x.id===c.id),lines=d.key.map(x=>`${x[0]}改为 ${x[2]}`);
  g.starts_at=d.ns.toISOString();g.duration_min=f.dur;g.venue_id=f.venue_id;
  if(f.type!==g.game_type){g.game_type=f.type;g.capacity=CAP[f.type]}
  if(g.game_type==='doubles'){const ap=PARTS.filter(p=>p.game_id===g.id&&p.status==='approved').length;g.filled=Math.max(0,CAP.doubles-ap-f.miss)}else g.filled=0;
  g.ntrp_min=f.mn;g.ntrp_max=f.mx;g.tags=[...f.tags];g.note=f.note.trim().slice(0,60);g.hide_done=!!f.hide;
  if(d.key.some(x=>x[0]==='时间')){g.ufRemind=false;g.ufEnd=false;g.time_set_at=Date.now()}g.join_mode=ugMode(f);
  const sp=V(g).spots;g.status=sp<=0?'full':'open';
  let n=0;if(d.key.length)PARTS.filter(p=>p.game_id===g.id&&p.user_id!==g.host_id&&['approved','pending'].includes(p.status)).forEach(p=>{if(p.status==='approved'){p.chg={lines,ack:false};n++}
    NR_EXTRA={lines};notify(p.user_id,'changed',g.id,g.host_id);NR_EXTRA=null});
  const id=g.id;NG.edit=null;
  if(typeof closeSheet==='function'){closeSheet();if(UI.detail===id)renderDetail();else openDetail(id);render()}else{closeModal();select(id)}
  toast(d.key.length&&n?`已保存，已通知 ${n} 位球友`:'已保存')}
// 已加入的人：球局页顶部看到改动，确认还能来 / 来不了
function geBanner(c){const p=c.mineP;if(!p||p.status!=='approved'||!p.chg||p.chg.ack||c.start<=NOW)return'';
  return `<div class="ge-b"><b>${esc(c.host.name.split(' ')[0])} 修改了球局</b><p>${p.chg.lines.map(esc).join('<br>')}</p><div><button data-ge="ok" data-g="${c.id}">还能来</button><button data-ge="out" data-g="${c.id}">来不了</button></div></div>`}
function passHTML(c){return geBanner(c)+passHTML0(c)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ge]');if(!b)return;e.stopPropagation();const k=b.dataset.ge,id=b.dataset.g;
  const re=()=>{render();if(typeof renderDetail==='function'&&UI.detail)renderDetail()};
  if(k==='edit'){geOpen(id||UI.detail||UI.sel);return}
  if(k==='back'){drawCreate();return}
  if(k==='go'){const f=NG,c=api.get(f.edit);geApply(c,f,geDiff(c,f));return}
  const g=GAMES.find(x=>x.id===id),p=PARTS.find(x=>x.game_id===id&&x.user_id===ME.id);if(!g||!p)return;
  if(k==='ok'){p.chg.ack=true;toast('好的，球场见 🎾');re()}
  if(k==='out'){p.status='left';p.left_at=Date.now();g.status='open';notify(g.host_id,'player_left',id,ME.id);toast('已退出，不算临时退出');re()}},true);

