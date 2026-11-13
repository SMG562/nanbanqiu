/* ===================== Supabase 登录（5g）=====================
 * 只管手机号验证码登录；球局等业务数据仍走演示 api（接真后端时再换）。
 * SB_CFG.url 和 key 都填了才启用；留空 = 演示登录（任意号码、任意 6 位验证码），测试和预览站照旧。
 * 只用 Supabase Auth 的 REST 接口，不装 SDK：/auth/v1/otp · /verify · /token?grant_type=refresh_token · /logout。
 * key 只能填公开的 publishable / anon key（可以放前端）；service_role 绝不能出现在这里。
 * 登录态存在本机 localStorage（nbq_sb）；后端上线后改成 httpOnly Cookie（api_spec §0.1）。
 * 纯逻辑部分 sbAuthMake 不碰页面变量（unit/sb_auth 在空沙盒里载入测试）。 */
// 三套环境按域名选（11-03）：正式 nanbanqiu.app → 正式库；分支预览 <分支>.nanbanqiu-preview.pages.dev → 测试库（nanbanqiu-staging，Sydney）；
//   预览站根 nanbanqiu-preview.pages.dev → 正式库的登录 + 演示数据（旧行为不变）；本地文件、localhost、测试域名 → 演示登录
const SB_REAL={url:'https://xosrdkrkfxkdrwldfhac.supabase.co',key:'sb_publishable_zb-7Wwh8tc1Sd-JPSDvQiQ_ZQ9me97W'};
const SB_STAGING={url:'https://nqgyhjtwbvuxmyxvegkf.supabase.co',key:'sb_publishable_rSXyr_Faz1VjOUYJXwYgHg_s4KeKkUz'};   // 公开 key，可以放前端
function nbqEnvOf(h){h=String(h||'');
  if(/^(www\.)?nanbanqiu\.app$/.test(h))return 'prod';
  if(/^[a-z0-9-]+\.nanbanqiu-preview\.pages\.dev$/.test(h))return 'staging';
  if(/(^|\.)pages\.dev$/.test(h))return 'preview';
  return 'none'}
const NBQ_ENV=nbqEnvOf(typeof location!=='undefined'?location.hostname:'');
const SB_CFG=NBQ_ENV==='staging'?SB_STAGING:NBQ_ENV==='none'?{url:'',key:''}:SB_REAL;
const SB_ERR_MAP={over_sms_send_rate_limit:'otp_too_fast',over_request_rate_limit:'rate_limited',otp_expired:'otp_wrong',otp_disabled:'sms_failed',sms_send_failed:'sms_failed',phone_provider_disabled:'sms_failed',validation_failed:'otp_wrong',invalid_credentials:'otp_wrong',user_banned:'account_banned'};
// 只有登录这一步用得到的提示（不在后端接口的错误码表里）；其余沿用 apiErrText
const SB_TXT={sms_paused:'短信验证码暂时停发，请稍后再试',otp_wrong:'验证码不对或已过期，请重新输入',sms_failed:'短信暂时发不出去，请稍后再试',network:'网络不通，请检查后再试'};
const SB_PROF_KEYS=['name','last','ntrp','home_club_ids','gender','adult_confirmed_at','terms_version','privacy_version'];
function sbAuthMake(cfg,io){
  const K='nbq_sb',base=()=>String(cfg.url||'').replace(/\/+$/,'');
  const on=()=>!!(cfg.url&&cfg.key);
  const rd=k=>{try{return JSON.parse(io.store.get(k)||'null')}catch(_){return null}};
  const wr=(k,v)=>{try{io.store.set(k,JSON.stringify(v))}catch(_){}};
  const del=k=>{try{io.store.del(k)}catch(_){}};
  const codeOf=(st,d)=>{const c=d&&(d.error_code||d.code);if(typeof c==='string'&&SB_ERR_MAP[c])return SB_ERR_MAP[c];
    if(st===429)return 'rate_limited';if(st===400||st===401||st===403||st===422)return 'otp_wrong';return 'unknown'};
  async function call(path,body,token){
    let r;try{r=await io.fetch(base()+path,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.key,Authorization:'Bearer '+(token||cfg.key)},body:JSON.stringify(body||{})})}catch(_){return{ok:false,status:0,code:'network'}}
    let d=null;try{d=await r.json()}catch(_){}
    return r.ok?{ok:true,status:r.status,data:d}:{ok:false,status:r.status,code:codeOf(r.status,d)}}
  let inflight=null;   // 同一时刻只发一次刷新：并发刷新会让服务端以为令牌被盗用而撤销整个登录
  const keep=(d,old)=>{const s={access_token:d.access_token,refresh_token:d.refresh_token||(old&&old.refresh_token),
      expires_at:d.expires_at||Math.floor(io.now()/1000)+(d.expires_in||3600),uid:(d.user&&d.user.id)||(old&&old.uid),phone:(d.user&&d.user.phone)||(old&&old.phone)||''};wr(K,s);return s};
  return {
    on,
    // 发验证码；格式已由页面检查过，这里只管发
    async send(e164){const r=await call('/auth/v1/otp',{phone:e164,create_user:true});return r.ok?{ok:true}:{ok:false,code:r.code==='otp_wrong'?'sms_failed':r.code}},
    // 验证码登录：成功返回 {ok,uid}
    async verify(e164,token){const r=await call('/auth/v1/verify',{type:'sms',phone:e164,token:String(token)});
      if(!r.ok)return{ok:false,code:r.code};const d=r.data||{};if(!d.access_token||!d.user)return{ok:false,code:'unknown'};
      const s=keep(d,null);return{ok:true,uid:s.uid}},
    session(){return rd(K)},
    // 取有效登录态：快过期（60 秒内）就用 refresh token 换新；换不了（被撤销）清掉；断网保留，下次再试
    fresh(){const s=rd(K);if(!s||!on())return Promise.resolve(null);if(s.expires_at-io.now()/1000>60)return Promise.resolve(s);
      if(inflight)return inflight;
      inflight=(async()=>{
        const r=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});
        if(r.ok&&r.data&&r.data.access_token)return keep(r.data,s);
        // 只有服务端明确说令牌无效（400 / 401 / 403）才清掉登录；断网、限流（429）、服务端临时出错（5xx）都保留，下次再试
        if(r.status===400||r.status===401||r.status===403){del(K);return null}
        return s.expires_at>io.now()/1000?s:null})().finally(()=>{inflight=null});
      return inflight},
    async logout(){const s=rd(K);del(K);if(s&&on()){try{await call('/auth/v1/logout',{},s.access_token)}catch(_){}}},
    prof(uid){return uid?rd('nbq_prof_'+uid):null},
    setProf(uid,me){if(!uid||!me)return;const p={};SB_PROF_KEYS.forEach(k=>{if(me[k]!==undefined)p[k]=me[k]});wr('nbq_prof_'+uid,p)}
  }}

// 运行时开关（#49）：读 /api/switches，sms_paused 开 = 不向 Supabase 发码。读不到（断网、接口挂了、返回异常）一律当没暂停，不挡正常登录
async function sbSmsPaused(io){try{const r=await io.fetch('/api/switches',{method:'GET',cache:'no-store'});if(!r||!r.ok)return false;const d=await r.json();return !!(d&&d.switches&&d.switches.sms_paused===true)}catch(_){return false}}

/* ---- 页面接线（用到页面变量：toast、apiErrText、openOtp、openNewProfile、api、ME、render……）---- */
const SBA=sbAuthMake(SB_CFG,{fetch:(u,o)=>fetch(u,o),now:()=>Date.now(),
  store:{get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),del:k=>localStorage.removeItem(k)}});
let SBA_BUSY=false;
const sbaMsg=c=>SB_TXT[c]||apiErrText(c);
// 点「获取验证码 / 重新发送」：启用时先真发，成功才进验证码页；演示模式直接进
function sbaSendThen(next){if(!SBA.on()){next();return}
  if(SBA_BUSY)return;SBA_BUSY=true;
  sbSmsPaused({fetch:(u,o)=>fetch(u,o)}).then(p=>p?{ok:false,code:'sms_paused'}:SBA.send(AUTH.e164)).then(r=>{SBA_BUSY=false;if(r.ok)next();else toast(sbaMsg(r.code))})}
// 验证码输满 6 位
function sbaOtpDone(code){
  if(!SBA.on()){clearInterval(AUTH.t);openNewProfile();return}
  if(SBA_BUSY)return;SBA_BUSY=true;const o=$('#otp');if(o)o.readOnly=true;
  SBA.verify(AUTH.e164,code).then(r=>{SBA_BUSY=false;
    if(!r.ok){const x=$('#otp');if(x){x.readOnly=false;x.value='';x.focus()}toast(sbaMsg(r.code));return}
    clearInterval(AUTH.t);
    if(typeof NBQ_NET!=='undefined'&&NBQ_NET){nbqAfterLogin();return}   // 真实数据：资料在数据库里
    const p=SBA.prof(r.uid);
    if(!p){openNewProfile();return}   // 新号码：照旧填资料
    api.login(Object.assign({sb_uid:r.uid},p));toast('欢迎回来');   // 老用户：直接进
    const nx=AUTH.next;AUTH.next=null;typeof closeSheet==='function'?closeSheet():closeModal();render();if(nx)setTimeout(nx,380)})}
// 资料填完后记下，下次直接进（接真后端后这份资料由数据库给）
function sbaSaveProf(){const s=SBA.on()&&SBA.session();if(s&&ME)SBA.setProf(s.uid,ME)}
function sbaLogout(){if(typeof nbqSnapClear==='function')nbqSnapClear();NBQ_STALE=false;if(typeof NBQ_NET!=='undefined'&&NBQ_NET)nbqPushOff();if(SBA.on())SBA.logout();if(typeof NBQ_NET!=='undefined'&&NBQ_NET)nbqBoot()}   // 真实模式：清掉我的数据，重新读公开球局
let SBA_TRY=0;
// 打开页面：有登录态又有资料 → 自动登录；碰上网络没准备好（手机从后台冷启动常见）会重试，页面重新可见 / 网络恢复时也再试
// 本机有登录记录、正在把「我」读回来：页面右上角先画占位，不要闪一下「登录」（11-03）。读完、没有登录记录、或重试用完就不再等
let SBA_WAIT=true;
function sbaWaiting(){return SBA_WAIT&&!ME&&typeof NBQ_NET!=='undefined'&&!!NBQ_NET&&SBA.on()&&!!SBA.session()}
function sbaWaitHTML(){return '<div class="empty"><b>正在恢复登录…</b></div>'}   // 恢复中各处「需要登录」的区域画这个，不要画登录按钮
// 「需要登录」的区域一律走这个：已登录 → in()；恢复登录中 → wait（默认「正在恢复登录…」）；确定没登录 → out()。
// 新页面不要自己判断 !ME 去画登录按钮 / 「登录后…」——tests/static 会拦（11-03）
function authView(o){if(ME)return o.in?o.in():'';if(sbaWaiting())return o.wait!==undefined?o.wait:sbaWaitHTML();return o.out?o.out():''}
function sbaRetry(){if(SBA_TRY++<5)setTimeout(sbaRestore,1500*SBA_TRY);else{SBA_WAIT=false;render()}}
function sbaClosePrompt(){if(typeof $==='function'&&($('#ph')||$('#otp'))){typeof closeSheet==='function'?closeSheet():typeof closeModal==='function'&&closeModal()}}
function sbaRestore(){if(!SBA.on()||(ME&&!NBQ_STALE))return;
  if(typeof NBQ_NET!=='undefined'&&NBQ_NET){SBA.fresh().then(s=>{if(ME&&!NBQ_STALE)return;if(!s){if(SBA.session())sbaRetry();else{SBA_WAIT=false;nbqSnapDrop();render()}return}
    return nbqEnter().then(e=>{if(e.st==='ok'){SBA_TRY=0;SBA_WAIT=false;sbaClosePrompt();render()}   // 读入成功一定要重画：此时「我」已经被读进来，不能再用 if(ME)return 跳过（11-03：刷新后内存里是登录的、页面却还画着「登录」按钮）
      else if((!ME||NBQ_STALE)&&e.st==='error')sbaRetry();else{SBA_WAIT=false;if(e.st==='new')nbqSnapDrop();render()}})});return}
  SBA.fresh().then(s=>{if(!s||ME)return;const p=SBA.prof(s.uid);if(!p)return;api.login(Object.assign({sb_uid:s.uid},p));render()})}
function sbaWake(){if(!ME&&SBA.on()&&SBA.session()){SBA_TRY=0;sbaRestore()}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sbaWake()});
window.addEventListener('online',sbaWake);window.addEventListener('pageshow',sbaWake);
setTimeout(sbaRestore,0);
