/* ===== 首页引导条（11-08）=====
 * 看一眼就走，不要求任何操作：往下滑 / 点开一场球 / 点 × / 按 Esc / 登录 —— 任何一种都算看过，本机以后不再出现。
 * 规则见 0501 nbqIntroDecide。从分享 / 推送 / 球局链接进来：这次不显示，也不算看过（下次直接打开首页再给他看）。
 * 显示期间手机端不自动弹位置授权（0120 go），避免一打开就两层；下次回到首页照常问。
 * 本机记录 nbq_intro = {v:1,at,by}；存储读写失败只记在内存里（这次打开内不再出现）。
 * 开关：分支预览（staging）和预览站默认开；正式站 localStorage nbq_ff_intro=1 单独打开。
 * 不单独埋点（加事件要改库里的事件表）：效果用现有的 session_start(entry=direct) + game_view 做上线前后对比。 */
const NBQ_INTRO_K='nbq_intro';
const NBQ_INTRO=(()=>{const s={on:false,deep:false,state:null,mem:false};
  try{s.on=typeof NBQ_ENV!=='undefined'&&(NBQ_ENV==='staging'||NBQ_ENV==='preview')||localStorage.getItem('nbq_ff_intro')==='1'}catch(_){}
  // 落地网址在启动路由改写 hash 之前记下
  try{s.deep=/^#\/./.test(location.hash)||/\/(g|u|p)\//.test(location.pathname)||(typeof AN!=='undefined'&&(AN.entry==='share'||AN.entry==='push'))}catch(_){}
  return s})();
function nbqIntroSeen(){if(NBQ_INTRO.mem)return true;try{const j=JSON.parse(localStorage.getItem(NBQ_INTRO_K)||'null');return !!(j&&j.v>=1)}catch(_){return false}}
function nbqIntroLoggedIn(){if(typeof ME!=='undefined'&&ME)return true;try{if(localStorage.getItem('nbq_snap'))return true}catch(_){}
  try{return typeof SBA!=='undefined'&&SBA.on()&&!!SBA.session()}catch(_){return false}}
function nbqIntroShowing(){
  if(NBQ_INTRO.state==='done')return false;
  const st=nbqIntroDecide({on:NBQ_INTRO.on,loggedIn:nbqIntroLoggedIn(),seen:nbqIntroSeen(),standalone:typeof AENV!=='undefined'&&AENV.standalone,deep:NBQ_INTRO.deep});
  if(st!=='show'){if(NBQ_INTRO.state==='show')nbqIntroDone('login');return false}
  NBQ_INTRO.state='show';
  return true}
function nbqIntroDone(by){
  if(NBQ_INTRO.state!=='show')return;NBQ_INTRO.state='done';NBQ_INTRO.mem=true;
  try{localStorage.setItem(NBQ_INTRO_K,JSON.stringify({v:1,at:Date.now(),by}))}catch(_){}
  const el=document.getElementById('nbqIntro');if(!el)return;
  const rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.classList.add('shut');setTimeout(()=>el.remove(),rm?0:400)}
function nbqIntroCount(){try{return api.list().filter(c=>!c.past&&dOff(c.start)>=0&&dOff(c.start)<7).length}catch(_){return 0}}
const nbqIntroCountTxt=()=>{const n=nbqIntroCount();return n>=5?`· 附近这 7 天 ${n} 场`:''};   // 场数少时不显示，不显得冷清
function nbqIntroHTML(){const city=typeof CITY!=='undefined'&&CITY.zh?CITY.zh:'';
  return `<section class="nbq-intro" id="nbqIntro" aria-label="第一次来南伴球"><div class="ni-box">
  <svg class="ni-art" viewBox="0 0 300 170" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><defs>
   <linearGradient id="niSk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B3B2A"/><stop offset="1" stop-color="#12482F"/></linearGradient>
   <radialGradient id="niGl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4C8" stop-opacity=".5"/><stop offset="1" stop-color="#FFF4C8" stop-opacity="0"/></radialGradient>
   <radialGradient id="niBl" cx=".36" cy=".32" r=".72"><stop offset="0" stop-color="#E6F87F"/><stop offset=".68" stop-color="#C6EA3D"/><stop offset="1" stop-color="#8FAE1B"/></radialGradient></defs>
   <rect width="300" height="170" fill="url(#niSk)"/><path d="M0 85H300V170H0Z" fill="#164F35"/>
   <g stroke="#E8F1E9" stroke-opacity=".42" stroke-width="1.2" fill="none"><path d="M150 88H260L330 178H80Z"/><path d="M118 116H292M205 116V178"/></g>
   <g class="ni-lamp"><line x1="110" y1="85" x2="110" y2="30" stroke="#062A1D" stroke-width="2.4"/><circle cx="110" cy="30" r="32" fill="url(#niGl)"/><rect x="103" y="28" width="14" height="5" rx="1.5" fill="#FFF8DC"/></g>
   <ellipse cx="271" cy="146" rx="18" ry="3.5" fill="#04170F" opacity=".55"/>
   <g class="ni-ball"><circle cx="268" cy="122" r="21" fill="url(#niBl)"/><path d="M249.5 113.6C262.8 119.9 262.8 133.6 259.2 140.5M278.5 104.4C271.6 115.1 273.3 127.3 287.3 129.8" stroke="#F7FBE6" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></svg>
  <button class="ni-x" data-a="introX" aria-label="知道了，关闭">×</button>
  <div class="ni-txt"><div class="ni-eb">${esc(city)}华人网球约局 <span class="ni-n">${nbqIntroCountTxt()}</span></div>
   <h2>想打球，缺个搭子？<br><em>在这里挑一场就行。</em></h2>
   <ol class="ni-st"><li>挑一场</li><li>申请加入</li><li>球场见</li></ol></div></div></section>`}
// 两端在渲染首页时调用：here = 现在是不是首页
function nbqIntroSync(host,here){if(!host)return;const el=host.querySelector('#nbqIntro');
  if(here&&nbqIntroShowing()){if(!el)host.innerHTML=nbqIntroHTML();else{const n=el.querySelector('.ni-n');if(n)n.textContent=nbqIntroCountTxt()}}
  else if(el&&!el.classList.contains('shut'))el.remove()}
document.addEventListener('click',e=>{if(NBQ_INTRO.state!=='show')return;const t=e.target;
  if(t.closest('[data-a="introX"]')){e.stopPropagation();nbqIntroDone('x');return}
  if(t.closest('[data-open],[data-sel]'))nbqIntroDone('open')},true);
// 往下滑：只认用户自己的滚动手势（页面启动时程序自动滚到「现在」不算）
const nbqIntroScroll=e=>{if(NBQ_INTRO.state==='show'&&!(e.target.closest&&e.target.closest('#nbqIntro')))nbqIntroDone('scroll')};
document.addEventListener('wheel',nbqIntroScroll,{passive:true,capture:true});document.addEventListener('touchmove',nbqIntroScroll,{passive:true,capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&NBQ_INTRO.state==='show'&&document.getElementById('nbqIntro'))nbqIntroDone('x')});
