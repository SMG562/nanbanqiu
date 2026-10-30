/* ===================== 前台数据层骨架（5g-3 前台接入第 3 轮）=====================
 * 真实模式（正式域名、登录后）下前台从 /api/* 读数据；演示模式（预览站、测试、本地文件）完全不走这里。
 * 本文件只放纯逻辑，不碰页面变量（unit/nbq_net 在空沙盒里载入测试）：
 *   nbqNetMake(io)   接口调用：带登录令牌、统一错误（码 = 后端错误码，另有 network / login_required）
 *   nbqFrom*         后端字段 → 前台内存数据的形状（USERS / GAMES / PARTS / VEN）
 *   nbqLoadAll(net)  登录后一次读入：球场、我的资料、公开球局、我的球局、邀约
 * 页面接线（把结果放进 USERS / GAMES / PARTS / VEN）在 "页面接线" 之后，第 4 轮起逐个操作改成「先调接口再更新缓存」。
 * 球场 id：接口给的是服务器 uuid，演示数据是 v1…；真实模式整个替换 VEN（球场导入正式库后才有数据，见进度记录）。 */
function nbqNetMake(io){
  // io: {fetch, token:()=>Promise<string|null>, base:string, onAuthLost?:()=>void}
  const base=String(io.base||'').replace(/\/+$/,'');
  const qs=o=>{const p=Object.keys(o||{}).filter(k=>o[k]!==undefined&&o[k]!==null&&o[k]!=='').map(k=>encodeURIComponent(k)+'='+encodeURIComponent(o[k]));return p.length?'?'+p.join('&'):''};
  async function call(method,path,opt){
    opt=opt||{};const h={Accept:'application/json'};
    const tk=await io.token();
    if(tk)h.Authorization='Bearer '+tk;else if(!opt.anon)return{ok:false,status:401,code:'login_required'};
    const init={method,headers:h};
    if(opt.body!==undefined){h['Content-Type']='application/json';init.body=JSON.stringify(opt.body)}
    let r;try{r=await io.fetch(base+path+qs(opt.query),init)}catch(_){return{ok:false,status:0,code:'network'}}
    let d=null;try{d=await r.json()}catch(_){}
    if(r.ok)return{ok:true,status:r.status,data:d||{}};
    const code=(d&&typeof d.error==='string'&&d.error)||(r.status===401?'login_required':r.status===429?'rate_limited':r.status>=500?'db_unavailable':'unknown');
    if(r.status===401&&tk&&io.onAuthLost)io.onAuthLost();
    const out={ok:false,status:r.status,code};
    if(d&&d.detail!==undefined)out.detail=d.detail;
    const ra=typeof r.headers?.get==='function'?+r.headers.get('Retry-After'):0;
    if(ra>0)out.retry_after=ra;else if(d&&d.retry_after>0)out.retry_after=d.retry_after;
    return out}
  return{call,get:(p,q,o)=>call('GET',p,{...o,query:q}),post:(p,b,o)=>call('POST',p,{...o,body:b===undefined?{}:b}),
    put:(p,b)=>call('PUT',p,{body:b===undefined?{}:b}),patch:(p,b)=>call('PATCH',p,{body:b}),del:(p,b)=>call('DELETE',p,b===undefined?{}:{body:b})}}

const nbqMs=t=>t==null?null:typeof t==='number'?t:Date.parse(t);
// 球友（me 或球友卡片）→ USERS 条目。姓 = last_initial；ntrp 字段在前台就是 UTR 数值
function nbqFromUser(u){if(!u)return null;
  return{id:u.id,no:u.member_no,name:u.nickname,last:u.last_initial||'',ntrp:u.utr,utr_estimated:!!u.utr_estimated,
    avatar_kind:u.avatar_kind||'letter',animal:u.avatar_animal||'tiger',color:u.avatar_color,card_theme:u.card_theme,seal_roll:u.seal_roll,
    played:u.played,hosted:u.hosted,kudos:u.kudos,level:u.level,gone:!!u.gone,gender:u.gender||null,home_club_ids:Array.isArray(u.club_ids)?u.club_ids:(u.card_venue_id?[u.card_venue_id]:[]),
    blocked:new Set(),base:{}}}
// 球场 → VEN 条目（接口的 suburb / surfaces 等原样带上）
function nbqFromVenue(v){return{id:v.id,name:v.name,short:v.short_name||v.name,suburb:v.suburb,lat:v.lat,lng:v.lng,
  surface:Array.isArray(v.surfaces)&&v.surfaces[0]||'hard',courts:v.courts,lights:!!v.lights,indoor:!!v.indoor,booking_url:v.booking_url||null}}
// 球局卡片 → GAMES 条目。前台沿用演示数据的形状：开始时间是 ISO 字符串，水平范围叫 ntrp_min / ntrp_max（值就是 UTR）；接口的 utr_min / utr_max 两个名字都留着
const nbqIso=t=>t==null?null:new Date(t).toISOString();
function nbqFromGame(g){return{...g,starts_at:nbqIso(g.starts_at),original_start:nbqIso(g.original_start),postponed_at:nbqIso(g.postponed_at),time_set_at:nbqIso(g.time_set_at),
  ntrp_min:g.utr_min,ntrp_max:g.utr_max,filled:g.filled||0,tags:g.tags||[]}}
function nbqFromPart(p){return{game_id:p.game_id,user_id:p.user_id,role:p.role,status:p.status,message:p.message||'',
  reason:p.decline_reason||undefined,note:p.decline_note||undefined,change_ack:p.change_ack||undefined,
  created_at:nbqMs(p.created_at),approved_at:nbqMs(p.approved_at),left_at:nbqMs(p.left_at)}}
function nbqFromInvite(i){return{...i,starts_at:nbqMs(i.starts_at),ends_at:nbqMs(i.ends_at),counter_starts_at:nbqMs(i.counter_starts_at),counter_ends_at:nbqMs(i.counter_ends_at),
  created_at:nbqMs(i.created_at),expires_at:nbqMs(i.expires_at),responded_at:nbqMs(i.responded_at)}}

// 登录后一次读入。返回 {ok:true,registered:false} 表示新号码还没资料；任何一步失败 → {ok:false,code}，不留半份
async function nbqLoadAll(net){
  const [m,vs]=await Promise.all([net.get('/api/me'),net.get('/api/venues',null,{anon:true})]);
  if(!m.ok)return{ok:false,code:m.code};
  if(!m.data.registered)return{ok:true,registered:false,venues:vs.ok?(vs.data.venues||[]).map(nbqFromVenue):[]};
  const [pub,mine,inv]=await Promise.all([net.get('/api/games'),net.get('/api/games/mine'),net.get('/api/invites')]);
  for(const r of [vs,pub,mine,inv])if(!r.ok)return{ok:false,code:r.code};
  const users={},put=u=>{if(u&&u.id)users[u.id]=nbqFromUser(u)};
  put(m.data.user);[mine.data.profiles,inv.data.profiles].forEach(o=>Object.values(o||{}).forEach(put));
  const games={};[...(pub.data.games||[]),...(mine.data.games||[])].forEach(g=>{games[g.id]=nbqFromGame(g)});   // 同一局两边都有时以「我的」为准（后写覆盖）
  return{ok:true,registered:true,me:m.data.user.id,users,venues:(vs.data.venues||[]).map(nbqFromVenue),games:Object.values(games),
    parts:(mine.data.participants||[]).map(nbqFromPart),invites:(inv.data.invites||[]).map(nbqFromInvite)}}

/* ---- 页面接线 ---- */
// 真实数据只在正式域名 nanbanqiu.app（含 www）启用，且登录模块已配置；预览站（pages.dev）登录是真的，数据仍是演示（10-30 定）。
// 演示模式 NBQ_NET 为 null，其余代码照旧。
const NBQ_REAL=typeof location!=='undefined'&&/^(www\.)?nanbanqiu\.app$/.test(location.hostname)&&typeof SBA!=='undefined'&&SBA.on();
const NBQ_NET=NBQ_REAL?nbqNetMake({fetch:(u,o)=>fetch(u,o),base:'',
  token:async()=>{const s=await SBA.fresh();return s?s.access_token:null},
  onAuthLost:()=>{sbaLogout();render()}}):null;
// 清掉内存里的演示数据（真实模式启动时、退出登录时）。固定球局会在每次 housekeep 里自动补下一场，所以 SERIES 也要清；对话、邀约、点赞同理
function nbqClear(){Object.keys(USERS).forEach(k=>delete USERS[k]);GAMES.length=0;PARTS.length=0;if(Array.isArray(NOTIFS))NOTIFS.length=0;
  SERIES.length=0;INVITES.length=0;THREADS.length=0;MSGS.length=0;LASTREAD={};CXCUR=null;KUDOS.clear();ME=null}
// 把读入的结果换进内存数据（只在真实模式、登录后调用）。整体替换 VEN / USERS / GAMES / PARTS，不与演示数据混用
function nbqApply(r){if(!r||!r.ok||!r.registered)return false;
  Object.keys(VEN).forEach(k=>delete VEN[k]);r.venues.forEach(v=>{VEN[v.id]=v});
  Object.keys(USERS).forEach(k=>delete USERS[k]);Object.assign(USERS,r.users);
  GAMES.length=0;r.games.forEach(g=>GAMES.push(g));PARTS.length=0;r.parts.forEach(p=>PARTS.push(p));
  ME=USERS[r.me];return true}
// 启动（两端 seed() 之后调用）：真实模式先清掉演示数据，球场是公开的，先读进来（新用户选 Home Club 要用）
async function nbqBoot(){if(!NBQ_NET)return;nbqClear();
  const v=await NBQ_NET.get('/api/venues',null,{anon:true});
  if(v.ok&&!ME){Object.keys(VEN).forEach(k=>delete VEN[k]);(v.data.venues||[]).forEach(x=>{VEN[x.id]=nbqFromVenue(x)})}
  render()}
// 登录后进入：{st:'ok'} 已有资料并读入 · {st:'new'} 新号码还没资料 · {st:'error',code}
async function nbqEnter(){const r=await nbqLoadAll(NBQ_NET);
  if(!r.ok)return{st:'error',code:r.code};
  if(!r.registered)return{st:'new'};
  nbqApply(r);return{st:'ok'}}
// 验证码通过之后（sbaOtpDone 调用）
async function nbqAfterLogin(){const e=await nbqEnter();SBA_BUSY=false;
  if(e.st==='error'){const x=$('#otp');if(x)x.readOnly=false;toast(apiErrText(e.code));return}
  if(e.st==='new'){openNewProfile();return}
  toast('欢迎回来');const nx=AUTH.next;AUTH.next=null;typeof closeSheet==='function'?closeSheet():closeModal();render();if(nx)setTimeout(nx,380)}
// 新号码填完资料（两端 npDone 调用）：注册 → 常去球场 → 性别 → 读入
async function nbqNpDone(n){
  const last=($('#npLast')&&$('#npLast').value.trim().slice(0,1).toUpperCase())||'',btn=document.querySelector('[data-a="npDone"]'),err=m=>{const e=$('#npErr');if(e)e.textContent=m;if(btn)btn.disabled=false};
  if(btn){if(btn.disabled)return;btn.disabled=true}
  const reg=await NBQ_NET.post('/api/me/register',{nickname:n,last_initial:last||null,utr:NP.ntrp,utr_estimated:!!NP.est,adult:true});
  if(!reg.ok)return err(apiErrText(reg.code));
  if(NP.clubs&&NP.clubs.length){const c=await NBQ_NET.put('/api/me/clubs',{venue_ids:[...NP.clubs].slice(0,3)});if(!c.ok)toast(apiErrText(c.code))}
  if(NP.gender==='f'||NP.gender==='m'){const g=await NBQ_NET.patch('/api/me',{gender:NP.gender});if(!g.ok)toast(apiErrText(g.code))}
  const e=await nbqEnter();if(e.st!=='ok')return err(apiErrText(e.code||'unknown'));
  toast('账号已创建');const nx=AUTH.next;AUTH.next=null;NP={ntrp:3.0,clubs:[]};typeof closeSheet==='function'?closeSheet():closeModal();render();if(nx)setTimeout(nx,380)}
