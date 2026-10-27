/* =====================================================================
 * 第三期：使用环境（主屏幕 / 微信 / 小红书 / Safari …）· 全部时间 · 用户 ID · 指标口径写清楚
 *        · 最活跃的球场 · 最活跃球友的定义
 * ===================================================================== */
const ALLD=LAUNCH;
const isAll=()=>S.range>=ALLD;
const help=t=>`<span class="hp" data-tv="口径" data-tl="${esc(t)}">?</span>`;

/* ---------- 指标定义：KPI、趋势图、表头都从这里取说明 ---------- */
const DEF={
  online:'最近 5 分钟内有任何操作的人数（登录用户按用户 ID、未登录按设备去重）',
  dau:'活跃用户：这一天至少打开过一次南伴球的人数，按人去重；多天时取每天的平均',
  nu:'新注册：完成手机验证、创建账号的人数',
  games:'新球局：发布的球局数（取消后重发算两局）',
  apps:'申请加入（次数）：「申请加入球局」被提交的次数。同一人申请 3 个球局记 3 次',
  applicants:'申请人数：至少提交过一次申请的人数，按人去重',
  fill:'成局率：开局时「已确认人数 + 发起人」达到设定人数的球局 ÷ 全部开局的球局',
  msgs:'消息：发出的消息条数（球局群聊 + 私信）',
};

/* ---------- 用户：带用户 ID，活跃分有明确定义 ---------- */
const hex=n=>{let s='';for(let i=0;i<n;i++)s+='0123456789abcdef'[Math.floor(rnd()*16)];return s};
USERS.forEach(u=>{u.uid=`${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(rnd()*4)]}${hex(3)}-${hex(12)}`;
  u.w={hostOk:Math.round(u.hosted7*.7),play:Math.max(0,Math.round(u.applied7*.55+u.hosted7*.7+rnd()*2)),apply:u.applied7,inv:u.inv7,imp:u.imp7,days:u.days7,noshow:rnd()<.12?1:0}});
// 活跃分（所选时间范围内）：真正打上球的权重最高，爽约扣分
const ACT_W=[['hostOk','发起并成局',4],['play','到场打球',3],['apply','申请加入',1],['inv','发出邀约',1],['imp','留印象',.5],['days','活跃天数',1],['noshow','爽约',-5]];
const SORTS=[['score','活跃分'],['play','打球次数'],['hostOk','发起成局'],['days','活跃天数']];
const idCell=u=>`<span class="uid" data-copy="${u.uid}" title="点击复制完整用户 ID：${u.uid}"><span class="mono">${u.uid.slice(0,8)}</span><svg class="ic" viewBox="0 0 24 24" style="width:13px;height:13px"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></span>`;
function userTable(rows,compact){if(rows.length&&!rows[0].u)rows=rows.map(u=>({u,s:ustat(u)}));
  return `<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>球友</th><th>用户 ID ${help('数据库 users.id（UUID）。点击复制完整 ID，可在后台和数据库里直接定位到这个人')}</th>${compact?'':'<th>区域</th><th class="r">UTR</th>'}<th class="r">打球</th><th class="r">发起成局</th><th class="r">申请</th>${compact?'':'<th class="r">邀约</th><th class="r">印象</th>'}<th class="r">活跃天数</th>${compact?'':'<th class="r">爽约</th>'}<th class="r">活跃分</th>${compact?'':'<th>来源</th><th>最近活跃</th><th>状态</th>'}</tr></thead><tbody>
  ${rows.map(({u,s},i)=>`<tr><td class="num" style="color:var(--mut)">${i+1}</td><td><div class="who">${av(u)}<div><b>${esc(u.name)}</b><small class="num">编号 #${String(u.no).padStart(4,'0')}</small></div></div></td><td>${idCell(u)}</td>${compact?'':`<td>${esc(u.sub)}</td><td class="r num">${(+u.utr).toFixed(1)}</td>`}
    <td class="r num">${s.play}</td><td class="r num">${s.hostOk}</td><td class="r num">${s.apply}</td>${compact?'':`<td class="r num">${s.inv}</td><td class="r num">${s.imp}</td>`}<td class="r num">${s.days}</td>${compact?'':`<td class="r num" style="${s.noshow?'color:var(--crit)':''}">${s.noshow}</td>`}<td class="r num"><b>${s.score}</b></td>
    ${compact?'':`<td>${u.src[1]}</td><td>${u.last<60?u.last+' 分钟前':u.last<1440?Math.round(u.last/60)+' 小时前':Math.round(u.last/1440)+' 天前'}</td><td>${u.status==='ok'?'<span class="pill g">正常</span>':'<span class="pill c">已暂停</span>'}</td>`}</tr>`).join('')}</tbody></table></div>`}
const actDef=()=>`<div class="def"><b>最活跃球友怎么算</b><div>${rangeTxt()}内的活跃分 = ${ACT_W.map(([,n,w])=>`<span class="pill nodot">${n} ${w>0?'×':'×'} ${w}</span>`).join(' + ').replace('+ <span class="pill nodot">爽约','− <span class="pill nodot">爽约').replace('爽约 × -5','爽约 × 5')}<br><small>真正打上球的权重最高；只点开、只申请的人排不到前面；爽约扣分。权重在 <span class="mono">activity_weights</span> 配置里，可调。</small></div></div>`;
document.addEventListener('click',e=>{const c=e.target.closest('[data-copy]');if(c){e.stopPropagation();try{navigator.clipboard.writeText(c.dataset.copy)}catch(x){}c.classList.add('ok');setTimeout(()=>c.classList.remove('ok'),1200);return}
  const s=e.target.closest('[data-us]');if(s){S.usort=s.dataset.us;render()}},true);

/* ---------- 球场活跃度 ---------- */
const VDEF='球场活跃度 = 打上的球局 × 3 + 发布的球局 × 1 + 申请加入次数 × 0.5。以「真正打上了」为主，避免只发不打的球场排到前面';
function venueTable(rows,compact){return `<table><thead><tr><th>#</th><th>球场</th><th>区域</th><th class="r">打上的球局</th><th class="r">发布</th><th class="r">申请加入</th>${compact?'':'<th class="r">开打时人齐</th><th class="r">到场人次</th>'}<th class="r">活跃度 ${help(VDEF)}</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr><td class="num" style="color:var(--mut)">${i+1}</td><td><b style="font-weight:600">${esc(r.v[2])}</b>${r.v[4]==='user'?' <span class="pill nodot" style="font-size:10.5px">用户提交</span>':''}</td><td>${esc(r.v[3])}</td><td class="r num">${fmt(r.played)}</td><td class="r num">${fmt(r.games)}</td><td class="r num">${fmt(r.apps)}</td>${compact?'':`<td class="r num">${b1pf(r.fill)}</td><td class="r num">${fmt(r.players)}</td>`}<td class="r num"><b>${fmt(r.score)}</b></td></tr>`).join('')}</tbody></table>`}

/* ---------- 概览 ---------- */

/* ---------- 用户页 ---------- */

/* ---------- 球场页：加活跃排行 ---------- */

/* ---------- 使用环境 ---------- */
const ENVS=[ // key, 名称, 分组, 会话占比, 平均会话秒, 看球局→申请, 次日留存, 推送开启, 观察
 ['pwa_ios','主屏幕 · iPhone','pwa',.27,212,.36,.62,.58,'回访最多、转化最好；推送有效'],
 ['pwa_android','主屏幕 · 安卓','pwa',.05,198,.33,.58,.61,''],
 ['wechat','微信内打开','inapp',.19,118,.18,.31,0,'不能推送、不能加到主屏幕；多从群聊链接进来'],
 ['xhs','小红书内打开','inapp',.04,74,.09,.18,0,'几乎都是首次访问，跳出最高'],
 ['ig_fb','Instagram / Facebook 内','inapp',.01,80,.1,.2,0,''],
 ['safari_ios','iPhone Safari','mbrowser',.13,166,.27,.41,0,'最该引导「添加到主屏幕」的人'],
 ['chrome_ios','iPhone Chrome','mbrowser',.02,150,.24,.38,0,''],
 ['chrome_android','安卓 Chrome','mbrowser',.04,158,.25,.4,.22,'可以直接弹出安装'],
 ['mobile_other','其他手机浏览器','mbrowser',.02,120,.18,.3,0,''],
 ['desk_chrome','电脑 Chrome','desk',.15,314,.17,.33,0,'多在看地图、挑球局'],
 ['desk_safari','电脑 Safari','desk',.05,296,.16,.32,0,''],
 ['desk_edge','电脑 Edge','desk',.02,280,.15,.3,0,''],
 ['desk_other','电脑其他','desk',.01,240,.12,.25,0,''],
];
const EGROUP=[['pwa','主屏幕 App','--c1'],['inapp','App 内置浏览器','--c2'],['mbrowser','手机浏览器','--c3'],['desk','电脑','--c4']];
function stepFunnel(st,base){return `<div class="fun">${st.map((s,i)=>`<div class="fs" style="grid-template-columns:170px 1fr 110px"><span>${s[0]}</span><span class="t"><i style="width:${Math.max(4,s[1]*100).toFixed(1)}%;background:${ramp(.9-i*.13)}" data-tv="${fmt(base*s[1])} 人" data-tl="${s[0]}"></i></span><span class="p"><b class="num">${fmt(base*s[1])}</b>${i?pct(s[1]/st[i-1][1]):''}</span></div>`).join('')}</div>`}

/* ---------- 指标口径补充 ---------- */

