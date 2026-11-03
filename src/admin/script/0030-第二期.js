/* =====================================================================
 * 第二期：平台对比 · 页面与流量 · 安全与风险 · 更细的球局 / 球员卡 / 分享数据
 * 每个模块都按「指标定义（METRIC_DEFS）→ 取数函数 → 渲染」三层写，
 * 上线后把取数函数换成 /admin/api/... 的请求即可，页面结构不用动
 * ===================================================================== */
// 手机与电脑（按事件的 device 字段）在不同指标上的占比不同：手机更偏「约球、聊天」，电脑更偏「浏览、看地图」
const PSPLIT={dau:.68,nu:.57,games:.63,apps:.76,appr:.7,msgs:.86,inv:.8,shares:.74,sessions:.72,visitors:.55,fill:.5};
const PFm=k=>1   // 第三批：HIST 已按设备分开存（读取时按上方设备筛选），不再按比例拆;
const PLAT_NAME={pwa:'手机',web:'电脑'};   // S.plat 的键沿用 pwa / web，含义是设备
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- 多序列折线（同一单位、同一纵轴） ---------- */
function lineMulti(el,labels,series,fmtv){const W=el.clientWidth||700,H=240,L=44,R=12,Tp=12,B=26,n=labels.length,mx=Math.max(...series.flatMap(s=>s.vals))*1.12||1;
  const s0=Math.pow(10,Math.floor(Math.log10(mx/4))),nice=[1,2,2.5,5,10].map(k=>k*s0).find(k=>mx/k<=5),top=Math.ceil(mx/nice)*nice;
  const X=i=>L+(n<2?.5:i/(n-1))*(W-L-R),Yv=v=>Tp+(1-v/top)*(H-Tp-B);
  let g='';for(let v=0;v<=top+1e-9;v+=nice)g+=`<line x1="${L}" x2="${W-R}" y1="${Yv(v)}" y2="${Yv(v)}" stroke="var(--line)"/><text x="${L-8}" y="${Yv(v)+4}" text-anchor="end" font-size="11" fill="var(--mut)">${fmtv(v)}</text>`;
  const step=Math.max(1,Math.ceil(n/7));labels.forEach((l,i)=>{if(i%step===0||i===n-1)g+=`<text x="${X(i)}" y="${H-6}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}" font-size="11" fill="var(--mut)">${l}</text>`});
  series.forEach(s=>{g+=`<path d="${s.vals.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)} ${Yv(v).toFixed(1)}`).join('')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
    if(series.length<=2){const lv=s.vals[n-1];g+=`<text x="${X(n-1)-4}" y="${Yv(lv)-8}" text-anchor="end" font-size="11.5" font-weight="700" fill="var(--ink2)">${s.name}</text>`}});
  el.innerHTML=`<div class="lg2">${series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div><svg class="lc" width="${W}" height="${H}" style="display:block;touch-action:none">${g}<line id="xh" y1="${Tp}" y2="${H-B}" stroke="var(--ink)" stroke-opacity=".35" style="display:none"/>${series.map((s,k)=>`<circle class="xd" r="4.5" fill="${s.color}" stroke="var(--sf)" stroke-width="2" style="display:none"/>`).join('')}<rect x="${L}" y="0" width="${W-L-R}" height="${H}" fill="transparent" class="hit"/></svg>`;
  const svg=el.querySelector('svg'),xh=svg.querySelector('#xh'),dots=[...svg.querySelectorAll('.xd')];
  svg.querySelector('.hit').addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect(),i=Math.max(0,Math.min(n-1,Math.round((e.clientX-r.left-L)/(W-L-R)*(n-1))));
    xh.setAttribute('x1',X(i));xh.setAttribute('x2',X(i));xh.style.display='';dots.forEach((d,k)=>{d.setAttribute('cx',X(i));d.setAttribute('cy',Yv(series[k].vals[i]));d.style.display=''});
    tip.innerHTML='';const h=document.createElement('span');h.textContent=labels[i];tip.append(h);series.forEach(s=>{const row=document.createElement('div');row.className='trow';row.innerHTML=`<i style="background:${s.color}"></i>`;const b=document.createElement('b');b.textContent=fmtv(s.vals[i]);const nm=document.createElement('span');nm.textContent=s.name;row.append(b,nm);tip.append(row)});
    tip.style.opacity=1;tip.style.left=Math.min(innerWidth-tip.offsetWidth-12,e.clientX+14)+'px';tip.style.top=Math.max(8,e.clientY-tip.offsetHeight-10)+'px'});
  svg.querySelector('.hit').addEventListener('pointerleave',()=>{xh.style.display='none';dots.forEach(d=>d.style.display='none');hideTip()})}
// 成对横条：手机 / 电脑同一行对比（同一刻度）
// 100% 堆叠条：一个整体拆成几部分（如申请的结果）
function stack100(parts){const tot=parts.reduce((a,p)=>a+p.v,0)||1;
  return `<div class="stk">${parts.map((p,i)=>`<i style="width:${(p.v/tot*100).toFixed(2)}%;background:var(--c${i+1})" data-tv="${pct(p.v/tot)} · ${fmt(p.v)}" data-tl="${esc(p.n)}"></i>`).join('')}</div>
  <div class="stkl">${parts.map((p,i)=>`<span><i style="background:var(--c${i+1})"></i>${esc(p.n)} <b class="num">${pct(p.v/tot)}</b><small class="num">${fmt(p.v)}</small></span>`).join('')}</div>`}
const kpi=(l,v,d,cls='')=>`<div class="card kpi"><div class="l">${l}</div><div class="v num">${v}</div>${d?`<div class="d ${cls}">${d}</div>`:''}</div>`;
const rangeTxt=()=>S.range===1?'今天':S.range>=LAUNCH?'上线以来（'+LAUNCH+' 天）':'近 '+S.range+' 天';

/* ---------- 页面清单（屏幕名与中文名一一对应，前端 page_view.props.screen） ---------- */
const SCREENS=[['disc','发现球局',3.2,.62,48],['game_detail','球局详情',2.1,.7,35],['notif','消息',1.4,.84,41],['mine','我的球局',.9,.74,26],['me','我的',.8,.75,22],['player_card','球员卡',.72,.71,14],
 ['filter','筛选',.35,.52,12],['create','发起球局',.18,.62,71],['login','登录',.15,.48,33],['game_share','分享球局',.1,.7,15],['card_share','分享球员卡',.06,.84,18],['invite','约 TA 打球',.05,.8,40],['safety','安全须知',.045,.7,26],['community','微信群',.03,.6,10]];
/* ---------- 进入方式 ---------- */

/* ---------- 页面：平台对比 ---------- */

/* ---------- 页面：页面与流量 ---------- */

/* ---------- 页面：用户（加性别） ---------- */
const GENDER=[['f','女生',.31],['m','男生',.57],['','未填写',.12]];

/* ---------- 页面：球局与区域（加单双打、女生局、申请结果） ---------- */

/* ---------- 页面：球员卡（加被看最多、分享次数） ---------- */

/* ---------- 页面：分享与增长（球局分享 vs 球员卡分享） ---------- */

/* ---------- 页面：安全与风险 ---------- */
const RISK=[
 {u:'Kevin H.',sub:'Box Hill',plat:'pwa',score:72,sig:[['爽约',3],['被举报',2]],age:'注册 3 个月',st:'open'},
 {u:'Ryan G.',sub:'Richmond',plat:'pwa',score:64,sig:[['私信发链接',4],['被屏蔽',3]],age:'注册 9 天',st:'open'},
 {u:'Sam C.',sub:'Docklands',plat:'web',score:58,sig:[['未确认性别反复试女生局',4],['短期改性别',1]],age:'注册 2 周',st:'watching'},
 {u:'Nick I.',sub:'Footscray',plat:'pwa',score:46,sig:[['新账号大量私信',14]],age:'注册 2 天',st:'open'},
 {u:'Luke E.',sub:'Clayton',plat:'pwa',score:38,sig:[['临开局取消',4]],age:'注册 5 个月',st:'watching'},
 {u:'Ben K.',sub:'Kew',plat:'web',score:33,sig:[['被婉拒后仍高频申请',11]],age:'注册 1 个月',st:'open'},
 {u:'Frank J.',sub:'Glen Waverley',plat:'pwa',score:31,sig:[['爽约',2]],age:'注册 6 个月',st:'limited'},
];

/* ---------- 页面：埋点与指标 ---------- */
const METRIC_DEFS=[];   // 指标口径见文件末尾 B1

