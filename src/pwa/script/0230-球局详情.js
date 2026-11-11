/* ============================== 球局详情 ============================== */
function openDetail(id,landing=false){UI.detail=id;UI.landing=landing;renderDetail();$('#detail').classList.add('show');$('#dBody').scrollTop=0;closeSheet()}
function closeDetail(){$('#detail').classList.remove('show');UI.detail=null;UI.landing=false;render()}
function passHTML0(c){const st=stateOf(c);
  const BAND={approved:['band-green','i-check',c.spots<=0?'你已加入 · 人齐了':'你已加入'],pending:['band-amber',null,`等待 ${c.host.name} 确认`],
    host:['band-host','i-host',c.pend.length?`你发起的 · ${c.pend.length} 个申请待确认`:c.spots>0?'你发起的球局':'你发起的 · 人齐了'],
    full:['band-gray',null,'已满员 · 这局已经找到球友'],rejected:['band-gray',null,'这局没排上 · 看看附近其他球局吧'],cancelled:['band-red',null,'球局已取消'],past:['band-gray',null,'已结束'],held:['band-amber',null,'为你保留了位置 · 确认一下这周来不来'],invited:['band-amber',null,`${c.host.name} 约你打这局双打`]}[st];
  const people=seatsHTML(c,st);
  return `<div class="pass">${BAND?`<div class="pass-band ${BAND[0]}">${BAND[1]?`<svg><use href="#${BAND[1]}"/></svg>`:''}${esc(BAND[2])}</div>`:''}
    <div class="pass-main"><div class="pass-day">${dateLine(c.start)}</div><div class="pass-time num"><b>${hm(c.start)}</b><span>– ${hm(c.end)}</span>${lt(c.start)}</div>
      <a class="pass-place" href="https://maps.google.com/?q=${encodeURIComponent(c.v.name+' '+c.v.suburb+' VIC')}" target="_blank" rel="noopener"><span class="pi"><svg><use href="#i-pin"/></svg></span><span><b>${esc(c.v.name)}</b><small>${esc(c.v.suburb)} · ${c.dist.toFixed(1)} km</small></span><svg class="go" width="16" height="16"><use href="#i-ch"/></svg></a>
      <div class="pass-meta"><div><small>玩法</small><b>${TYPE[c.game_type]}</b></div><div><small>水平</small><b>${lvl(c)}</b></div><div><small>场地</small><b>${surfTxt(c.v)}</b></div></div>
      ${gxHTML(c)}${c.note?`<div class="note">${esc(c.note)}</div>`:''}</div>
    ${privHTML(c)}
    <div class="pass-people"><div class="pp-h"><b>球友</b><span>${c.spots>0&&!['cancelled','past'].includes(st)?`还缺 ${c.spots} 位`:`${c.appr.length} 人`}</span></div><div class="people">${people}</div></div></div>`}
function renderDetail(){
  const c=api.get(UI.detail),st=stateOf(c),blocked=ME&&blockedPair(ME.id,c.host_id);
  $('#dNav').innerHTML=UI.landing?`<div class="nb-brand"><svg><use href="#logo"/></svg>南伴球</div><button class="navbtn" data-a="share"><svg><use href="#i-share"/></svg></button>`
    :`<button class="navbtn" data-a="back"><svg><use href="#i-back"/></svg></button><button class="navbtn" data-a="share"><svg><use href="#i-share"/></svg></button>`;
  if(blocked){$('#dBody').innerHTML=`<div class="empty" style="padding-top:80px"><b>这个球局暂时无法查看</b></div>`;$('#dAct').innerHTML=`<button class="btn btn-p" data-a="explore">看看其他球局</button>`;$('#dAct').hidden=false;return}
  let b=womenLock(c)||passHTML(c);
  if(!womenLock(c))b+=requestsHTML(c);
  if(UI.landing)b+=`<div class="cap" style="margin-top:22px">南伴球 · ${esc(CITY.zh)}网球约局 · <b style="color:var(--g)" data-a="explore">附近更多球局 ›</b></div>`;
  $('#dBody').innerHTML=b;
  const nav=`https://maps.google.com/?daddr=${encodeURIComponent(c.v.name+' VIC')}`,safe=`<div class="safe"><svg width="14" height="14" style="color:var(--g)"><use href="#i-shield"/></svg>见面前，看看<b data-pact="1">球友约定</b>和<b data-a="safety">安全须知</b></div>`;
  $('#dAct').innerHTML={
    open:`${lateNote(c)}<button class="btn btn-p" data-a="apply">申请加入</button><div class="cap">${ME?`${esc(c.host.name)} 确认后${NOTIFY_WHERE()}`:'无需下载 · 手机号 30 秒完成'}</div>`,
    pending:`<button class="btn btn-s" data-a="leave">撤回申请</button>${safe}`,
    approved:`<div class="row2"><button class="btn btn-s" data-a="ics"><svg><use href="#i-cal"/></svg>加入日历</button><a class="btn btn-p" href="${nav}" target="_blank" rel="noopener"><svg><use href="#i-dir"/></svg>导航</a></div><button class="btn btn-link red" data-a="leave">取消参加</button>${safe}`,
    host:`<button class="btn btn-p" data-a="share"><svg><use href="#i-wx"/></svg>分享到微信群</button><div class="hostlinks">${c.start>NOW?`<button class="btn btn-link" data-ge="edit" data-g="${c.id}">修改球局</button><i></i>`:''}<button class="btn btn-link red" data-a="cancelGame">取消球局</button></div>`,
    full:`<button class="btn btn-p" data-a="explore">看看附近其他球局</button><button class="btn btn-link" data-a="create">自己发起一局</button>`,
    rejected:`<button class="btn btn-p" data-a="explore">看看附近其他球局</button>`,cancelled:`<button class="btn btn-p" data-a="explore">看看附近其他球局</button>`,
    past:(c.mine==='approved'||c.isHost)&&c.appr.length>1?'':''}[st];
  {const x=xActs(c,st);if(x!=null)$('#dAct').innerHTML=x}if(ME){$('#dAct').insertAdjacentHTML('afterbegin',chatGameBtn(c,st));$('#dAct').insertAdjacentHTML('beforeend',hostExtras(c,st))}
  $('#dAct').hidden=!$('#dAct').innerHTML;
}

