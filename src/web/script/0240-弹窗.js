/* ============================== 弹窗 ============================== */
/* 弹层原地重画时保住滚动位置（11-05）：表单里点一个选项就整张重画，原来一律把滚动条打回顶部，往下滚了的人被甩回最上面。
   判断「还是同一屏」：弹层已经开着，并且新旧内容的根元素 class 和标题文字都一样（换到别的屏标题不同，照旧从顶部开始）。 */
const layerSig=el=>{const r=el.querySelector('.m-x')?el.querySelector('.m-x').nextElementSibling:el.firstElementChild;return r?r.className+'|'+((r.querySelector('b,.sh-t,h2,h3')||{}).textContent||''):''};
function openModal(html,size='md'){UI.modalBack=null;const m=$('#modal'),was=$('#mbg').classList.contains('show'),sig0=was?layerSig(m):null,top0=m.scrollTop,dr0=was&&window.nbqDraftsTake?nbqDraftsTake(m):null;m.className='modal '+size;m.innerHTML=`<button class="m-x" data-a="closeModal">×</button>`+html;const same=sig0!==null&&sig0===layerSig(m);m.scrollTop=same?top0:0;if(same&&dr0)nbqDraftsPut(m,dr0);$('#mbg').classList.add('show')}
function closeModal(){if(UI.modalBack){const f=UI.modalBack;UI.modalBack=null;f();return}$('#mbg').classList.remove('show')}
$('#mbg').addEventListener('mousedown',e=>{if(e.target.id==='mbg')closeModal()});

/* 球员卡：自己 → 等级 / 徽章 / 积分规则；他人 → 屏蔽 / 举报 */
function openCard(uid){
  const u=U(uid),s=stats(uid),self=ME&&uid===ME.id;
  if(!self){const blocked=ME&&ME.blocked.has(uid);
    openModal(`<div class="m-b center"><div class="pcwrap">${flipCard(uid)}</div>
      <div class="bdgrid" style="margin:18px 0 6px;grid-template-columns:repeat(6,1fr)">${s.badges.filter(b=>b.got).slice(0,6).map(b=>`<div class="bd" data-bdgd="${b.code}" data-u="${uid}"><div class="hx" style="width:40px;height:44px;font-size:14px">${b.glyph}</div><span>${b.name}</span></div>`).join('')}</div>
      ${impressionsHTML(U(uid),'大家最喜欢 TA 的地方')}${invBtnHTML(uid)}${chatBtnHTML(uid)}${kudosHTML(uid)}${ME?`<div class="row2" style="margin-top:14px"><button class="btn btn-o btn-sm" data-a="${blocked?'unblock':'block'}" data-u="${uid}"><svg><use href="#i-ban"/></svg>${blocked?'解除屏蔽':'屏蔽此人'}</button><button class="btn btn-o btn-sm" data-a="report" data-u="${uid}"><svg><use href="#i-mail"/></svg>举报</button></div>`:''}</div>`,'sm');return}
  const pct=s.next?Math.round((s.points-LV[s.lv][0])/(s.next[0]-LV[s.lv][0])*100):100;
  openModal(`<div class="split card-left"><div class="side">${flipCard(uid)}${cthHTML()}${persHTML()}<div class="row2" style="width:300px"><button class="btn btn-p btn-sm" data-a="saveCard" data-u="${uid}"><svg><use href="#i-share"/></svg>分享球员卡</button></div></div>
    <div class="m-b">${journeyHTML(U(uid),s)}
      <div class="sec-t" style="margin-top:22px">徽章 · ${s.badges.filter(b=>b.got).length}/${s.badges.length}</div>
      <div class="bdgrid">${s.badges.map(b=>`<div class="bd${b.got?'':' lock'}" title="${esc(b.desc)}" data-bdgd="${b.code}" data-u="${uid}"><div class="hx">${b.glyph}</div><b>${b.name}</b><span>${b.got?b.desc:b.val+'/'+b.target}</span>${b.got?'':`<div class="pg"><i style="width:${b.val/b.target*100}%"></i></div>`}</div>`).join('')}</div>
      ${JOURNEY_RULES}</div></div>`,'lg');
}
// 分享图：正面 + 背面（二维码，颜色 = 用户印色），轻微反向旋转
function shareShot(uid){const u=U(uid);const front=playerCard(uid);
  const base=front.slice(0,front.indexOf('<div class="pc-top">')).replace(/<svg class="court"[\s\S]*?<\/svg>/,'');
  const back=base+`<div class="bk"><i class="q" style="color:${u.color}">${qrSVG(profileUrl(u,typeof SC!=='undefined'&&SC.to==='xhs'?'xhs':'moments'))}</i><div class="cta">扫码约我打球</div></div></div>`;
  return `<div class="shot"><div class="bw">${back}</div><div class="fw">${front}</div></div>`}
const SHARE_OPEN=h=>openModal(`<div class="m-b">${h}</div>`,'sm');
