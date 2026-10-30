/* ===================== Supabase 登录（5g）=====================
 * 只管手机号验证码登录；球局等业务数据仍走演示 api（接真后端时再换）。
 * SB_CFG.url 和 key 都填了才启用；留空 = 演示登录（任意号码、任意 6 位验证码），测试和预览站照旧。
 * 只用 Supabase Auth 的 REST 接口，不装 SDK：/auth/v1/otp · /verify · /token?grant_type=refresh_token · /logout。
 * key 只能填公开的 publishable / anon key（可以放前端）；service_role 绝不能出现在这里。
 * 登录态存在本机 localStorage（nbq_sb）；后端上线后改成 httpOnly Cookie（api_spec §0.1）。
 * 纯逻辑部分 sbAuthMake 不碰页面变量（unit/sb_auth 在空沙盒里载入测试）。 */
// 真配置只在正式域名（nanbanqiu.app、预览站 pages.dev）启用；本地文件、测试域名、localhost 仍是演示登录
const SB_REAL={url:'https://xosrdkrkfxkdrwldfhac.supabase.co',key:'sb_publishable_zb-7Wwh8tc1Sd-JPSDvQiQ_ZQ9me97W'};
const SB_CFG=(typeof location!=='undefined'&&/(^|\.)(nanbanqiu\.app|pages\.dev)$/.test(location.hostname))?SB_REAL:{url:'',key:''};
const SB_ERR_MAP={over_sms_send_rate_limit:'otp_too_fast',over_request_rate_limit:'rate_limited',otp_expired:'otp_wrong',otp_disabled:'sms_failed',sms_send_failed:'sms_failed',phone_provider_disabled:'sms_failed',validation_failed:'otp_wrong',invalid_credentials:'otp_wrong',user_banned:'account_banned'};
// 只有登录这一步用得到的提示（不在后端接口的错误码表里）；其余沿用 apiErrText
const SB_TXT={otp_wrong:'验证码不对或已过期，请重新输入',sms_failed:'短信暂时发不出去，请稍后再试',network:'网络不通，请检查后再试'};
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
    async fresh(){const s=rd(K);if(!s||!on())return null;if(s.expires_at-io.now()/1000>60)return s;
      const r=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});
      if(r.ok&&r.data&&r.data.access_token)return keep(r.data,s);
      if(r.code==='network')return s.expires_at>io.now()/1000?s:null;
      del(K);return null},
    async logout(){const s=rd(K);del(K);if(s&&on()){try{await call('/auth/v1/logout',{},s.access_token)}catch(_){}}},
    prof(uid){return uid?rd('nbq_prof_'+uid):null},
    setProf(uid,me){if(!uid||!me)return;const p={};SB_PROF_KEYS.forEach(k=>{if(me[k]!==undefined)p[k]=me[k]});wr('nbq_prof_'+uid,p)}
  }}

/* ---- 页面接线（用到页面变量：toast、apiErrText、openOtp、openNewProfile、api、ME、render……）---- */
const SBA=sbAuthMake(SB_CFG,{fetch:(u,o)=>fetch(u,o),now:()=>Date.now(),
  store:{get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),del:k=>localStorage.removeItem(k)}});
let SBA_BUSY=false;
const sbaMsg=c=>SB_TXT[c]||apiErrText(c);
// 点「获取验证码 / 重新发送」：启用时先真发，成功才进验证码页；演示模式直接进
function sbaSendThen(next){if(!SBA.on()){next();return}
  if(SBA_BUSY)return;SBA_BUSY=true;
  SBA.send(AUTH.e164).then(r=>{SBA_BUSY=false;if(r.ok)next();else toast(sbaMsg(r.code))})}
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
function sbaLogout(){if(SBA.on())SBA.logout();if(typeof NBQ_NET!=='undefined'&&NBQ_NET)nbqBoot()}   // 真实模式：清掉我的数据，重新读公开球局
// 打开页面：有登录态又有资料 → 自动登录
function sbaRestore(){if(!SBA.on()||ME)return;
  if(typeof NBQ_NET!=='undefined'&&NBQ_NET){SBA.fresh().then(s=>{if(!s||ME)return;return nbqEnter().then(e=>{if(e.st==='ok')render()})});return}
  SBA.fresh().then(s=>{if(!s||ME)return;const p=SBA.prof(s.uid);if(!p)return;api.login(Object.assign({sb_uid:s.uid},p));render()})}
setTimeout(sbaRestore,0);
