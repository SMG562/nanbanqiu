/* ===================== 推送引导与状态（11-04） =====================
 * 目标不是「让人装 App、开权限」，而是「有人回复时不错过」。所以：
 *  ① 引导只出现在用户刚做完一件「要等对方回复」的事之后：发出申请（原有，见 openApplied）· 发出邀约 · 发布球局；
 *  ② 状态：on / ask / need_install / denied / wechat / unsupported。权限（Notification.permission）和订阅（pushManager）是两件事，分开看；
 *  ③ 被系统拒绝（denied）后不再弹窗，给「去系统设置打开」的指引；
 *  ④ 已授权但订阅丢了 / 被推送服务判定失效（服务器收到 404 / 410 会清掉这台设备）：启动时静默补订阅，不弹窗（nbqPushHeal）；
 *  ⑤ 初始化只检测，不主动请求权限；请求权限只发生在用户点「开启提醒」之后。 */
function pushState(){
  if(typeof ENV!=='undefined'&&ENV==='wechat')return'wechat';
  if(PUSH&&PUSH.enabled)return'on';
  if(typeof ENV!=='undefined'&&ENV==='safari')return typeof a2hsAdded==='function'&&a2hsAdded()?'installed':'need_install';   // installed：用户说已经添加到主屏幕（这里是浏览器标签，开不了推送，也不再提醒）   // 在浏览器标签里：iPhone 上只有「添加到主屏幕」后的 App 能收推送
  if(!('Notification'in window)||!('PushManager'in window))return'unsupported';
  if(Notification.permission==='denied')return'denied';
  return'ask'}
const PN_TXT={game:['有人申请，第一时间知道','不开着南伴球，也会提醒你'],invite:['对方回复，不错过','接受、回复或换时间，都会提醒你']};
const PN_BTN={ask:['开启提醒','enablePush','i-bell'],need_install:['放到主屏幕','a2hs','i-plus'],denied:['怎么开','pushDenied','i-bell'],wechat:['怎么换','wxguide','i-share']};
function pushNudgeHTML(why){
  if(typeof AN_BUILD==='undefined'||AN_BUILD!=='pwa'||!ME)return'';   // 电脑端不推送（11-03 你定的），只有手机端引导
  const st=pushState();if(st==='on'||st==='unsupported'||st==='installed'||(st==='need_install'&&typeof a2hsRecent==='function'&&a2hsRecent()))return'';
  const t=PN_TXT[why]||PN_TXT.game,b=PN_BTN[st];
  const sub=st==='need_install'?'放到主屏幕后，才能像 App 一样收提醒':st==='denied'?'通知权限被关了，去系统设置里打开':st==='wechat'?'微信里收不到提醒，换到浏览器':t[1];
  return `<div class="pushcard pnudge" data-pn="${why}"><span class="pc-ic"><svg viewBox="0 0 100 100"><use href="#logo"/></svg><i>1</i></span><div><b>${t[0]}</b><p>${sub}</p></div><button class="pc-go" data-a="${b[1]}" data-pf="${why}"><svg><use href="#${b[2]}"/></svg>${b[0]}</button></div>`}
// 记下是从哪个引导点进来的（push_enable 埋点带 from）
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pf]');if(b)window.PUSH_FROM=b.dataset.pf},true);
// 被拒绝后：不再弹系统窗口，指引去系统设置
function openPushDenied(){const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua)||(/Mac/.test(ua)&&navigator.maxTouchPoints>1);
  const steps=ios?['打开 iPhone 的「设置」','点「通知」，找到「南伴球」','打开「允许通知」']:['长按桌面上的南伴球图标，点「应用信息」','点「通知」','打开「允许通知」'];
  openSheet(`<div class="center"><div class="sh-t">通知现在是关闭的</div><p class="sh-s">有人申请或回复时，需要通知才能第一时间告诉你。系统不允许网页再次弹窗，请在手机设置里打开：</p></div>
  <ol class="pdsteps">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>
  <button class="btn btn-p" data-a="pushRecheck">我已打开</button><div style="height:8px"></div><button class="btn btn-s" data-a="close">稍后</button>`)}
function pushRecheck(){
  if(typeof NBQ_NET==='undefined'||!NBQ_NET){PUSH.enabled=true;closeSheet();render();return}
  if(!('Notification'in window)||Notification.permission!=='granted'){toast('还没检测到，打开后再点一次');return}
  closeSheet();nbqPushSub().then(r=>{toast(r?'通知已开启':'已允许通知，但推送没开成功（'+NBQ_PUSH_WHY+'）');render()})}
{const _ep=enablePush;enablePush=function(){
  if(typeof AN_BUILD!=='undefined'&&AN_BUILD==='pwa'&&'Notification'in window&&Notification.permission==='denied'&&!(typeof ENV!=='undefined'&&(ENV==='wechat'||ENV==='safari'))){
    try{track('push_enable',{result:'denied',env:AENV.env,from:window.PUSH_FROM||'card'})}catch(_){}openPushDenied();return}
  return _ep.apply(this,arguments)}}
// 启动时静默补订阅：已允许通知，但服务器里没有这台设备（订阅丢了、被推送服务判为失效、重装过）→ 重新订阅一次。不弹窗，只做一次
let NBQ_HEAL_DONE=false;
async function nbqPushHeal(){
  if(NBQ_HEAL_DONE||typeof NBQ_NET==='undefined'||!NBQ_NET||!ME||typeof NR_PLAT==='undefined'||NR_PLAT!=='mobile')return;
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)||Notification.permission!=='granted')return;
  NBQ_HEAL_DONE=true;
  try{const r=await nbqPushDiag();if(!r||!Array.isArray(r.devices))return;   // 读不到就不动，不能把「读失败」当成「没订阅」
    if(r.devices.some(d=>d.this&&d.push)){if(!PUSH.enabled){PUSH.enabled=true;render()}return}
    const reg=await navigator.serviceWorker.getRegistration(),sub=reg&&await reg.pushManager.getSubscription();
    if(sub)try{await sub.unsubscribe()}catch(_){}
    const ok=await nbqPushSub();try{track('push_enable',{result:ok?'heal_ok':'heal_fail:'+NBQ_PUSH_WHY,env:AENV.env,from:'startup'})}catch(_){}
    PUSH.enabled=!!ok;render()}catch(_){}}
/* ===================== iPhone Safari：先装后登录（11-04） =====================
 * iPhone 上，浏览器（Safari）和「添加到主屏幕」的 App 不共用登录和设置：在 Safari 里登录再添加到主屏幕，要重新登录一次。
 * 所以「要登录」的那一刻，先建议添加到主屏幕、从桌面图标打开后再登录——只登一次，也才能收到提醒。
 * 不强迫：可以选「先在浏览器里用」，同一次打开里不再问。只对真实环境的 iPhone Safari 生效（演示、安卓、已是主屏幕 App 的都不变）。 */
let PN_AUTH=null;
{if(typeof AN_BUILD!=='undefined'&&AN_BUILD==='pwa'&&typeof openAuth==='function'){const _oa=openAuth;
  openAuth=function(next,why){
    let seen=false;try{seen=sessionStorage.getItem('nbq_a2hs_first')==='1'}catch(_){}
    if(!seen&&!(typeof a2hsAdded==='function'&&a2hsAdded())&&typeof NBQ_NET!=='undefined'&&NBQ_NET&&typeof ENV!=='undefined'&&ENV==='safari'&&typeof a2hsKind==='function'&&a2hsKind()==='ios_safari'){
      PN_AUTH={next,why};
      openSheet(`<div class="center"><div class="sh-t">先添加到主屏幕，再登录</div><p class="sh-s">iPhone 上，浏览器和桌面图标不共用登录。先添加到主屏幕，从桌面图标打开后再登录，只需登录一次，也能收到球友的回复提醒。</p></div>
      <button class="btn btn-p" data-a="a2hs">添加到主屏幕</button><div style="height:8px"></div><button class="btn btn-s" data-a="authAnyway">先在浏览器里用</button>`);return}
    return _oa.call(this,next,why)}}}
// 主屏幕 App 里登录完（没有接着要做的事）：一步开通知。只问一次；系统弹窗只在用户点了「开启通知」之后出现
function pnAfterLogin(){if(typeof AN_BUILD==='undefined'||AN_BUILD!=='pwa'||!ME||typeof ENV==='undefined'||ENV!=='pwa'||pushState()!=='ask')return;
  if(document.querySelector('#sheet.show,.sheet.show')||(typeof UI!=='undefined'&&UI.detail))return;   // 正在看别的：不打断
  try{if(localStorage.getItem('nbq_push_asked')==='1')return;localStorage.setItem('nbq_push_asked','1')}catch(_){return}
  window.PUSH_FROM='login';
  openSheet(`<div class="center"><div class="bigic" style="background:var(--gs);color:var(--g)"><svg><use href="#i-bell"/></svg></div><div class="sh-t">开启通知</div><p class="sh-s">有人申请、同意或回复你时，第一时间告诉你。</p></div>
  <button class="btn btn-p" data-a="enablePush">开启通知</button><div style="height:8px"></div><button class="btn btn-s" data-a="close">以后再说</button>`)}
function authAnyway(){try{sessionStorage.setItem('nbq_a2hs_first','1')}catch(_){}const p=PN_AUTH||{};PN_AUTH=null;openAuth(p.next,p.why)}
