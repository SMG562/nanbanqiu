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
    const tk=opt.noauth?null:await io.token();
    if(tk)h.Authorization='Bearer '+tk;else if(!opt.anon&&!opt.noauth)return{ok:false,status:401,code:'login_required'};
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
// 枚举字段进前台的统一检查（11-03）：库里的值不在前台认得的名单里 → 用兜底值，同时上报一条「未知枚举值」（进后台报错列表、冒烟测试会变红），不再悄悄当成有效值往下传
const NBQ_ENUM_SEEN=new Set();
function nbqEnum(field,val,allowed,fallback){if(allowed.includes(val))return val;
  if(val!=null&&!NBQ_ENUM_SEEN.has(field+'='+val)){NBQ_ENUM_SEEN.add(field+'='+val);
    try{if(typeof dispatchEvent==='function'&&typeof ErrorEvent==='function')dispatchEvent(new ErrorEvent('error',{message:'未知枚举值 '+field+'='+String(val).slice(0,40)}))}catch(_){}}
  return fallback}
// 印色：库里存色名（paper / red / coral…），前台画印用色值（#F4EFE3…）。两套名单：ZAVC（印色，paper 为默认）+ AVC（字母底色）。认不出一律回到纸白，绝不把色名直接当 CSS 颜色用（会画成黑色，11-03 教训）
function nbqColor(k){if(typeof k==='string'&&/^#[0-9a-f]{3,8}$/i.test(k))return k;
  const z=ZAVC.find(c=>c[0]===k);if(z)return z[1];const a=AVC.find(c=>c[0]===k);if(a)return a[2];return ZAVC[0][1]}
// 球友（me 或球友卡片）→ USERS 条目。姓 = last_initial；ntrp 字段在前台就是 UTR 数值
function nbqFromUser(u){if(!u)return null;
  return{id:u.id,no:u.member_no,name:u.nickname,last:u.last_initial||'',ntrp:u.utr,utr_estimated:!!u.utr_estimated,
    avatar_kind:nbqEnum('avatar_kind',u.avatar_kind||'letter',['letter','animal'],'letter'),animal:u.avatar_animal||'tiger',color:nbqColor(u.avatar_color),card_theme:u.card_theme==null?u.card_theme:nbqEnum('card_theme',u.card_theme,['court','hard','clay','grass','night'],'court'),seal_roll:u.seal_roll,wechat:u.wechat_id||undefined,invite_from:u.invite_from||undefined,email:u.mail_set?NBQ_EMAIL_SET:null,emPrefs:u.mail_prefs||undefined,
    played:u.played,hosted:u.hosted,kudos:u.kudos,level:u.level,gone:!!u.gone,gender:u.gender==null?null:nbqEnum('gender',u.gender,['f','m'],null),pact_at:u.pact_accepted_at?nbqMs(u.pact_accepted_at):null,home_club_ids:Array.isArray(u.club_ids)?u.club_ids:(u.card_venue_id?[u.card_venue_id]:[]),
    blocked:new Set(),base:{}}}
// 球场 → VEN 条目（接口的 suburb / surfaces 等原样带上）
function nbqFromVenue(v){const sf=Array.isArray(v.surfaces)&&v.surfaces.length?v.surfaces.map(x=>nbqEnum('surface',x,['hard','clay','synclay','grass','synthetic'],'hard')):['hard'];   // 接口是多选 surfaces；前台显示「红土 / 硬地」用 surfaces，surface 只是第一个（11-03：之前只带了第一个，多场地球场少显示）
  return{id:v.id,name:v.name,short:v.short_name||v.name,suburb:v.suburb,lat:v.lat,lng:v.lng,
  surface:sf[0],surfaces:sf,courts:v.courts,lights:!!v.lights,indoor:!!v.indoor,booking_url:v.booking_url||null}}
// 球局卡片 → GAMES 条目。前台沿用演示数据的形状：开始时间是 ISO 字符串，水平范围叫 ntrp_min / ntrp_max（值就是 UTR）；接口的 utr_min / utr_max 两个名字都留着
const nbqIso=t=>t==null?null:new Date(t).toISOString();
function nbqFromGame(g){return{...g,starts_at:nbqIso(g.starts_at),original_start:nbqIso(g.original_start),postponed_at:nbqIso(g.postponed_at),time_set_at:nbqIso(g.time_set_at),
  ntrp_min:g.utr_min,ntrp_max:g.utr_max,filled:g.filled||0,tags:g.tags||[],postponed:!!g.postponed_at}}
function nbqFromPart(p){return{game_id:p.game_id,user_id:p.user_id,role:p.role,status:p.status,message:p.message||'',
  reason:p.decline_reason||undefined,note:p.decline_note||undefined,change_ack:p.change_ack||undefined,
  created_at:nbqMs(p.created_at),approved_at:nbqMs(p.approved_at),left_at:nbqMs(p.left_at)}}
// 邀约（第 6 轮）：接口给具体的开始 / 结束时间，前台用「第几天 + 时:分」（o / t / e）。自填场地（只有 venue_name）用 'n:名字' 当 id
const nbqHM=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
function nbqInvSlot(s,e){const a=new Date(s),b=new Date(e),t0=new Date(typeof T0!=='undefined'?T0:Date.now());t0.setHours(0,0,0,0);   // 和页面的 dayAt 同一个「今天」(T0)
 const d=new Date(a);d.setHours(0,0,0,0);return{o:Math.round((d-t0)/864e5),t:nbqHM(a),e:nbqHM(b)}}
const nbqInvVid=(id,name)=>id||(name?'n:'+name:null);
function nbqFromInvite(i){const v=nbqInvVid(i.venue_id,i.venue_name),c=i.counter_starts_at&&i.counter_ends_at;
  return{id:i.id,from:i.from_user,to:i.to_user,...nbqInvSlot(i.starts_at,i.ends_at),venue_id:v,game_type:nbqEnum('game_type',i.game_type,['singles','rally','doubles'],'singles'),note:i.note||'',
    status:nbqEnum('invite_status',i.status,['pending','counter','accepted','declined','withdrawn','expired'],'expired'),
    counter:c?{...nbqInvSlot(i.counter_starts_at,i.counter_ends_at),venue_id:nbqInvVid(i.counter_venue_id,i.counter_venue_name)||v}:null,countered:!!i.countered_at,
    game_id:i.game_id||null,no:i.decline_reason||null,noNote:i.decline_note||'',
    at:i.expires_at?nbqMs(i.expires_at)-48*36e5:nbqMs(i.created_at),created_at:nbqMs(i.created_at),expires_at:nbqMs(i.expires_at),responded_at:nbqMs(i.responded_at)}}
// 自填场地放进场地表（点开邀约要显示名字），位置借用我的常去球场
function nbqInvVenues(VENS,invs,base){const put=id=>{if(id&&String(id).startsWith('n:')&&!VENS[id]){const b=VENS[base]||Object.values(VENS)[0]||{};VENS[id]={id,name:id.slice(2),short:id.slice(2),suburb:'自填场地',lat:b.lat,lng:b.lng,surface:'hard',surfaces:['hard'],custom:true}}};
  (invs||[]).forEach(i=>{put(i.venue_id);if(i.counter)put(i.counter.venue_id)})}

// 聊天（第 6 轮 6b）：会话列表一行 → 前台会话 + 一条「最后一句」占位消息（ph，点开会话才拉全部）；消息一行 → 前台消息
function nbqFromThread(t,me){return{id:t.id,type:t.kind==='dm'?'dm':'game',game_id:t.game_id||null,...(t.kind==='dm'?{members:[me,t.other_id]}:{}),srv:true}}
function nbqThreadLast(t,me){if(t.last_body==null||!t.last_at)return null;return{tid:t.id,from:t.last_sender||(t.unread?(t.other_id||''):me),text:t.last_body,at:nbqMs(t.last_at),ph:true}}
function nbqFromMsg(m,tid){return{tid,from:m.sender_id,text:m.body,at:nbqMs(m.created_at),id:Number(m.id)}}

// 补全：别人的球局只有卡片，没有参与记录。给每局补上发起人（资料没有时用卡片上的昵称 / UTR）和发起人的参与行；
// 其余已确认的人只知道人数，算进 filled（前台画成「已有球友」匿名头像），这样余位和接口的 spots_left 一致
function nbqCompose(games,parts,users){
  games.forEach(g=>{
    if(!users[g.host_id])users[g.host_id]=nbqFromUser({id:g.host_id,nickname:g.host_nickname,utr:g.host_utr});
    if(!parts.some(p=>p.game_id===g.id&&p.user_id===g.host_id))parts.push({game_id:g.id,user_id:g.host_id,role:'host',status:'approved',message:'',created_at:0});
    const known=parts.filter(p=>p.game_id===g.id&&p.status==='approved').length,unk=Math.max(0,(g.approved_count||0)-known);
    g.filled=(g.filled||0)+unk;g.unknown_n=unk})}
// 登录后一次读入。返回 {ok:true,registered:false} 表示新号码还没资料；任何一步失败 → {ok:false,code}，不留半份
async function nbqLoadAll(net){
  const [m,vs]=await Promise.all([net.get('/api/me'),net.get('/api/venues',null,{anon:true})]);
  if(!m.ok)return{ok:false,code:m.code};
  if(!m.data.registered)return{ok:true,registered:false,venues:vs.ok?(vs.data.venues||[]).map(nbqFromVenue):[]};
  const [pub,mine,inv,blk,aft]=await Promise.all([net.get('/api/games'),net.get('/api/games/mine'),net.get('/api/invites'),net.get('/api/blocks'),net.get('/api/me/after')]);   // 屏蔽名单 / 赛后记录读不到不算失败（按没有处理）
  for(const r of [vs,pub,mine,inv])if(!r.ok)return{ok:false,code:r.code};
  const users={},put=u=>{if(u&&u.id)users[u.id]=nbqFromUser(u)};
  put(m.data.user);[mine.data.profiles,inv.data.profiles,blk.ok&&blk.data.profiles].forEach(o=>Object.values(o||{}).forEach(put));
  const blocked=blk.ok?(blk.data.blocks||[]).map(b=>b.user_id):[];blocked.forEach(id=>{if(!users[id])put({id,nickname:'已屏蔽的球友'})});   // 名片读不到时用占位，名单里不会缺人
  const gm={};[...(pub.data.games||[]),...(mine.data.games||[])].forEach(g=>{gm[g.id]=nbqFromGame(g)});   // 同一局两边都有时以「我的」为准（后写覆盖）
  const games=Object.values(gm),parts=(mine.data.participants||[]).map(nbqFromPart);
  // 公开球局的发起人：取完整球员卡（头像等）；取不到的用卡片上的昵称兜底，不算失败
  const need=[...new Set(games.map(g=>g.host_id))].filter(id=>!users[id]);
  for(let i=0;i<need.length;i+=50){const pr=await net.get('/api/profiles',{ids:need.slice(i,i+50).join(',')});if(pr.ok)Object.values(pr.data.profiles||{}).forEach(put)}
  nbqCompose(games,parts,users);
  return{ok:true,registered:true,me:m.data.user.id,users,venues:(vs.data.venues||[]).map(nbqFromVenue),games,parts,blocked,invites:(inv.data.invites||[]).map(nbqFromInvite),after:aft.ok?aft.data:null}}
// 没登录：只读公开球局（不带令牌，服务端只给公开的、非女生局的）
async function nbqLoadPublic(net){
  const r=await net.get('/api/games',null,{noauth:true});if(!r.ok)return{ok:false,code:r.code};
  const games=(r.data.games||[]).map(nbqFromGame),parts=[],users={};nbqCompose(games,parts,users);
  return{ok:true,games,parts,users}}

// 通知（第 5 轮）：后端一行 {id, kind, game_id, actor_id, read_at, created_at} → 前台 NOTIFS 条目。
// 先接「由球局推出文案」的种类；邀约（要 invite_id）、赛后 / 徽章 / 等级 / 没到场（要附加内容）留给第 6 轮，读到也先不显示。
const NBQ_INV_KINDS=new Set(['invite','invite_counter','invite_accepted','invite_declined','invite_expired']);
const NBQ_NTF_KINDS=new Set(['request','approved','rejected','full','player_left','game_cancelled','joined','expired','unfilled','unfilled_end','postponed','changed','soon','reopen']);
function nbqFromNotif(r,me){return{id:Number(r.id),user_id:me,kind:r.kind,game_id:r.game_id||null,from:r.actor_id||null,at:nbqMs(r.created_at),invite_id:r.invite_id||null,read:!!r.read_at,srv:true,synced:!!r.read_at}}
// 过滤 + 转换（球局不在内存里的先不显示：文案要用球局的时间地点）。返回新到的在前，与前台 unshift 的顺序一致
// 邀约类通知要带 invite_id，且邀约已读入内存（invIds）；不传 invIds 就不显示邀约类
const nbqNtfOk=(r,gameIds,invIds)=>NBQ_INV_KINDS.has(r.kind)?!!(r.invite_id&&invIds&&invIds.has(r.invite_id)):!!(NBQ_NTF_KINDS.has(r.kind)&&r.game_id&&gameIds.has(r.game_id));
function nbqNtfList(rows,me,gameIds,invIds){return(rows||[]).filter(r=>nbqNtfOk(r,gameIds,invIds)).map(r=>nbqFromNotif(r,me))}
// 需要先补读球局的通知（球局不在内存里）
const nbqNtfNeedGames=(rows,gameIds,invIds)=>(rows||[]).some(r=>NBQ_INV_KINDS.has(r.kind)?!!(invIds&&r.invite_id&&!invIds.has(r.invite_id)):!!(NBQ_NTF_KINDS.has(r.kind)&&r.game_id&&!gameIds.has(r.game_id)));
// 还没告诉服务器的已读（本地点开 / 全部已读后 read=true，synced 还不是 true）
const nbqUnsyncedReads=list=>(list||[]).filter(n=>n.srv&&n.read&&!n.synced).map(n=>n.id);
// 推送公钥 base64url → Uint8Array（pushManager.subscribe 要这种形式）
function nbqKeyBytes(k){const p='='.repeat((4-String(k).length%4)%4),b=atob((String(k)+p).replace(/-/g,'+').replace(/_/g,'/')),o=new Uint8Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}

/* ---- 页面接线 ---- */
// 真实数据只在正式域名 nanbanqiu.app（含 www）启用，且登录模块已配置；预览站（pages.dev）登录是真的，数据仍是演示（10-30 定）。
// 演示模式 NBQ_NET 为 null，其余代码照旧。
const NBQ_REAL=typeof location!=='undefined'&&(NBQ_ENV==='prod'||NBQ_ENV==='staging')&&typeof SBA!=='undefined'&&SBA.on();   // 测试库（staging）与正式一样走真实数据，只是连的是测试库
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
  ME=USERS[r.me];if(ME)ME.blocked=new Set(r.blocked||[]);if(ME&&r.after)nbqApplyAfter(r.after,ME.id);INVITES.length=0;(r.invites||[]).forEach(i=>INVITES.push(i));nbqInvVenues(VEN,INVITES,(ME&&ME.home_club_ids||[])[0]);nbqRenderSoon();if(!NBQ_STALE)nbqSnapSoon();return true}

// 赛后记录（第 6 轮 6d）：我的多遇到 / 少遇到 → OPIN；近 7 天的赛后感受 → AFTER（读不到时保持原样，不清空）
function nbqApplyAfter(a,me){
  Object.keys(OPIN).forEach(k=>delete OPIN[k]);Object.keys(LESS_IV).forEach(k=>delete LESS_IV[k]);
  (a.prefs||[]).forEach(x=>{if(x.pref!=='more'&&x.pref!=='less')return;const k=me+'>'+x.target_id,at=nbqMs(x.updated_at)||Date.now();
    OPIN[k]={v:x.pref,at,gid:x.game_id||null};if(x.pref==='less')LESS_IV[k]=[[at,Infinity]]});
  // 我给别人留的印象（守时 / 友善…）：以服务器为准，刷新后还在
  [...KUDOS.keys()].forEach(k=>{if(k.startsWith(me+'|'))KUDOS.delete(k)});
  (a.impressions||[]).forEach(x=>{const ks=(x.kinds||[]).filter(Boolean);if(ks.length)KUDOS.set(me+'|'+x.to_id+'|'+x.game_id,ks)});
  // 我反馈过谁没来 / 我对爽约反馈的申诉：以服务器为准
  Object.keys(NS).forEach(k=>{if(NS[k])NS[k].delete(me)});Object.keys(NS_APPEAL).forEach(k=>{if(k.endsWith('|'+me))delete NS_APPEAL[k]});
  (a.noshows||[]).forEach(x=>{const k=x.game_id+'|'+x.target_id;(NS[k]=NS[k]||new Set()).add(me)});
  (a.appeals||[]).forEach(x=>{NS_APPEAL[x.game_id+'|'+me]={reason:x.reason,at:nbqMs(x.created_at)||0,status:x.status||'pending'}});
  Object.keys(AFTER).forEach(k=>{if(k.endsWith('|'+me))delete AFTER[k]});
  (a.feels||[]).forEach(f=>{AFTER[f.game_id+'|'+me]={feel:f.feel||null,closed:!!f.closed_at,at:nbqMs(f.closed_at)||0,notified:true,seen:true}})}
// 数据读入内存后一定要让页面跟着重画：放在 nbqApply 这一个出口里统一做，不靠每个调用的地方各自记得（11-03：刷新后内存里是登录、页面还画着「登录」按钮，就是某个调用处漏了）。
// 正在输入时不重画（免得打断）；同一时刻多次读入只画一次
let NBQ_RT=0;
function nbqRenderSoon(){if(NBQ_RT)return;NBQ_RT=setTimeout(()=>{NBQ_RT=0;const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;try{render()}catch(e){}},0)}
/* ---- 登录快照（先画上次的、后台再更新；Gmail 同款）----
   刷新时本机有登录记录，就用上次读到的数据立刻画成登录状态，同时后台验证令牌、读最新数据，读完静默换上。
   没有快照（第一次、退出后、换了账号）才走「正在恢复登录…」占位。快照只存这台设备、和令牌同处；退出登录 / 令牌失效必清。
   快照里的数据可能是旧的：NBQ_STALE=true 期间写操作不放行（先等最新数据读回来）。 */
const NBQ_SNAP_K='nbq_snap',NBQ_SNAP_V=1,NBQ_SNAP_AGE=7*864e5;
let NBQ_STALE=false,NBQ_SS=0;
const nbqSetJ=(k,v)=>v instanceof Set?{__set:[...v]}:v,nbqSetR=(k,v)=>v&&typeof v==='object'&&Array.isArray(v.__set)?new Set(v.__set):v;
function nbqSnapSave(){try{const s=SBA.on()&&SBA.session();if(!s||!ME||NBQ_STALE)return;
  const r={me:ME.id,users:USERS,venues:Object.values(VEN),games:GAMES,parts:PARTS};
  const t=JSON.stringify({v:NBQ_SNAP_V,uid:s.uid,at:Date.now(),r,notifs:NOTIFS},nbqSetJ);if(t.length<1.5e6)localStorage.setItem(NBQ_SNAP_K,t)}catch(e){}}
function nbqSnapSoon(){if(NBQ_SS)return;NBQ_SS=setTimeout(()=>{NBQ_SS=0;nbqSnapSave()},800)}
function nbqSnapClear(){try{localStorage.removeItem(NBQ_SNAP_K)}catch(e){}}
// 启动时同步读快照并画上；成功返回 true。快照和当前登录记录不是同一个人 / 太旧 / 版本不对，一律丢掉
function nbqSnapLoad(){try{const s=SBA.on()&&SBA.session();const t=localStorage.getItem(NBQ_SNAP_K);if(!t)return false;
  const o=JSON.parse(t,nbqSetR);if(!s||!o||o.v!==NBQ_SNAP_V||o.uid!==s.uid||Date.now()-o.at>NBQ_SNAP_AGE||!o.r||!o.r.users||!o.r.users[o.r.me]){nbqSnapClear();return false}
  const r=Object.assign({ok:true,registered:true,venues:[],games:[],parts:[]},o.r);r.venues=r.venues.map(v=>v);
  if(!nbqApply(r)){nbqSnapClear();return false}
  if(Array.isArray(o.notifs))NOTIFS.splice(0,NOTIFS.length,...o.notifs);NBQ_STALE=true;return true}catch(e){nbqSnapClear();nbqClear();return false}}
// 快照画出来之后发现登录其实已失效 / 退出：回到未登录
function nbqSnapDrop(){nbqSnapClear();if(NBQ_STALE){NBQ_STALE=false;nbqClear();if(typeof NBQ_NET!=='undefined'&&NBQ_NET)nbqBoot()}}
// 启动（两端 seed() 之后调用）：真实模式先清掉演示数据；球场和公开球局不用登录，先读进来（新用户选 Home Club 要用球场）
async function nbqBoot(){if(!NBQ_NET)return;nbqClear();nbqSnapLoad();
  const [v,pub]=await Promise.all([NBQ_NET.get('/api/venues',null,{anon:true}),nbqLoadPublic(NBQ_NET)]);
  if(ME)return;   // 读的时候已经登录进来了，以登录后读入的为准
  if(v.ok){Object.keys(VEN).forEach(k=>delete VEN[k]);(v.data.venues||[]).forEach(x=>{VEN[x.id]=nbqFromVenue(x)})}
  if(pub.ok){Object.assign(USERS,pub.users);pub.games.forEach(g=>GAMES.push(g));pub.parts.forEach(p=>PARTS.push(p))}
  render()}
// 登录后进入：{st:'ok'} 已有资料并读入 · {st:'new'} 新号码还没资料 · {st:'error',code}
async function nbqEnter(){const r=await nbqLoadAll(NBQ_NET);
  if(!r.ok)return{st:'error',code:r.code};
  if(!r.registered)return{st:'new'};
  NBQ_STALE=false;nbqApply(r);nbqNtfStart();nbqPushState();nbqPullNotifs().then(nbqOpenFromPush);nbqPullThreads().then(c=>{if(c)nbqRenderSoon();if(NBQ_PUSH_T&&!NBQ_PUSH_T_DONE)nbqOpenFromPush()});nbqPushSub();return{st:'ok'}}
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

/* ---- 球局写操作（4b）：先调接口，成功后重新读入「我的球局 + 公开球局」，以服务器为准；失败提示错误码并同步一次 ---- */
// 重新读入（保持登录；读不到就保留现有数据）
async function nbqRefresh(){const r=await nbqLoadAll(NBQ_NET);if(r.ok&&r.registered){NBQ_STALE=false;nbqApply(r);return true}return false}
const NBQ_BUSY=new Set();   // 同一个操作进行中不重复提交（连点）
// call: net => Promise<{ok,data,code,...}>；返回成功时的 data，失败返回 null（已提示）
async function nbqWrite(key,call){
  if(NBQ_STALE){toast('正在更新数据，请稍等一下再试');if(typeof sbaRestore==='function')sbaRestore();return null}   // 画的是上次的快照，不拿旧数据去写
  if(NBQ_BUSY.has(key))return null;NBQ_BUSY.add(key);
  try{const r=await call(NBQ_NET);
    if(!r.ok){if(r.code!=='login_required')toast(apiErrText(r.code));if(r.status>0&&r.code!=='login_required')await nbqRefresh();render();return null}
    await nbqRefresh();return r.data||{}}
  finally{NBQ_BUSY.delete(key)}}
// 我的 Club：接口一次最多 3 个（PUT /api/me/clubs）；改完走 nbqWrite 重读，页面上的「我的 Club」以服务器为准（11-03：之前只改内存，刷新就丢，真实模式下也不会显示）
// 资料类修改（11-03）：前台先改内存（立刻看到），再写到服务器；之前只改内存，刷新就回到旧值（印章颜色 / 动物 / 卡面主题 / 微信号 / 邀约限制 / 性别 / 邮箱）
const NBQ_EMAIL_SET='（已保存）';   // 接口出于隐私不返回邮箱本身，只告诉前台「设置过」
const nbqOn=()=>typeof NBQ_NET!=='undefined'&&!!NBQ_NET;
const nbqColorName=h=>{const z=ZAVC.find(c=>c[1].toLowerCase()===String(h).toLowerCase());return z?z[0]:'paper'};
const nbqPatchMe=(key,body)=>nbqWrite('me'+key,n=>n.patch('/api/me',body));
// 返回 true = 现在不能改（正在用旧快照）；调用处直接 return
const nbqCardBlocked=()=>{if(nbqOn()&&NBQ_STALE){toast('正在更新数据，请稍等一下再试');return true}return false};
let NBQ_CARD_T=0;
// 球员卡 / 头像：连点换色时合并成一次保存（取点击当时的值，中途重读也不会丢）
function nbqSaveCard(){if(!nbqOn()||!ME)return;
  const body={avatar_kind:ME.avatar_kind||'letter',avatar_animal:ME.animal||null,avatar_color:nbqColorName(ME.color),seal_roll:ME.seal_roll||0,card_theme:ME.card_theme||'court'};
  clearTimeout(NBQ_CARD_T);NBQ_CARD_T=setTimeout(async()=>{const r=await NBQ_NET.patch('/api/me',body);if(!r.ok){if(r.code!=='login_required')toast('没保存上：'+apiErrText(r.code));await nbqRefresh();render()}},500)}
const CLUB_MAX=3;
const nbqSetClubs=ids=>nbqWrite('clubs',n=>n.put('/api/me/clubs',{venue_ids:[...new Set(ids)].slice(0,CLUB_MAX)}));
const nbqApplyReq=(id,msg)=>nbqWrite('apply'+id,n=>n.post('/api/games/'+id+'/requests',{message:msg||''}));
const nbqJoin=id=>nbqWrite('join'+id,n=>n.post('/api/games/'+id+'/join'));
const nbqLeave=id=>nbqWrite('leave'+id,n=>n.del('/api/games/'+id+'/requests/me'));
const nbqCancel=id=>nbqWrite('cancel'+id,n=>n.post('/api/games/'+id+'/cancel'));
const nbqApprove=(id,uid)=>nbqWrite('dec'+id+uid,n=>n.post('/api/games/'+id+'/requests/'+uid+'/approve'));
// 婉拒原因：前台的 full / friends → known，level → level，next / 其他 → pass（后端只有 known | level | pass）
const nbqReason=r=>({full:'known',friends:'known',known:'known',level:'level'})[r]||'pass';
const nbqDecline=(id,uid,reason,note)=>nbqWrite('dec'+id+uid,n=>n.post('/api/games/'+id+'/requests/'+uid+'/decline',{reason:nbqReason(reason),note:(note||'').slice(0,30)}));
// 发局：前台表单 → 接口参数。每周重复（rep）和「约满后不再公开」（hide）后端还没有，真实模式先不带
function nbqCreateBody(f){return{venue_id:f.venue_id,starts_at:dayAt(f.o,f.t).toISOString(),duration_min:f.dur,game_type:f.type,utr_min:f.mn,utr_max:f.mx,
  note:(f.note||'').trim().slice(0,60),tags:[...f.tags],join_mode:ugMode(f),filled:f.type==='doubles'?3-f.miss:0}}
// 改局：只带接口认的字段（时间 / 时长 / 场地 / 水平 / 备注 / 标签 / 加入方式 / 双打缺几人）；玩法和「约满后不再公开」接口还没有，geSave 先挡住
function nbqEditBody(f,ns,apCount){const b={starts_at:ns.toISOString(),duration_min:f.dur,venue_id:f.venue_id,utr_min:f.mn,utr_max:f.mx,
  note:(f.note||'').trim().slice(0,60),tags:[...f.tags],join_mode:ugMode(f)};
  if(f.type==='doubles')b.filled=Math.max(0,CAP.doubles-apCount-f.miss);return b}
const nbqEdit=(id,body)=>nbqWrite('edit'+id,n=>n.patch('/api/games/'+id,body));
const nbqPostpone=id=>nbqWrite('postpone'+id,n=>n.post('/api/games/'+id+'/postpone'));
const nbqAck=(id,choice)=>nbqWrite('ack'+id,n=>n.post('/api/games/'+id+'/change-ack',{choice}));
async function nbqCreate(f){const d=await nbqWrite('create',n=>n.post('/api/games',nbqCreateBody(f)));return d&&d.id||null}

/* ---- 邀约写操作（第 6 轮）：先调接口，成功后重读（以服务器为准）；失败提示错误码，邀约卡 / 表单留在原处 ---- */
const nbqInvVen=id=>{const v=VEN[id];return v&&v.custom?{venue_name:v.name}:{venue_id:id}};   // 自填场地只传名字
const nbqInvTimes=p=>({starts_at:dayAt(p.o,p.t).toISOString(),ends_at:dayAt(p.o,p.e).toISOString()});
const nbqInvBack=()=>{if(IVP&&invOf(IVP.id))drawInvite();else INV_CLOSE()};
async function nbqInviteSend(f,doneHTML){
  const d=await nbqWrite('invsend'+f.to,n=>n.post('/api/invites',{to_user:f.to,...nbqInvTimes(f),...nbqInvVen(f.venue_id),game_type:f.game_type,note:(f.note||'').trim().slice(0,30)}));
  if(!d)return;track('invite_send',{invite_id:d.id,target_uid:f.to,played_together:playedTogether(ME.id,f.to)});IVF=null;INV_OPEN(doneHTML);INV_RENDER()}
async function nbqInviteAccept(i){
  const d=await nbqWrite('invacc'+i.id,n=>n.post('/api/invites/'+i.id+'/accept'));if(!d)return nbqInvBack();
  track('invite_accept',{invite_id:i.id});INV_CLOSE();toast('已生成私人球局 🎾');INV_RENDER();if(d.game_id)setTimeout(()=>INV_GAME(d.game_id),300)}
async function nbqInviteCounter(i,f){
  const d=await nbqWrite('invctr'+i.id,n=>n.post('/api/invites/'+i.id+'/counter',{...nbqInvTimes(f),...nbqInvVen(f.venue_id)}));if(!d)return;
  track('invite_counter_send',{invite_id:i.id});IVF=null;INV_CLOSE();toast('已发回给对方确认');INV_RENDER()}
async function nbqInviteDecline(i,why,note){
  const d=await nbqWrite('invno'+i.id,n=>n.post('/api/invites/'+i.id+'/decline',{reason:['week','rest','pass'].includes(why)?why:'pass',note:note||''}));if(!d)return nbqInvBack();
  track('invite_decline',{invite_id:i.id,reason:why||'pass',has_note:!!note});INV_CLOSE();toast('已婉拒');INV_RENDER()}
async function nbqInviteWithdraw(i){
  const was=i.status==='counter'&&i.to===ME.id?'counter':'invite',d=await nbqWrite('invwd'+i.id,n=>n.post('/api/invites/'+i.id+'/withdraw'));if(!d)return nbqInvBack();
  track('invite_withdraw',{invite_id:i.id,what:was});INV_RENDER();if(was==='counter'){toast('已撤回新时间');drawInvite()}else{toast('已撤回');INV_CLOSE()}}


/* ---- 赛后（第 6 轮 6d）：感受 / 多遇到·随缘·少遇到 / 好了 都先调接口，成功后重读（以服务器为准）。对方不会收到任何通知 ---- */
const nbqRecap=(gid,body,key)=>nbqWrite('rc'+(key||gid),n=>n.put('/api/games/'+gid+'/recap',body));
async function nbqRecapPref(gid,uid,v){const d=await nbqRecap(gid,{prefs:{[uid]:v}},gid+uid);return !!d}
async function nbqRecapFeel(gid,v){const d=await nbqRecap(gid,{feel:v},gid+'feel');return !!d}
// 给球友留印象：整组替换（空数组 = 撤回），成功后重读；都点个赞：对同局每位还没点过的人各记一次「友善」
async function nbqRecapImp(gid,uid,kinds){const d=await nbqRecap(gid,{impressions:{[uid]:kinds}},gid+uid+'imp');return !!d}
async function nbqKudosAll(gid,uids){if(NBQ_STALE){toast('正在更新数据，请稍等一下再试');return false}const k='kall'+gid;if(NBQ_BUSY.has(k))return false;NBQ_BUSY.add(k);
  try{for(const u of uids){const r=await NBQ_NET.post('/api/players/'+u+'/kudos',{game_id:gid});if(!r.ok&&r.code!=='login_required'){toast(apiErrText(r.code));break}}await nbqRefresh();return true}finally{NBQ_BUSY.delete(k)}}
// 反馈「TA 没来」（可撤回）/ 被反馈后申诉：先调接口，成功后重读；对方是否收到通知由服务器按规则决定，前台不再本地造通知
async function nbqNoshow(gid,uid,on){const d=await nbqWrite('ns'+gid+uid,n=>on?n.post('/api/games/'+gid+'/noshow',{target_id:uid}):n.del('/api/games/'+gid+'/noshow',{target_id:uid}));
  if(d)track(on?'noshow_report':'noshow_undo',{game_id:gid,target_uid:uid});return !!d}
async function nbqNoshowAppeal(gid,reason){const d=await nbqWrite('nsa'+gid,n=>n.post('/api/games/'+gid+'/appeal',{reason}));if(d)track('noshow_appeal',{game_id:gid,reason});return !!d}
async function nbqRecapDone(gid){return !!(await nbqRecap(gid,{done:true},gid+'done'))}
async function nbqPrefSet(uid,v){const d=await nbqWrite('pref'+uid,n=>n.put('/api/players/'+uid+'/pref',{pref:v}));return !!d}


/* ---- 屏蔽 / 举报（第 6 轮 6c）：先调接口，成功才改页面；屏蔽名单登录时读入，刷新不丢 ---- */
async function nbqBlock(uid,on){const d=await nbqWrite('blk'+uid,n=>on?n.post('/api/blocks',{user_id:uid}):n.del('/api/blocks/'+uid));
  if(!d)return false;track(on?'user_block':'user_unblock',{target_uid:uid});return true}
async function nbqReportSend(c,reason,note){const k='rep'+c.type+c.id;if(NBQ_BUSY.has(k))return false;NBQ_BUSY.add(k);
  try{const r=await NBQ_NET.post('/api/reports',{target_type:c.type,target_id:c.id,reason,note:note||'',via:c.via,...(c.ctx?{context_ref:String(c.ctx)}:{})});
    if(!r.ok){if(r.code!=='login_required')toast(apiErrText(r.code));return false}return true}
  finally{NBQ_BUSY.delete(k)}}

/* ---- 聊天（第 6 轮 6b）：会话列表 / 消息读自服务器；发消息先调接口，成功才显示；每 45 秒（和通知一起）读会话列表，开着会话时每 8 秒读新消息 ---- */
async function nbqMissingUsers(ids){const miss=[...new Set(ids.filter(id=>id&&!USERS[id]))];
  for(let i=0;i<miss.length;i+=50){const pr=await NBQ_NET.get('/api/profiles',{ids:miss.slice(i,i+50).join(',')});if(pr.ok)Object.values(pr.data.profiles||{}).forEach(u=>{if(u&&u.id)USERS[u.id]=nbqFromUser(u)})}}
// 读会话列表。返回有没有变化（最后一句 / 未读 / 会话数）
async function nbqPullThreads(){if(!NBQ_NET||!ME)return false;
  const r=await NBQ_NET.get('/api/threads');if(!r.ok)return false;const rows=r.data.threads||[],me=ME.id;
  await nbqMissingUsers(rows.flatMap(t=>[t.other_id,t.last_sender]));
  const sig=()=>THREADS.filter(t=>t.srv).map(t=>{const m=lastMsg(t);return t.id+'|'+(m?m.at+m.text:'')+'|'+cxUnread(t)}).join(',');
  const before=sig();
  THREADS.splice(0,THREADS.length,...rows.map(t=>nbqFromThread(t,me)),...THREADS.filter(t=>t.tmp));
  rows.forEach(t=>{const ph=nbqThreadLast(t,me);
    for(let i=MSGS.length-1;i>=0;i--)if(MSGS[i].tid===t.id&&MSGS[i].ph)MSGS.splice(i,1);
    if(ph&&!MSGS.some(m=>m.tid===t.id&&!m.ph&&m.at>=ph.at)){MSGS.push(ph);if(CXCUR!==t.id)LASTREAD[me+'|'+t.id]=t.unread?ph.at-1:ph.at}});
  return before!==sig()}
// 读一个会话的消息（最近 50 条），换掉占位；返回有没有新消息
async function nbqLoadMsgs(t){const r=await NBQ_NET.get('/api/threads/'+t.id+'/messages');if(!r.ok)return false;
  const list=r.data.messages||[];await nbqMissingUsers(list.map(m=>m.sender_id));
  const had=MSGS.filter(m=>m.tid===t.id&&!m.ph).length;
  for(let i=MSGS.length-1;i>=0;i--)if(MSGS[i].tid===t.id)MSGS.splice(i,1);
  list.forEach(m=>MSGS.push(nbqFromMsg(m,t.id)));return list.length!==had}
// 点开会话：本地临时会话先在服务器建好（私信 / 球局群聊），再读消息、标已读、画出来
async function nbqThreadOpen(tid){let t=THREADS.find(x=>x.id===tid);if(!t)return;
  if(t.tmp){const r=await NBQ_NET.post('/api/threads',t.type==='dm'?{user_id:cxOther(t)}:{game_id:t.game_id});
    if(!r.ok){toast(apiErrText(r.code));return}
    const ex=THREADS.find(x=>x.id===r.data.id&&x!==t);if(ex){THREADS.splice(THREADS.indexOf(t),1);t=ex}else{t.id=r.data.id;delete t.tmp;t.srv=true}}
  await nbqLoadMsgs(t);NBQ_NET.post('/api/threads/'+t.id+'/read');cxDraw(t.id)}
async function nbqSendMsg(t,text){const k='msg'+t.id;if(NBQ_BUSY.has(k))return;NBQ_BUSY.add(k);
  try{const r=await NBQ_NET.post('/api/threads/'+t.id+'/messages',{body:text});
    if(!r.ok){if(r.code!=='login_required')toast(apiErrText(r.code));return}   // 没发出去：输入框里的字留着
    MSGS.push({tid:t.id,from:ME.id,text,at:Date.now(),id:r.data.id});LASTREAD[ME.id+'|'+t.id]=Date.now();cxDraw(t.id);track('chat_send',{type:t.type,quick:QUICK.includes(text)})}
  finally{NBQ_BUSY.delete(k)}}
// 开着会话时读新消息；有新的就重画（输入框里写了一半的字和光标保留）
async function nbqChatLive(){if(!NBQ_NET||!ME||!CXCUR||document.visibilityState!=='visible')return;const t=THREADS.find(x=>x.id===CXCUR);if(!t||t.tmp||!document.getElementById('cxMsgs'))return;
  if(!await nbqLoadMsgs(t))return;const i=document.getElementById('cxIn'),v=i?i.value:'',f=i&&document.activeElement===i;
  NBQ_NET.post('/api/threads/'+t.id+'/read');cxDraw(t.id);const n=document.getElementById('cxIn');if(n&&v){n.value=v;if(f)n.focus()}}

/* ---- 通知（第 5 轮）：列表 / 未读 / 已读同步、推送订阅、埋点上报 ---- */
// 真实模式下通知由服务器生成（球局上的动作触发），前台不再自己造：本地的 notify / notifyInv 直接不动作
if(NBQ_NET){notify=function(){};notifyInv=function(){}}
// 读通知：整份换进 NOTIFS。有通知指向内存里没有的球局（别人刚发的 / 刚被同意的）→ 先重新读入球局再转换。返回有没有新的未读
let NBQ_PULL_P=null;   // 正在读的那一次；别处同时要读时等它读完，不要直接返回「没有新的」（点推送打开通知页时曾因此看到空列表）
async function nbqPullNotifs(){if(!NBQ_NET||!ME)return false;
  if(NBQ_PULL_P){try{await NBQ_PULL_P}catch(e){}return false}
  NBQ_PULL_P=(async()=>{await nbqFlushReads();
    const r=await NBQ_NET.get('/api/notifications');if(!r.ok)return false;
    let rows=r.data.notifications||[];const invIds=()=>new Set(INVITES.map(i=>i.id));if(nbqNtfNeedGames(rows,new Set(GAMES.map(g=>g.id)),invIds()))await nbqRefresh();
    const before=new Set(NOTIFS.filter(n=>!n.read).map(n=>n.id)),list=nbqNtfList(rows,ME.id,new Set(GAMES.map(g=>g.id)),invIds());
    NOTIFS.splice(0,NOTIFS.length,...list);
    const fresh=list.some(n=>!n.read&&!before.has(n.id));
    if(fresh)await nbqRefresh();   // 有新通知就同时重读球局（申请人、同意状态都在那里），不管是谁调用的
    nbqSnapSoon();if(typeof nrBadge==='function')nrBadge();return fresh})();
  try{return await NBQ_PULL_P}finally{NBQ_PULL_P=null}}
// 已读同步：本地标记已读后，攒着一起告诉服务器（每次最多 200 条）
async function nbqFlushReads(){if(!NBQ_NET||!ME)return;const ids=nbqUnsyncedReads(NOTIFS);
  for(let i=0;i<ids.length;i+=200){const part=ids.slice(i,i+200),r=await NBQ_NET.post('/api/notifications/read',{ids:part});
    if(r.ok)NOTIFS.forEach(n=>{if(part.includes(n.id))n.synced=true})}}
let NBQ_NTF_T=null;
// 每 45 秒 / 页面重新可见 / 网络恢复时跑一次：读通知；有新的未读 → 同时重新读入球局（对方同意 / 婉拒 / 取消后，这里的状态才跟着变）→ 刷新红点和页面（正在输入时不重画，免得打断）
async function nbqNtfTick(){if(!NBQ_NET||!ME||document.visibilityState!=='visible')return;
  const ch=await nbqPullThreads();
  if(await nbqPullNotifs()||ch){if(typeof nrBadge==='function')nrBadge();
    const a=document.activeElement;if(!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))render()}}
function nbqNtfStart(){if(!NBQ_NET||NBQ_NTF_T)return;
  NBQ_NTF_T=setInterval(nbqNtfTick,45000);setInterval(nbqFlushReads,5000);setInterval(nbqChatLive,8000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')nbqNtfTick();else nbqFlushReads()});
  addEventListener('online',nbqNtfTick)}
// 推送订阅：登录后若已允许通知就（重新）订阅一次；用户点「开启通知」允许后也订阅。公钥由服务器给（没配 = 安静跳过）
let NBQ_PUSH_WHY='';   // 最近一次推送订阅没成功的原因（提示给用户 / 排查用）：permission / unsupported / key / sw / subscribe / api
async function nbqPushSub(){NBQ_PUSH_WHY='';if(!NBQ_NET||!ME)return false;
  if(NR_PLAT==='desktop'){NBQ_PUSH_WHY='desktop';return false}   // 11-03 你定的：电脑端不订阅推送，提醒只推手机
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){NBQ_PUSH_WHY='unsupported';return false}
  if(Notification.permission!=='granted'){NBQ_PUSH_WHY='permission';return false}
  let step='key';
  try{const k=await NBQ_NET.get('/api/push/key',null,{anon:true});if(!k.ok||!k.data.key){NBQ_PUSH_WHY='key';return false}
    step='sw';const reg=await navigator.serviceWorker.register('/sw.js');
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,no)=>setTimeout(()=>no(new Error('sw_timeout')),10000))]);   // 装不上就别一直等
    step='subscribe';let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:nbqKeyBytes(k.data.key)});
    step='api';const j=sub.toJSON(),r=await NBQ_NET.post('/api/push/subscriptions',{endpoint:j.endpoint,keys:j.keys,platform:NR_PLAT==='mobile'?'mobile':'desktop'});
    if(r.ok){PUSH.enabled=true;return true}NBQ_PUSH_WHY='api:'+r.code;return false}catch(_){NBQ_PUSH_WHY=step;return false}}
// 重新打开页面时，先看这台设备是不是已经订阅过：是 → 马上显示「已开启」、不再露出「开启提醒」卡片（订阅 / 上报要等 Service Worker 就绪，慢）
async function nbqPushState(){try{if(!NBQ_NET||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)||Notification.permission!=='granted')return;
  const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();
  if(sub&&!PUSH.enabled){PUSH.enabled=true;if(typeof render==='function')render()}
  nbqPushHeal()}catch(e){}}   // 已允许通知：再核对服务器里有没有这台设备，没有就静默补订阅（0496）
// 推送自检（11-03）：本人设备订阅状态 + 最近提醒去向；把本机推送地址放请求体里，让服务器标出「这台设备」
async function nbqPushDiag(){if(!NBQ_NET||!ME)return null;let ep=null;
  try{if('serviceWorker'in navigator&&'PushManager'in window){const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();ep=sub?sub.endpoint:null}}catch(_){}
  const r=await NBQ_NET.post('/api/me/push-diag',{endpoint:ep});return r.ok?r.data:null}
// 退出登录前（令牌还在）：告诉服务器这台设备不再收推送，并取消浏览器里的订阅
async function nbqPushOff(){if(!NBQ_NET||!('serviceWorker'in navigator))return;
  const s=SBA.session(),tk=s&&s.access_token;
  try{const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(!sub)return;
    if(tk)await fetch('/api/push/subscriptions',{method:'DELETE',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint}),keepalive:true});
    await sub.unsubscribe()}catch(_){}}
// 埋点：已登录且令牌还新鲜就带令牌发（服务端才认 user_id）；否则交回 sendBeacon（匿名，登录后靠 login_success 关联）。返回 true = 已发
function nbqEventsSend(batch){if(!NBQ_NET||!ME)return false;
  const s=SBA.session();if(!s||!(s.expires_at-Date.now()/1000>30))return false;
  try{fetch('/api/events',{method:'POST',keepalive:true,headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({v:2,events:batch})}).catch(()=>{});return true}catch(_){return false}}
// 手机号已验证、但新号码还没填资料就把资料卡划掉了：再点「登录 / 注册」直接回到填资料，不再要一遍验证码
if(NBQ_NET){const _oa=openAuth;openAuth=function(next,why){
  if(!ME&&SBA.session()){AUTH.next=next||null;nbqEnter().then(e=>{if(e.st==='new')openNewProfile();else if(e.st==='ok'){render();if(next)setTimeout(next,380)}else _oa(next,why)});return}
  return _oa.apply(this,arguments)}}

// 点「申请加入」通知：内存里没有这条申请（还是旧数据）就先重读一次，再打开球局并定位到申请人，避免只看到球局详情却没有同意 / 婉拒
if(NBQ_NET&&typeof nrOpen==='function'){const _nbqNo=nrOpen;nrOpen=function(n){
  if(n&&n.kind==='request'&&n.from&&!PARTS.some(p=>p.game_id===n.game_id&&p.user_id===n.from&&p.status==='pending')){const a=arguments,t=this;nbqRefresh().then(()=>_nbqNo.apply(t,a));return}
  return _nbqNo.apply(this,arguments)};if(NR_PLAT==='mobile')ntfOpen=nrOpen}

// 点推送通知打开：地址带 ?n=<通知 id>（sw.js 加的）。登录读入后，手机端直接打开「消息 → 通知」页（申请的接受 / 婉拒按钮就在那一行）；
// 埋点那边会在启动时把 n / k 从地址栏去掉，所以这里在脚本加载时先记下
const NBQ_PUSH_N=(()=>{try{return new URL(location.href).searchParams.get('n')}catch(e){return null}})();
let NBQ_PUSH_DONE=false;
const NBQ_PUSH_T=(()=>{try{return new URL(location.href).searchParams.get('t')}catch(e){return null}})();   // 新消息推送：?t=<会话 id>，点开直接进那个会话
// 打开推送指向的会话：先读会话列表（会话可能是刚建的），找不到就算了
async function nbqOpenThreadFromPush(tid){if(!NBQ_NET||!ME||!tid)return false;
  if(!THREADS.some(t=>t.id===tid))await nbqPullThreads();
  if(!THREADS.some(t=>t.id===tid))return false;
  try{closeSheet&&closeSheet()}catch(e){}try{UI.detail&&closeDetail&&closeDetail()}catch(e){}
  openThread(tid);return true}
let NBQ_PUSH_T_DONE=false;
function nbqOpenFromPush(force){if(!ME||(!force&&(NBQ_PUSH_DONE||!NBQ_PUSH_N)))return;
  if(NBQ_PUSH_T&&!NBQ_PUSH_T_DONE){NBQ_PUSH_T_DONE=true;NBQ_PUSH_DONE=true;nbqOpenThreadFromPush(NBQ_PUSH_T);return}   // 新消息的推送：去会话，不去通知页
  NBQ_PUSH_DONE=true;
  if(typeof go==='function'&&typeof UI!=='undefined'&&typeof NR_PLAT!=='undefined'&&NR_PLAT==='mobile'){try{closeSheet&&closeSheet();UI.detail&&closeDetail&&closeDetail()}catch(e){}UI.msgTab='ntf';go('notif')}}
// 页面已经开着时点推送：Service Worker 不再让页面整个重新加载（会闪过入口页、发现页），而是发一条消息过来，这里读新通知再切到通知页
if(NBQ_NET&&'serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(!e.data||e.data.type!=='nbq_open_notif')return;if(e.data.kind==='chat'&&e.data.thread_id){nbqOpenThreadFromPush(e.data.thread_id);return}nbqPullNotifs().then(()=>nbqOpenFromPush(true))});
