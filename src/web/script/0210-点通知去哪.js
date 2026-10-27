function render(){
  renderComm();
  if(UI.landing){$('#appRoot').hidden=true;$('#landRoot').hidden=false;renderLanding();return}
  $('#appRoot').hidden=false;$('#landRoot').hidden=true;
  document.body.classList.toggle('is-mine',UI.tab==='mine');document.body.classList.toggle('is-disc',UI.tab==='disc');
  $('#layout').classList.toggle('has-detail',!!(UI.sel||UI.selVenue&&UI.mode==='map'&&UI.tab==='disc'));
  renderNav();renderLeft();renderCenter();renderRight();renderDemo();
}
function renderComm(){$('#commPill').classList.toggle('show',!UI.sel)}
function renderNav(){
  $$('#tabs [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===UI.tab));
  const n=ME?NOTIFS.filter(x=>x.user_id===ME.id&&!x.read).length:0;$('#nBadge').hidden=!n;$('#nBadge').textContent=n;{const k=ME?chatUnread():0;$('#cBadge').hidden=!k;$('#cBadge').textContent=k}
  const p=ME?api.mine().filter(c=>!c.past&&c.status!=='cancelled'&&(c.mine==='pending'||(c.isHost&&c.pend.length))).length:0;
  // 右上角只显示头像 + 名字
  $('#meSlot').innerHTML=ME?`<button class="me" data-a="umenu">${av(ME,'sm')}</button>`:`<button class="btn btn-o btn-sm" data-a="login">登录</button>`;
}

/* ---------- 左栏 ---------- */
function filtersHTML(){
  const list=api.list().filter(c=>!c.past&&dOff(c.start)>=UI.page&&dOff(c.start)<UI.page+5);
  return `<div class="card"><div class="fhead"><h3>筛选</h3><button class="btn-link" data-a="fReset">重置</button></div>
  <div class="fsec">
    
    <div>
    <div class="flab">位置</div>
    ${!LOC.asked?`<div class="locprompt">允许使用位置，显示附近球局和距离<div><button class="btn btn-p btn-sm" data-a="locAllow">允许</button><button class="btn btn-o btn-sm" data-a="locDismiss">暂不</button></div></div>`:''}
    <div class="lrow"><div class="sbx"><svg class="sbx-i"><use href="#i-pin"/></svg><input class="inp" id="fSub" value="${esc(LOC.label)}" placeholder="区名、邮编或中文名" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list"><div class="sbx-dd" id="fSubDD" hidden></div></div><button class="sqbtn" data-a="locAllow" title="使用当前位置"><svg><use href="#i-nav"/></svg></button></div>
    <div class="flab" style="margin-top:12px">距离 <b>${F.radius} km 内</b></div>
    <div class="opt eq" style="--n:5">${RADII.map(r=>`<button class="${F.radius===r?'on':''}" data-radius="${r}">${r}</button>`).join('')}</div></div></div>
  <div class="fsec"><div class="flab">UTR</div><div class="opt eq" style="--n:5">${UB.map((b,i)=>`<button class="${F.levels.has(i)?'on':''}" data-flv="${i}">${b[2]}</button>`).join('')}</div></div>
  <div class="fsec"><div class="flab">玩法</div><div class="opt eq">${Object.entries(TYPE).map(([k,v])=>`<button class="${F.types.has(k)?'on':''}" data-fty="${k}">${v}</button>`).join('')}</div></div>
  <div class="fsec">${tagFilterHTML(t=>`<div class="flab">${t}</div>`)}</div>
  <div class="fres"><b>${list.length}</b>局 · ${list.reduce((s,c)=>s+Math.max(0,c.spots),0)} 个空位</div></div>`;
}
