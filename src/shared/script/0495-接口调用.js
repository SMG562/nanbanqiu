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
    played:u.played,hosted:u.hosted,kudos:u.kudos,level:u.level,gone:!!u.gone,home_club_ids:u.card_venue_id?[u.card_venue_id]:[],
    blocked:new Set(),base:{}}}
// 球场 → VEN 条目（接口的 suburb / surfaces 等原样带上）
function nbqFromVenue(v){return{id:v.id,name:v.name,short:v.short_name||v.name,suburb:v.suburb,lat:v.lat,lng:v.lng,
  surface:Array.isArray(v.surfaces)&&v.surfaces[0]||'hard',courts:v.courts,lights:!!v.lights,indoor:!!v.indoor,booking_url:v.booking_url||null}}
// 球局卡片 → GAMES 条目（字段名后端与前台一致；时间转毫秒数，与演示数据一致）
function nbqFromGame(g){return{...g,starts_at:nbqMs(g.starts_at),original_start:nbqMs(g.original_start),postponed_at:nbqMs(g.postponed_at),time_set_at:nbqMs(g.time_set_at),
  filled:g.filled||0,tags:g.tags||[]}}
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
// 真实模式 = 登录模块已启用（SB_CFG 有配置 = 正式域名）。演示模式 NBQ_NET 为 null，其余代码照旧
const NBQ_NET=(typeof SBA!=='undefined'&&SBA.on())?nbqNetMake({fetch:(u,o)=>fetch(u,o),base:'',
  token:async()=>{const s=await SBA.fresh();return s?s.access_token:null},
  onAuthLost:()=>{if(typeof sbaLogout==='function')sbaLogout()}}):null;
// 把读入的结果换进内存数据（只在真实模式、登录后调用）。整体替换 VEN / USERS / GAMES / PARTS，不与演示数据混用
function nbqApply(r){if(!r||!r.ok||!r.registered)return false;
  Object.keys(VEN).forEach(k=>delete VEN[k]);r.venues.forEach(v=>{VEN[v.id]=v});
  Object.keys(USERS).forEach(k=>delete USERS[k]);Object.assign(USERS,r.users);
  GAMES.length=0;r.games.forEach(g=>GAMES.push(g));PARTS.length=0;r.parts.forEach(p=>PARTS.push(p));
  ME=USERS[r.me];return true}
