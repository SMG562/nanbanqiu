/* ============================== Sheets ============================== */
/* 弹层原地重画时保住滚动位置（11-05）：表单里点一个选项就整张重画，原来一律把滚动条打回顶部，往下滚了的人被甩回最上面。
   判断「还是同一屏」：弹层已经开着，并且新旧内容的根元素 class 和标题文字都一样（换到别的屏标题不同，照旧从顶部开始）。 */
const layerSig=el=>{const r=el.querySelector('.grab')?el.querySelector('.grab').nextElementSibling:el.firstElementChild;return r?r.className+'|'+((r.querySelector('b,.sh-t,h2,h3')||{}).textContent||''):''};
function openSheet(html,tall=false,dark=false){UI.sheetBack=null;const s=$('#sheet'),was=s.classList.contains('show'),sig0=was?layerSig(s):null,top0=s.scrollTop;s.innerHTML='<div class="grab"></div>'+html;s.classList.toggle('tall',tall);s.classList.toggle('dark',dark);s.scrollTop=sig0!==null&&sig0===layerSig(s)?top0:0;$('#sbg').classList.add('show');requestAnimationFrame(()=>s.classList.add('show'))}
function closeSheet(){if(UI.sheetBack){const f=UI.sheetBack;UI.sheetBack=null;f();return}$('#sheet').classList.remove('show');$('#sbg').classList.remove('show')}
$('#sbg').onclick=closeSheet;
/* 弹层手势（11-03）：顶部留白可点收起；把手 / 弹层顶部（内容已在最上面）往下拖，松手时拖过 ~110px 或甩得够快就收起，否则弹回；
   输入框、横向滑动不接管；弹层内容没滚到顶时不抢滚动。收起走 closeSheet()（弹层里有「返回上一层」时先返回，和点遮罩一致）。Esc 也能收起。 */
(function(){const s=$('#sheet'),bg=$('#sbg');let g=null;
  const shown=()=>s.classList.contains('show');
  const settle=()=>{s.classList.remove('drag');s.style.transform='';bg.style.transition='';bg.style.opacity=''};
  s.addEventListener('touchstart',e=>{if(!shown()||e.touches.length!==1){g=null;return}
    const t=e.touches[0],top=s.getBoundingClientRect().top;
    g={y:t.clientY,x:t.clientX,at:Date.now(),scrolled:s.scrollTop>0,grab:t.clientY-top<40,skip:!!e.target.closest('input,textarea,select,[contenteditable="true"],[data-nodrag]'),drag:false,dy:0}},{passive:true});
  s.addEventListener('touchmove',e=>{if(!g||g.skip||e.touches.length!==1)return;const t=e.touches[0],dy=t.clientY-g.y,dx=t.clientX-g.x;
    if(!g.drag){if(Math.abs(dx)>Math.abs(dy)){g=null;return}                      // 横着滑：不管
      if(dy>8&&!g.scrolled&&(s.scrollTop<=0||g.grab)){g.drag=true;g.y=t.clientY;s.classList.add('drag');bg.style.transition='none'}else return}
    e.preventDefault();g.dy=Math.max(0,t.clientY-g.y);
    s.style.transform=`translateY(${g.dy}px)`;bg.style.opacity=String(Math.max(.15,1-g.dy/Math.max(240,s.offsetHeight)))},{passive:false});
  const end=()=>{if(!g)return;const d=g;g=null;if(!d.drag)return;
    const v=d.dy/Math.max(1,Date.now()-d.at);                                       // px/ms
    const close=d.dy>110||(v>.5&&d.dy>40);
    settle();if(close)closeSheet()};                                                // 清掉内联样式的同时改 class：动画从当前位置继续
  s.addEventListener('touchend',end,{passive:true});s.addEventListener('touchcancel',end,{passive:true});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&shown())closeSheet()})})();

/* 球员卡：他人 → 屏蔽 / 举报；自己 → 等级 / 徽章 / 规则 / 保存 */
function openCard(uid){const u=U(uid),s=stats(uid),self=ME&&uid===ME.id;
  if(!self){const blocked=ME&&ME.blocked.has(uid);
    openSheet(`${flipCard(uid)}<div class="bdgrid" style="margin:18px 0 4px;grid-template-columns:repeat(6,1fr)">${s.badges.filter(b=>b.got).slice(0,6).map(b=>`<div class="bd" data-bdgd="${b.code}" data-u="${uid}"><div class="hx" style="width:40px;height:44px;font-size:14px">${b.glyph}</div><span style="color:#9BA79F">${b.name}</span></div>`).join('')}</div>
    ${impressionsHTML(U(uid),'大家最喜欢 TA 的地方')}${invBtnHTML(uid)}${chatBtnHTML(uid)}${kudosHTML(uid)}${ME?`<div class="row2" style="margin-top:14px"><button class="btn btn-mini" style="background:#232B26;color:#fff" data-a="${blocked?'unblock':'block'}" data-u="${uid}"><svg><use href="#i-ban"/></svg>${blocked?'解除屏蔽':'屏蔽此人'}</button><button class="btn btn-mini" style="background:#232B26;color:#fff" data-a="report" data-u="${uid}"><svg><use href="#i-mail"/></svg>举报</button></div>`:''}`,false,true);return}
  const pct=s.next?Math.round((s.points-LV[s.lv][0])/(s.next[0]-LV[s.lv][0])*100):100;
  openSheet(`<div class="selfcard">${flipCard(uid)}</div>${journeyHTML(U(uid),s)}
    <div class="sec-t" style="margin-top:22px">徽章 · ${s.badges.filter(b=>b.got).length}/${s.badges.length}</div>
    <div class="bdgrid">${s.badges.map(b=>`<div class="bd${b.got?'':' lock'}" data-bdgd="${b.code}" data-u="${uid}"><div class="hx">${b.glyph}</div><b>${b.name}</b><span>${b.got?b.desc:b.val+'/'+b.target}</span>${b.got?'':`<div class="pg"><i style="width:${b.val/b.target*100}%"></i></div>`}</div>`).join('')}</div>
    ${JOURNEY_RULES}
    <div style="height:14px"></div><button class="btn btn-p" data-a="saveCard" data-u="${uid}"><svg><use href="#i-share"/></svg>分享球员卡</button>`,true)}
// 分享图：正面 + 背面（二维码，颜色 = 用户印色），轻微反向旋转
function shareShot(uid){const u=U(uid);const front=playerCard(uid);
  const base=front.slice(0,front.indexOf('<div class="pc-top">')).replace(/<svg class="court"[\s\S]*?<\/svg>/,'');
  const back=base+`<div class="bk"><i class="q" style="color:${u.color}">${qrSVG(profileUrl(u,typeof SC!=='undefined'&&SC.to==='xhs'?'xhs':'moments'))}</i><div class="cta">扫码约我打球</div></div></div>`;
  return `<div class="shot"><div class="bw">${back}</div><div class="fw">${front}</div></div>`}
const SHARE_OPEN=h=>openSheet(h,false);
