const anLS=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const anSS=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const anId=p=>p+Math.random().toString(36).slice(2,12)+Date.now().toString(36).slice(-4);
const AN={q:[],sent:0,pre:[],ready:false,sid:null,last:0,ctx:'list',pv:null,overlay:null,cardAt:{},
  anon:anLS('nbq_anon')||(()=>{const a=anId('a_');anSS('nbq_anon',a);return a})(),
  off:anLS('nbq_analytics_off')==='1',
  // 地址栏参数：分享（s / f）、广告（utm_*）、主屏幕（source）、推送（n / k）；hash 路由里的参数也读
  qp:(()=>{const o={};try{const h=location.hash.indexOf('?');[new URLSearchParams(location.search),new URLSearchParams(h>=0?location.hash.slice(h+1):'')].forEach(p=>p.forEach((v,k)=>{if(v&&o[k]==null)o[k]=v}))}catch(e){}return o})()};
// 分享出去的链接都带上来源：?s=渠道&f=分享人编号 —— 站外回流能精确算到「哪种分享、谁分享的」
// 渠道：link 复制链接 / text 复制文案 / sys 系统分享 / xhs 小红书 / moments 朋友圈 / qr 图片上的二维码 / webqr 电脑端扫码
function shareURL(url,ch){if(!ch)return url;let q='s='+ch;try{if(typeof ME!=='undefined'&&ME&&ME.no!=null)q+='&f='+(typeof fmtNo==='function'?fmtNo(ME.no):ME.no)}catch(e){}return url+(url.includes('?')?'&':'?')+q}
// 进入方式：推送（?n=&k=）· 站外分享（带 s=）· 外部来源 · 直接（输入网址 / 收藏 / 主屏幕）
AN.entry=AN.qp.n||AN.qp.k?'push':AN.qp.s?'share':(document.referrer&&!/nanbanqiu\.com/.test(document.referrer))?'external':'direct';

// 使用环境：比「手机 / 电脑」更细，知道用户到底在哪打开（主屏幕、微信、小红书、Safari……）
// env：pwa_ios / pwa_android 主屏幕 · wechat 微信内 · xhs 小红书内 · ig_fb · safari_ios · chrome_ios · chrome_android · samsung · mobile_other ·
//      desk_chrome / desk_safari / desk_edge / desk_firefox / desk_other 电脑
// device：按 UA 推断；UA 看不出来时，触屏且屏幕窄（< 600）也算手机
const AENV=(()=>{const ua=navigator.userAgent||'',sa=!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone),
  ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),and=/Android/.test(ua);
  let mob=ios||and||/Mobile/.test(ua);try{if(!mob&&window.matchMedia&&matchMedia('(pointer: coarse)').matches&&Math.min(screen.width,screen.height)<600)mob=true}catch(e){}
  let env;if(/MicroMessenger/i.test(ua))env='wechat';else if(/xhsdiscover|XiaoHongShu/i.test(ua))env='xhs';else if(/Instagram|FBAN|FBAV/i.test(ua))env='ig_fb';
  else if(sa)env=ios?'pwa_ios':'pwa_android';else if(mob){env=ios?(/CriOS/.test(ua)?'chrome_ios':/FxiOS|EdgiOS/.test(ua)?'mobile_other':'safari_ios'):/SamsungBrowser/.test(ua)?'samsung':/Chrome/.test(ua)?'chrome_android':'mobile_other'}
  else env=/Edg\//.test(ua)?'desk_edge':/Firefox/.test(ua)?'desk_firefox':/Chrome/.test(ua)?'desk_chrome':/Safari/.test(ua)?'desk_safari':'desk_other';
  return {env,device:mob?'mobile':'desktop',os:ios?'ios':and?'android':/Mac/.test(ua)?'macos':/Windows/.test(ua)?'windows':'other',standalone:sa}})();

function track(ev,props){if(AN.off)return;const now=Date.now();
  if(AN.ready&&AN.last&&now-AN.last>AN_IDLE)anSession('direct');          // 30 分钟没有活动：新会话
  AN.last=now;anSS('nbq_last',String(now));
  const e={ev,at:new Date(now).toISOString(),uid:typeof ME!=='undefined'&&ME?ME.id:null,anon:AN.anon,sid:AN.sid,device:AENV.device,build:AN_BUILD,env:AENV.env,os:AENV.os,city:CITY.key,scr:AN.pv?AN.pv.screen:'',props:props||{}};
  if(!AN.ready){AN.pre.push(e);return}anPush(e)}
function anPush(e){AN.q.push(e);if(window.AN_LOG)window.AN_LOG.push(e);if(AN.q.length>=30)anFlush()}
function anFlush(){if(!AN.q.length)return;const batch=AN.q.splice(0);AN.sent+=batch.length;
  try{if(/^https?:/.test(location.protocol)&&navigator.sendBeacon)navigator.sendBeacon('/api/events',new Blob([JSON.stringify({v:2,events:batch})],{type:'application/json'}));else if(window.AN_DEBUG)console.debug('[track]',batch)}catch(e){}}
// 新会话：换 sid，先发 session_start（第一次带上进入方式、落地页和来源参数）
function anSession(entry,first){AN.sid=anId('s_');anSS('nbq_sid',AN.sid);AN.last=Date.now();anSS('nbq_last',String(AN.last));if(entry)AN.entry=entry;if(AN.off)return;
  const q=first?AN.qp:{},p={entry:AN.entry,ref:first&&document.referrer?(()=>{try{return new URL(document.referrer).hostname}catch(e){return''}})():(q.ref||''),landing:location.pathname+location.hash,
    utm_source:q.utm_source||null,utm_medium:q.utm_medium||null,utm_campaign:q.utm_campaign||null,s:q.s||null,f:q.f||null,source:q.source||null,
    standalone:AENV.standalone,lang:navigator.language,vw:innerWidth};
  anPush({ev:'session_start',at:new Date().toISOString(),uid:typeof ME!=='undefined'&&ME?ME.id:null,anon:AN.anon,sid:AN.sid,device:AENV.device,build:AN_BUILD,env:AENV.env,os:AENV.os,city:CITY.key,scr:AN.pv?AN.pv.screen:'',props:p})}
// 退出登录：换新 anon 和会话，避免同一台设备上的两个人被并成一个人
function anNewAnon(){anFlush();AN.anon=anId('a_');anSS('nbq_anon',AN.anon);anSession('direct')}
setInterval(anFlush,10000);

// ---------- 页面：page_view / page_time ----------
// 底下的页面按状态算（PWA：发现 / 我的球局 / 消息 / 我的 / 球局详情；网页：发现 / 我的球局 / 球局详情 / 分享落地页）；
// 盖在上面的面板（登录、发起、球员卡、分享、筛选……）打开时记成单独的页面，关掉后回到底下的页面
function anPage(screen){if(!screen)return;const now=Date.now();if(AN.pv&&AN.pv.screen===screen)return;
  if(AN.pv)track('page_time',{screen:AN.pv.screen,ms:now-AN.pv.t});AN.pv={screen,t:now};track('page_view',{screen,entry:AN.entry})}
function anBase(){if(typeof UI==='undefined')return'';if(AN_BUILD==='pwa')return UI.detail?'game_detail':UI.tab||'disc';return UI.landing?'landing':UI.sel?'game_detail':UI.tab||'disc'}
function anOverlayOn(){const on=id=>{const x=document.getElementById(id);return !!(x&&x.classList.contains('show'))};return AN.overlay==='notif'?on('pop'):on('sbg')||on('mbg')}
function anSync(){if(AN.overlay&&!anOverlayOn())AN.overlay=null;anPage(AN.overlay||anBase())}
function anOverlay(name){AN.overlay=name;anPage(name)}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(AN.pv){track('page_time',{screen:AN.pv.screen,ms:Date.now()-AN.pv.t});AN.pv.t=Date.now()}track('app_hide');anFlush()}
  else{if(AN.pv)AN.pv.t=Date.now();track('app_show')}});
// 记录这次点击发生在哪块区域，用来区分「从列表 / 地图 / 消息 / 通知 / 球员卡 / 我的球局 / 详情」进入
addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;AN.clickEl=t;
  AN.ctx=t.closest('.rc,.rc-p')?'recap':t.closest('.req,.rq-c')?'request':t.closest('#banner,#dn')?'notif':t.closest('.mapel,#mapView,#map,.mapbox,.vcs,.vpanel,[data-vc],[data-pin],.mcard')?'map'
    :t.closest('.cx-th,.cxsheet,.cx-list,.cx-m,.cx-web')?'chat':t.closest('#scr-notif,#pop,.ntf')?'notif':t.closest('.pc,[data-card],.kdb,.fp,.cardsheet,.invbtn,.pals')?'card'
    :t.closest('#scr-mine,.tl2,.ivq')?'mine':t.closest('#detail,.dpanel,#colR,.dp,.land')?'detail':'list'},true);
// 球员卡当前状态：只在看 / 改 / 分享自己的卡时带上（后台统计「最多人用的动物 / 印样 / 印色 / 卡面」）
const anCard=()=>{if(typeof ME==='undefined'||!ME)return{};return{animal:ME.avatar_kind==='animal'?ME.animal:'letter',seal:ME.avatar_kind==='animal'&&typeof sealOf==='function'?sealOf(ME):'bw-rd',seal_roll:ME.seal_roll||0,color:ME.color,theme:ME.card_theme||'court'}};
const anGame=id=>{try{const g=GAMES.find(x=>x.id===id);if(!g)return{game_id:id};return{game_id:id,venue_id:g.venue_id,type:g.game_type,utr:[g.ntrp_min,g.ntrp_max]}}catch(e){return{game_id:id}}};

// 添加到主屏幕：安卓 / 电脑 Chrome 有安装事件；iPhone 没有，用「第一次从主屏幕打开」判断
addEventListener('beforeinstallprompt',()=>track('pwa_install_prompt'));
addEventListener('appinstalled',()=>track('pwa_installed',{os:AENV.os}));
try{if(AENV.standalone&&!anLS('nbq_sa1')){anSS('nbq_sa1','1');track('pwa_first_launch',{os:AENV.os})}}catch(e){}

// ---------- 「使用数据」开关：未登录也能关（我的页、联系我们）；关了之后不再发任何事件 ----------
const AN_TXT='记录你怎么使用南伴球，用于改进产品；不含聊天内容、手机号和精确位置';
const anOffTxt=()=>`${AN.off?'已关闭':'已开启'} · ${AN_TXT}`;
const anPrivHTML=cls=>`<button class="${cls}" data-anx="1"><span class="ico" style="background:#5B7A6A"><svg><use href="#i-shield"/></svg></span><span class="v">使用数据<small data-anxs>${anOffTxt()}</small></span></button>`;
function anSetOff(off){if(off===AN.off)return;if(off){track('analytics_off');anFlush()}AN.off=off;anSS('nbq_analytics_off',off?'1':'0');
  if(typeof ME!=='undefined'&&ME)ME.analytics_opt_out=off;      // PATCH /api/me {analytics_opt_out} → users.analytics_opt_out
  if(!off){if(!AN.sid)anSession('direct');track('analytics_on')}document.querySelectorAll('[data-anxs]').forEach(s=>s.textContent=anOffTxt())}
// 登录 / 换账号：以账号上的设置为准；新账号沿用这台设备的选择
function anIdentity(){if(typeof ME==='undefined'||!ME)return;if(ME.analytics_opt_out==null){ME.analytics_opt_out=AN.off;return}
  const off=!!ME.analytics_opt_out;if(off!==AN.off){AN.off=off;anSS('nbq_analytics_off',off?'1':'0');document.querySelectorAll('[data-anxs]').forEach(s=>s.textContent=anOffTxt())}}
// ---------- 隐私（5b-2）：用户协议 / 隐私政策、18 岁确认、下载我的数据（GET /api/me/export，每天 1 次） ----------
const LEGAL_V={terms:1,privacy:1};   // = 数据库 legal_docs 的当前版本；改版时加 1，登录后发现本人同意的版本更低 → 请重新同意
const legalLinks=()=>`<a href="terms.html" target="_blank" rel="noopener">《用户协议》</a>和<a href="privacy.html" target="_blank" rel="noopener">《隐私政策》</a>`;
const pvExportHTML=cls=>`<button class="${cls}" data-pvx="export"><span class="ico" style="background:#475467"><svg><use href="#i-dl"/></svg></span><span class="v">下载我的数据<small>资料、球局、消息等，一个 JSON 文件</small></span></button>`;
const pvLegalHTML=()=>`<p class="fine" style="margin:18px 0 6px">南伴球 Southern Companion · <a href="terms.html" target="_blank" rel="noopener">用户协议</a> · <a href="privacy.html" target="_blank" rel="noopener">隐私政策</a></p>`;
function myDataJSON(){const id=ME.id,gm=gid=>GAMES.find(g=>g.id===gid)||{},vn=v=>VEN[v]?VEN[v].name:null;
  return {exported_at:new Date().toISOString(),about:'这是南伴球保存的你的个人信息（隐私政策第 6 条）。不含别人对你的私下评价和举报人身份；有疑问请写信给 privacy@nanbanqiu.com。',
    profile:{nickname:ME.name,last_initial:ME.last||null,member_no:ME.no,utr:ME.ntrp,gender:ME.gender||null,email:ME.email||null,wechat_id:ME.wechat||null,home_clubs:(ME.home_club_ids||[]).map(vn),
      analytics_opt_out:!!ME.analytics_opt_out,adult_confirmed_at:ME.adult_confirmed_at||null,terms_version:ME.terms_version||null,privacy_version:ME.privacy_version||null},
    games_hosted:GAMES.filter(g=>g.host_id===id).map(g=>({share_code:g.share_code,starts_at:g.starts_at,venue:vn(g.venue_id),status:g.status,note:g.note||''})),
    games_joined:PARTS.filter(p=>p.user_id===id&&p.role!=='host').map(p=>({share_code:gm(p.game_id).share_code,starts_at:gm(p.game_id).starts_at,venue:vn(gm(p.game_id).venue_id),status:p.status,message:p.message||''})),
    invites:(typeof INVITES!=='undefined'?INVITES:[]).filter(i=>i.from_user===id||i.to_user===id).map(i=>({direction:i.from_user===id?'sent':'received',other:(U(i.from_user===id?i.to_user:i.from_user)||{}).name,starts_at:i.starts_at,status:i.status})),
    messages:(typeof MSGS!=='undefined'?MSGS:[]).filter(m=>{const t=THREADS.find(t=>t.id===m.tid);return t&&cxMember(t,id)}).map(m=>({thread:m.tid,from:m.from===id?'我':(U(m.from)||{}).name,body:m.text,at:new Date(m.at).toISOString()})),
    blocked:[...(ME.blocked||[])].map(u=>(U(u)||{}).name)}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pvx="export"]');if(!b||!ME)return;e.stopPropagation();
  if(ME.exported_at&&Date.now()-ME.exported_at<864e5){toast(apiErrText('rate_limited'));return}
  try{const blob=new Blob([JSON.stringify(myDataJSON(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nanbanqiu-my-data-'+new Date().toLocaleDateString('sv-SE')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(_){}
  ME.exported_at=Date.now();toast('已下载你的数据')},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-anx]');if(!b)return;e.stopPropagation();anSetOff(!AN.off);
  if(typeof toast==='function')toast(AN.off?'已关闭使用数据':'已开启，谢谢你帮我们变得更好')},true);

/* ---------- 球员卡翻面：正面是卡，背面是「扫码约我打球」的二维码 ---------- */
function cardBack(uid){const u=U(uid),f=playerCard(uid),base=f.slice(0,f.indexOf('<div class="pc-top">')).replace(/<svg class="court"[\s\S]*?<\/svg>/,'');
  return base+`<div class="bk"><i class="q" style="color:${u.color}">${qrSVG(profileUrl(u,'qr'))}</i></div></div>`}
const flipCard=uid=>`<div class="flip" data-flip title="翻面"><div class="fi"><div class="ff">${playerCard(uid)}</div><div class="fb">${cardBack(uid)}</div></div></div>`;
document.addEventListener('click',e=>{const f=e.target.closest('[data-flip],[data-flipbtn]');if(!f)return;e.stopPropagation();const el=f.matches('[data-flip]')?f:f.previousElementSibling;el&&el.classList.toggle('on')},true);

