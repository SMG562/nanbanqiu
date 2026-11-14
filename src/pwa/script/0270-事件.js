/* ============================== 事件 ============================== */
DEV.addEventListener('click',e=>{
  const t=e.target;
  const tab=t.closest('[data-tab]');if(tab){go(tab.dataset.tab);if(UI.detail)closeDetail();return}
  const md=t.closest('[data-mode]');if(md){UI.mode=md.dataset.mode;renderDisc();return}
  const dy=t.closest('[data-day]');if(dy){UI.day=+dy.dataset.day;UI.sel=null;UI._scrollNow=UI.day===0;renderDisc();if(UI.day!==0)$('#calView').scrollTop=0;return}
  const ex=t.closest('[data-exp]');if(ex){const k=ex.dataset.exp;UI.exp.has(k)?UI.exp.delete(k):UI.exp.add(k);renderDisc();return}
  const usr=t.closest('[data-user]');if(usr){openCard(usr.dataset.user);return}
  const sel=t.closest('.mcard[data-sel]');if(sel&&!t.closest('[data-open]')){selectGame(sel.dataset.sel,true);return}
  const pn=t.closest('[data-pin]');if(pn){selectGame(pn.dataset.pin,true);return}
  const rad=t.closest('[data-radius]');if(rad){F.radius=+rad.dataset.radius;render();$$('[data-radius]').forEach(b=>b.classList.toggle('on',b===rad));return}
  const sub=t.closest('[data-suburb]');if(sub){const s=SUBURBS.find(x=>x.name===sub.dataset.suburb);sbRemember(s.name);closeSheet();setLoc(s.lat,s.lng,s.name,'manual');return}
  const cen=t.closest('[data-center]');if(cen){const v=VEN[cen.dataset.center];closeSheet();setLoc(v.lat,v.lng,v.short,'club');return}
  const flv=t.closest('[data-flv]');if(flv){const l=+flv.dataset.flv;F.levels.has(l)?F.levels.delete(l):F.levels.add(l);render();UI.redrawFilter();return}
  const fty=t.closest('[data-fty]');if(fty){const k=fty.dataset.fty;F.types.has(k)?F.types.delete(k):F.types.add(k);render();UI.redrawFilter();return}
  const nlv=t.closest('[data-nlv]');if(nlv){NP.ntrp=+nlv.dataset.nlv;NP.redraw();return}
  const avcb=t.closest('[data-avc]');if(avcb&&ME){if(nbqCardBlocked())return;ME.color=avcb.dataset.avc;nbqSaveCard();refreshCard();return}
  const pz=t.closest('[data-akind],[data-an],[data-roll]');if(pz&&ME){if(nbqCardBlocked())return;const d=pz.dataset;if(d.akind)ME.avatar_kind=d.akind;if(d.an){ME.animal=d.an;ME.avatar_kind='animal'}if(d.roll)ME.seal_roll=(ME.seal_roll||0)+1;nbqSaveCard();refreshCard();return}
  const cth=t.closest('[data-cth]');if(cth&&ME){if(nbqCardBlocked())return;ME.card_theme=cth.dataset.cth;nbqSaveCard();refreshCard();return}
  const npc=t.closest('[data-npc]');if(npc){const id=npc.dataset.npc;if(!NP.clubs.includes(id)&&NP.clubs.length>=CLUB_MAX){toast('最多选 '+CLUB_MAX+' 个 Club');return}NP.clubs=NP.clubs.includes(id)?NP.clubs.filter(x=>x!==id):[...NP.clubs,id];npc.classList.toggle('on');return}
  const cm=t.closest('[data-clmain]');if(cm){const id=cm.dataset.clmain;CL=[id,...CL.filter(x=>x!==id)];$('#clList').innerHTML=clubRows();return}
  const cl=t.closest('[data-cl]');if(cl){const id=cl.dataset.cl;if(!CL.includes(id)&&CL.length>=CLUB_MAX){toast('最多选 '+CLUB_MAX+' 个 Club');return}CL=CL.includes(id)?CL.filter(x=>x!==id):[...CL,id];$('#clList').innerHTML=clubRows();$('[data-a=saveClubs]').textContent='完成'+(CL.length?`（${CL.length}）`:'');return}
  const eb=t.closest('[data-eta]');if(eb){APPLY_ETA=+eb.dataset.eta;eb.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===eb));return}
  const q=t.closest('[data-q]');if(q){const a=$('#applyMsg');a.value=a.value.replace(/[。！!]?$/,'，')+q.dataset.q+'。';q.remove();return}
  const nd=t.closest('[data-ngdur]');if(nd){NG.dur=+nd.dataset.ngdur;NG.redraw();return}
  const nt=t.closest('[data-ngtype]');if(nt){NG.type=nt.dataset.ngtype;NG.redraw();return}
  const op=t.closest('[data-open]');if(op&&!t.closest('[data-a]')){openDetail(op.dataset.open);return}
  const a=t.closest('[data-a]');if(!a)return;
  const g=a.dataset.g||UI.detail,need=(fn,why)=>{if(ME)return fn();openAuth(fn,why)};
  switch(a.dataset.a){
    case'back':closeDetail();break;
    case'close':closeSheet();break;
    case'explore':closeSheet();closeDetail();go('disc');break;
    case'filter':openFilter();break;
    case'fReset':F.levels.clear();F.types.clear();F.utr=null;F.tags&&F.tags.clear();F.radius=10;render();UI.redrawFilter();break;
    case'loc':case'locPick':openSuburbPicker();break;
    case'locAllow':requestLocation();break;
    case'commClose':UI.comm=false;render();toast('可在「我的 → 微信约球群」再次找到');break;
    case'community':openCommunity();break;
    case'settings':openSettings();break;
    case'safety':openSafety();break;
    case'contact':openContact();break;
    case'myCard':need(()=>openCard(ME.id));break;
    case'custom':need(openCustom);break;
    case'saveCard':saveCard(a.dataset.u);break;
    case'doSaveCard':doSaveCard(a.dataset.u);break;
    case'block':openBlock(a.dataset.u);break;
    case'doBlock':if(NBQ_NET){nbqBlock(a.dataset.u,true).then(ok=>{if(!ok)return;closeSheet();toast(`已屏蔽 ${U(a.dataset.u).name}`);render()});break}
      api.block(a.dataset.u);closeSheet();toast(`已屏蔽 ${U(a.dataset.u).name}`);render();break;
    case'unblock':if(NBQ_NET){nbqBlock(a.dataset.u,false).then(ok=>{if(!ok)return;closeSheet();toast('已解除屏蔽');render()});break}
      api.unblock(a.dataset.u);closeSheet();toast('已解除屏蔽');render();break;
    case'blocklist':openBlocklist();break;
    case'report':location.href=reportMail(a.dataset.u);toast('已打开邮件：safety@nanbanqiu.app');break;
    case'kudos':api.kudos(g);toast('👍 已为同场球友点赞');render();break;
    case'login':openAuth(null);break;
    case'sendCode':{const p=$('#ph');if(p){const e=phoneE164($('#cc').value,p.value);if(!e){const k=phoneCountry($('#cc').value);p.focus();p.style.borderColor='var(--red)';toast('请输入'+k.zh+'手机号，如 '+k.hint);return}AUTH.phone=p.value;AUTH.cc=$('#cc').value;AUTH.e164=e}sbaSendThen(openOtp);break}
    case'npDone':{const n=$('#npName').value.trim();if(!n){$('#npErr').textContent='请填写昵称';return}{const bad=NICK_BAD(n);if(bad){$('#npErr').textContent=bad;return}}if(!$('#npAdult')||!$('#npAdult').checked){$('#npErr').textContent=apiErrText('adult_required');return}
      if(NBQ_NET){nbqNpDone(n);break}
      api.login({name:n,last:($('#npLast')&&$('#npLast').value.trim().slice(0,1).toUpperCase())||'',ntrp:NP.ntrp,home_club_ids:[...NP.clubs],gender:NP.gender==='f'||NP.gender==='m'?NP.gender:null,adult_confirmed_at:new Date().toISOString(),terms_version:LEGAL_V.terms,privacy_version:LEGAL_V.privacy});/* = api_consent_accept(true) */sbaSaveProf();toast('账号已创建 · 以后打开链接自动登录');const nx=AUTH.next;AUTH.next=null;NP={ntrp:3.0,clubs:[]};closeSheet();render();if(nx)setTimeout(nx,380);break}
    case'apply':need(()=>gateApply(g,()=>openApply(g)),'发送申请前，先用手机号验证一下');break;
    case'doApply':{if(api.get(g).start<=NOW&&!APPLY_ETA){toast('选一下大概多久能到');break}
      if(NBQ_NET){nbqApplyReq(g,$('#applyMsg').value.trim(),APPLY_ETA).then(d=>{if(d){render();openApplied(g)}});break}api.apply(g,$('#applyMsg').value.trim(),APPLY_ETA);render();openApplied(g);break}
    case'leave':openLeave(g);break;
    case'doLeave':{const was=api.get(g).mine;if(NBQ_NET){nbqLeave(g).then(d=>{if(d){closeSheet();toast(was==='approved'?'已取消参加':'已撤回申请');render()}});break}api.leave(g);closeSheet();toast(was==='approved'?'已取消参加':'已撤回申请');render();break}
    case'approve':if(NBQ_NET){const nm=U(a.dataset.u).name;nbqApprove(a.dataset.g,a.dataset.u).then(d=>{if(d)toast(`已接受 ${nm}`);render()});break}if(api.decide(a.dataset.g,a.dataset.u,true)!==false)toast(`已接受 ${U(a.dataset.u).name}`);render();break;
    case'reject':if(NBQ_NET){nbqDecline(a.dataset.g,a.dataset.u,'pass').then(()=>render());break}api.decide(a.dataset.g,a.dataset.u,false);;render();break;
    case'cancelGame':openCancelGame(g);break;
    case'doCancelGame':if(NBQ_NET){nbqCancel(g).then(d=>{if(d){closeSheet();toast('球局已取消，已通知球友');render()}});break}api.cancelGame(g);closeSheet();toast('球局已取消，已通知球友');render();break;
    case'ics':downloadICS(g);break;
    case'share':openShare(g);break;
    case'poster':openPoster(g);break;
    case'wxShare':wxShare(g);break;
    case'copyText':copy(shareText(api.get(g)),'已复制，去微信群粘贴');break;
    case'copyLink':copy(shareURL('https://nanbanqiu.app/g/'+api.get(g).share_code,'link'),'链接已复制');break;
    case'sysShare':{const c=api.get(g);if(navigator.share)navigator.share({title:ogTitle(c),text:shareText(c),url:shareURL('https://nanbanqiu.app/g/'+c.share_code,'sys')}).catch(()=>{});else copy(shareText(c),'已复制分享文案');break}
    case'editClubs':openClubs();break;
    case'rkSlot':case'rkSwap':case'rkBrand':case'rkOther':case'rkBack':case'rkSeries':case'rkSave':case'rkMain':case'rkDel':rkAct(a);break;   // 我的球拍（0498）
    case'utOpen':case'utMode':case'utEst':case'utSave':utAct(a);break;   // 我的 UTR（0499）
    case'saveClubs':(async()=>{if(NBQ_NET){if(await nbqSetClubs(CL)===null)return}else api.setClubs(CL);closeSheet();toast('已更新我的 Club');render()})();break;
    case'addClub':(async()=>{const ids=[...myClubIds(),a.dataset.v];if(ids.length>CLUB_MAX){toast('最多选 '+CLUB_MAX+' 个 Club，请先在「编辑」里去掉一个');return}if(NBQ_NET){if(await nbqSetClubs(ids)===null)return}else api.setClubs(ids);toast('已加入我的 Club');render()})();break;
    case'enablePush':enablePush();break;
    case'pushDenied':openPushDenied();break;
    case'pushRecheck':pushRecheck();break;
    case'authAnyway':authAnyway();break;
    case'wxguide':closeSheet();openWxGuide();break;
    case'wxclose':$('#wxg').hidden=true;break;
    case'a2hs':openA2HS();break;
    case'a2hsDone':a2hsPut('nbq_a2hs_ok',String(Date.now()));closeSheet();toast('好的，以后从桌面的南伴球图标打开');render();break;
    case'a2hsGo':if(A2HS_EV){const ev=A2HS_EV;ev.prompt();ev.userChoice.then(r=>{A2HS_EV=null;closeSheet();if(r&&r.outcome==='accepted')toast('已添加到主屏幕')},()=>{})}break;
    case'a2hsLink':copy(location.href.split('#')[0],'链接已复制，到 Safari 粘贴打开');break;
    case'logout':sbaLogout();ME=null;toast('已退出登录');render();break;
    case'create':closeDetail();openCreate();break;
  }
});
function copy(t,m){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(m),()=>toast(m))}
function downloadICS(id){const c=api.get(id),f=d=>d.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//nanbanqiu//CN','BEGIN:VEVENT',`UID:${c.id}@nanbanqiu.app`,`DTSTAMP:${f(new Date())}`,`DTSTART:${f(c.start)}`,`DTEND:${f(c.end)}`,`SUMMARY:🎾 ${TYPE[c.game_type]} · ${c.v.short}`,`LOCATION:${c.v.name}\\, ${c.v.suburb} VIC`,`URL:https://nanbanqiu.app/g/${c.share_code}`,'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:2 小时后打球','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download=`nanbanqiu-${c.share_code}.ics`;a.click();toast('已加入日历（提前 2 小时提醒）')}

