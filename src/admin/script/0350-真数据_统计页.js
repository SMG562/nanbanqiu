/* =====================================================================
 * 真数据 · 统计页（#27 第 4 步）：概览、球员卡、区域、访问与页面、分享与拉新、手机与电脑、打开方式、球局全流程、打完之后、成长与徽章、场边数据。
 *   数据只来自 GET /admin/api/stats（白名单批量接口，和原型 CARDSRC 同名同口径）；每页按下面的 STP 配置画卡片，不碰模拟数据层。
 *   卡片种类：kpis（一行数字）· table · heat（星期 × 小时）· funnel · series（每日走势小图）。读不到的卡片单独显示原因，不影响其他卡片。
 *   第一版求「真、全、可读」：图表比原型朴素，口径一致；精细图表以后逐页替换（换的时候只改这页的配置或渲染，不改接口）。
 * ===================================================================== */
const STX={range:30,cache:{},err:{},loading:{},gen:0};
const STX_LBL={users:'活跃球友',anon_visitors:'未登录访客',started:'到点的局',full_at_start:'开打时人齐',rate:'人齐率',left_n:'今天还没开打',filled_n:'已满员',short_n:'还缺人',soon_short:'2 小时内开打还缺人',cancelled_n:'今天取消',pending_n:'等确认的申请',expiring_n:'快过期的申请',unmet_n:'想打没打上',
  member_no:'编号',nickname:'球友',host_ok:'发起成局',played:'打上',apply:'申请',invite:'邀约',impression:'留印象',active_day:'活跃天数',no_show:'爽约',score:'活跃分',short_name:'球场',suburb:'区',games:'球局',applications:'申请',prev_games:'上期球局',full_games:'人齐的局',new_users:'新注册',
  cards:'被看的卡',views:'查看',from_outside:'站外来看',external_landings:'站外打开',kind:'类型',channel:'渠道',shares:'分享',opens:'打开',signups:'带来注册',device:'设备',screen:'页面',visitors:'人数',avg_seconds:'平均停留（秒）',entry:'入口',sessions:'次数',people:'人数',via:'从哪进',
  active_people:'活跃人数',fill_rate:'人齐率',env:'打开方式',inapp_users:'在 App 内打开的人',moved:'换到浏览器',acted:'之后有操作',outcome:'结果',n:'次数',type:'类型',step:'步',name:'步骤',
  posts:'发布',posters:'发布人数',balls:'点网球',replies:'回复',with_photo:'带照片',with_topic:'带话题',with_venue:'带球场',later:'稍后公开',replies_closed:'关闭回复',hides:'被隐藏',hide_topic:'不看这个话题',hide_user:'不看这个人',hide_far:'太远不看',reports:'举报',deleted:'作者删除',photos_blurred:'照片打码',
  topic_id:'话题',title:'话题',interactions:'互动',body:'内容',venue:'球场',author:'作者',has_photo:'有照片',still_public:'还公开',status:'状态',prev_posts:'上期发布',event:'事件',category:'类别',description:'说明',props:'属性',source:'谁上报',replaced_by:'合并到'};
const STX_PCT=new Set(['rate','fill_rate','with_photo','with_topic','with_venue','later','replies_closed']);
const stxFmt=(k,v)=>v==null?'—':typeof v==='boolean'?(v?'是':'否'):STX_PCT.has(k)&&typeof v==='number'?(v<=1?Math.round(v*100):Math.round(v))+'%':typeof v==='number'?(Number.isInteger(v)?v.toLocaleString('zh-CN'):(+v.toFixed(1)).toLocaleString('zh-CN')):String(v);
// 每页的卡片：[种类, 标题, 数据源, 选项]；选项 cols = 只显示这些列（顺序），w = 占几栏（共 2 栏）
const STP={
  overview:[['kpis','这段时间的活跃','active_users'],['kpis','开打时人齐','fill_rate'],['kpis','今天','today_board',{note:'不受时间范围影响',w:2}],['series','每天','series',{w:2}],
    ['table','最活跃的球友','user_activity',{w:2}],['table','最活跃的球场','venue_activity'],['funnel','从来访到打上球','visit_funnel'],['heat','大家几点打球','start_heatmap',{v:'games',w:2}]],
  cards:[['kpis','球员卡被查看','card_views'],['table','分享与打开','share_attribution',{w:2}]],
  regions:[['table','全部区域','suburb_activity',{w:2}]],
  traffic:[['table','页面','page_traffic',{w:2}],['table','入口','entry_sources'],['table','球局详情从哪进','game_view_via']],
  growth:[['table','分享带来的打开和注册','share_attribution',{w:2}],['funnel','从来访到打上球','visit_funnel']],
  platform:[['table','手机和电脑对比','device_compare',{w:2}],['funnel','添加到主屏幕','pwa_install_funnel']],
  env:[['table','打开方式','env_usage',{w:2}],['table','在微信 / 小红书里打开之后','inapp_handoff_funnel',{w:2}]],
  life:[['kpis','开打时人齐','fill_rate'],['table','申请的结果','application_outcomes'],['heat','开打时间','start_heatmap',{v:'games',w:2}],['table','球局详情从哪进','game_view_via']],
  after:[['table','邀约的结果','invite_outcomes',{w:2}],['table','「少看」的效果','less_effect_counts']],
  grow:[['table','新用户留存（按注册周）','retention',{w:2}],['table','徽章稀有度','badge_rarity'],['table','升级卡住的人','level_stuck']],
  events:[['table','事件定义（埋点）','event_defs',{w:2,noExport:true}]],
  sb:[['kpis','场边','sb_kpis',{w:2}],['kpis','发布时的选择','sb_choices',{w:2}],['kpis','负面信号','sb_negative',{w:2}],['table','话题','sb_topics',{w:2}],['table','球场','sb_courts'],['heat','几点发场边','sb_heat',{v:'posts'}],['table','看的人最多的发布','sb_top_posts',{w:2}]],
};
const stxKey=p=>p+'@'+STX.range;
async function stxLoad(page){const k=stxKey(page),g=STX.gen;if(STX.loading[k])return;STX.loading[k]=true;
  const fns=[...new Set(STP[page].map(c=>c[2]))],to=new Date(),from=new Date(to-STX.range*864e5);
  const r=await admApi('GET',`/stats?fns=${fns.join(',')}&from=${from.toISOString()}&to=${to.toISOString()}`);STX.loading[k]=false;if(g!==STX.gen)return;
  if(r.status===401)return toLogin('登录已过期，请重新登录');
  if(r.ok&&r.body&&r.body.data){STX.cache[k]=r.body.data;delete STX.err[k]}else STX.err[k]=realErr(r);
  if(RL.me&&S.page===page)render()}
function stxTable(rows,o){const cols=(o&&o.cols)||Object.keys(rows[0]||{});
  return `<table><thead><tr>${cols.map(c=>`<th>${esc(STX_LBL[c]||c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td${typeof r[c]==='number'?' class="mono"':''}>${esc(c==='member_no'&&r[c]!=null?'#'+String(r[c]).padStart(4,'0'):c==='screen'&&typeof SCREENS!=='undefined'&&(SCREENS.find(s=>s[0]===r[c])||[])[1]||stxFmt(c,r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function stxKpis(rows){const r=rows[0]||{};return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${Object.keys(r).map(k=>`<div class="kpi" style="padding:6px 0"><div class="l">${esc(STX_LBL[k]||k)}</div><div class="v">${esc(stxFmt(k,r[k]))}</div></div>`).join('')}</div>`}
function stxFunnel(rows){const top=Math.max(1,...rows.map(r=>+r.people||0));
  return `<div class="fun">${rows.map((r,i)=>`<div class="fs"><span>${esc(r.name||r.step)}</span><div class="t"><i style="width:${Math.max(2,Math.round((r.people||0)*100/top))}%;background:var(--g)">${r.people||0}</i></div><span class="p">${i?`<b>${rows[i-1].people?Math.round(r.people*100/rows[i-1].people):0}%</b>上一步`:''}</span></div>`).join('')}</div>`}
function stxHeat(rows,o){const v=o.v,H=[...Array(17)].map((_,i)=>i+6),m={};let mx=0;rows.forEach(r=>{const x=+r[v]||0;m[r.dow+'_'+r.hour]=x;mx=Math.max(mx,x)});
  const D=['日','一','二','三','四','五','六'],ord=[1,2,3,4,5,6,0];
  return `<div class="hm"><span></span>${H.map(h=>`<span class="hx">${h%3===0?h:''}</span>`).join('')}${ord.map(d=>`<span class="hl">${D[d]}</span>${H.map(h=>{const x=m[d+'_'+h]||0;return `<span class="c" title="星期${D[d]} ${h} 点：${x}" style="background:${x?`color-mix(in srgb, var(--g) ${Math.round(15+85*x/mx)}%, transparent)`:'var(--sf2)'}"></span>`}).join('')}`).join('')}</div><p class="cap">颜色越深越多；最多 ${mx}。</p>`}
function stxSeries(rows){const M=[['dau','日活'],['new_users','新注册'],['games_created','新球局'],['applications','申请'],['messages','消息'],['shares','分享']];
  const days=[...new Set(rows.map(r=>String(r.day).slice(0,10)))].sort();if(!days.length)return '';
  return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${M.map(([k,l])=>{const ys=days.map(d=>{const r=rows.find(x=>x.metric===k&&String(x.day).slice(0,10)===d);return r?r.value:0}),mx=Math.max(1,...ys),sum=ys.reduce((a,b)=>a+b,0);
    const pts=ys.map((y,i)=>`${(i*100/Math.max(1,ys.length-1)).toFixed(1)},${(28-y*26/mx).toFixed(1)}`).join(' ');
    return `<div class="kpi" style="padding:6px 0"><div class="l">${l}</div><div class="v">${(k==='dau'?Math.round(sum/days.length):sum).toLocaleString('zh-CN')}</div><div class="d">${k==='dau'?'日均':'合计'} · ${days.length} 天</div><svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--g)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg></div>`}).join('')}</div>`}
function stxCard([kind,title,fn,o={}],data){const v=data&&data[fn];let body;
  if(!data)body='<p class="cap">读取中…</p>';
  else if(!v||v.error)body=`<p class="cap">${v&&v.error==='admin_forbidden'?'你的角色看不到这一项（含昵称或个人内容）':'这一项暂时读不出来'}</p>`;
  else if(!v.length||(kind==='kpis'&&!Object.keys(v[0]||{}).length))body='<div class="empty">这段时间还没有数据</div>';
  else body=kind==='kpis'?stxKpis(v):kind==='funnel'?stxFunnel(v):kind==='heat'?stxHeat(v,o):kind==='series'?(stxSeries(v)||'<div class="empty">这段时间还没有数据</div>'):stxTable(v,o);
  const ex=kind==='table'&&!o.noExport&&Array.isArray(v)&&v.length&&realCan('data.export')?`<button class="btn sm" data-stx="export" data-fn="${esc(fn)}">导出</button>${realCan('data.export_ids')&&v.some(r=>'member_no' in r||'nickname' in r||'author' in r)?`<button class="btn sm" data-stx="exportids" data-fn="${esc(fn)}">含编号昵称导出</button>`:''}`:'';
  return `<div class="card" style="${o.w===2?'grid-column:1/-1':''}"><div class="ch"><b>${esc(title)}</b>${o.note?`<small>${esc(o.note)}</small>`:''}<small class="mono" title="数据源" style="margin-left:auto">${esc(fn)}</small>${ex}</div>${body}</div>`}
// 导出：服务端先记日志（谁、哪个数据集、带不带编号），再给数据；这里转成 CSV 下载（Excel 能直接打开中文）
async function stxExport(fn,ids,reason){const to=new Date(),from=new Date(to-STX.range*864e5);
  const r=await admApi('POST','/export',{dataset:fn,with_ids:ids,reason:reason||undefined,from:from.toISOString(),to:to.toISOString()});
  if(r.status===401)return toLogin('登录已过期，请重新登录');if(!r.ok||!r.body||!Array.isArray(r.body.rows))return admToast(realErr(r));
  const rows=r.body.rows,cols=Object.keys(rows[0]||{}),cell=v=>{const x=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);return /[",\n]|^[=+\-@]/.test(x)?'"'+x.replace(/"/g,'""').replace(/^([=+\-@])/,"'$1")+'"':x};
  const csv=[cols.map(c=>cell(STX_LBL[c]||c)).join(','),...rows.map(x=>cols.map(c=>cell(x[c])).join(','))].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download=`${fn}_${STX.range}d${ids?'_ids':''}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0);
  admToast(`已导出 ${rows.length} 行（已记进操作日志）`)}
function realStatsPage(page){const k=stxKey(page),data=STX.cache[k];if(!data&&!STX.err[k])stxLoad(page);
  const R=[[1,'近 24 小时'],[7,'近 7 天'],[30,'近 30 天'],[90,'近 90 天']];
  return `<div class="rowacts" style="margin-bottom:12px;flex-wrap:wrap">${R.map(([n,l])=>`<button class="btn sm${STX.range===n?' p':''}" data-stx="range" data-v="${n}">${l}</button>`).join('')}<button class="btn sm" data-stx="reload" style="margin-left:auto">刷新</button></div>
  ${STX.err[k]?`<div class="card nodata"><h2>读不出来</h2><p>${esc(STX.err[k])} <button class="btn sm" data-stx="reload">重试</button></p></div>`:''}
  <div class="grid g2">${STP[page].map(c=>stxCard(c,data)).join('')}</div><p class="cap">数字来自数据库的统计函数（和「数据口径」页同一套定义）；按墨尔本时间。</p>`}
// 数据口径页：事件定义（库里）+ 每张卡片的数据源和口径（CARDSRC，纯文字定义、没有数字）
function stxCardSrc(){const T2=k=>TITLES[k]||k;return `<div class="card"><div class="ch"><b>每张卡片的口径</b><small>页面 → 卡片 → 数据源和定义</small></div>${Object.entries(typeof CARDSRC==='object'?CARDSRC:{}).map(([pg,cards])=>`<details><summary><b>${esc(T2(pg))}</b> <small style="color:var(--mut)">${Object.keys(cards).length} 张</small></summary><table><tbody>${Object.entries(cards).map(([t,[src,def]])=>`<tr><td>${esc(t)}</td><td class="mono"><small>${esc(src.join(' · '))}</small></td><td><small>${esc(def)}</small></td></tr>`).join('')}</tbody></table></details>`).join('')}</div>`}
if(NBQ_MODE==='real'){for(const p of Object.keys(STP))REAL_PAGES[p]=()=>realStatsPage(p)+(p==='events'?stxCardSrc():'');
  REAL_RESET.push(()=>{STX.cache={};STX.err={};STX.loading={};STX.gen++});
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-stx]');if(!b)return;
    if(b.dataset.stx==='range'){STX.range=+b.dataset.v;render();return}
    if(b.dataset.stx==='export')return stxExport(b.dataset.fn,false);
    if(b.dataset.stx==='exportids')return admAskReason('导出含编号和昵称的数据（只有超级管理员）',reason=>stxExport(b.dataset.fn,true,reason));
    if(b.dataset.stx==='reload'){const k=stxKey(S.page);delete STX.cache[k];delete STX.err[k];STX.gen++;STX.loading={};render()}})}
