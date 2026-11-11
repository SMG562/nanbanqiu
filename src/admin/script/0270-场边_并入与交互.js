const SB_IC={sb:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16h0A2.5 2.5 0 0 1 4 13.5z"/>',
 stopic:'<path d="M9 4 7 20M17 4l-2 16M4.5 9h15M4 15h15"/>',ssched:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M4 10h16M9 14h2M13 14h2M9 17h2"/>',sguide:'<path d="M5 6h14M5 10.5h10M5 15h14M5 19.5h7"/>'};

/* ---------- 并入：导航、标题、只读能看的页面 ---------- */
Object.assign(IC,SB_IC);
(()=>{const i=PAGES.findIndex(p=>p[0]==='h'&&p[1]==='体验与成长');PAGES.splice(i,0,['h','场边 24h'],['sb','场边数据'],['stopic','话题'],['ssched','今日推荐排期'],['sguide','引导文案']);
  Object.assign(TITLES,{sb:'场边数据',stopic:'话题',ssched:'今日推荐排期',sguide:'引导文案'})})();
const SB_PAGES=['sb','stopic','ssched','sguide'];
SB_PAGES.forEach(p=>VIEWER_PAGES.add(p));   // 只读能看（配置和统计里没有球友的私人信息；昵称按只读规则隐藏）
const sbWho=n=>S.role==='viewer'?'某球友':n;
function sbGo(p){S.page=p;render()}
// 写操作：要 sideline.config（超级管理员、运营）；没有权限 → 提示，和服务端 admin_forbidden 一致
function sbCan(){if(admCan('sideline.config'))return true;admToast(`${ADMIN_ERR.admin_forbidden}（需要${admNeed('sideline.config')}）`);return false}
function sbLog(t){S.audit.unshift([admWho(),'sideline.config',t,'刚刚'])}
function sbVer(note){const n=15+SB_VERS.length-3;SB_VERS.unshift(['v'+n,admWho(),note,'刚刚']);return 'v'+n}
function sbDirty(){SB.dirty++;sbPubBar()}
function sbPubBar(){const p=$('#pub');if(!p)return;p.style.display=SB.dirty&&SB_PAGES.includes(S.page)?'flex':'none';$('#pubn').textContent=SB.dirty}

/* ---------- 渲染之后：筛选条、发布条、预览轮播、没权限的控件 ---------- */
const _sbDrawNav=drawNav;drawNav=function(){_sbDrawNav();const n=SB_TOPICS.filter(t=>t.pending).length,b=document.querySelector('#nav [data-pg="stopic"]');if(b&&n)b.insertAdjacentHTML('beforeend',`<i>${n}</i>`)};
const _sbRender=render;render=function(){const r=_sbRender.apply(this,arguments);sbAfter();return r};
function sbAfter(){const on=SB_PAGES.includes(S.page),data=S.page==='sb';
  ['#rng','#plat'].forEach(s=>{const e=$(s);if(e)e.style.display=!on||data?'':'none'});
  const csv=document.querySelector('.filters .btn');if(csv)csv.style.display=on&&!data?'none':'';
  sbPubBar();
  if(on&&!admCan('sideline.config')){document.querySelectorAll('#page input,#page select').forEach(e=>{e.disabled=true});
    document.querySelectorAll('#page [data-on],#page [data-promote],#page [data-release],#page [data-ral],#page [data-aal],#page [data-rgen],#page [data-qon],#page [data-qx],#page [data-rollback],#page [data-newev],#page [data-new]').forEach(b=>{b.classList.add('noperm');b.title='需要'+admNeed('sideline.config')})}
  if(S.page==='sguide')sbRunPv()}

/* ---------- 交互 ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('#page [data-tr],#page [data-ts],#page [data-cs],[data-edit],[data-new],#page [data-tab],#page [data-on],[data-promote],[data-hide],[data-ral],[data-aal],[data-rgen],[data-close],[data-save],[data-fon],[data-fsug],[data-ph],[data-up],[data-dn],[data-pvs],[data-release],[data-qon],[data-qx],[data-rollback],[data-newev],[data-publish],[data-discard]');if(!b)return;const d=b.dataset;
  if(d.tr){SB.tr=d.tr;sbGo('sb');return}if(d.ts){SB.topicSort=d.ts;sbGo('sb');return}if(d.cs){SB.courtSort=d.cs;sbGo('sb');return}
  if(d.edit){sbOpenEdit(d.edit);return}
  if(d.tab){SB.tab=d.tab;sbGo('stopic');return}
  if('close' in d){sbCloseEdit();return}
  if(d.fon!==undefined&&SB.edit){SB.edit.on=!SB.edit.on;sbDrawEdit();return}if(d.fsug!==undefined&&SB.edit){SB.edit.sug=!SB.edit.sug;sbDrawEdit();return}
  if(d.ph&&SB.edit){const p=SB.edit.photo,i=p.indexOf(d.ph);i>=0?p.splice(i,1):p.push(d.ph);sbDrawEdit();return}
  if((d.up!==undefined||d.dn!==undefined)&&SB.edit){const f=SB.edit.fills,i=+(d.up??d.dn),j=d.up!==undefined?i-1:i+1;[f[i],f[j]]=[f[j],f[i]];sbDrawEdit();return}
  if(d.pvs!==undefined){SB.slot=+d.pvs;sbGo('sguide');return}
  // 以下都是写操作
  if(!sbCan())return;
  if('new' in d){sbOpenEdit('new');return}
  if('newev' in d){sbOpenEdit('new');SB.edit.kind='限时';sbDrawEdit();return}
  if(d.on){const t=SB_TOPICS.find(x=>x.id===d.on);t.on=!t.on;b.classList.toggle('on',t.on);sbLog(`#${t.t} ${t.on?'上线':'下线'}`);admToast(t.on?`#${t.t} 已上线`:`#${t.t} 已下线，场边看不到了`);return}
  if(d.promote){const t=SB_TOPICS.find(x=>x.id===d.promote);t.kind='常驻';sbOpenEdit(t.id);admToast('转为常驻：补上问题和三个开头再保存');return}
  if(d.release){const t=SB_TOPICS.find(x=>x.id===d.release);t.pending=false;sbLog(`#${t.t} 提前放出`);sbGo('stopic');admToast(`#${t.t} 已放出，出现在「大家在聊」和搜索里`);return}
  if(d.hide!==undefined){b.closest('tr').style.opacity=.35;b.textContent='已隐藏';b.disabled=true;admToast('已隐藏，作者会收到说明');return}
  if(d.ral!==undefined){const a=SB_ALIAS.splice(+d.ral,1)[0];sbLog(`相似词 删除「${a[0]}」`);sbGo('stopic');return}
  if('aal' in d){const w=$('#alw').value.trim();if(!w)return;SB_ALIAS.push([w,$('#alt').value]);sbLog(`相似词 添加「${w}」`);sbGo('stopic');admToast('已添加');return}
  if(d.rgen!==undefined){const g=SB_GENERIC.splice(+d.rgen,1)[0];sbLog(`太宽的词 删除「${g}」`);sbGo('stopic');return}
  if('save' in d){const t=SB.edit;if(!t.t.trim()){admToast('先写名字');return}if(t.t.length<SB_RULES.min||t.t.length>SB_RULES.max){admToast(`名字 ${SB_RULES.min}–${SB_RULES.max} 个字`);return}if(t.kind!=='大家发起'&&!t.ask.trim()){admToast('常驻和限时话题要有一个问题');return}
    t.fills=t.fills.filter(f=>f.trim());const i=SB_TOPICS.findIndex(x=>x.id===t.id);delete t.isNew;if(i>=0)SB_TOPICS[i]=t;else SB_TOPICS.unshift(t);sbVer(`编辑 #${t.t}`);sbLog(`编辑 #${t.t}`);sbCloseEdit();render();admToast('已保存，5 分钟内在场边生效');return}
  if(d.qon){const [g,i]=d.qon.split(':'),L=g==='gen'?SB_GENQ:SB_COURTQ;L[+i].on=!L[+i].on;b.classList.toggle('on',L[+i].on);sbDirty();return}
  if(d.qx){const [g,i]=d.qx.split(':'),L=g==='gen'?SB_GENQ:SB_COURTQ;L.splice(+i,1);sbGo('sguide');sbDirty();return}
  if(d.rollback){const v=sbVer(`退回到 ${d.rollback}`);sbLog(`退回到 ${d.rollback}（新版本 ${v}）`);admToast(`已退回到 ${d.rollback}，5 分钟内生效`);render();return}
  if('publish' in d){SB.dirty=0;const v=sbVer('改了引导文案');sbLog(`发布 ${v}：引导文案`);admToast('已发布，5 分钟内生效');render();return}
  if('discard' in d){SB.dirty=0;sbLog('放弃草稿');admToast('已放弃改动');render();return}
});
document.addEventListener('input',e=>{const el=e.target,d=el.dataset;
  if(SB.edit&&d.f){SB.edit[d.f]=el.value;const pos=el.selectionStart;sbDrawEdit();const n=$(`#drw [data-f="${d.f}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}return}
  if(SB.edit&&d.fill!==undefined){SB.edit.fills[+d.fill]=el.value;const pos=el.selectionStart;sbDrawEdit();const n=$(`#drw [data-fill="${d.fill}"]`);n.focus();n.setSelectionRange(pos,pos);return}
  if(!SB_PAGES.includes(S.page)||!el.closest('#page'))return;
  if(el.id==='tsearch'){const q=el.value.trim();document.querySelectorAll('#page tbody tr').forEach(tr=>tr.style.display=!q||tr.textContent.includes(q)?'':'none');return}
  if(!sbCan()){render();return}
  if(d.q){const [g,i]=d.q.split(':');(g==='gen'?SB_GENQ:SB_COURTQ)[+i].t=el.value;sbDirty();return}
  if(d.sl){const [i,j]=d.sl.split(':');SB_SLOTS[+i].tp[+j]=el.value;sbDirty();return}
  if(d.set){SB_SET[d.set]=+el.value;sbDirty();return}
  if(d.wk!==undefined){SB_WEEK[+d.wk][1]=el.value;sbLog(`周历 ${SB_WEEK[+d.wk][0]} 改了`);admToast('排期已保存');return}
  if(d.rule){SB_RULES[d.rule]=+el.value;sbLog(`规则 ${d.rule} = ${el.value}`);admToast('规则已保存');return}
  if(d.cf!==undefined||d.lf!==undefined||d.sf!==undefined||d.st!==undefined){sbDirty();return}});
document.addEventListener('keydown',e=>{if(e.target.id==='genin'&&e.key==='Enter'){const v=e.target.value.trim();if(v&&sbCan()){SB_GENERIC.push(v);sbLog(`太宽的词 添加「${v}」`);sbGo('stopic')}}if(e.key==='Escape'&&SB.edit)sbCloseEdit()});
$('#scrim').onclick=sbCloseEdit;

/* ---------- 卡片数据源登记（数据口径 → 卡片与数据源；key = 卡片标题） ---------- */
Object.assign(CARDSRC,{
 sb:{'发布':[['sb_posts'],'这段时间发出的条数（含 24 小时后已存进相册的）'],'发布的人':[['sb_posts'],'至少发过一条的人，去重'],'看过场边的人':[['sb_views','events'],'打开过场边这一页的人，去重（含未登录）'],'发布率':[['sb_posts','sb_views'],'发布的人 ÷ 看过场边的人'],'网球 + 回复':[['sb_balls','sb_replies'],'点的网球数 + 回复数'],'带照片的':[['sb_posts','sb_photos'],'带照片的发布 ÷ 全部发布'],
  '趋势':[['sb_posts','sb_views','sb_balls','sb_replies'],'今天按小时，其余按天'],'最热闹的话题':[['sb_posts','sb_topics'],'发布 / 参与人（去重）/ 网球 / 和上一周期比的增长'],'发布最多的球场':[['sb_posts','venues'],'只算选了球场的发布'],'浏览最多的发布':[['sb_posts','sb_views'],'浏览 = 打开详情或在信息流里停留超过 1 秒'],
  '引导有没有用':[['events','sb_hints','sb_posts'],'看到底栏问题 → 点进来写 → 发出；点进率低于 3% 标黄'],'哪些开头被用了':[['events','sb_topics'],'点了开头的人里，最后发出的比例；低于 50% 标黄'],'什么时候最热闹':[['sb_posts'],'发布数，按星期和小时（墨尔本时间）'],'发的时候大家怎么选':[['sb_posts','sb_hides','reports'],'带话题 / 球场 / 照片 / 延迟公开 / 关回复；不感兴趣、屏蔽、举报、撤回'] },
 stopic:{'所有话题':[['sb_topics','sb_config_draft'],'admin_sb_config_draft() 读、admin_sb_config_set() 写；提前放出 admin_sb_topic_release()'],'相似的合并':[['sb_topic_alias'],'大家输入的词 → 推荐 / 并入的话题'],'规则':[['sb_settings','sb_generic_words'],'太宽的词、名字长短、几个人用过才被看到、几天没人用就沉下去'] },
 ssched:{'每周的固定栏目':[['sb_week','sb_today'],'每天 0 点换；同一个话题一周只出现一次'],'特别安排':[['sb_specials'],'盖过周历，有起止时间；自动安排按触发条件'] },
 sguide:{'底栏的问题':[['sb_hints','sb_slots','sb_settings'],'一直会出现的、按时段带出的、选了球场时的问题'],'不是话题的开头':[['sb_starters'],'球场问题、失物招领进来时输入框下面的几行'],'发布页':[['sb_settings'],'没带话题进来时给几个话题'],'改动记录':[['sb_config_versions'],'每次发布留一个版本，可以退回'] },
});
