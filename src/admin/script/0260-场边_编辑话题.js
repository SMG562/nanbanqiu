/* ---------- 编辑话题 ---------- */
function sbOpenEdit(id){const t=id==='new'?{id:'n'+Date.now(),t:'',kind:'常驻',q:'',ask:'',fills:['','',''],photo:[],on:false,sug:true,isNew:true}:JSON.parse(JSON.stringify(SB_TOPICS.find(x=>x.id===id)));while(t.fills.length<3&&t.kind!=='大家发起')t.fills.push('');SB.edit=t;sbDrawEdit();$('#scrim').classList.add('on');$('#drw').classList.add('on')}
function sbCloseEdit(){$('#scrim').classList.remove('on');$('#drw').classList.remove('on');SB.edit=null}
function sbDrawEdit(){const t=SB.edit,len=t.t.length,bad=len&&(len<SB_RULES.min||len>SB_RULES.max),gen=SB_GENERIC.includes(t.t.trim().toLowerCase()),stat=SB_TS.find(x=>x.id===t.id);
  $('#drw').innerHTML=`<div class="dh"><b>${t.isNew?'新建话题':'编辑 #'+esc(t.t)}</b><button class="btn" data-close>取消</button><button class="btn p" data-save>保存</button></div>
  <div class="db"><div>
   <div class="fld"><label>名字 <small>一个具体的场景或动作</small><span class="cnt ${bad?'bad':''}">${len} / ${SB_RULES.max}</span></label><input type="text" value="${esc(t.t)}" data-f="t">${gen?'<span class="warn">这个词太宽了，大家发起时也不能用</span>':''}</div>
   <div class="row2"><div class="fld"><label>类型</label><select data-f="kind">${['常驻','限时','大家发起'].map(k=>`<option ${t.kind===k?'selected':''}>${k}</option>`).join('')}</select></div>
    <div class="fld"><label>上线</label><div style="display:flex;align-items:center;gap:10px;height:38px"><button class="tg ${t.on?'on':''}" data-fon></button><span class="sbm">${t.on?'在场边可以看到、可以选':'只有后台能看到'}</span></div></div></div>
   ${t.kind==='限时'?`<div class="row2"><div class="fld"><label>开始</label><input type="date" value="${t.from||''}" data-f="from"></div><div class="fld"><label>结束</label><input type="date" value="${t.to||''}" data-f="to"></div></div>`:''}
   <div class="fld"><label>一句说明 <small>话题页顶部那一行</small><span class="cnt">${t.q.length} / 24</span></label><input type="text" value="${esc(t.q)}" data-f="q" maxlength="24"></div>
   <div class="fld"><label>它的问题 <small>底栏和发布页的提示；${SB_SET.hlen} 个字以内，问句或省略号</small><span class="cnt ${t.ask.length>SB_SET.hlen?'bad':''}">${t.ask.length} / ${SB_SET.hlen}</span></label><input type="text" value="${esc(t.ask)}" data-f="ask" maxlength="20">${/！|!/.test(t.ask)?'<span class="warn">不用感叹号</span>':''}${t.ask&&!/[？?…]$/.test(t.ask)?'<span class="warn">建议用问句或省略号结尾</span>':''}</div>
   <div class="fld"><label>三个开头 <small>只给半句，读着就知道后面接什么；空着就不显示</small></label>${[0,1,2].map(i=>`<div class="srow" style="margin-bottom:6px"><input type="text" value="${esc(t.fills[i]||'')}" data-fill="${i}" maxlength="16" placeholder="第 ${i+1} 句"><button data-up="${i}" ${i?'':'disabled'}>↑</button><button data-dn="${i}" ${i<2?'':'disabled'}>↓</button></div>`).join('')}</div>
   <div class="fld"><label>照片里有这些时，优先推荐它</label><div class="tags">${['穿搭','鞋','球拍','球包','宠物','球场','晚霞','风景','影子'].map(p=>`<span style="cursor:pointer;${t.photo.includes(p)?'background:var(--gw);color:var(--g);border-color:transparent':''}" data-ph="${p}">${p}</span>`).join('')}</div></div>
   <div class="opt"><div><b>出现在「今天想聊点什么」</b><small>没带话题进来时的三个建议</small></div><button class="tg ${t.sug?'on':''}" data-fsug></button></div>
   ${stat?`<div class="opt"><div><b>近 7 天</b><small>${fmt(stat.posts)} 条 · ${fmt(stat.people)} 人 · ${fmt(stat.balls)} 个网球 · 增长 ${(stat.grow>=0?'▲ ':'▼ ')+pct(Math.abs(stat.grow))}</small></div></div>`:''}
  </div>
  <div class="pv"><div class="lb">预览 · 发布页</div>${sbPhoneCompose(t)}<p class="cap">从底栏「${esc(t.ask||'…')}」点进来时，看到的就是这样。</p></div></div>`}

