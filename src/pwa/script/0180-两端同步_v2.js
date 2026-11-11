  const _sPop=renderPop;renderPop=function(){_sPop();clearTimeout(renderPop._t);renderPop._t=setTimeout(()=>{if(!ME||!$('#pop').classList.contains('show'))return;NOTIFS.filter(n=>n.user_id===ME.id).forEach(n=>n.read=true);renderNav()},1500)};
  window.webFocusApplicant=function(uid){setTimeout(()=>{const R=$('#colR');if(!R)return;const el=uid?R.querySelector(`.req[data-rqu="${uid}"]`):R.querySelector('.rq-h');if(!el){const h=R.querySelector('.rq-h');h&&h.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(!uid){el.scrollIntoView({behavior:'smooth',block:'start'});return}el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)},250)};
  document.addEventListener('click',e=>{const x=e.target.closest('#pop [data-wn]');if(!x||e.target.closest('button,a,[data-user]'))return;e.stopPropagation();e.preventDefault();
    const id=x.dataset.wn,n=id.startsWith('rg')?null:NOTIFS.find(n=>String(n.id)===id),gid=n?n.game_id:id.slice(2);$('#pop').classList.remove('show');
    if(n){n.read=true}else NOTIFS.filter(q=>q.kind==='request'&&q.game_id===gid).forEach(q=>q.read=true);
    if(n&&(n.kind==='rejected'||n.kind==='expired')){const g=GAMES.find(g=>g.id===gid);if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}UI.tab='disc';UI.sel=null;if(g){const o=dOff(new Date(g.starts_at));if(o>=0&&o<7)UI.page=o<=4?0:2}render();return}
    if(n&&n.kind==='request'){const c=api.get(gid);if(c&&c.pend.length>RQ_FOLD+1){const i=rqSorted(c).findIndex(p=>p.user_id===n.from);if(i>=RQ_FOLD)RQ.open[gid]=true}select(gid);webFocusApplicant(n.from);return}
    select(gid);if(!n)webFocusApplicant(null)},true);
