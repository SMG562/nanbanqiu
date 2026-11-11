function nrToGame(id,uid){if(NR_PLAT==='mobile'){openDetail(id);if(uid)focusApplicant(uid)}else{if(uid){const c=api.get(id);if(c&&c.pend.length>RQ_FOLD+1&&rqSorted(c).findIndex(p=>p.user_id===uid)>=RQ_FOLD)RQ.open[id]=true}$('#pop')&&$('#pop').classList.remove('show');if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}UI.tab='disc';select(id);if(uid&&window.webFocusApplicant)webFocusApplicant(uid)}}
function nrToDay(id){const g=GAMES.find(g=>g.id===id),o=g?dOff(new Date(g.starts_at)):-1;
  if(NR_PLAT==='mobile'){if(UI.detail)closeDetail();if(o>=0&&o<7)UI.day=o;UI.mode='cal';go('disc')}
  else{$('#pop')&&$('#pop').classList.remove('show');if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}UI.tab='disc';UI.sel=null;if(o>=0&&o<7)UI.page=o<=4?0:2;render()}}
function nrOpen(n){if(!n)return;if(!nrTodo(n))n.read=true;const k=n.kind;if(NR_PLAT==='desktop'&&$('#pop'))$('#pop').classList.remove('show');
