/* ============================== 事件 ============================== */
document.addEventListener('click',e=>{
  const t=e.target;
  if(!t.closest('#pop')&&!t.closest('[data-a=notif]'))$('#pop').classList.remove('show');
  if(!t.closest('[data-a=umenu]'))$('#umenu').classList.remove('show');
  if(!t.closest('#demo')&&!t.closest('[data-a=demo]'))$('#demo').classList.remove('show');
  const tab=t.closest('[data-tab]');if(tab){UI.tab=tab.dataset.tab;UI.sel=null;closeModal();if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}render();scrollTo(0,0);return}
  const md=t.closest('[data-mode]');if(md){UI.mode=md.dataset.mode;UI.selVenue=null;render();return}
  const mdy=t.closest('[data-mapday]');if(mdy){UI.mapDay=+mdy.dataset.mapday;UI.sel=null;UI.selVenue=null;render();return}
  const ex=t.closest('[data-exp]');if(ex){const k=ex.dataset.exp;UI.exp.has(k)?UI.exp.delete(k):UI.exp.add(k);render();return}
  const usr=t.closest('[data-user]');if(usr){openCard(usr.dataset.user);return}
  const rad=t.closest('[data-radius]');if(rad){F.radius=+rad.dataset.radius;LOC.asked=true;refreshFilters();return}
  const flv=t.closest('[data-flv]');if(flv){const l=+flv.dataset.flv;F.levels.has(l)?F.levels.delete(l):F.levels.add(l);refreshFilters();return}
  const fty=t.closest('[data-fty]');if(fty){const k=fty.dataset.fty;F.types.has(k)?F.types.delete(k):F.types.add(k);refreshFilters();return}
  const nlv=t.closest('[data-nlv]');if(nlv){NP.ntrp=+nlv.dataset.nlv;NP.redraw();return}
  const avcb=t.closest('[data-avc]');if(avcb&&ME){ME.color=avcb.dataset.avc;openCard(ME.id);render();return}
  const pz=t.closest('[data-akind],[data-an],[data-roll]');if(pz&&ME){const d=pz.dataset;if(d.akind)ME.avatar_kind=d.akind;if(d.an){ME.animal=d.an;ME.avatar_kind='animal'}if(d.roll)ME.seal_roll=(ME.seal_roll||0)+1;openCard(ME.id);render();return}
  const cth=t.closest('[data-cth]');if(cth&&ME){ME.card_theme=cth.dataset.cth;openCard(ME.id);render();return}
  const npc=t.closest('[data-npc]');if(npc){const id=npc.dataset.npc;NP.clubs=NP.clubs.includes(id)?NP.clubs.filter(x=>x!==id):[...NP.clubs,id];npc.classList.toggle('on');return}
  const cm=t.closest('[data-clmain]');if(cm){const id=cm.dataset.clmain;CL=[id,...CL.filter(x=>x!==id)];$('#clList').innerHTML=clubRows();return}
  const cl=t.closest('[data-cl]');if(cl){const id=cl.dataset.cl;CL=CL.includes(id)?CL.filter(x=>x!==id):[...CL,id];$('#clList').innerHTML=clubRows();$('[data-a=saveClubs]').textContent='完成'+(CL.length?`（${CL.length}）`:'');return}
  const q=t.closest('[data-q]');if(q){const a=$('#applyMsg');a.value=a.value.replace(/[。！!]?$/,'，')+q.dataset.q+'。';q.remove();return}
  const nd=t.closest('[data-ngdur]');if(nd){NG.dur=+nd.dataset.ngdur;NG.redraw();return}
  const nt=t.closest('[data-ngtype]');if(nt){NG.type=nt.dataset.ngtype;NG.redraw();return}
  const who=t.closest('[data-who]');if(who){setWho(who.dataset.who);return}
  const dm=t.closest('[data-demo]');if(dm){runDemo(dm.dataset.demo);return}
  const a=t.closest('[data-a]');
  const sl=t.closest('[data-sel]');if(sl&&!a){$('#pop').classList.remove('show');UI.sel===sl.dataset.sel&&!UI.landing&&!sl.closest('#pop')?(UI.sel=null,render()):select(sl.dataset.sel);return}
  if(!a)return;
  const g=a.dataset.g||UI.sel,need=(fn,why)=>{if(ME)return fn();openAuth(fn,why)};
  switch(a.dataset.a){
    case'home':e.preventDefault();UI.landing=null;UI.tab='disc';history.replaceState(null,'','#/');render();break;
    case'closeModal':closeModal();break;
    case'closeDetail':UI.sel=null;UI.selVenue=null;render();break;
    case'vback':UI.sel=null;render();break;
    case'explore':closeModal();UI.landing=null;UI.tab='disc';UI.sel=null;history.replaceState(null,'','#/');render();scrollTo(0,0);break;
    case'prev':UI.page=0;render();break;
    case'next':UI.page=2;render();break;
    case'today':UI.page=0;render();break;
    case'notif':togglePop();break;
    case'umenu':toggleUmenu();break;
    case'readAll':NOTIFS.forEach(n=>{if(ME&&n.user_id===ME.id)n.read=true});renderPop();renderNav();break;
    case'demo':$('#demo').classList.toggle('show');renderDemo();break;
    case'commClose':UI.comm=false;renderComm();break;
    case'commOpen':openCommunity();break;
    case'community':openCommunity();break;
    case'safety':openSafety();break;
    case'contact':openContact();break;
    case'myCard':$('#umenu').classList.remove('show');need(()=>openCard(ME.id),'登录后查看你的球员卡');break;
    case'saveCard':saveCard(a.dataset.u);break;
    case'doSaveCard':doSaveCard(a.dataset.u);break;
    case'copyCard':copy(profileUrl(ME),'球员卡链接已复制');break;
    case'block':openBlock(a.dataset.u);break;
    case'doBlock':api.block(a.dataset.u);closeModal();toast(`已屏蔽 ${U(a.dataset.u).name}`);UI.sel=null;render();break;
    case'unblock':api.unblock(a.dataset.u);toast('已解除屏蔽');closeModal();render();break;
    case'blocklist':$('#umenu').classList.remove('show');openBlocklist();break;
    case'report':location.href=reportMail(a.dataset.u);toast('已打开邮件：safety@nanbanqiu.app');break;
    case'kudos':api.kudos(g);toast('👍 已为同场球友点赞');render();break;
    case'filterModal':openModal(`<div class="m-b" style="padding:12px 0 0">${filtersHTML()}</div>`,'sm');$('#modal .card').style.cssText='border:0;box-shadow:none';bindSub($('#modal'));break;
    case'fReset':F.levels.clear();F.types.clear();F.utr=null;F.tags&&F.tags.clear();F.radius=10;refreshFilters();break;
    case'locAllow':requestLocation();break;
    case'locDismiss':LOC.asked=true;render();break;
    case'login':openAuth(null);break;
    case'sendCode':{const p=$('#ph');if(p){const e=phoneE164($('#cc').value,p.value);if(!e){const k=phoneCountry($('#cc').value);p.style.borderColor='var(--red)';p.focus();toast('请输入'+k.zh+'手机号，如 '+k.hint);return}AUTH.phone=p.value;AUTH.cc=$('#cc').value;AUTH.e164=e}sbaSendThen(openOtp);break}
    case'npDone':{const n=$('#npName').value.trim();if(!n){$('#npErr').textContent='请填写昵称';return}{const bad=NICK_BAD(n);if(bad){$('#npErr').textContent=bad;return}}if(!$('#npAdult')||!$('#npAdult').checked){$('#npErr').textContent=apiErrText('adult_required');return}
      if(NBQ_NET){nbqNpDone(n);break}
      api.login({name:n,last:($('#npLast')&&$('#npLast').value.trim().slice(0,1).toUpperCase())||'',ntrp:NP.ntrp,home_club_ids:[...NP.clubs],gender:NP.gender==='f'||NP.gender==='m'?NP.gender:null,adult_confirmed_at:new Date().toISOString(),terms_version:LEGAL_V.terms,privacy_version:LEGAL_V.privacy});/* = api_consent_accept(true) */sbaSaveProf();NP={ntrp:3.0,clubs:[]};closeModal();toast('账号已创建 · 以后打开链接自动登录');render();const nx=AUTH.next;AUTH.next=null;if(nx)setTimeout(nx,150);break}
    case'apply':need(()=>gateApply(g,()=>openApply(g)),'发送申请前，先用手机号验证一下');break;
    case'doApply':api.apply(g,$('#applyMsg').value.trim());render();openApplied(g);break;
    case'leave':openLeave(g);break;
    case'doLeave':{const was=api.get(g).mine;api.leave(g);closeModal();toast(was==='approved'?'已取消参加':'已撤回申请');render();break}
    case'approve':if(api.decide(a.dataset.g,a.dataset.u,true)!==false)toast(`已接受 ${U(a.dataset.u).name}`);render();if($('#pop').classList.contains('show'))renderPop();break;
    case'reject':api.decide(a.dataset.g,a.dataset.u,false);;render();if($('#pop').classList.contains('show'))renderPop();break;
    case'cancelGame':openCancelGame(g);break;
    case'doCancelGame':api.cancelGame(g);closeModal();toast('球局已取消，已通知球友');render();break;
    case'ics':downloadICS(g);break;
    case'share':openShare(g);break;
    case'copyText':copy(shareText(api.get(g)),'已复制，去微信群粘贴');break;
    case'copyLink':copy(shareURL('https://nanbanqiu.app/g/'+api.get(g).share_code,'link'),'链接已复制');break;
    case'openLanding':UI.landing=api.get(g).share_code;history.replaceState(null,'','#/g/'+UI.landing);render();scrollTo(0,0);break;
    case'enablePush':enablePush();break;
    case'editClubs':openClubs();break;
    case'saveClubs':api.setClubs(CL);closeModal();toast('已更新我的 Club');render();break;
    case'addClub':api.setClubs([...myClubIds(),a.dataset.v]);toast('已加入我的 Club');render();break;
    case'logout':sbaLogout();ME=null;UI.sel=null;$('#umenu').classList.remove('show');toast('已退出登录');render();break;
    case'create':if(UI.landing){UI.landing=null;history.replaceState(null,'','#/');render()}openCreate();break;
  }
});
$('#dim').onclick=()=>{UI.sel=null;UI.selVenue=null;render()};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#mbg').classList.contains('show'))closeModal();else if($('#pop').classList.contains('show'))togglePop(false);else if(UI.sel){UI.sel=null;render()}});
addEventListener('resize',()=>{clearTimeout(window._rz);window._rz=setTimeout(()=>{if(!UI.landing){renderRight();renderComm()}},150)});
addEventListener('hashchange',route);

