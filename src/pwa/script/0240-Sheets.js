/* ============================== Sheets ============================== */
function openSheet(html,tall=false,dark=false){UI.sheetBack=null;const s=$('#sheet');s.innerHTML='<div class="grab"></div>'+html;s.classList.toggle('tall',tall);s.classList.toggle('dark',dark);s.scrollTop=0;$('#sbg').classList.add('show');requestAnimationFrame(()=>s.classList.add('show'))}
function closeSheet(){if(UI.sheetBack){const f=UI.sheetBack;UI.sheetBack=null;f();return}$('#sheet').classList.remove('show');$('#sbg').classList.remove('show')}
$('#sbg').onclick=closeSheet;

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
