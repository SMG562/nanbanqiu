function playerCard(uid){const u=U(uid),s=stats(uid),home=(u.home_club_ids||[])[0],top=bdgTop(s);
  return `<div class="pc th-${u.card_theme||'court'}" data-card="${uid}"><svg class="court" viewBox="0 0 300 430" fill="none" stroke="#fff" stroke-width="2"><rect x="40" y="40" width="220" height="350"/><path d="M40 215h220M70 40v350M230 40v350M70 130h160M70 300h160M150 130v170"/></svg><i class="pc-light"></i><i class="pc-grain"></i>
    <div class="pc-top"><div class="pc-rt"><b>${f1(u.ntrp)}</b><span>UTR</span></div><div class="pc-lv"><b>Lv${s.lv+1}</b><span>${LV[s.lv][1]}</span></div></div>
    <div class="pc-av wdc ${u.avatar_kind==='animal'&&sealOf(u).endsWith('-g')?'glass':''}">${stampSVG(s=>avContent(u,s),u.color,128,String(u.id)+(u.animal||'')+u.color+(u.seal_roll||0),u.avatar_kind==='animal'?sealOf(u):'bw-rd',String(u.id)+(u.animal||''))}</div>
    <div class="pc-name">${esc(cardName(u))}</div><div class="pc-club">${home?clubLabelHTML(VEN[home].name):esc(CITY.zh)+' · 南伴球'}</div>
    <div class="pc-stats"><div><b class="num">${s.played}</b><span>场次</span></div><div><b class="num">${s.hosted}</b><span>组织</span></div><div><b class="num">${s.kudos}</b><span>好评</span></div>
      <div><b class="num">${s.streak}</b><span>连续周</span></div><div><b class="num">${s.clubs}</b><span>CLUB</span></div><div><b class="num">${s.played?Math.round(s.att*100)+'%':'—'}</b><span>赴约率</span></div></div>
    <div class="pc-foot"><span class="pc-no">NO. ${fmtNo(u.no)}</span><span class="bdg">${top.map(b=>`<i title="${b.name}">${b.mini}</i>`).join('')}</span></div><div class="pc-qrw"><div class="t"><b>扫码约我打球</b></div><div class="pc-qr"></div></div></div>`}
function renderMe(){
  if(!ME&&sbaWaiting()){$('#meBody').innerHTML=sbaWaitHTML();return}
  if(!ME){$('#meBody').innerHTML=loginCTA('登录南伴球')+`<div class="group" style="margin-top:18px">${anPrivHTML('li')}</div>`+commHTML();return}
  const s=stats(ME.id),pct=s.next?Math.round((s.points-LV[s.lv][0])/(s.next[0]-LV[s.lv][0])*100):100;
  const freq={};api.mine().filter(c=>c.past&&(c.mine==='approved'||c.isHost)).forEach(c=>freq[c.venue_id]=(freq[c.venue_id]||0)+1);
  const often=Object.entries(freq).filter(([id])=>!myClubIds().includes(id)).sort((a,b)=>b[1]-a[1]).slice(0,2);
  $('#meBody').innerHTML=`<div data-a="myCard" style="cursor:pointer">${playerCard(ME.id)}</div>
  <button class="custbtn" data-a="custom">个性化球员卡</button>
  <div class="lvbox"><div class="t"><b>${JOURNEY[s.lv].e} Lv${s.lv+1} ${LV[s.lv][1]}</b><button class="lvc-info" data-sx="lvinfo">等级说明 ›</button></div>${journeyPath(s)}<p class="jhint">${s.hint}</p>
    <div class="row2" style="margin-top:10px"><button class="sbtn" data-a="myCard"><span style="display:inline-flex;gap:6px;align-items:center">🏅 徽章 ${s.badges.filter(b=>b.got).length}/${s.badges.length}</span></button><button class="sbtn p" data-a="saveCard" data-u="${ME.id}">分享球员卡</button></div></div>
  <div class="sec-t"><span>我的 Club</span><button data-a="editClubs">编辑</button></div>
  <div class="group">${myClubIds().map(id=>{const v=VEN[id];return `<div class="club"><span class="ci"><svg><use href="#i-court"/></svg></span><span class="v"><b>${esc(v.name)}</b><small>${esc(v.suburb)} · ${surfTxt(v)} · ${km(LOC,v).toFixed(1)} km</small></span><span class="pill p-green">Home</span></div>`}).join('')}
    ${often.map(([id,n])=>{const v=VEN[id];return `<div class="club"><span class="ci" style="background:#F0F2F0;color:var(--mut)"><svg><use href="#i-court"/></svg></span><span class="v"><b>${esc(v.name)}</b><small>最近打过 ${n} 次</small></span><button class="pill p-gray" data-a="addClub" data-v="${id}">+ Home</button></div>`}).join('')}
    ${!myClubIds().length&&!often.length?`<button class="club" data-a="editClubs"><span class="ci"><svg><use href="#i-plus"/></svg></span><span class="v"><b>添加我的 Club</b><small>会员 Club 可多选，主 Club 显示在球员卡上</small></span></button>`:''}</div>
  ${partnersHTML()}
  <div class="group" style="margin-top:14px"><button class="li" data-a="sbAlbum"><span class="ico sb"><svg><use href="#i-side"/></svg></span><span class="v">场边相册<small>只有自己看得到</small></span><svg class="ch"><use href="#i-ch"/></svg></button></div>
  <div class="sec-t">设置</div><div class="group">
    <button class="li" data-a="nrSet"><span class="ico" style="background:#E5484D"><svg><use href="#i-bell"/></svg></span><span class="v">提醒方式<small>${PUSH.enabled?'已开启':ENV==='wechat'?'微信内不可用':'未开启'}</small></span>${PUSH.enabled?'<span class="pill p-green">已开启</span>':'<svg class="ch"><use href="#i-ch"/></svg>'}</button>
    ${ENV!=='pwa'?`<button class="li" data-a="${ENV==='wechat'?'wxguide':'a2hs'}"><span class="ico" style="background:var(--g)"><svg><use href="#i-home"/></svg></span><span class="v">添加到主屏幕<small>像 App 一样打开，接收通知</small></span><svg class="ch"><use href="#i-ch"/></svg></button>`:''}
    <button class="li" data-em="settings"><span class="ico" style="background:#3B82F6"><svg><use href="#i-mail"/></svg></span><span class="v">邮件提醒<small>${ME.email?esc(ME.email):'收不到推送时，用邮件告诉你'}</small></span><svg class="ch"><use href="#i-ch"/></svg></button>
    <button class="li" data-sx="gender"><span class="ico" style="background:#C2476B"><svg><use href="#i-user"/></svg></span><span class="v">性别<small>${ME.gender==='f'?'女生':ME.gender==='m'?'男生':'未填写'} · 只用于女生局</small></span><svg class="ch"><use href="#i-ch"/></svg></button>
    ${invSetHTML('li')}<button class="li" data-a="blocklist"><span class="ico" style="background:#667085"><svg><use href="#i-ban"/></svg></span><span class="v">屏蔽名单<small>${ME.blocked.size?ME.blocked.size+' 人':'暂无'}</small></span><svg class="ch"><use href="#i-ch"/></svg></button>${anPrivHTML('li')}${pvExportHTML('li')}
    <button class="li" data-a="community"><span class="ico" style="background:#07C160"><svg><use href="#i-wx"/></svg></span><span class="v">微信约球群<small>球场优惠 · 线下约局</small></span><svg class="ch"><use href="#i-ch"/></svg></button></div>
  <div class="sec-t">帮助</div><div class="group">
    <button class="li" data-a="safety"><span class="ico" style="background:var(--g)"><svg><use href="#i-shield"/></svg></span><span class="v">安全须知</span><svg class="ch"><use href="#i-ch"/></svg></button>
    <button class="li" data-a="contact"><span class="ico" style="background:#2F80ED"><svg><use href="#i-mail"/></svg></span><span class="v">联系我们 / 举报</span><svg class="ch"><use href="#i-ch"/></svg></button>
    <button class="li" data-a="logout"><span class="ico" style="background:#98A2B3"><svg><use href="#i-out"/></svg></span><span class="v">退出登录</span></button></div>
  ${pvLegalHTML()}`;
}

